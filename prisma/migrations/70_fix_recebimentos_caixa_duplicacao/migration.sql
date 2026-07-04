-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 70_fix_recebimentos_caixa_duplicacao
--
-- PROBLEMA:
--   recebimentos_caixa podia ganhar mais de uma linha para a mesma
--   (caixa_id, solicitacao_id): uma criada pelo frontend ao concluir a
--   entrega (addRecebimentoAutomatico, rota_id NULL) e outra(s) criada(s)
--   pelo trigger fn_sync_pagamento_to_caixa por rota conciliada pelo admin
--   (rota_id NOT NULL). O guard antigo do trigger só comparava
--   caixa_id + solicitacao_id + rota_id, então nunca reconhecia a linha
--   rota_id NULL já existente como "esse dinheiro já está registrado" —
--   e também nunca atualizava o valor quando uma conciliação corrigia um
--   valor errado, só ficava esperando encontrar uma linha nova por rota.
--   Caso real: LT-20260703-00020 (Malu baby, caixa do Sergio) — 3 linhas
--   de R$30 para uma entrega que só gerou R$30 reais em dinheiro.
--
-- SOLUÇÃO:
--   1) Consolida duplicatas já existentes em uma única linha por
--      (caixa_id, solicitacao_id), com o valor correto recalculado a
--      partir das rotas reais.
--   2) Troca o índice único parcial (migration 47, só rota_id IS NULL)
--      por um índice único em (caixa_id, solicitacao_id) sem filtro —
--      a invariante real é "no máximo 1 recebimento em dinheiro por
--      solicitação por caixa".
--   3) Reescreve fn_sync_pagamento_to_caixa para, a cada INSERT em
--      pagamentos_solicitacao em dinheiro, recalcular a SOMA de todos os
--      pagamentos em dinheiro daquela solicitação e fazer UPSERT
--      (ON CONFLICT) em vez de INSERT cego por rota. Adiciona um trigger
--      irmão em AFTER DELETE para manter o valor correto quando uma
--      conciliação é refeita (delete + insert).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1) Derruba o índice parcial antigo primeiro — ele bloquearia a consolidação
--       abaixo sempre que a linha "keep" precisar assumir rota_id NULL e já
--       existir outra linha rota_id NULL no mesmo grupo (caixa_id, solicitacao_id).

DROP INDEX IF EXISTS uq_recebimentos_caixa_sol_no_rota;

-- ── 2) Consolida duplicatas existentes ──────────────────────────────────────

DO $$
DECLARE
  v_group   RECORD;
  v_total   numeric;
  v_keep_id uuid;
BEGIN
  FOR v_group IN
    SELECT caixa_id, solicitacao_id
    FROM recebimentos_caixa
    WHERE solicitacao_id IS NOT NULL
    GROUP BY caixa_id, solicitacao_id
    HAVING COUNT(*) > 1
  LOOP
    -- Total correto = mesma regra de calcTotalDinheiroNoCaixa (src/lib/rotasHelpers.ts):
    -- taxa pago_na_hora em dinheiro + cobrança de loja em dinheiro repassada à empresa.
    SELECT COALESCE(SUM(
      CASE WHEN r.pagamento_operacao = 'pago_na_hora'
            AND COALESCE(r.taxa_resolvida, 0) > 0
            AND EXISTS (
              SELECT 1 FROM unnest(r.meios_pagamento_operacao) mp
              JOIN formas_pagamento fp ON fp.id::text = mp
              WHERE lower(fp.name) LIKE '%dinheiro%'
            )
           THEN r.taxa_resolvida ELSE 0 END
      +
      CASE WHEN r.receber_do_cliente
            AND COALESCE(r.valor_a_receber, 0) > 0
            AND r.meio_cobranca_destino = 'dinheiro'
            AND r.destino_dinheiro = 'repassar_empresa'
           THEN r.valor_a_receber ELSE 0 END
    ), 0)
    INTO v_total
    FROM rotas r
    WHERE r.solicitacao_id = v_group.solicitacao_id;

    IF v_total = 0 THEN
      DELETE FROM recebimentos_caixa
      WHERE caixa_id = v_group.caixa_id AND solicitacao_id = v_group.solicitacao_id;
      CONTINUE;
    END IF;

    SELECT id INTO v_keep_id
    FROM recebimentos_caixa
    WHERE caixa_id = v_group.caixa_id AND solicitacao_id = v_group.solicitacao_id
    ORDER BY created_at ASC
    LIMIT 1;

    UPDATE recebimentos_caixa
    SET valor = v_total,
        rota_id = NULL,
        observacao = 'Consolidado automaticamente (correção de duplicidade — migration 70)'
    WHERE id = v_keep_id;

    DELETE FROM recebimentos_caixa
    WHERE caixa_id = v_group.caixa_id
      AND solicitacao_id = v_group.solicitacao_id
      AND id <> v_keep_id;
  END LOOP;
END;
$$;

-- ── 3) Índice único real: no máximo 1 recebimento por solicitação por caixa ──

CREATE UNIQUE INDEX IF NOT EXISTS uq_recebimentos_caixa_por_solicitacao
  ON recebimentos_caixa (caixa_id, solicitacao_id)
  WHERE solicitacao_id IS NOT NULL;

-- ── 4) Sync idempotente: upsert por solicitação em vez de insert por rota ───

CREATE OR REPLACE FUNCTION fn_sync_solicitacao_dinheiro_to_caixa(p_solicitacao_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entregador_id uuid;
  v_caixa_id      uuid;
  v_total         numeric;
BEGIN
  SELECT entregador_id INTO v_entregador_id
  FROM solicitacoes
  WHERE id = p_solicitacao_id;

  IF v_entregador_id IS NULL THEN
    RETURN;
  END IF;

  -- Soma todos os pagamentos em dinheiro já conciliados para a solicitação —
  -- fonte de verdade única, substitui o antigo "um insert por linha nova".
  SELECT COALESCE(SUM(ps.valor), 0) INTO v_total
  FROM pagamentos_solicitacao ps
  JOIN formas_pagamento fp ON fp.id = ps.forma_pagamento_id
  WHERE ps.solicitacao_id = p_solicitacao_id
    AND lower(fp.name) LIKE '%dinheiro%';

  SELECT id INTO v_caixa_id
  FROM caixas_entregadores
  WHERE entregador_id = v_entregador_id
    AND status = 'aberto'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_total <= 0 THEN
    IF v_caixa_id IS NOT NULL THEN
      DELETE FROM recebimentos_caixa
      WHERE caixa_id = v_caixa_id AND solicitacao_id = p_solicitacao_id;
    END IF;
    RETURN;
  END IF;

  -- Nunca deixa o dinheiro sem lugar pra cair (mesmo critério das migrations 67/68).
  IF v_caixa_id IS NULL THEN
    INSERT INTO caixas_entregadores (entregador_id, data, troco_inicial, status, observacoes)
    VALUES (
      v_entregador_id, CURRENT_DATE, 0, 'aberto',
      'Aberto automaticamente ao sincronizar um recebimento em dinheiro sem caixa aberto'
    )
    RETURNING id INTO v_caixa_id;
  END IF;

  INSERT INTO recebimentos_caixa (
    caixa_id, solicitacao_id, rota_id, forma_pagamento_id, valor, pertence_a, observacao
  ) VALUES (
    v_caixa_id, p_solicitacao_id, NULL, NULL, v_total, 'operacao',
    'Sincronizado automaticamente via pagamento registrado'
  )
  ON CONFLICT (caixa_id, solicitacao_id) WHERE solicitacao_id IS NOT NULL
  DO UPDATE SET
    valor      = EXCLUDED.valor,
    observacao = EXCLUDED.observacao;
END;
$$;

CREATE OR REPLACE FUNCTION fn_sync_pagamento_to_caixa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_forma_nome text;
BEGIN
  SELECT name INTO v_forma_nome FROM formas_pagamento WHERE id = NEW.forma_pagamento_id;

  IF v_forma_nome IS NULL OR lower(v_forma_nome) NOT LIKE '%dinheiro%' THEN
    RETURN NEW;
  END IF;

  PERFORM fn_sync_solicitacao_dinheiro_to_caixa(NEW.solicitacao_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fn_sync_pagamento_removido_from_caixa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM fn_sync_solicitacao_dinheiro_to_caixa(OLD.solicitacao_id);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_pagamento_to_caixa ON pagamentos_solicitacao;
CREATE TRIGGER trg_sync_pagamento_to_caixa
  AFTER INSERT ON pagamentos_solicitacao
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_pagamento_to_caixa();

DROP TRIGGER IF EXISTS trg_sync_pagamento_removido_from_caixa ON pagamentos_solicitacao;
CREATE TRIGGER trg_sync_pagamento_removido_from_caixa
  AFTER DELETE ON pagamentos_solicitacao
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_pagamento_removido_from_caixa();

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 67_fix_caixa_sync_pos_reabertura
--
-- PROBLEMA:
--   Recebimento em dinheiro registrado por um entregador depois que uma
--   entrega faturada é reaberta (reabrir_entrega_faturada / excluir_entrega_faturada)
--   às vezes não aparece no caixa dele. Caso real: LT-20260701-00038, R$69,00,
--   caixa do Rafael Pimentel aberto em 01/07, pagamento reconciliado em 03/07 —
--   o valor nunca chegou ao caixa, sem nenhum erro visível.
--
--   Dois defeitos combinados:
--
--   1) fn_sync_pagamento_to_caixa (migration 45) só encontra o caixa do
--      entregador se caixas_entregadores.data = CURRENT_DATE. Caixas ficam
--      abertos por vários dias (comportamento normal, já assumido pelo
--      próprio frontend em CaixaStore.tsx/addRecebimentoAutomatico), então o
--      trigger falha em silêncio (RETURN NEW, sem erro) sempre que o
--      pagamento acontece em dia diferente do dia de abertura do caixa.
--
--   2) reabrir_entrega_faturada (migration 62) e excluir_entrega_faturada
--      (migration 64) limpam recebimentos_caixa com
--      `WHERE rota_id IN (SELECT id FROM rotas WHERE solicitacao_id = ...)`.
--      Isso não remove linhas com rota_id IS NULL — que é exatamente como o
--      caminho de frontend (addRecebimentoAutomatico) grava. A tabela já tem
--      a coluna solicitacao_id direto; não há razão para passar pelo join de
--      rotas, e as duas funções já resetam pagamentos/rotas por
--      solicitacao_id no restante do corpo.
--
-- SOLUÇÃO:
--   1) fn_sync_pagamento_to_caixa: remove a condição de data, mantém só
--      status = 'aberto'.
--   2) reabrir_entrega_faturada / excluir_entrega_faturada: troca a limpeza
--      de recebimentos_caixa para filtrar direto por solicitacao_id.
--
--   Sem mudança de assinatura em nenhuma das três funções — CREATE OR REPLACE
--   preserva os GRANT/REVOKE já aplicados nas migrations anteriores.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1) fn_sync_pagamento_to_caixa: caixa aberto não precisa ter sido aberto hoje ──

CREATE OR REPLACE FUNCTION fn_sync_pagamento_to_caixa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entregador_id uuid;
  v_caixa_id      uuid;
  v_forma_nome    text;
BEGIN
  -- Só processa formas de pagamento "dinheiro"
  SELECT name INTO v_forma_nome
  FROM formas_pagamento
  WHERE id = NEW.forma_pagamento_id;

  IF v_forma_nome IS NULL OR lower(v_forma_nome) NOT LIKE '%dinheiro%' THEN
    RETURN NEW;
  END IF;

  -- Busca entregador da solicitação
  SELECT entregador_id INTO v_entregador_id
  FROM solicitacoes
  WHERE id = NEW.solicitacao_id;

  IF v_entregador_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Busca qualquer caixa aberto do entregador — sem restrição de data, pois
  -- o admin pode ter deixado o caixa do dia anterior aberto (mesmo critério
  -- já usado por addRecebimentoAutomatico no frontend)
  SELECT id INTO v_caixa_id
  FROM caixas_entregadores
  WHERE entregador_id = v_entregador_id
    AND status = 'aberto'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_caixa_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Evita duplicação para a mesma rota/solicitação
  IF EXISTS (
    SELECT 1 FROM recebimentos_caixa
    WHERE caixa_id      = v_caixa_id
      AND solicitacao_id = NEW.solicitacao_id
      AND (rota_id = NEW.rota_id OR (rota_id IS NULL AND NEW.rota_id IS NULL))
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO recebimentos_caixa (
    caixa_id, solicitacao_id, rota_id,
    forma_pagamento_id, valor, pertence_a, observacao
  ) VALUES (
    v_caixa_id, NEW.solicitacao_id, NEW.rota_id,
    NEW.forma_pagamento_id, NEW.valor, NEW.pertence_a,
    'Sincronizado automaticamente via pagamento registrado'
  );

  RETURN NEW;
END;
$$;

-- ── 2) reabrir_entrega_faturada: limpeza de recebimentos_caixa por solicitacao_id ──

CREATE OR REPLACE FUNCTION public.reabrir_entrega_faturada(
  p_solicitacao_id UUID,
  p_motivo         TEXT,
  p_usuario_id     UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sol             RECORD;
  v_fatura          RECORD;
  v_lanc            RECORD;
  v_usuario_id      UUID := COALESCE(p_usuario_id, auth.uid());
  v_total_estornado NUMERIC := 0;
  v_delta_credito   NUMERIC;
  v_delta_debito    NUMERIC;
BEGIN
  SELECT * INTO v_sol FROM solicitacoes WHERE id = p_solicitacao_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitação não encontrada.');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM lancamentos_financeiros
    WHERE solicitacao_id = p_solicitacao_id
      AND tipo IN ('debito_loja', 'credito_loja')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta solicitação não possui lançamentos faturados para reabrir.');
  END IF;

  FOR v_fatura IN
    SELECT DISTINCT f.id, f.numero, f.status_geral
    FROM lancamentos_financeiros lf
    JOIN faturas f ON f.id = lf.fatura_id
    WHERE lf.solicitacao_id = p_solicitacao_id
      AND lf.tipo IN ('debito_loja', 'credito_loja')
  LOOP
    IF v_fatura.status_geral IN ('Paga', 'Finalizada') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Não é possível reabrir: a fatura ' || v_fatura.numero || ' já está ' || v_fatura.status_geral || '.'
      );
    END IF;
  END LOOP;

  FOR v_fatura IN
    SELECT DISTINCT f.id, f.numero
    FROM lancamentos_financeiros lf
    JOIN faturas f ON f.id = lf.fatura_id
    WHERE lf.solicitacao_id = p_solicitacao_id
      AND lf.tipo IN ('debito_loja', 'credito_loja')
  LOOP
    SELECT
      COALESCE(SUM(valor) FILTER (WHERE sinal = 'credito'), 0),
      COALESCE(SUM(valor) FILTER (WHERE sinal = 'debito'), 0)
    INTO v_delta_credito, v_delta_debito
    FROM lancamentos_financeiros
    WHERE solicitacao_id = p_solicitacao_id
      AND fatura_id = v_fatura.id
      AND tipo IN ('debito_loja', 'credito_loja');

    FOR v_lanc IN
      SELECT * FROM lancamentos_financeiros
      WHERE solicitacao_id = p_solicitacao_id
        AND fatura_id = v_fatura.id
        AND tipo IN ('debito_loja', 'credito_loja')
    LOOP
      INSERT INTO ajustes_financeiros (fatura_id, solicitacao_id, tipo, tipo_lancamento, valor, motivo, usuario_id)
      VALUES (
        v_fatura.id, p_solicitacao_id,
        CASE WHEN v_lanc.sinal = 'debito' THEN 'credito' ELSE 'debito' END::tipo_ajuste,
        v_lanc.tipo,
        v_lanc.valor,
        'Reversão de conciliação — ' || v_sol.codigo || ' — ' || p_motivo,
        v_usuario_id
      );
      v_total_estornado := v_total_estornado + v_lanc.valor;
    END LOOP;

    UPDATE faturas SET
      total_creditos_loja = GREATEST(total_creditos_loja - v_delta_credito, 0),
      total_debitos_loja  = GREATEST(total_debitos_loja  - v_delta_debito, 0),
      total_entregas      = GREATEST(total_entregas - 1, 0),
      saldo_liquido        = GREATEST(total_creditos_loja - v_delta_credito, 0)
                            - GREATEST(total_debitos_loja  - v_delta_debito, 0),
      status_geral         = CASE WHEN status_geral = 'Fechada' THEN 'Aberta' ELSE status_geral END,
      data_vencimento      = CASE WHEN status_geral = 'Fechada' THEN CURRENT_DATE + 7 ELSE data_vencimento END,
      updated_at           = now()
    WHERE id = v_fatura.id;

    INSERT INTO historico_faturas (fatura_id, tipo, descricao, usuario_id, metadata)
    VALUES (
      v_fatura.id, 'correcao',
      'Entrega ' || v_sol.codigo || ' revertida da fatura — ' || p_motivo,
      v_usuario_id,
      jsonb_build_object('solicitacao_id', p_solicitacao_id, 'motivo', p_motivo,
                          'valor_revertido', v_delta_debito - v_delta_credito)
    );
  END LOOP;

  DELETE FROM pagamentos_solicitacao WHERE solicitacao_id = p_solicitacao_id;
  DELETE FROM recebimentos_caixa WHERE solicitacao_id = p_solicitacao_id;
  UPDATE rotas SET status = 'ativa' WHERE solicitacao_id = p_solicitacao_id AND status = 'concluida';
  UPDATE solicitacoes SET
    status = 'em_andamento',
    data_conclusao = NULL,
    admin_conciliada_at = NULL,
    reaberta_em = now()
  WHERE id = p_solicitacao_id;

  INSERT INTO historico_solicitacoes (solicitacao_id, tipo, descricao, usuario_id, metadata)
  VALUES (
    p_solicitacao_id, 'edicao',
    'Entrega reaberta a partir da fatura — ' || p_motivo,
    v_usuario_id,
    jsonb_build_object('motivo', p_motivo, 'valor_revertido', v_total_estornado, 'origem', 'fatura')
  );

  RETURN jsonb_build_object('success', true, 'total_estornado', v_total_estornado);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reabrir_entrega_faturada(uuid, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reabrir_entrega_faturada(uuid, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.reabrir_entrega_faturada(uuid, text, uuid) TO authenticated;

-- ── 3) excluir_entrega_faturada: mesma correção de limpeza ──────────────────

CREATE OR REPLACE FUNCTION public.excluir_entrega_faturada(
  p_solicitacao_id UUID,
  p_motivo         TEXT,
  p_usuario_id     UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sol             RECORD;
  v_fatura          RECORD;
  v_lanc            RECORD;
  v_usuario_id      UUID := COALESCE(p_usuario_id, auth.uid());
  v_total_estornado NUMERIC := 0;
  v_delta_credito   NUMERIC;
  v_delta_debito    NUMERIC;
  v_total_entregas  INT;
  v_saldo_pos       NUMERIC;
BEGIN
  SELECT * INTO v_sol FROM solicitacoes WHERE id = p_solicitacao_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitação não encontrada.');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM lancamentos_financeiros
    WHERE solicitacao_id = p_solicitacao_id
      AND tipo IN ('debito_loja', 'credito_loja')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta solicitação não possui lançamentos faturados para excluir.');
  END IF;

  FOR v_fatura IN
    SELECT DISTINCT f.id, f.numero, f.status_geral
    FROM lancamentos_financeiros lf
    JOIN faturas f ON f.id = lf.fatura_id
    WHERE lf.solicitacao_id = p_solicitacao_id
      AND lf.tipo IN ('debito_loja', 'credito_loja')
  LOOP
    IF v_fatura.status_geral IN ('Paga', 'Finalizada') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Não é possível excluir: a fatura ' || v_fatura.numero || ' já está ' || v_fatura.status_geral || '.'
      );
    END IF;
  END LOOP;

  FOR v_fatura IN
    SELECT DISTINCT f.id, f.numero
    FROM lancamentos_financeiros lf
    JOIN faturas f ON f.id = lf.fatura_id
    WHERE lf.solicitacao_id = p_solicitacao_id
      AND lf.tipo IN ('debito_loja', 'credito_loja')
  LOOP
    SELECT
      COALESCE(SUM(valor) FILTER (WHERE sinal = 'credito'), 0),
      COALESCE(SUM(valor) FILTER (WHERE sinal = 'debito'), 0)
    INTO v_delta_credito, v_delta_debito
    FROM lancamentos_financeiros
    WHERE solicitacao_id = p_solicitacao_id
      AND fatura_id = v_fatura.id
      AND tipo IN ('debito_loja', 'credito_loja');

    FOR v_lanc IN
      SELECT * FROM lancamentos_financeiros
      WHERE solicitacao_id = p_solicitacao_id
        AND fatura_id = v_fatura.id
        AND tipo IN ('debito_loja', 'credito_loja')
    LOOP
      INSERT INTO ajustes_financeiros (fatura_id, solicitacao_id, tipo, tipo_lancamento, valor, motivo, usuario_id)
      VALUES (
        v_fatura.id, p_solicitacao_id,
        CASE WHEN v_lanc.sinal = 'debito' THEN 'credito' ELSE 'debito' END::tipo_ajuste,
        v_lanc.tipo,
        v_lanc.valor,
        'Exclusão definitiva da entrega — ' || v_sol.codigo || ' — ' || p_motivo,
        v_usuario_id
      );
      v_total_estornado := v_total_estornado + v_lanc.valor;
    END LOOP;

    UPDATE faturas SET
      total_creditos_loja = GREATEST(total_creditos_loja - v_delta_credito, 0),
      total_debitos_loja  = GREATEST(total_debitos_loja  - v_delta_debito, 0),
      total_entregas      = GREATEST(total_entregas - 1, 0),
      saldo_liquido        = saldo_liquido - v_delta_credito + v_delta_debito,
      status_geral         = CASE WHEN status_geral = 'Fechada' THEN 'Aberta' ELSE status_geral END,
      data_vencimento      = CASE WHEN status_geral = 'Fechada' THEN CURRENT_DATE + 7 ELSE data_vencimento END,
      updated_at           = now()
    WHERE id = v_fatura.id
    RETURNING total_entregas, saldo_liquido INTO v_total_entregas, v_saldo_pos;

    INSERT INTO historico_faturas (fatura_id, tipo, descricao, usuario_id, metadata)
    VALUES (
      v_fatura.id, 'entrega_excluida',
      'Entrega ' || v_sol.codigo || ' excluída definitivamente da fatura — ' || p_motivo,
      v_usuario_id,
      jsonb_build_object('solicitacao_id', p_solicitacao_id, 'motivo', p_motivo,
                          'valor_revertido', v_delta_debito - v_delta_credito)
    );

    IF v_total_entregas = 0 AND v_saldo_pos = 0 THEN
      UPDATE faturas SET
        status_geral = 'Cancelada'::status_geral,
        updated_at   = now()
      WHERE id = v_fatura.id;

      INSERT INTO historico_faturas (fatura_id, tipo, descricao, usuario_id)
      VALUES (
        v_fatura.id, 'fatura_cancelada',
        'Fatura cancelada automaticamente — última entrega removida',
        v_usuario_id
      );
    END IF;
  END LOOP;

  -- Reset operacional + exclusão definitiva: a solicitação não volta a ser
  -- trabalhada por ninguém (comportamento da migration 64, preservado aqui)
  DELETE FROM pagamentos_solicitacao WHERE solicitacao_id = p_solicitacao_id;
  DELETE FROM recebimentos_caixa WHERE solicitacao_id = p_solicitacao_id;
  UPDATE rotas SET status = 'cancelada' WHERE solicitacao_id = p_solicitacao_id AND status = 'concluida';
  UPDATE solicitacoes SET
    status = 'cancelada',
    data_conclusao = NULL,
    admin_conciliada_at = NULL,
    reaberta_em = NULL,
    excluida_em = now()
  WHERE id = p_solicitacao_id;

  INSERT INTO historico_solicitacoes (solicitacao_id, tipo, descricao, usuario_id, metadata)
  VALUES (
    p_solicitacao_id, 'edicao',
    'Entrega excluída definitivamente a partir da fatura — ' || p_motivo,
    v_usuario_id,
    jsonb_build_object('motivo', p_motivo, 'valor_revertido', v_total_estornado, 'origem', 'fatura', 'exclusao_definitiva', true)
  );

  RETURN jsonb_build_object('success', true, 'total_estornado', v_total_estornado);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.excluir_entrega_faturada(uuid, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.excluir_entrega_faturada(uuid, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.excluir_entrega_faturada(uuid, text, uuid) TO authenticated;

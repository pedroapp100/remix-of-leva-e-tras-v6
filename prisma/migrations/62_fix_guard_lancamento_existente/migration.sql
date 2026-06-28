-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 62_fix_guard_lancamento_existente
--
-- PROBLEMA:
--   reabrir_entrega_faturada e excluir_entrega_faturada bloqueiam a operação
--   quando solicitacoes.admin_conciliada_at está vazio, assumindo que isso
--   significa "nunca foi faturada". Essa suposição quebra quando alguém usa o
--   botão "Reabrir Entrega" antigo e puramente operacional (useReabrirSolicitacao,
--   useSolicitacoes.ts:364-392, chamado de SolicitacoesPage.tsx) numa solicitação
--   que JÁ tem lançamentos reais numa fatura: esse botão limpa
--   admin_conciliada_at mas nunca toca em lancamentos_financeiros/faturas. Se a
--   solicitação for cancelada depois (ação simples de "Cancelar Solicitação",
--   também sem nenhuma checagem financeira), a fatura fica com lançamentos
--   "fantasmas" — e nenhuma das duas funções de reversão consegue mais corrigi-la,
--   porque a trava olha o campo errado.
--
--   Caso real observado: solicitação LT-20260619-00034 (fatura FAT-202606-00200),
--   reaberta pelo botão antigo e cancelada em seguida — ficou com R$15/R$115 em
--   lancamentos_financeiros presos numa fatura "Aberta", sem nenhuma ferramenta
--   capaz de revertê-los.
--
-- SOLUÇÃO:
--   Troca a checagem de admin_conciliada_at por uma checagem direta: existe
--   lançamento de débito_loja/crédito_loja para esta solicitação? É essa
--   pergunta que importa de fato para as duas funções (ambas já filtram por
--   esses lançamentos no restante do corpo) — não um campo auxiliar que outro
--   fluxo pode zerar sem querer.
-- ─────────────────────────────────────────────────────────────────────────────

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
  DELETE FROM recebimentos_caixa WHERE rota_id IN (SELECT id FROM rotas WHERE solicitacao_id = p_solicitacao_id);
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

-- ── Mesmo fix em excluir_entrega_faturada (migration 61) ────────────────────

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
        'Exclusão de entrega da fatura — ' || v_sol.codigo || ' — ' || p_motivo,
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
      'Entrega ' || v_sol.codigo || ' excluída da fatura — ' || p_motivo,
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

  DELETE FROM pagamentos_solicitacao WHERE solicitacao_id = p_solicitacao_id;
  DELETE FROM recebimentos_caixa WHERE rota_id IN (SELECT id FROM rotas WHERE solicitacao_id = p_solicitacao_id);
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
    'Entrega excluída da fatura — ' || p_motivo,
    v_usuario_id,
    jsonb_build_object('motivo', p_motivo, 'valor_revertido', v_total_estornado, 'origem', 'fatura')
  );

  RETURN jsonb_build_object('success', true, 'total_estornado', v_total_estornado);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.excluir_entrega_faturada(uuid, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.excluir_entrega_faturada(uuid, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.excluir_entrega_faturada(uuid, text, uuid) TO authenticated;

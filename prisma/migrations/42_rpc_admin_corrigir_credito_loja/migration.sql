-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 42_rpc_admin_corrigir_credito_loja
--
-- PROBLEMA ESTRUTURAL:
--   O guard 'already_processed' em concluir_fatura_entrega bloqueia
--   permanentemente qualquer correção depois que uma fatura foi gerada.
--   Se o admin submeter valores errados, não há como corrigir via app.
--
-- SOLUÇÃO:
--   RPC admin_corrigir_credito_loja — exclusiva para admin, SECURITY DEFINER,
--   que substitui o lancamento credito_loja de uma solicitação e recalcula
--   os totais da fatura de forma atômica.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION admin_corrigir_credito_loja(
  p_solicitacao_id  UUID,
  p_fatura_id       UUID,
  p_novo_credito    NUMERIC,
  p_sol_codigo      TEXT,
  p_usuario_id      UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credito_anterior  NUMERIC;
  v_debito_atual      NUMERIC;
  v_delta             NUMERIC;
  v_tipo_ajuste       tipo_ajuste;
BEGIN
  -- Lê os totais atuais da fatura (fonte de verdade dos displays)
  SELECT total_creditos_loja, total_debitos_loja
  INTO v_credito_anterior, v_debito_atual
  FROM faturas
  WHERE id = p_fatura_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fatura % não encontrada', p_fatura_id;
  END IF;

  v_delta := p_novo_credito - COALESCE(v_credito_anterior, 0);

  -- Nada a fazer se os valores já estão corretos
  IF v_delta = 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'credito_anterior', v_credito_anterior,
      'credito_novo', p_novo_credito,
      'already_correct', true
    );
  END IF;

  -- Registra o ajuste como auditoria (lancamentos são imutáveis por design)
  -- delta > 0 = precisamos de mais crédito → ajuste tipo 'credito'
  -- delta < 0 = crédito estava alto demais → ajuste tipo 'debito'
  v_tipo_ajuste := CASE WHEN v_delta > 0 THEN 'credito'::tipo_ajuste ELSE 'debito'::tipo_ajuste END;

  INSERT INTO ajustes_financeiros (fatura_id, solicitacao_id, tipo, valor, motivo, usuario_id)
  VALUES (
    p_fatura_id,
    p_solicitacao_id,
    v_tipo_ajuste,
    ABS(v_delta),
    'Correc admin: credito loja '
      || to_char(COALESCE(v_credito_anterior, 0), 'FM999G999D00')
      || ' -> R$ ' || to_char(p_novo_credito, 'FM999G999D00')
      || ' sol ' || p_sol_codigo,
    COALESCE(p_usuario_id, auth.uid())
  );

  -- Atualiza os totais armazenados na fatura
  UPDATE faturas SET
    total_creditos_loja = p_novo_credito,
    saldo_liquido       = p_novo_credito - COALESCE(v_debito_atual, 0),
    updated_at          = now()
  WHERE id = p_fatura_id;

  -- Histórico visível na tela da fatura
  INSERT INTO historico_faturas (fatura_id, tipo, descricao)
  VALUES (
    p_fatura_id,
    'correcao',
    'Admin corrigiu crédito loja: R$ '
      || to_char(COALESCE(v_credito_anterior, 0), 'FM999G999D00')
      || ' → R$ ' || to_char(p_novo_credito, 'FM999G999D00')
      || ' (' || p_sol_codigo || ')'
  );

  RETURN jsonb_build_object(
    'success',          true,
    'credito_anterior', COALESCE(v_credito_anterior, 0),
    'credito_novo',     p_novo_credito,
    'delta',            v_delta
  );
END;
$$;

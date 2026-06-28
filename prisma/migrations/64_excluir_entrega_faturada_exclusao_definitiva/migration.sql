-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 64_excluir_entrega_faturada_exclusao_definitiva
--
-- PROBLEMA:
--   excluir_entrega_faturada (migrations 61/62) reverte o financeiro mas devolve
--   a solicitação para em_andamento — pensado como "correção", não como
--   "exclusão definitiva". Decisão do usuário: a lixeira na fatura deve ser uma
--   exclusão de verdade (some de tudo, pra sempre), enquanto o ícone de reabrir
--   (↺) continua sendo o caminho de correção/reconciliar de novo.
--
-- SOLUÇÃO:
--   Ajusta o bloco de reset operacional no final de excluir_entrega_faturada:
--   - solicitacoes.excluida_em = now() (nova coluna, migration 63) — esconde a
--     solicitação de toda tela do sistema daqui em diante.
--   - status = 'cancelada' (em vez de 'em_andamento') — não conta mais como
--     entrega ativa em painéis/filas/comissão (fechar_ciclos_comissao_meta já
--     filtra por status = 'concluida', então isso também corrige o cálculo de
--     comissão automaticamente).
--   - reaberta_em = NULL (em vez de now()) — não há "reconciliação futura" a
--     corrigir, já que a solicitação nunca mais será tocada.
--   - rotas voltam para 'cancelada' (em vez de 'ativa') — não pode reaparecer
--     como corrida ativa para o entregador.
--   Resto da função idêntico ao corpo aplicado na migration 62.
-- ─────────────────────────────────────────────────────────────────────────────

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
  -- trabalhada por ninguém — diferente de reabrir_entrega_faturada, que devolve
  -- para em_andamento para permitir reconciliar de novo.
  DELETE FROM pagamentos_solicitacao WHERE solicitacao_id = p_solicitacao_id;
  DELETE FROM recebimentos_caixa WHERE rota_id IN (SELECT id FROM rotas WHERE solicitacao_id = p_solicitacao_id);
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

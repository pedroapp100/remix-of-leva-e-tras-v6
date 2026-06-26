-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 52_reabrir_entrega_faturada
--
-- PROBLEMA:
--   Uma entrega faturada conciliada errado não pode ser corrigida hoje: o botão
--   "Reabrir Entrega" não toca em lancamentos_financeiros/faturas, e a função
--   órfã admin_reabrir_conciliacao (criada via SQL ad-hoc, fora de qualquer
--   migration) só limpa admin_conciliada_at sem reverter nada financeiro.
--
-- SOLUÇÃO:
--   reabrir_entrega_faturada — função única, atômica, SECURITY DEFINER:
--   1. Valida que nenhuma fatura afetada está Paga/Finalizada.
--   2. Cria ajuste(s) compensatório(s) em ajustes_financeiros (lancamentos_financeiros
--      é imutável por trigger — nunca tocamos nela).
--   3. Corrige total_creditos_loja/total_debitos_loja/total_entregas/saldo_liquido
--      da fatura (não só o saldo).
--   4. Reabre a fatura se estava Fechada, empurrando data_vencimento para o futuro.
--   5. Limpa pagamentos_solicitacao/recebimentos_caixa, reativa rotas, volta a
--      solicitação para em_andamento (mesma lógica de useReabrirSolicitacao).
--   6. Registra histórico na fatura e na solicitação.
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove a função órfã: criada via SQL ad-hoc (não está em nenhuma migration),
-- nunca chamada pelo front-end, e incompleta (não reverte lancamentos/totais).
DROP FUNCTION IF EXISTS public.admin_reabrir_conciliacao(uuid, text, uuid);

CREATE OR REPLACE FUNCTION public.reabrir_entrega_faturada(
  p_solicitacao_id UUID,
  p_motivo         TEXT,
  p_usuario_id     UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
  IF v_sol.admin_conciliada_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta solicitação ainda não foi conciliada.');
  END IF;

  -- Valida ANTES de mudar qualquer coisa: nenhuma fatura afetada pode estar paga/finalizada
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

  -- Para cada fatura afetada: cria ajuste compensatório e corrige os totais reais
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
      INSERT INTO ajustes_financeiros (fatura_id, solicitacao_id, tipo, valor, motivo, usuario_id)
      VALUES (
        v_fatura.id, p_solicitacao_id,
        CASE WHEN v_lanc.sinal = 'debito' THEN 'credito' ELSE 'debito' END::tipo_ajuste,
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

  -- Reseta o lado operacional (mesma lógica de useReabrirSolicitacao, useSolicitacoes.ts:364-392)
  DELETE FROM pagamentos_solicitacao WHERE solicitacao_id = p_solicitacao_id;
  DELETE FROM recebimentos_caixa WHERE rota_id IN (SELECT id FROM rotas WHERE solicitacao_id = p_solicitacao_id);
  UPDATE rotas SET status = 'ativa' WHERE solicitacao_id = p_solicitacao_id AND status = 'concluida';
  UPDATE solicitacoes SET
    status = 'em_andamento',
    data_conclusao = NULL,
    admin_conciliada_at = NULL
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

GRANT EXECUTE ON FUNCTION public.reabrir_entrega_faturada(uuid, text, uuid) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 61_excluir_entrega_faturada
--
-- PROBLEMA:
--   O ícone de lixeira em "Entregas Incluídas" (modal da fatura) é decorativo —
--   só mostra um toast, sem nenhuma ação real. Não existe forma de excluir uma
--   entrega de uma fatura, nem de cancelar a fatura quando ela ficar sem
--   nenhuma entrega ativa.
--
-- SOLUÇÃO:
--   excluir_entrega_faturada — clonada de reabrir_entrega_faturada (lida direto
--   da produção via pg_get_functiondef, que já inclui reaberta_em = now(), não
--   presente no arquivo local da migration 52), com três diferenças:
--
--   1. Captura total_entregas/saldo_liquido pós-update via RETURNING.
--   2. Grava historico_faturas com tipo = 'entrega_excluida' (em vez de
--      'correcao') e metadata.solicitacao_id — é essa linha que o front-end
--      usa para esconder a entrega da lista pra sempre, já que o lançamento
--      original em lancamentos_financeiros nunca pode ser apagado (imutável
--      por trigger).
--   3. Cancela a fatura automaticamente (status_geral = 'Cancelada', migration
--      60) quando ela fica sem nenhuma entrega ativa.
--
--   Correção deliberada em relação ao corpo original de reabrir_entrega_faturada:
--   a fórmula de saldo_liquido ali RECALCULA do zero
--   (GREATEST(creditos-delta,0) - GREATEST(debitos-delta,0)) — o mesmo problema
--   que a migration 59 já identificou e corrigiu em concluir_fatura_entrega
--   ("recalcula saldo do zero... troca por soma incremental"), mas que nunca foi
--   replicado para reabrir_entrega_faturada. Usar a fórmula incremental aqui
--   (saldo_liquido = saldo_liquido - delta_credito + delta_debito) é necessário
--   para que a guarda de cancelamento abaixo funcione: sem ela, um ajuste manual
--   avulso (que altera saldo_liquido sem nunca tocar total_creditos_loja/
--   total_debitos_loja — ver handleAjuste no front) seria apagado silenciosamente
--   antes mesmo de a guarda conseguir detectá-lo.
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
        'error', 'Não é possível excluir: a fatura ' || v_fatura.numero || ' já está ' || v_fatura.status_geral || '.'
      );
    END IF;
  END LOOP;

  -- Para cada fatura afetada: cria ajuste compensatório, corrige os totais reais,
  -- marca a entrega como excluída e cancela a fatura se ela ficou vazia
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

    -- Cancela automaticamente só se não restar nenhuma entrega ativa E não houver
    -- saldo pendente de outra natureza (ajuste manual avulso) — ver nota acima.
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

  -- Reseta o lado operacional (mesma lógica de reabrir_entrega_faturada)
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

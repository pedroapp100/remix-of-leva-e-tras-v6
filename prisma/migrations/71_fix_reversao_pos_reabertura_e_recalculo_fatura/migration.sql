-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 71_fix_reversao_pos_reabertura_e_recalculo_fatura
--
-- PROBLEMA:
--   reabrir_entrega_faturada e excluir_entrega_faturada calculam quanto
--   estornar de uma entrega lendo direto de lancamentos_financeiros — a
--   tabela que guarda o valor ORIGINAL de cada entrega faturada, imutável
--   por trigger (trg_lancamentos_immutable, decisão de projeto correta pra
--   auditoria). Quando uma entrega reaberta é corrigida, concluir_fatura_entrega
--   (migration 54) não pode alterar essa linha original — grava a correção
--   só em ajustes_financeiros + atualização direta dos totais da fatura.
--
--   Isso funciona na primeira reabertura. Numa segunda reabertura da MESMA
--   entrega, reabrir_entrega_faturada volta a ler o valor original (nunca
--   mudou) em vez do valor real atual (já corrigido pela primeira correção)
--   — e estorna de menos. A diferença fica presa no total da fatura sem
--   corresponder a nada real. Caso real: FAT-202607-00058, entrega
--   LT-20260709-00014 reaberta duas vezes, R$4,00 presos em
--   total_debitos_loja (114 salvo vs 110 real).
--
-- SOLUÇÃO:
--   1) fn_valor_atual_entrega_fatura: calcula o valor REAL e atual de uma
--      entrega numa fatura = lançamento original (lancamentos_financeiros)
--      + soma líquida de todos os ajustes já aplicados a ela
--      (ajustes_financeiros, via a coluna tipo_lancamento que já existe
--      desde a migration 58). Razão imutável + ajustes = valor atual —
--      funciona não importa quantos ciclos de reabertura aconteçam.
--   2) reabrir_entrega_faturada e excluir_entrega_faturada passam a usar
--      essa função em vez de somar direto de lancamentos_financeiros.
--   3) recalcular_totais_fatura(fatura_id): reconstrói
--      total_creditos_loja/total_debitos_loja/saldo_liquido de uma fatura
--      inteira a partir de lancamentos_financeiros + ajustes_financeiros
--      (a fonte de verdade) — rede de segurança pra qualquer divergência,
--      inclusive de causas futuras não previstas aqui.
--
--   Definições abaixo replicam a definição REAL hoje em produção (lida via
--   pg_get_functiondef), com o mínimo de diff necessário.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1) fn_valor_atual_entrega_fatura ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_valor_atual_entrega_fatura(
  p_solicitacao_id uuid,
  p_fatura_id      uuid,
  p_tipo           tipo_lancamento
) RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  -- Cada SUM(...) FILTER(...) precisa do próprio COALESCE antes de subtrair:
  -- quando um dos lados não tem nenhuma linha, SUM(...) FILTER retorna NULL
  -- (não zero), e NULL - valor também vira NULL — perdendo o ajuste inteiro
  -- em vez de contá-lo como zero.
  SELECT GREATEST(
    COALESCE((
      SELECT SUM(valor) FROM lancamentos_financeiros
      WHERE solicitacao_id = p_solicitacao_id
        AND fatura_id = p_fatura_id
        AND tipo = p_tipo
    ), 0)
    +
    (
      SELECT
        COALESCE(SUM(valor) FILTER (
          WHERE tipo = CASE WHEN p_tipo = 'debito_loja'::tipo_lancamento
                            THEN 'debito'::tipo_ajuste ELSE 'credito'::tipo_ajuste END
        ), 0)
        -
        COALESCE(SUM(valor) FILTER (
          WHERE tipo = CASE WHEN p_tipo = 'debito_loja'::tipo_lancamento
                            THEN 'credito'::tipo_ajuste ELSE 'debito'::tipo_ajuste END
        ), 0)
      FROM ajustes_financeiros
      WHERE solicitacao_id = p_solicitacao_id
        AND fatura_id = p_fatura_id
        AND tipo_lancamento = p_tipo
    ),
    0
  );
$$;

-- ── 2) reabrir_entrega_faturada: delta vem de fn_valor_atual_entrega_fatura ──

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
    -- Valor atual real (lançamento original + ajustes já aplicados) — não o
    -- valor congelado em lancamentos_financeiros, que pode estar desatualizado
    -- se essa entrega já foi reaberta e corrigida antes.
    v_delta_debito  := fn_valor_atual_entrega_fatura(p_solicitacao_id, v_fatura.id, 'debito_loja'::tipo_lancamento);
    v_delta_credito := fn_valor_atual_entrega_fatura(p_solicitacao_id, v_fatura.id, 'credito_loja'::tipo_lancamento);

    IF v_delta_debito > 0 THEN
      INSERT INTO ajustes_financeiros (fatura_id, solicitacao_id, tipo, tipo_lancamento, valor, motivo, usuario_id)
      VALUES (
        v_fatura.id, p_solicitacao_id, 'credito'::tipo_ajuste, 'debito_loja'::tipo_lancamento, v_delta_debito,
        'Reversão de conciliação — ' || v_sol.codigo || ' — ' || p_motivo,
        v_usuario_id
      );
      v_total_estornado := v_total_estornado + v_delta_debito;
    END IF;

    IF v_delta_credito > 0 THEN
      INSERT INTO ajustes_financeiros (fatura_id, solicitacao_id, tipo, tipo_lancamento, valor, motivo, usuario_id)
      VALUES (
        v_fatura.id, p_solicitacao_id, 'debito'::tipo_ajuste, 'credito_loja'::tipo_lancamento, v_delta_credito,
        'Reversão de conciliação — ' || v_sol.codigo || ' — ' || p_motivo,
        v_usuario_id
      );
      v_total_estornado := v_total_estornado + v_delta_credito;
    END IF;

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

-- ── 3) excluir_entrega_faturada: mesma correção de delta ────────────────────

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
    v_delta_debito  := fn_valor_atual_entrega_fatura(p_solicitacao_id, v_fatura.id, 'debito_loja'::tipo_lancamento);
    v_delta_credito := fn_valor_atual_entrega_fatura(p_solicitacao_id, v_fatura.id, 'credito_loja'::tipo_lancamento);

    IF v_delta_debito > 0 THEN
      INSERT INTO ajustes_financeiros (fatura_id, solicitacao_id, tipo, tipo_lancamento, valor, motivo, usuario_id)
      VALUES (
        v_fatura.id, p_solicitacao_id, 'credito'::tipo_ajuste, 'debito_loja'::tipo_lancamento, v_delta_debito,
        'Exclusão definitiva da entrega — ' || v_sol.codigo || ' — ' || p_motivo,
        v_usuario_id
      );
      v_total_estornado := v_total_estornado + v_delta_debito;
    END IF;

    IF v_delta_credito > 0 THEN
      INSERT INTO ajustes_financeiros (fatura_id, solicitacao_id, tipo, tipo_lancamento, valor, motivo, usuario_id)
      VALUES (
        v_fatura.id, p_solicitacao_id, 'debito'::tipo_ajuste, 'credito_loja'::tipo_lancamento, v_delta_credito,
        'Exclusão definitiva da entrega — ' || v_sol.codigo || ' — ' || p_motivo,
        v_usuario_id
      );
      v_total_estornado := v_total_estornado + v_delta_credito;
    END IF;

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

-- ── 4) recalcular_totais_fatura: rede de segurança pra qualquer divergência ──

CREATE OR REPLACE FUNCTION public.recalcular_totais_fatura(
  p_fatura_id  UUID,
  p_usuario_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_usuario_id       UUID := COALESCE(p_usuario_id, auth.uid());
  v_creditos_lanc    NUMERIC;
  v_debitos_lanc     NUMERIC;
  v_creditos_ajustes NUMERIC;
  v_debitos_ajustes  NUMERIC;
  v_novo_credito     NUMERIC;
  v_novo_debito      NUMERIC;
  v_antigo_credito   NUMERIC;
  v_antigo_debito    NUMERIC;
BEGIN
  SELECT total_creditos_loja, total_debitos_loja
  INTO v_antigo_credito, v_antigo_debito
  FROM faturas WHERE id = p_fatura_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fatura não encontrada.');
  END IF;

  SELECT
    COALESCE(SUM(valor) FILTER (WHERE tipo = 'credito_loja'), 0),
    COALESCE(SUM(valor) FILTER (WHERE tipo = 'debito_loja'), 0)
  INTO v_creditos_lanc, v_debitos_lanc
  FROM lancamentos_financeiros
  WHERE fatura_id = p_fatura_id;

  SELECT
    COALESCE(SUM(valor) FILTER (WHERE tipo_lancamento = 'credito_loja' AND tipo = 'credito'), 0)
      - COALESCE(SUM(valor) FILTER (WHERE tipo_lancamento = 'credito_loja' AND tipo = 'debito'), 0),
    COALESCE(SUM(valor) FILTER (WHERE tipo_lancamento = 'debito_loja' AND tipo = 'debito'), 0)
      - COALESCE(SUM(valor) FILTER (WHERE tipo_lancamento = 'debito_loja' AND tipo = 'credito'), 0)
  INTO v_creditos_ajustes, v_debitos_ajustes
  FROM ajustes_financeiros
  WHERE fatura_id = p_fatura_id;

  v_novo_credito := GREATEST(v_creditos_lanc + v_creditos_ajustes, 0);
  v_novo_debito  := GREATEST(v_debitos_lanc  + v_debitos_ajustes, 0);

  UPDATE faturas SET
    total_creditos_loja = v_novo_credito,
    total_debitos_loja  = v_novo_debito,
    saldo_liquido        = v_novo_credito - v_novo_debito,
    updated_at           = now()
  WHERE id = p_fatura_id;

  IF v_novo_credito <> v_antigo_credito OR v_novo_debito <> v_antigo_debito THEN
    INSERT INTO historico_faturas (fatura_id, tipo, descricao, usuario_id, metadata)
    VALUES (
      p_fatura_id, 'correcao',
      'Totais recalculados a partir do razão financeiro',
      v_usuario_id,
      jsonb_build_object(
        'credito_antigo', v_antigo_credito, 'credito_novo', v_novo_credito,
        'debito_antigo', v_antigo_debito, 'debito_novo', v_novo_debito
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'total_creditos_loja', v_novo_credito,
    'total_debitos_loja', v_novo_debito,
    'saldo_liquido', v_novo_credito - v_novo_debito,
    'alterado', (v_novo_credito <> v_antigo_credito OR v_novo_debito <> v_antigo_debito)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recalcular_totais_fatura(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalcular_totais_fatura(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.recalcular_totais_fatura(uuid, uuid) TO authenticated;

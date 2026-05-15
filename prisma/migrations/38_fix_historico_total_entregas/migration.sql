-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 38_fix_historico_total_entregas
--
-- PROBLEMA:
--   A migration 37 corrigiu lancamentos_financeiros e os totais financeiros,
--   mas deixou três problemas abertos:
--   1) historico_faturas ainda tem entradas duplicadas (uma por chamada ao RPC)
--   2) total_entregas não foi recalculado (continua inflado, ex: 2 → deveria ser 1)
--   3) O RPC step 4 (INSERT em historico_faturas) não tem ON CONFLICT DO NOTHING,
--      deixando uma janela de race condition entre chamadas simultâneas.
--
-- SOLUÇÃO:
--   1. Remove entradas duplicadas em historico_faturas (tipo = entrega_adicionada)
--   2. Recalcula total_entregas de todas as faturas a partir de lancamentos_financeiros
--   3. Adiciona UNIQUE partial index em (fatura_id, descricao) WHERE tipo = entrega_adicionada
--   4. Substitui o RPC pela versão com ON CONFLICT DO NOTHING no historico insert
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Passo 1: Remover duplicatas em historico_faturas ─────────────────────────
-- Para cada (fatura_id, tipo, descricao) duplicado, mantém o registro mais antigo
-- (menor created_at / menor id como desempate) e deleta os demais.

DELETE FROM historico_faturas
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY fatura_id, tipo, descricao
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM historico_faturas
    WHERE tipo = 'entrega_adicionada'
  ) ranked
  WHERE rn > 1
);

-- ── Passo 2: Recalcular total_entregas para todas as faturas ─────────────────
-- total_entregas = número de solicitações distintas com lançamentos vinculados.
-- Esta é a fonte de verdade mais confiável após a limpeza da migration 37.

UPDATE faturas f
SET
  total_entregas = COALESCE(agg.total, 0),
  updated_at     = now()
FROM (
  SELECT
    fatura_id,
    COUNT(DISTINCT solicitacao_id) AS total
  FROM lancamentos_financeiros
  WHERE fatura_id IS NOT NULL
    AND solicitacao_id IS NOT NULL
  GROUP BY fatura_id
) agg
WHERE f.id = agg.fatura_id;

-- ── Passo 3: UNIQUE partial index em historico_faturas ───────────────────────
-- Bloqueia fisicamente duplicatas futuras para entradas de tipo entrega_adicionada.
-- Entradas manuais (tipo diferente) não são afetadas.

CREATE UNIQUE INDEX IF NOT EXISTS uq_historico_entrega_adicionada
  ON historico_faturas (fatura_id, descricao)
  WHERE tipo = 'entrega_adicionada';

-- ── Passo 4: Atualizar RPC — historico com ON CONFLICT DO NOTHING ─────────────
-- Mesma lógica da migration 37, com uma adição:
-- O INSERT em historico_faturas agora usa ON CONFLICT DO NOTHING,
-- respaldado pelo index uq_historico_entrega_adicionada criado acima.

CREATE OR REPLACE FUNCTION concluir_fatura_entrega(
  p_fatura_id       UUID,
  p_sol_id          UUID,
  p_cliente_id      UUID,
  p_cliente_nome    TEXT,
  p_tipo_faturamento TEXT,
  p_total_taxas     NUMERIC,
  p_total_recebido  NUMERIC,
  p_sol_codigo      TEXT,
  p_num_rotas       INT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fatura_id       UUID;
  v_fatura_numero   TEXT;
  v_now             TIMESTAMPTZ := now();
  v_total_entregas  INT;
  v_auto_fechada    BOOLEAN := false;
  v_threshold       INT;
  v_freq            TEXT;
  v_auto_enabled    BOOLEAN;
  v_lancamento_novo BOOLEAN := false;
BEGIN
  -- ── Guard: se já existem lançamentos para esta solicitação, skip ──
  IF EXISTS (
    SELECT 1 FROM lancamentos_financeiros
    WHERE solicitacao_id = p_sol_id
    LIMIT 1
  ) THEN
    SELECT id INTO v_fatura_id FROM faturas
    WHERE id = p_fatura_id OR (
      cliente_id = p_cliente_id AND status_geral = 'Aberta'
    )
    LIMIT 1;

    RETURN jsonb_build_object(
      'success', true,
      'fatura_id', v_fatura_id,
      'already_processed', true
    );
  END IF;

  -- ── 1) Upsert fatura ──
  IF p_fatura_id IS NOT NULL THEN
    UPDATE faturas SET
      total_entregas      = total_entregas + 1,
      total_creditos_loja = total_creditos_loja + p_total_recebido,
      total_debitos_loja  = total_debitos_loja  + p_total_taxas,
      saldo_liquido       = (total_creditos_loja + p_total_recebido)
                          - (total_debitos_loja  + p_total_taxas),
      updated_at          = v_now
    WHERE id = p_fatura_id
    RETURNING total_entregas INTO v_total_entregas;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Fatura % não encontrada', p_fatura_id;
    END IF;

    v_fatura_id := p_fatura_id;
  ELSE
    v_fatura_numero := gerar_numero_fatura();

    INSERT INTO faturas (
      numero, cliente_id, cliente_nome, tipo_faturamento,
      total_entregas, data_emissao, data_vencimento,
      total_creditos_loja, total_debitos_loja, saldo_liquido,
      status_geral, status_taxas, status_repasse, status_cobranca
    ) VALUES (
      v_fatura_numero,
      p_cliente_id,
      p_cliente_nome,
      p_tipo_faturamento::tipo_faturamento,
      1,
      CURRENT_DATE,
      CURRENT_DATE + 7,
      p_total_recebido,
      p_total_taxas,
      p_total_recebido - p_total_taxas,
      'Aberta'::status_geral,
      'Pendente'::status_taxas,
      'Pendente'::status_repasse,
      'Nao_aplicavel'::status_cobranca
    ) RETURNING id, total_entregas INTO v_fatura_id, v_total_entregas;
  END IF;

  -- ── 2) Lançamento débito (taxas) — ON CONFLICT DO NOTHING ──
  IF p_total_taxas > 0 THEN
    INSERT INTO lancamentos_financeiros (
      solicitacao_id, cliente_id, fatura_id,
      tipo, valor, sinal, status_liquidacao,
      descricao, referencia_origem
    ) VALUES (
      p_sol_id, p_cliente_id, v_fatura_id,
      'debito_loja'::tipo_lancamento,
      p_total_taxas,
      'debito'::sinal_lancamento,
      'pendente'::status_liquidacao,
      'Taxas de entrega — ' || p_sol_codigo
        || ' (' || p_num_rotas || ' rota'
        || CASE WHEN p_num_rotas > 1 THEN 's' ELSE '' END || ')',
      p_sol_codigo
    )
    ON CONFLICT (solicitacao_id, tipo)
    WHERE solicitacao_id IS NOT NULL
    DO NOTHING;

    GET DIAGNOSTICS v_lancamento_novo = ROW_COUNT;
  END IF;

  -- ── 3) Lançamento crédito (recebidos do cliente) — ON CONFLICT DO NOTHING ──
  IF p_total_recebido > 0 THEN
    INSERT INTO lancamentos_financeiros (
      solicitacao_id, cliente_id, fatura_id,
      tipo, valor, sinal, status_liquidacao,
      descricao, referencia_origem
    ) VALUES (
      p_sol_id, p_cliente_id, v_fatura_id,
      'credito_loja'::tipo_lancamento,
      p_total_recebido,
      'credito'::sinal_lancamento,
      'pendente'::status_liquidacao,
      'Valores recebidos do cliente — ' || p_sol_codigo,
      p_sol_codigo
    )
    ON CONFLICT (solicitacao_id, tipo)
    WHERE solicitacao_id IS NOT NULL
    DO NOTHING;
  END IF;

  -- ── 4) Histórico da fatura — ON CONFLICT DO NOTHING ──
  -- Respaldado pelo index uq_historico_entrega_adicionada (fatura_id, descricao)
  -- WHERE tipo = entrega_adicionada criado no Passo 3 desta migration.
  INSERT INTO historico_faturas (fatura_id, tipo, descricao)
  VALUES (
    v_fatura_id,
    'entrega_adicionada',
    'Solicitação ' || p_sol_codigo || ' concluída — '
      || p_num_rotas || ' rota'
      || CASE WHEN p_num_rotas > 1 THEN 's' ELSE '' END
      || ', taxas R$ ' || to_char(p_total_taxas, 'FM999G999D00')
  )
  ON CONFLICT (fatura_id, descricao)
  WHERE tipo = 'entrega_adicionada'
  DO NOTHING;

  -- ── 5) Auto-close para frequência por_entrega ──
  SELECT
    c.numero_de_entregas_para_faturamento,
    f.tipo_faturamento,
    s.auto_fechar_fatura_por_entrega
  INTO v_threshold, v_freq, v_auto_enabled
  FROM faturas f
  JOIN clientes c ON c.id = f.cliente_id
  LEFT JOIN configuracoes_sistema s ON true
  WHERE f.id = v_fatura_id
  LIMIT 1;

  IF v_freq = 'por_entrega'
    AND v_auto_enabled = true
    AND v_threshold IS NOT NULL
    AND v_total_entregas >= v_threshold
  THEN
    UPDATE faturas SET
      status_geral = 'Fechada',
      updated_at   = v_now
    WHERE id = v_fatura_id;

    v_auto_fechada := true;
  END IF;

  RETURN jsonb_build_object(
    'success',        true,
    'fatura_id',      v_fatura_id,
    'fatura_numero',  v_fatura_numero,
    'total_entregas', v_total_entregas,
    'auto_fechada',   v_auto_fechada
  );
END;
$$;

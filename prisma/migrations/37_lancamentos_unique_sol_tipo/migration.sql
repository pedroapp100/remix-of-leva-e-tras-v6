-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 37_lancamentos_unique_sol_tipo
--
-- PROBLEMA:
--   A tabela lancamentos_financeiros não tinha proteção contra duplicatas.
--   O RPC concluir_fatura_entrega podia ser chamado duas vezes para a mesma
--   solicitação, gerando lançamentos duplicados e inflando os totais da fatura.
--
-- SOLUÇÃO:
--   1. Remove os lançamentos duplicados já existentes (mantém apenas o mais antigo)
--   2. Recalcula os totais das faturas afetadas (total_creditos_loja,
--      total_debitos_loja, saldo_liquido)
--   3. Adiciona UNIQUE partial index em (solicitacao_id, tipo)
--      WHERE solicitacao_id IS NOT NULL
--      → lançamentos manuais sem solicitacao_id não são afetados
--   4. Atualiza o RPC para usar INSERT ... ON CONFLICT DO NOTHING (idempotente)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Passo 1: Remover duplicatas ───────────────────────────────────────────────
-- Para cada (solicitacao_id, tipo) duplicado, mantém o registro mais antigo
-- (menor created_at / menor id como desempate) e deleta os demais.

DELETE FROM lancamentos_financeiros
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY solicitacao_id, tipo
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM lancamentos_financeiros
    WHERE solicitacao_id IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- ── Passo 2: Recalcular totais das faturas afetadas ───────────────────────────
-- Recalcula total_creditos_loja, total_debitos_loja e saldo_liquido
-- somando apenas os lançamentos que restaram após a limpeza.

UPDATE faturas f
SET
  total_creditos_loja = COALESCE(agg.creditos, 0),
  total_debitos_loja  = COALESCE(agg.debitos, 0),
  saldo_liquido       = COALESCE(agg.creditos, 0) - COALESCE(agg.debitos, 0),
  updated_at          = now()
FROM (
  SELECT
    fatura_id,
    SUM(CASE WHEN sinal = 'credito' THEN valor ELSE 0 END) AS creditos,
    SUM(CASE WHEN sinal = 'debito'  THEN valor ELSE 0 END) AS debitos
  FROM lancamentos_financeiros
  WHERE fatura_id IS NOT NULL
  GROUP BY fatura_id
) agg
WHERE f.id = agg.fatura_id;

-- ── Passo 3: UNIQUE partial index ────────────────────────────────────────────
-- Bloqueia fisicamente duplicatas futuras.
-- Partial (WHERE solicitacao_id IS NOT NULL) para não restringir
-- lançamentos manuais de ajuste que não têm solicitação vinculada.

CREATE UNIQUE INDEX IF NOT EXISTS uq_lancamentos_sol_tipo
  ON lancamentos_financeiros (solicitacao_id, tipo)
  WHERE solicitacao_id IS NOT NULL;

-- ── Passo 4: Atualizar RPC para ser idempotente ───────────────────────────────
-- Substitui INSERT simples por INSERT ... ON CONFLICT DO NOTHING.
-- Se a constraint já barrou a duplicata no banco, o RPC não lança exceção —
-- simplesmente ignora a tentativa e continua.

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
  -- A constraint uq_lancamentos_sol_tipo garante isso no banco,
  -- mas este check evita atualizar o total_entregas e saldo da fatura de novo.
  IF EXISTS (
    SELECT 1 FROM lancamentos_financeiros
    WHERE solicitacao_id = p_sol_id
    LIMIT 1
  ) THEN
    -- Retorna sucesso sem reprocessar (idempotente)
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

  -- ── 4) Histórico da fatura ──
  INSERT INTO historico_faturas (fatura_id, tipo, descricao)
  VALUES (
    v_fatura_id,
    'entrega_adicionada',
    'Solicitação ' || p_sol_codigo || ' concluída — '
      || p_num_rotas || ' rota'
      || CASE WHEN p_num_rotas > 1 THEN 's' ELSE '' END
      || ', taxas R$ ' || to_char(p_total_taxas, 'FM999G999D00')
  );

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

-- Migration 12: Prazo de vencimento configurável por cliente
-- Adds prazo_vencimento_dias column to clientes table (default 7 days)
-- and updates the concluir_fatura_entrega RPC to use it.

-- ── 1) Add column to clientes ────────────────────────────────────────────────
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS prazo_vencimento_dias INT NOT NULL DEFAULT 7
  CONSTRAINT prazo_vencimento_dias_range CHECK (prazo_vencimento_dias BETWEEN 1 AND 365);

-- ── 2) Update RPC to read prazo_vencimento_dias and use it ───────────────────
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
  v_prazo_dias      INT;
BEGIN
  -- ── 0) Read client billing config (prazo + auto-close settings) ──
  -- Done once up-front so both the fatura INSERT and the auto-close
  -- logic share the same data without a second round-trip.
  SELECT
    c.ativar_faturamento_automatico,
    c.frequencia_faturamento::TEXT,
    c.numero_de_entregas_para_faturamento,
    c.prazo_vencimento_dias
  INTO v_auto_enabled, v_freq, v_threshold, v_prazo_dias
  FROM clientes c
  WHERE c.id = p_cliente_id;

  -- ── 1) Upsert fatura ──
  IF p_fatura_id IS NOT NULL THEN
    UPDATE faturas SET
      total_entregas      = total_entregas + 1,
      total_creditos_loja = total_creditos_loja + p_total_recebido,
      total_debitos_loja  = total_debitos_loja + p_total_taxas,
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
      CURRENT_DATE + COALESCE(v_prazo_dias, 7),
      p_total_recebido,
      p_total_taxas,
      p_total_recebido - p_total_taxas,
      'Aberta'::status_geral,
      'Pendente'::status_taxas,
      'Pendente'::status_repasse,
      'Nao_aplicavel'::status_cobranca
    ) RETURNING id, total_entregas INTO v_fatura_id, v_total_entregas;
  END IF;

  -- ── 2) Lançamento débito (taxas) ──
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
    );
  END IF;

  -- ── 3) Lançamento crédito (recebidos do cliente) ──
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
    );
  END IF;

  -- ── 4) Histórico da fatura (entrega adicionada) ──
  INSERT INTO historico_faturas (fatura_id, tipo, descricao)
  VALUES (
    v_fatura_id,
    'entrega_adicionada',
    'Solicitação ' || p_sol_codigo || ' concluída — '
      || p_num_rotas || ' rota'
      || CASE WHEN p_num_rotas > 1 THEN 's' ELSE '' END
      || ', taxas R$ ' || to_char(p_total_taxas, 'FM999G999D00')
  );

  -- ── 5) Auto-close for por_entrega frequency ──
  -- (uses v_auto_enabled / v_freq / v_threshold already fetched in step 0)_now
    WHERE id = v_fatura_id
      AND status_geral = 'Aberta'::status_geral;

    IF FOUND THEN
      v_auto_fechada := true;

      INSERT INTO historico_faturas (fatura_id, tipo, descricao)
      VALUES (
        v_fatura_id,
        'fechamento_automatico',
        'Fatura fechada automaticamente — '
          || v_total_entregas || '/' || v_threshold
          || ' entregas atingidas'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success',        true,
    'fatura_id',      v_fatura_id,
    'fatura_numero',  COALESCE(v_fatura_numero, ''),
    'auto_fechada',   v_auto_fechada,
    'total_entregas', v_total_entregas
  );
END;
$$;

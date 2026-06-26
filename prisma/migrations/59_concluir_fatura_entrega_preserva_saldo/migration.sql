-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 59_concluir_fatura_entrega_preserva_saldo
--
-- PROBLEMA:
--   concluir_fatura_entrega recalcula saldo_liquido do zero
--   (total_creditos_loja - total_debitos_loja) toda vez que uma entrega nova
--   é anexada a uma fatura "Aberta" já existente. Isso é inofensivo hoje
--   porque nada nunca reduz saldo_liquido enquanto a fatura está Aberta — mas
--   passa a habilitar pagamento/repasse parcial em faturas Aberta apaga
--   silenciosamente qualquer pagamento já registrado na próxima entrega que
--   chegar, porque o recálculo ignora completamente o saldo atual.
--
-- SOLUÇÃO:
--   Trocar o recálculo por soma incremental: saldo_liquido = saldo_liquido +
--   p_total_recebido - p_total_taxas, nos dois pontos onde a fórmula antiga
--   aparece (bloco de correção pós-reabertura e bloco normal de anexação a
--   fatura Aberta existente). Para uma fatura que nunca recebeu pagamento,
--   saldo_liquido já é idêntico a total_creditos_loja - total_debitos_loja
--   antes do update, então o resultado é matematicamente o mesmo de hoje —
--   zero efeito colateral no caminho existente.
--
--   Resto do corpo da função idêntico ao que está rodando em produção hoje
--   (confirmado via pg_get_functiondef antes desta migration), incluindo o
--   hardening de permissões da migration 56 (REVOKE de PUBLIC/anon, search_path).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.concluir_fatura_entrega(
  p_fatura_id        UUID,
  p_sol_id           UUID,
  p_cliente_id       UUID,
  p_cliente_nome     TEXT,
  p_tipo_faturamento TEXT,
  p_total_taxas      NUMERIC,
  p_total_recebido   NUMERIC,
  p_sol_codigo       TEXT,
  p_num_rotas        INT,
  p_usuario_id       UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fatura_id       UUID;
  v_fatura_numero   TEXT;
  v_now             TIMESTAMPTZ := now();
  v_total_entregas  INT;
  v_auto_fechada    BOOLEAN := false;
  v_threshold       INT;
  v_freq            TEXT;
  v_reaberta_em     TIMESTAMPTZ;
  v_lanc_fatura_id  UUID;
BEGIN
  -- ── Correção pós-reabertura: a entrega foi reaberta e está sendo reconciliada
  --    de novo. Não tenta inserir um lançamento (colidiria com o antigo, que é
  --    imutável) — aplica os valores novos como ajuste, mesmo padrão de
  --    admin_corrigir_credito_loja (migration 42). ──
  SELECT reaberta_em INTO v_reaberta_em FROM solicitacoes WHERE id = p_sol_id;

  IF v_reaberta_em IS NOT NULL THEN
    UPDATE solicitacoes SET reaberta_em = NULL WHERE id = p_sol_id;

    SELECT fatura_id INTO v_lanc_fatura_id
    FROM lancamentos_financeiros
    WHERE solicitacao_id = p_sol_id
    LIMIT 1;
  END IF;

  IF v_reaberta_em IS NOT NULL AND v_lanc_fatura_id IS NOT NULL THEN
    v_fatura_id := v_lanc_fatura_id;

    IF p_total_taxas > 0 THEN
      INSERT INTO ajustes_financeiros (fatura_id, solicitacao_id, tipo, tipo_lancamento, valor, motivo, usuario_id)
      VALUES (
        v_fatura_id, p_sol_id, 'debito'::tipo_ajuste, 'debito_loja'::tipo_lancamento, p_total_taxas,
        'Reconciliação corrigida — ' || p_sol_codigo || ' (taxa aplicada após reabertura)',
        COALESCE(p_usuario_id, auth.uid())
      );
    END IF;

    IF p_total_recebido > 0 THEN
      INSERT INTO ajustes_financeiros (fatura_id, solicitacao_id, tipo, tipo_lancamento, valor, motivo, usuario_id)
      VALUES (
        v_fatura_id, p_sol_id, 'credito'::tipo_ajuste, 'credito_loja'::tipo_lancamento, p_total_recebido,
        'Reconciliação corrigida — ' || p_sol_codigo || ' (valor recebido aplicado após reabertura)',
        COALESCE(p_usuario_id, auth.uid())
      );
    END IF;

    UPDATE faturas SET
      total_entregas      = total_entregas + 1,
      total_creditos_loja = total_creditos_loja + p_total_recebido,
      total_debitos_loja  = total_debitos_loja  + p_total_taxas,
      saldo_liquido        = saldo_liquido + p_total_recebido - p_total_taxas,
      updated_at          = v_now
    WHERE id = v_fatura_id
    RETURNING numero, total_entregas INTO v_fatura_numero, v_total_entregas;

    INSERT INTO historico_faturas (fatura_id, tipo, descricao)
    VALUES (
      v_fatura_id,
      'correcao',
      'Entrega ' || p_sol_codigo || ' reconciliada novamente após reabertura — taxas R$ '
        || to_char(p_total_taxas, 'FM999G999D00')
    );

    SELECT
      c.numero_de_entregas_para_faturamento,
      f.tipo_faturamento
    INTO v_threshold, v_freq
    FROM faturas f
    JOIN clientes c ON c.id = f.cliente_id
    WHERE f.id = v_fatura_id
    LIMIT 1;

    IF v_freq = 'por_entrega'
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
      'success',                 true,
      'fatura_id',                v_fatura_id,
      'fatura_numero',            COALESCE(v_fatura_numero, ''),
      'total_entregas',           v_total_entregas,
      'auto_fechada',             v_auto_fechada,
      'corrigido_pos_reabertura', true
    );
  END IF;

  -- ── Guard original: idempotência para clique duplo / retry de rede ──
  IF EXISTS (
    SELECT 1 FROM lancamentos_financeiros
    WHERE solicitacao_id = p_sol_id
    LIMIT 1
  ) THEN
    SELECT id, numero INTO v_fatura_id, v_fatura_numero FROM faturas
    WHERE id = p_fatura_id OR (
      cliente_id = p_cliente_id AND status_geral = 'Aberta'
    )
    LIMIT 1;

    RETURN jsonb_build_object(
      'success',          true,
      'fatura_id',        v_fatura_id,
      'fatura_numero',    COALESCE(v_fatura_numero, ''),
      'already_processed', true
    );
  END IF;

  -- ── 1) Upsert fatura ──
  IF p_fatura_id IS NOT NULL THEN
    UPDATE faturas SET
      total_entregas      = total_entregas + 1,
      total_creditos_loja = total_creditos_loja + p_total_recebido,
      total_debitos_loja  = total_debitos_loja  + p_total_taxas,
      saldo_liquido        = saldo_liquido + p_total_recebido - p_total_taxas,
      updated_at          = v_now
    WHERE id = p_fatura_id
    RETURNING total_entregas, numero INTO v_total_entregas, v_fatura_numero;

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
    f.tipo_faturamento
  INTO v_threshold, v_freq
  FROM faturas f
  JOIN clientes c ON c.id = f.cliente_id
  WHERE f.id = v_fatura_id
  LIMIT 1;

  IF v_freq = 'por_entrega'
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
    'fatura_numero',  COALESCE(v_fatura_numero, ''),
    'total_entregas', v_total_entregas,
    'auto_fechada',   v_auto_fechada
  );
END;
$$;

-- ── Reaplica o hardening de permissões da migration 56 ──────────────────────
-- CREATE OR REPLACE FUNCTION não garante preservar GRANTs customizados em toda
-- versão do Postgres — reaplicar explicitamente para não reabrir o buraco que
-- a migration 56 fechou (EXECUTE para anon/PUBLIC).
REVOKE EXECUTE ON FUNCTION public.concluir_fatura_entrega(
  uuid, uuid, uuid, text, text, numeric, numeric, text, integer, uuid
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.concluir_fatura_entrega(
  uuid, uuid, uuid, text, text, numeric, numeric, text, integer, uuid
) FROM anon;

GRANT EXECUTE ON FUNCTION public.concluir_fatura_entrega(
  uuid, uuid, uuid, text, text, numeric, numeric, text, integer, uuid
) TO authenticated;

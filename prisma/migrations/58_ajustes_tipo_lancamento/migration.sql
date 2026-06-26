-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 58_ajustes_tipo_lancamento
--
-- PROBLEMA:
--   A tela de "Lançamentos Financeiros" mostra sempre o valor original e
--   congelado (lancamentos_financeiros é imutável por trigger), mesmo depois
--   de reaberturas/correções via ajustes_financeiros. Não há como calcular
--   com segurança "o valor atual desta linha" porque ajustes_financeiros só
--   guarda solicitacao_id (qual entrega) e tipo (se o próprio ajuste é
--   crédito/débito) — nenhuma coluna diz a qual lançamento (débito ou
--   crédito da loja) aquele ajuste se refere. A única alternativa seria
--   adivinhar pelo texto do motivo, frágil e descartada de propósito.
--
-- SOLUÇÃO:
--   Nova coluna ajustes_financeiros.tipo_lancamento (mesmo enum
--   tipo_lancamento já usado em lancamentos_financeiros.tipo), preenchida
--   estruturalmente pelas próprias funções que criam o ajuste:
--   - reabrir_entrega_faturada: grava v_lanc.tipo (o tipo do lançamento que
--     está revertendo — já está disponível no loop, não precisa adivinhar).
--   - concluir_fatura_entrega (bloco de correção pós-reabertura, migration
--     54): grava 'debito_loja' no ajuste de taxa e 'credito_loja' no ajuste
--     de valor recebido.
--   Com isso, a tela calcula valor_atual = valor_original ± soma dos
--   ajustes com mesmo solicitacao_id + tipo_lancamento, de forma confiável.
--
--   Backfill único das 4 linhas já existentes (caso real LT-20260625-00022),
--   baseado em 2 padrões de texto gerados pelo próprio sistema (não é
--   leitura de texto livre de usuário) — não é um mecanismo permanente,
--   é uma correção pontual de dados que já existiam antes desta migration.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE ajustes_financeiros ADD COLUMN tipo_lancamento tipo_lancamento NULL;

-- ── reabrir_entrega_faturada: + tipo_lancamento no INSERT do ajuste de reversão ──

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

  -- Reseta o lado operacional (mesma lógica de useReabrirSolicitacao, useSolicitacoes.ts:364-392)
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

-- ── concluir_fatura_entrega: + tipo_lancamento nos 2 INSERTs do bloco de correção ──

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
      saldo_liquido       = (total_creditos_loja + p_total_recebido)
                          - (total_debitos_loja  + p_total_taxas),
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
      saldo_liquido       = (total_creditos_loja + p_total_recebido)
                          - (total_debitos_loja  + p_total_taxas),
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

-- ── Backfill único dos dados já existentes (LT-20260625-00022) ──────────────

UPDATE ajustes_financeiros SET tipo_lancamento = 'debito_loja'
  WHERE motivo LIKE 'Reversão de conciliação%' AND tipo = 'credito' AND tipo_lancamento IS NULL;

UPDATE ajustes_financeiros SET tipo_lancamento = 'credito_loja'
  WHERE motivo LIKE 'Reversão de conciliação%' AND tipo = 'debito' AND tipo_lancamento IS NULL;

UPDATE ajustes_financeiros SET tipo_lancamento = 'debito_loja'
  WHERE motivo LIKE 'Reconciliação corrigida%taxa aplicada após reabertura%' AND tipo_lancamento IS NULL;

UPDATE ajustes_financeiros SET tipo_lancamento = 'credito_loja'
  WHERE motivo LIKE 'Reconciliação corrigida%valor recebido aplicado após reabertura%' AND tipo_lancamento IS NULL;

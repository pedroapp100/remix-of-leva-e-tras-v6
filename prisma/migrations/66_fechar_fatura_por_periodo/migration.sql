-- ============================================================================
-- 66_fechar_fatura_por_periodo
--
-- Permite fechar manualmente só um intervalo de datas dentro de uma fatura
-- Aberta: as solicitações concluídas no período saem para uma fatura nova que
-- já nasce "Fechada" (aguardando pagamento); as demais continuam na fatura
-- original, que permanece "Aberta" recebendo novas entregas normalmente.
--
-- Restrição de desenho: lancamentos_financeiros é imutável (trigger
-- trg_lancamentos_immutable) e tem índice único (solicitacao_id, tipo) — não
-- é possível "mover" um lançamento entre faturas. Por isso o rastreamento de
-- "esta solicitação está na fatura X agora" usa historico_faturas.metadata
-- (mesmo mecanismo já usado por entrega_excluida), e a fatura nova recebe os
-- valores via ajustes_financeiros — mesmo padrão de reabrir_entrega_faturada/
-- excluir_entrega_faturada.
--
-- Divergências deliberadas em relação às funções irmãs (documentadas para não
-- parecer descuido):
--   1) A fatura origem NUNCA é cancelada automaticamente mesmo zerando (ao
--      contrário de excluir_entrega_faturada) — ela deve continuar Aberta.
--   2) O vencimento da fatura nova usa clientes.prazo_vencimento_dias (mais
--      correto), enquanto reabrir/excluir_entrega_faturada continuam com o
--      "+7" fixo herdado de concluir_fatura_entrega — corrigir aquelas é
--      fora do escopo desta migration.
-- ============================================================================

-- ── a) Patch em concluir_fatura_entrega: grava metadata.solicitacao_id no
--       histórico "entrega_adicionada", eliminando a necessidade de regex
--       para localizar entregas "pago na hora" (sem lançamento) por fatura ──
CREATE OR REPLACE FUNCTION public.concluir_fatura_entrega(p_fatura_id uuid, p_sol_id uuid, p_cliente_id uuid, p_cliente_nome text, p_tipo_faturamento text, p_total_taxas numeric, p_total_recebido numeric, p_sol_codigo text, p_num_rotas integer, p_usuario_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- ── 4) Histórico da fatura (com metadata.solicitacao_id — usado por
  --       fechar_fatura_por_periodo para localizar entregas "pago na hora",
  --       sem lançamento, dentro de um intervalo de datas) ──
  INSERT INTO historico_faturas (fatura_id, tipo, descricao, metadata)
  VALUES (
    v_fatura_id,
    'entrega_adicionada',
    'Solicitação ' || p_sol_codigo || ' concluída — '
      || p_num_rotas || ' rota'
      || CASE WHEN p_num_rotas > 1 THEN 's' ELSE '' END
      || ', taxas R$ ' || to_char(p_total_taxas, 'FM999G999D00'),
    jsonb_build_object('solicitacao_id', p_sol_id)
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
$function$;

-- ── b) Backfill único: preenche metadata.solicitacao_id nas linhas
--       "entrega_adicionada" já existentes, via o mesmo regex que o
--       front-end usava para reconstruir esse vínculo ──
UPDATE historico_faturas hf
SET metadata = jsonb_build_object('solicitacao_id', s.id)
FROM solicitacoes s
WHERE hf.tipo = 'entrega_adicionada'
  AND hf.metadata IS NULL
  AND s.codigo = substring(hf.descricao FROM 'Solicitação (LT-\S+) concluída');

-- ── c) Função nova: fecha só o período selecionado, criando uma fatura nova
--       já Fechada com o subconjunto de solicitações do intervalo ──
CREATE OR REPLACE FUNCTION public.fechar_fatura_por_periodo(
  p_fatura_id   UUID,
  p_data_inicio DATE,
  p_data_fim    DATE,
  p_usuario_id  UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fatura             RECORD;
  v_usuario_id         UUID := COALESCE(p_usuario_id, auth.uid());
  v_sol_ids            UUID[];
  v_sol                RECORD;
  v_lanc               RECORD;
  v_creditos_mov       NUMERIC := 0;
  v_debitos_mov        NUMERIC := 0;
  v_entregas_mov       INT := 0;
  v_prazo              INT;
  v_fatura_numero_nova TEXT;
  v_fatura_nova_id     UUID;
  v_creditos_restante  NUMERIC;
  v_debitos_restante   NUMERIC;
  v_entregas_restante  INT;
  v_saldo_restante     NUMERIC;
BEGIN
  -- 1) Lock + guards — nenhuma mutação ainda
  SELECT * INTO v_fatura FROM faturas WHERE id = p_fatura_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fatura não encontrada.');
  END IF;

  IF v_fatura.status_geral <> 'Aberta' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Só é possível fechar por período uma fatura Aberta (atual: ' || v_fatura.status_geral || ').');
  END IF;

  IF p_data_inicio IS NULL OR p_data_fim IS NULL OR p_data_inicio > p_data_fim THEN
    RETURN jsonb_build_object('success', false, 'error', 'Período inválido.');
  END IF;

  -- 2) Elegibilidade: concluídas dentro do período, pertencentes a esta
  --    fatura (via lançamento ou via metadata de "pago na hora"), que ainda
  --    não foram excluídas nem transferidas anteriormente
  SELECT array_agg(s.id) INTO v_sol_ids
  FROM solicitacoes s
  WHERE s.status = 'concluida'
    AND s.excluida_em IS NULL
    AND s.data_conclusao IS NOT NULL
    AND (s.data_conclusao AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN p_data_inicio AND p_data_fim
    AND (
      EXISTS (
        SELECT 1 FROM lancamentos_financeiros lf
        WHERE lf.solicitacao_id = s.id AND lf.fatura_id = p_fatura_id
          AND lf.tipo IN ('debito_loja', 'credito_loja')
      )
      OR EXISTS (
        SELECT 1 FROM historico_faturas hf
        WHERE hf.fatura_id = p_fatura_id AND hf.tipo = 'entrega_adicionada'
          AND (hf.metadata ->> 'solicitacao_id')::uuid = s.id
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM historico_faturas hf
      WHERE hf.fatura_id = p_fatura_id
        AND hf.tipo IN ('entrega_excluida', 'entrega_transferida')
        AND (hf.metadata ->> 'solicitacao_id')::uuid = s.id
    );

  IF v_sol_ids IS NULL OR array_length(v_sol_ids, 1) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nenhuma solicitação concluída encontrada no período informado.');
  END IF;

  v_entregas_mov := array_length(v_sol_ids, 1);

  -- 3) Somas do subconjunto — usadas no checksum e na fatura nova
  SELECT
    COALESCE(SUM(valor) FILTER (WHERE tipo = 'credito_loja'), 0),
    COALESCE(SUM(valor) FILTER (WHERE tipo = 'debito_loja'), 0)
  INTO v_creditos_mov, v_debitos_mov
  FROM lancamentos_financeiros
  WHERE fatura_id = p_fatura_id
    AND solicitacao_id = ANY(v_sol_ids)
    AND tipo IN ('debito_loja', 'credito_loja');

  -- 4) Cria a fatura nova, já Fechada — vencimento usa o prazo do cliente
  SELECT prazo_vencimento_dias INTO v_prazo FROM clientes WHERE id = v_fatura.cliente_id;
  v_fatura_numero_nova := gerar_numero_fatura();

  INSERT INTO faturas (
    numero, cliente_id, cliente_nome, tipo_faturamento,
    total_entregas, data_emissao, data_vencimento,
    total_creditos_loja, total_debitos_loja, saldo_liquido,
    status_geral, status_taxas, status_repasse, status_cobranca
  ) VALUES (
    v_fatura_numero_nova, v_fatura.cliente_id, v_fatura.cliente_nome, v_fatura.tipo_faturamento,
    v_entregas_mov, p_data_inicio, CURRENT_DATE + COALESCE(v_prazo, 7),
    v_creditos_mov, v_debitos_mov, v_creditos_mov - v_debitos_mov,
    'Fechada'::status_geral, 'Pendente'::status_taxas, 'Pendente'::status_repasse, 'Nao_aplicavel'::status_cobranca
  ) RETURNING id INTO v_fatura_nova_id;

  -- 5) Por solicitação: estorna da origem (ajuste), registra na nova
  --    (ajuste), e marca a transferência no histórico da origem. Entregas
  --    "pago na hora" (sem lançamento) não geram ajuste — só a marcação.
  FOR v_sol IN SELECT id, codigo FROM solicitacoes WHERE id = ANY(v_sol_ids) LOOP
    FOR v_lanc IN
      SELECT * FROM lancamentos_financeiros
      WHERE fatura_id = p_fatura_id AND solicitacao_id = v_sol.id
        AND tipo IN ('debito_loja', 'credito_loja')
    LOOP
      INSERT INTO ajustes_financeiros (fatura_id, solicitacao_id, tipo, tipo_lancamento, valor, motivo, usuario_id)
      VALUES (
        p_fatura_id, v_sol.id,
        CASE WHEN v_lanc.sinal = 'debito' THEN 'credito' ELSE 'debito' END::tipo_ajuste,
        v_lanc.tipo, v_lanc.valor,
        'Transferência para fatura ' || v_fatura_numero_nova || ' — fechamento por período (' ||
          to_char(p_data_inicio, 'DD/MM/YYYY') || ' a ' || to_char(p_data_fim, 'DD/MM/YYYY') || ') — ' || v_sol.codigo,
        v_usuario_id
      );

      INSERT INTO ajustes_financeiros (fatura_id, solicitacao_id, tipo, tipo_lancamento, valor, motivo, usuario_id)
      VALUES (
        v_fatura_nova_id, v_sol.id,
        CASE WHEN v_lanc.sinal = 'debito' THEN 'debito' ELSE 'credito' END::tipo_ajuste,
        v_lanc.tipo, v_lanc.valor,
        'Entrada por transferência da fatura ' || v_fatura.numero || ' — ' || v_sol.codigo,
        v_usuario_id
      );
    END LOOP;

    INSERT INTO historico_faturas (fatura_id, tipo, descricao, usuario_id, metadata)
    VALUES (
      p_fatura_id, 'entrega_transferida',
      'Entrega ' || v_sol.codigo || ' transferida para a fatura ' || v_fatura_numero_nova,
      v_usuario_id,
      jsonb_build_object('solicitacao_id', v_sol.id, 'fatura_destino_id', v_fatura_nova_id, 'fatura_destino_numero', v_fatura_numero_nova)
    );
  END LOOP;

  -- 6) Atualiza a fatura origem — continua Aberta mesmo que zere
  --    (divergência deliberada em relação a excluir_entrega_faturada)
  UPDATE faturas SET
    total_creditos_loja = total_creditos_loja - v_creditos_mov,
    total_debitos_loja  = total_debitos_loja  - v_debitos_mov,
    total_entregas      = total_entregas - v_entregas_mov,
    saldo_liquido       = saldo_liquido - (v_creditos_mov - v_debitos_mov),
    updated_at          = now()
  WHERE id = p_fatura_id
  RETURNING total_creditos_loja, total_debitos_loja, total_entregas, saldo_liquido
  INTO v_creditos_restante, v_debitos_restante, v_entregas_restante, v_saldo_restante;

  -- 7) Checksum — garantia de invariante (não é validação de negócio, por
  --    isso RAISE EXCEPTION aqui é correto: reverte a transação inteira,
  --    cumprindo o requisito de "tudo ou nada")
  IF v_creditos_restante + v_creditos_mov <> v_fatura.total_creditos_loja
     OR v_debitos_restante + v_debitos_mov <> v_fatura.total_debitos_loja
     OR v_entregas_restante + v_entregas_mov <> v_fatura.total_entregas THEN
    RAISE EXCEPTION 'Checksum falhou ao fechar fatura % por período — operação abortada, nada foi salvo.', v_fatura.numero;
  END IF;

  -- 8) Histórico agregado na fatura nova
  INSERT INTO historico_faturas (fatura_id, tipo, descricao, usuario_id, metadata)
  VALUES (
    v_fatura_nova_id, 'fatura_criada_por_periodo',
    v_entregas_mov || ' solicitações — R$ ' || to_char(v_creditos_mov - v_debitos_mov, 'FM999G999D00') ||
      ' — transferidas da fatura ' || v_fatura.numero || ' (' || to_char(p_data_inicio, 'DD/MM/YYYY') || ' a ' || to_char(p_data_fim, 'DD/MM/YYYY') || ')',
    v_usuario_id,
    jsonb_build_object(
      'fatura_origem_id', p_fatura_id, 'fatura_origem_numero', v_fatura.numero,
      'periodo_inicio', p_data_inicio, 'periodo_fim', p_data_fim, 'solicitacao_ids', to_jsonb(v_sol_ids)
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'fatura_nova_id', v_fatura_nova_id,
    'fatura_nova_numero', v_fatura_numero_nova,
    'total_entregas', v_entregas_mov,
    'total_creditos_loja', v_creditos_mov,
    'total_debitos_loja', v_debitos_mov,
    'saldo_liquido', v_creditos_mov - v_debitos_mov,
    'fatura_origem_total_entregas_restante', v_entregas_restante
  );
END;
$$;

-- ── d) Hardening de permissões (mesmo padrão das outras RPCs financeiras) ──
REVOKE EXECUTE ON FUNCTION public.fechar_fatura_por_periodo(uuid, date, date, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fechar_fatura_por_periodo(uuid, date, date, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fechar_fatura_por_periodo(uuid, date, date, uuid) TO authenticated;

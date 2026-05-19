-- Testa RLS simulando sessão de admin
DO $$
DECLARE
  v_admin_id uuid := 'dd9d103c-2b58-49e1-8010-828b343bb722';
  v_caixa_id uuid := '96173c4e-6afd-4652-8ce2-9350c6df108a';
  v_is_admin bool;
  v_can_select int;
  v_can_update bool;
  v_policy_count int;
BEGIN
  -- Simular contexto autenticado do admin
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_admin_id::text, 'role', 'authenticated')::text, true);

  -- 1. is_admin() retorna true para esse user?
  SELECT public.is_admin() INTO v_is_admin;

  -- 2. Quantas policies FOR ALL existem para admin em caixas_entregadores?
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'caixas_entregadores'
    AND cmd = 'ALL';

  -- 3. Dados da tabela acessíveis?
  SELECT COUNT(*) INTO v_can_select
  FROM public.caixas_entregadores;

  -- 4. UPDATE funciona? (não altera nada, só testa permissão)
  BEGIN
    UPDATE public.caixas_entregadores
    SET observacoes = observacoes
    WHERE id = v_caixa_id;
    v_can_update := true;
  EXCEPTION WHEN insufficient_privilege THEN
    v_can_update := false;
  END;

  RAISE NOTICE '==== RESULTADO DOS TESTES RLS ====';
  RAISE NOTICE 'is_admin() para admin_id: %', v_is_admin;
  RAISE NOTICE 'Policies FOR ALL em caixas_entregadores: %', v_policy_count;
  RAISE NOTICE 'SELECT retornou % linhas', v_can_select;
  RAISE NOTICE 'UPDATE permitido: %', v_can_update;

  IF v_is_admin AND v_can_update THEN
    RAISE NOTICE '>>> TODOS OS TESTES PASSARAM - Admin pode fechar caixa <<<';
  ELSE
    RAISE NOTICE '>>> FALHA: is_admin=%, can_update=%', v_is_admin, v_can_update;
  END IF;
END;
$$;

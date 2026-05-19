-- Testa isolamento do entregador: só vê o próprio caixa
DO $$
DECLARE
  -- Rafael Pimentel (entregador real)
  v_entregador_profile_id uuid := '8138c84e-d550-46e5-a83b-f3894f395ab1';
  v_entregador_id         uuid := '04475628-8ff0-420e-808c-6df575366330';
  -- Joao Entregador (outro entregador — não deve ser visível para Rafael)
  v_outro_entregador_id   uuid := 'd5524211-1434-43e8-805d-d56198b62668';

  v_caixas_visiveis int;
  v_caixas_proprias int;
  v_caixas_alheias  int;
  v_is_admin        bool;
  v_auth_role       text;
BEGIN
  -- Simular contexto autenticado do entregador Rafael
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_entregador_profile_id::text, 'role', 'authenticated')::text, true);

  -- Funções helper devem retornar corretamente
  SELECT public.is_admin() INTO v_is_admin;
  SELECT public.auth_role() INTO v_auth_role;

  -- Quantos caixas o entregador consegue ver no total?
  SELECT COUNT(*) INTO v_caixas_visiveis FROM public.caixas_entregadores;

  -- Quantos são do próprio entregador?
  SELECT COUNT(*) INTO v_caixas_proprias
  FROM public.caixas_entregadores
  WHERE entregador_id = v_entregador_id;

  -- Quantos são do outro entregador (deve ser 0)?
  SELECT COUNT(*) INTO v_caixas_alheias
  FROM public.caixas_entregadores
  WHERE entregador_id = v_outro_entregador_id;

  RAISE NOTICE '==== TESTE DE ISOLAMENTO DO ENTREGADOR ====';
  RAISE NOTICE 'is_admin() = % (esperado: false)', v_is_admin;
  RAISE NOTICE 'auth_role() = % (esperado: entregador)', v_auth_role;
  RAISE NOTICE 'Caixas visíveis no total: % (deve ser só os próprios)', v_caixas_visiveis;
  RAISE NOTICE 'Caixas próprios: %', v_caixas_proprias;
  RAISE NOTICE 'Caixas de outro entregador visíveis: % (deve ser 0)', v_caixas_alheias;

  IF NOT v_is_admin
    AND v_auth_role = 'entregador'
    AND v_caixas_alheias = 0
    AND v_caixas_visiveis = v_caixas_proprias
  THEN
    RAISE NOTICE '>>> ISOLAMENTO OK - Entregador vê APENAS o próprio caixa <<<';
  ELSE
    RAISE NOTICE '>>> FALHA DE ISOLAMENTO! admin=%, role=%, alheios=%',
      v_is_admin, v_auth_role, v_caixas_alheias;
  END IF;
END;
$$;

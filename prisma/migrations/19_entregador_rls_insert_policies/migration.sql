-- Migration 19: RLS INSERT/UPDATE policies for entregador role
-- Fix: Entregador could not INSERT into pagamentos_solicitacao, recebimentos_caixa
-- Fix: Entregador could not INSERT/UPDATE caixas_entregadores
-- Fix: Entregador could not UPDATE own entregadores record

-- ══════════════════════════════════════════════════════════════════════════════
-- pagamentos_solicitacao: entregador INSERT + SELECT
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "entregador_insert_pagamentos" ON public.pagamentos_solicitacao;
CREATE POLICY "entregador_insert_pagamentos" ON public.pagamentos_solicitacao
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.auth_role()) = 'entregador'
    AND solicitacao_id IN (
      SELECT id FROM public.solicitacoes 
      WHERE entregador_id = (SELECT public.entregador_id_atual())
    )
  );

DROP POLICY IF EXISTS "entregador_select_pagamentos" ON public.pagamentos_solicitacao;
CREATE POLICY "entregador_select_pagamentos" ON public.pagamentos_solicitacao
  FOR SELECT TO authenticated
  USING (
    (SELECT public.auth_role()) = 'entregador'
    AND solicitacao_id IN (
      SELECT id FROM public.solicitacoes 
      WHERE entregador_id = (SELECT public.entregador_id_atual())
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- recebimentos_caixa: entregador INSERT + SELECT
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "entregador_insert_recebimentos" ON public.recebimentos_caixa;
CREATE POLICY "entregador_insert_recebimentos" ON public.recebimentos_caixa
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.auth_role()) = 'entregador'
    AND caixa_id IN (
      SELECT id FROM public.caixas_entregadores
      WHERE entregador_id = (SELECT public.entregador_id_atual())
    )
  );

DROP POLICY IF EXISTS "entregador_select_recebimentos" ON public.recebimentos_caixa;
CREATE POLICY "entregador_select_recebimentos" ON public.recebimentos_caixa
  FOR SELECT TO authenticated
  USING (
    (SELECT public.auth_role()) = 'entregador'
    AND caixa_id IN (
      SELECT id FROM public.caixas_entregadores
      WHERE entregador_id = (SELECT public.entregador_id_atual())
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- caixas_entregadores: entregador INSERT + UPDATE
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "entregador_insert_caixas" ON public.caixas_entregadores;
CREATE POLICY "entregador_insert_caixas" ON public.caixas_entregadores
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.auth_role()) = 'entregador'
    AND entregador_id = (SELECT public.entregador_id_atual())
  );

DROP POLICY IF EXISTS "entregador_update_caixas" ON public.caixas_entregadores;
CREATE POLICY "entregador_update_caixas" ON public.caixas_entregadores
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.auth_role()) = 'entregador'
    AND entregador_id = (SELECT public.entregador_id_atual())
  )
  WITH CHECK (
    entregador_id = (SELECT public.entregador_id_atual())
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- entregadores: entregador UPDATE own record
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "entregador_update_self" ON public.entregadores;
CREATE POLICY "entregador_update_self" ON public.entregadores
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.auth_role()) = 'entregador'
    AND id = (SELECT public.entregador_id_atual())
  )
  WITH CHECK (
    id = (SELECT public.entregador_id_atual())
  );

-- Migration 44: RLS completa para caixas_entregadores e recebimentos_caixa
-- Problema: tabelas sem policy de admin → UPDATE/SELECT bloqueado em produção
-- Solução: ativar RLS formalmente + policies para admin (acesso total) e entregador (próprio)

-- ══════════════════════════════════════════════════════════════════════════════
-- caixas_entregadores
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.caixas_entregadores ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total (SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "admin_all_caixas" ON public.caixas_entregadores;
CREATE POLICY "admin_all_caixas" ON public.caixas_entregadores
  FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- Entregador: SELECT apenas o próprio caixa
DROP POLICY IF EXISTS "entregador_select_caixas" ON public.caixas_entregadores;
CREATE POLICY "entregador_select_caixas" ON public.caixas_entregadores
  FOR SELECT TO authenticated
  USING (
    (SELECT public.auth_role()) = 'entregador'
    AND entregador_id = (SELECT public.entregador_id_atual())
  );

-- Entregador: INSERT apenas para si mesmo (idempotente — já existia na migration 19)
DROP POLICY IF EXISTS "entregador_insert_caixas" ON public.caixas_entregadores;
CREATE POLICY "entregador_insert_caixas" ON public.caixas_entregadores
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.auth_role()) = 'entregador'
    AND entregador_id = (SELECT public.entregador_id_atual())
  );

-- Entregador: UPDATE apenas no próprio caixa (idempotente — já existia na migration 19)
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
-- recebimentos_caixa
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.recebimentos_caixa ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
DROP POLICY IF EXISTS "admin_all_recebimentos" ON public.recebimentos_caixa;
CREATE POLICY "admin_all_recebimentos" ON public.recebimentos_caixa
  FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- Entregador: SELECT apenas recebimentos dos próprios caixas (idempotente — já existia)
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

-- Entregador: INSERT apenas em caixas próprios (idempotente — já existia)
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

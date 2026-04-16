-- Migration 18: RLS em solicitacoes + helper functions para roles
-- Resolve: entregador não consegue UPDATE (iniciar/concluir corrida)
-- Ref: DB_ARCHITECTURE_PLAN.md Section 7.2-7.3, PRD v3.0 Section 2
-- Depende de: migration 11 (is_admin), migration 6 (idx_sol_entregador, idx_sol_cliente)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Helper functions: auth_role, entregador_id_atual, cliente_id_atual
--    Pattern: STABLE + SECURITY DEFINER + (SELECT auth.uid()) para cache
-- ─────────────────────────────────────────────────────────────────────────────

-- Retorna role do usuário autenticado ('admin' | 'cliente' | 'entregador')
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role::text
  FROM public.profiles p
  WHERE p.id = (SELECT auth.uid())
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.auth_role() TO authenticated;

-- Retorna entregadores.id vinculado ao profile do usuário autenticado
CREATE OR REPLACE FUNCTION public.entregador_id_atual()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id
  FROM public.entregadores e
  WHERE e.profile_id = (SELECT auth.uid())
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.entregador_id_atual() TO authenticated;

-- Retorna clientes.id vinculado ao profile do usuário autenticado
CREATE OR REPLACE FUNCTION public.cliente_id_atual()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id
  FROM public.clientes c
  WHERE c.profile_id = (SELECT auth.uid())
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.cliente_id_atual() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Habilitar RLS em solicitacoes (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;

-- Limpar políticas manuais que possam existir (criadas via Dashboard)
DROP POLICY IF EXISTS "admin_all_solicitacoes" ON public.solicitacoes;
DROP POLICY IF EXISTS "entregador_select_solicitacoes" ON public.solicitacoes;
DROP POLICY IF EXISTS "entregador_update_solicitacoes" ON public.solicitacoes;
DROP POLICY IF EXISTS "cliente_select_solicitacoes" ON public.solicitacoes;
-- Possíveis nomes de policies manuais
DROP POLICY IF EXISTS "Enable read access for all users" ON public.solicitacoes;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.solicitacoes;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.solicitacoes;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Policies para solicitacoes
--    Performance: (SELECT fn()) em USING/WITH CHECK — avaliado 1x, não por row
--    Índices: idx_sol_entregador + idx_sol_cliente já existem (migration 6)
-- ─────────────────────────────────────────────────────────────────────────────

-- Admin: acesso total (SELECT/INSERT/UPDATE/DELETE)
CREATE POLICY "admin_all_solicitacoes"
ON public.solicitacoes
FOR ALL
TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

-- Entregador: SELECT apenas solicitações atribuídas a ele
CREATE POLICY "entregador_select_solicitacoes"
ON public.solicitacoes
FOR SELECT
TO authenticated
USING (
  entregador_id = (SELECT public.entregador_id_atual())
  AND (SELECT public.auth_role()) = 'entregador'
);

-- Entregador: UPDATE apenas solicitações atribuídas a ele
-- WITH CHECK garante que não pode reatribuir a outro entregador
CREATE POLICY "entregador_update_solicitacoes"
ON public.solicitacoes
FOR UPDATE
TO authenticated
USING (
  entregador_id = (SELECT public.entregador_id_atual())
  AND (SELECT public.auth_role()) = 'entregador'
)
WITH CHECK (
  entregador_id = (SELECT public.entregador_id_atual())
);

-- Cliente: SELECT apenas suas próprias solicitações
CREATE POLICY "cliente_select_solicitacoes"
ON public.solicitacoes
FOR SELECT
TO authenticated
USING (
  cliente_id = (SELECT public.cliente_id_atual())
  AND (SELECT public.auth_role()) = 'cliente'
);

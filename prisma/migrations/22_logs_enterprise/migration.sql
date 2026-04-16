-- ============================================================
-- Migration 22: logs_auditoria — Enterprise hardening
-- Objetivos:
--   1. Função helper fn_current_user_nome() para consistência
--   2. tsvector GENERATED ALWAYS para full-text search (GIN index)
--   3. Índice parcial composto (categoria, created_at DESC)
--   4. Fix RLS: auth.uid() → (select auth.uid()) — 5-10x mais rápido
--   5. Políticas de imutabilidade (bloqueia UPDATE e DELETE)
-- ============================================================

-- ── 1. Helper: resolver nome real do usuário autenticado ──────────────────────
-- SECURITY DEFINER: executa como owner, bypassa RLS em profiles.
-- Usado pelos triggers das próximas migrations para garantir
-- que usuario_nome seja sempre o nome do perfil, nunca o email.
CREATE OR REPLACE FUNCTION public.fn_current_user_nome()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT nome FROM public.profiles WHERE id = (SELECT auth.uid()) LIMIT 1),
    'Sistema'
  );
$$;

-- ── 2. Coluna tsvector para full-text search ──────────────────────────────────
-- GENERATED ALWAYS AS: atualizada automaticamente a cada INSERT/UPDATE.
-- Combina descricao + acao + usuario_nome para busca ampla.
-- Usa 'portuguese' para suporte a stemming em PT-BR.
ALTER TABLE public.logs_auditoria
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('portuguese',
        coalesce(descricao, '') || ' ' ||
        coalesce(acao, '')      || ' ' ||
        coalesce(usuario_nome, '')
      )
    ) STORED;

-- ── 3. Índice GIN para full-text search (100x mais rápido que LIKE) ───────────
CREATE INDEX IF NOT EXISTS logs_auditoria_search_vector_idx
  ON public.logs_auditoria USING GIN (search_vector);

-- ── 4. Índice parcial composto — filtros de categoria + data ─────────────────
-- Cobre o padrão de query mais comum: WHERE categoria = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS logs_auditoria_categoria_created_at_idx
  ON public.logs_auditoria (categoria, created_at DESC);

-- ── 5. Fix RLS: substituir auth.uid() por (select auth.uid()) ────────────────
-- auth.uid() sem SELECT wrapper é chamada POR ROW, podendo ser chamada
-- milhões de vezes. Com SELECT wrapper, é chamada UMA VEZ e cacheada.
-- Referência: security-rls-performance.md — impacto 5-10x
ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS logs_auditoria_select_authenticated ON public.logs_auditoria;
CREATE POLICY logs_auditoria_select_authenticated
  ON public.logs_auditoria
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS logs_auditoria_insert_authenticated ON public.logs_auditoria;
CREATE POLICY logs_auditoria_insert_authenticated
  ON public.logs_auditoria
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Permitir INSERT para service_role (usado pelos triggers SECURITY DEFINER)
DROP POLICY IF EXISTS logs_auditoria_insert_service ON public.logs_auditoria;
CREATE POLICY logs_auditoria_insert_service
  ON public.logs_auditoria
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ── 6. Imutabilidade: bloquear UPDATE e DELETE ────────────────────────────────
-- Logs de auditoria corporativos NUNCA podem ser modificados ou removidos.
-- Nem admins conseguem — apenas via service_role com rotação controlada (migration 24).
DROP POLICY IF EXISTS logs_auditoria_no_update ON public.logs_auditoria;
CREATE POLICY logs_auditoria_no_update
  ON public.logs_auditoria
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS logs_auditoria_no_delete ON public.logs_auditoria;
CREATE POLICY logs_auditoria_no_delete
  ON public.logs_auditoria
  FOR DELETE
  TO authenticated
  USING (false);

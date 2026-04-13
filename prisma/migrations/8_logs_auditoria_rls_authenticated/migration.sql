-- Fix #13: logs_auditoria com RLS e políticas somente authenticated
-- Objetivo: permitir leitura/escrita de auditoria apenas para usuários autenticados.

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
WITH CHECK (auth.uid() IS NOT NULL);

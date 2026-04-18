-- Migration: Allow entregadores to INSERT into historico_solicitacoes
-- They already have SELECT via hsol_entregador policy.
-- Admin already has ALL via admin_full_access policy.

CREATE POLICY "hsol_entregador_insert"
ON public.historico_solicitacoes
FOR INSERT
TO authenticated
WITH CHECK (
  usuario_id = auth.uid()
  AND solicitacao_id IN (
    SELECT id FROM solicitacoes WHERE entregador_id = entregador_id_atual()
  )
);

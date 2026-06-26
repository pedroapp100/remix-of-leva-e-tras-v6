-- concluir_fatura_entrega é SECURITY DEFINER e move dinheiro (cria fatura,
-- lançamentos e ajustes) — não pode ficar chamável por "anon" (usuário não
-- autenticado) via /rest/v1/rpc/concluir_fatura_entrega. Essa exposição já
-- existia antes desta sessão (a função nunca tinha passado pelo hardening que
-- a migration 53 já aplicou em reabrir_entrega_faturada) — o Supabase concede
-- EXECUTE por padrão a anon/authenticated/service_role em toda função nova.
-- Aproveitando que a migration 54/55 já recriou essa função, fecha o mesmo
-- buraco aqui: revoga de PUBLIC/anon, mantém authenticated/service_role/prisma,
-- e fixa o search_path (mesmo padrão da migration 53).
REVOKE EXECUTE ON FUNCTION public.concluir_fatura_entrega(
  uuid, uuid, uuid, text, text, numeric, numeric, text, integer, uuid
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.concluir_fatura_entrega(
  uuid, uuid, uuid, text, text, numeric, numeric, text, integer, uuid
) FROM anon;

GRANT EXECUTE ON FUNCTION public.concluir_fatura_entrega(
  uuid, uuid, uuid, text, text, numeric, numeric, text, integer, uuid
) TO authenticated;

ALTER FUNCTION public.concluir_fatura_entrega(
  uuid, uuid, uuid, text, text, numeric, numeric, text, integer, uuid
) SET search_path = public;

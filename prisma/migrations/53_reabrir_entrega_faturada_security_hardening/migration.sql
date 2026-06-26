-- A migration anterior (52_reabrir_entrega_faturada) criou a função sem revogar o
-- GRANT padrão do Postgres para PUBLIC, e os advisors do Supabase confirmaram que
-- isso deixava reabrir_entrega_faturada chamável pelo papel "anon" (usuário não
-- autenticado) via /rest/v1/rpc/reabrir_entrega_faturada — uma função que reverte
-- dinheiro não pode ficar exposta sem login. Revoga de PUBLIC, mantém só para
-- authenticated (mesmo modelo de permissão que o resto das RPCs administrativas
-- deste projeto já usa, ex.: concluir_fatura_entrega, admin_corrigir_credito_loja).
-- Também fixa o search_path para evitar o aviso function_search_path_mutable.

REVOKE EXECUTE ON FUNCTION public.reabrir_entrega_faturada(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reabrir_entrega_faturada(uuid, text, uuid) TO authenticated;

ALTER FUNCTION public.reabrir_entrega_faturada(uuid, text, uuid) SET search_path = public;

-- O REVOKE FROM PUBLIC acima não foi suficiente: o Supabase concede EXECUTE
-- automaticamente a anon/authenticated/service_role via default privileges no
-- momento da criação de qualquer função (confirmado via pg_proc.proacl mostrando
-- "anon=X" mesmo após o REVOKE FROM PUBLIC). É preciso revogar explicitamente do
-- papel anon — esse, sim, é o grant que expõe a função à internet sem autenticação
-- via /rest/v1/rpc.
REVOKE EXECUTE ON FUNCTION public.reabrir_entrega_faturada(uuid, text, uuid) FROM anon;

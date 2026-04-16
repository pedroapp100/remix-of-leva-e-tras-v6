-- Migration 20: notify_role RPC — SECURITY DEFINER bypass para RLS em profiles
-- Problema: sendNotificationToRole() rodava SELECT em profiles com a sessão do
-- usuário chamador (ex: entregador). Com RLS ativa o entregador só enxerga o
-- próprio perfil → 0 admins encontrados → notificação nunca inserida (falha silenciosa).
-- Solução: SECURITY DEFINER executa como owner do banco, bypassa RLS,
-- faz SELECT + INSERT em um único round-trip.

CREATE OR REPLACE FUNCTION public.notify_role(
  p_role    text,
  p_title   text,
  p_message text,
  p_type    text,
  p_link    text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, read, link)
  SELECT p.id, p_title, p_message, p_type, false, p_link
  FROM public.profiles p
  WHERE p.role::text = p_role
    AND p.ativo = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_role(text, text, text, text, text) TO authenticated;

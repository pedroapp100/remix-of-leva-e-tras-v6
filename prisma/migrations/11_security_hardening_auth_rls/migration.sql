-- Fix #16: hardening de segredo + RLS em tabelas sensíveis de configuração
-- Objetivos:
-- 1) remover dependência de service_role hardcoded em webhook dispatch
-- 2) exigir chave no Vault (`service_role_key`) para dispatch seguro
-- 3) habilitar RLS admin-only em integracoes, webhooks e system_settings

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Helper de autorização: admin
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text = 'admin'
      AND COALESCE(p.ativo, true) = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Dispatch de webhook sem segredo versionado
-- ─────────────────────────────────────────────────────────────────────────────
-- Busca service_role_key no Vault e apenas dispara se houver chave válida.
-- Em ambientes sem Vault (fora do Supabase), a função falha de forma segura
-- com WARNING e sem quebrar transações de negócio.
CREATE OR REPLACE FUNCTION public.dispatch_webhook_event(
  p_evento  text,
  p_payload jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l_url text := 'https://qbumfnkrqqsthmsgrhfi.supabase.co/functions/v1/dispatch-webhook';
  l_key text;
BEGIN
  BEGIN
    SELECT ds.decrypted_secret
      INTO l_key
      FROM vault.decrypted_secrets ds
      WHERE ds.name = 'service_role_key'
      LIMIT 1;
  EXCEPTION
    WHEN undefined_table OR invalid_schema_name THEN
      l_key := NULL;
  END;

  IF l_key IS NULL OR btrim(l_key) = '' THEN
    RAISE WARNING '[dispatch_webhook_event] service_role_key não encontrada no Vault. Pulando dispatch.';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url                  := l_url,
    headers              := jsonb_build_object(
                              'Content-Type',  'application/json',
                              'Authorization', 'Bearer ' || l_key
                            ),
    body                 := jsonb_build_object('evento', p_evento, 'payload', p_payload)::text,
    timeout_milliseconds := 5000
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[dispatch_webhook_event] Falhou para evento %: %', p_evento, SQLERRM;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) RLS: tabelas sensíveis de configuração (admin-only)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.integracoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS integracoes_admin_all ON public.integracoes;
CREATE POLICY integracoes_admin_all
ON public.integracoes
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS webhooks_admin_all ON public.webhooks;
CREATE POLICY webhooks_admin_all
ON public.webhooks
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS system_settings_admin_all ON public.system_settings;
CREATE POLICY system_settings_admin_all
ON public.system_settings
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Migration 17: Add documento (CPF/CNPJ) to profiles for alternative login
-- Stores CPF (11 digits) or CNPJ (14 digits) as plain digits

ALTER TABLE public.profiles ADD COLUMN documento TEXT;

CREATE UNIQUE INDEX idx_profiles_documento
  ON public.profiles(documento) WHERE documento IS NOT NULL;

-- Backfill from entregadores
UPDATE public.profiles p
SET documento = e.documento
FROM public.entregadores e
WHERE e.profile_id = p.id
  AND e.documento IS NOT NULL
  AND e.documento <> ''
  AND p.documento IS NULL;

-- Backfill from clientes
UPDATE public.profiles p
SET documento = c.documento
FROM public.clientes c
WHERE c.profile_id = p.id
  AND c.documento IS NOT NULL
  AND c.documento <> ''
  AND p.documento IS NULL;

-- Backfill fallback via email join
UPDATE public.profiles p
SET documento = e.documento
FROM public.entregadores e
WHERE e.email = p.email
  AND e.documento IS NOT NULL
  AND e.documento <> ''
  AND p.documento IS NULL;

UPDATE public.profiles p
SET documento = c.documento
FROM public.clientes c
WHERE c.email = p.email
  AND c.documento IS NOT NULL
  AND c.documento <> ''
  AND p.documento IS NULL;

-- RPC for CPF/CNPJ → email lookup (used in login page)
-- SECURITY DEFINER: callable by anon, returns only email
CREATE OR REPLACE FUNCTION public.lookup_email_by_documento(doc_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_email TEXT;
BEGIN
  doc_input := regexp_replace(doc_input, '[^0-9]', '', 'g');
  IF length(doc_input) NOT IN (11, 14) THEN
    RETURN NULL;
  END IF;

  SELECT email INTO found_email
  FROM public.profiles
  WHERE documento = doc_input
    AND ativo = true
  LIMIT 1;

  RETURN found_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_email_by_documento(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.lookup_email_by_documento(TEXT) TO authenticated;

-- Update handle_new_user trigger to save documento from signup metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, nome, email, role, documento)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'nome',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public."Role",
      'admin'::public."Role"
    ),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'documento', '')), '')
  )
  ON CONFLICT (id) DO UPDATE SET
    documento = COALESCE(
      EXCLUDED.documento,
      public.profiles.documento
    );
  RETURN NEW;
END;
$function$;

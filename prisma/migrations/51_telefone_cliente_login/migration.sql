-- Migration 51: Login por telefone para clientes
-- Replica o padrão já existente para CPF/CNPJ (migration 17/25):
--   1) Coluna telefone em profiles + índice único parcial
--   2) Backfill a partir de clientes.telefone (via profile_id)
--   3) Function lookup_email_by_telefone, espelhando lookup_email_by_documento
--   4) handle_new_user passa a gravar telefone também (vindo do metadata do signup)

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telefone TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_telefone
  ON public.profiles(telefone) WHERE telefone IS NOT NULL;

-- Backfill: clientes que já têm profile_id ganham o telefone em profiles.
-- Existem telefones duplicados entre clientes hoje (inclusive valores placeholder
-- como "00000000000" repetido em vários cadastros) — por isso:
--   1) ignora telefones com todos os dígitos iguais (placeholder óbvio)
--   2) quando o mesmo telefone real se repete em mais de um cliente, só o
--      cadastro mais antigo recebe o telefone de login (o índice único exige isso)
WITH ranked AS (
  SELECT c.profile_id, c.telefone,
         ROW_NUMBER() OVER (PARTITION BY c.telefone ORDER BY c.created_at) AS rn
  FROM public.clientes c
  WHERE c.profile_id IS NOT NULL
    AND c.telefone IS NOT NULL
    AND c.telefone <> repeat(left(c.telefone, 1), length(c.telefone))
)
UPDATE public.profiles p
SET telefone = r.telefone
FROM ranked r
WHERE r.profile_id = p.id
  AND r.rn = 1
  AND p.telefone IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p2 WHERE p2.telefone = r.telefone AND p2.id <> p.id
  );

CREATE OR REPLACE FUNCTION public.lookup_email_by_telefone(telefone_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  found_email TEXT;
BEGIN
  telefone_input := regexp_replace(telefone_input, '[^0-9]', '', 'g');

  IF length(telefone_input) NOT IN (10, 11) THEN
    RETURN NULL;
  END IF;

  SELECT email INTO found_email
  FROM public.profiles
  WHERE telefone = telefone_input
    AND ativo = true
  LIMIT 1;

  RETURN found_email;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.lookup_email_by_telefone(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_documento TEXT;
  v_telefone TEXT;
BEGIN
  v_documento := NULLIF(
    TRIM(REGEXP_REPLACE(
      COALESCE(NEW.raw_user_meta_data->>'documento', ''),
      '[^0-9]', '', 'g'
    )),
    ''
  );

  IF v_documento IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles WHERE documento = v_documento
  ) THEN
    v_documento := NULL;
  END IF;

  v_telefone := NULLIF(
    TRIM(REGEXP_REPLACE(
      COALESCE(NEW.raw_user_meta_data->>'telefone', ''),
      '[^0-9]', '', 'g'
    )),
    ''
  );

  IF v_telefone IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles WHERE telefone = v_telefone
  ) THEN
    v_telefone := NULL;
  END IF;

  INSERT INTO public.profiles (id, nome, email, role, documento, telefone)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'nome'), ''),
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.role,
      'admin'::public.role
    ),
    v_documento,
    v_telefone
  )
  ON CONFLICT (id) DO UPDATE SET
    documento = COALESCE(EXCLUDED.documento, public.profiles.documento),
    telefone = COALESCE(EXCLUDED.telefone, public.profiles.telefone);

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Safety net: nunca deixar o auth user falhar por causa do trigger.
  INSERT INTO public.profiles (id, nome, email, role)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'nome'), ''),
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.role,
      'admin'::public.role
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

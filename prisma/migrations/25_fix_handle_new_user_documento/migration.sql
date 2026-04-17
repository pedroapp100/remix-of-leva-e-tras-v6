-- Migration 25: Fix handle_new_user — graceful duplicate documento
-- Problema: ON CONFLICT (id) não protegia contra unique violation em
-- idx_profiles_documento, causando "Database error saving new user" quando
-- o CPF/CNPJ já existia em outro perfil.
-- Solução:
--   1) Checar existência do documento antes de inserir; se duplicado → NULL
--   2) Bloco EXCEPTION WHEN OTHERS como safety net: nunca bloquear auth user

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_documento TEXT;
BEGIN
  -- Limpar e validar documento vindo dos metadados de signup
  v_documento := NULLIF(
    TRIM(REGEXP_REPLACE(
      COALESCE(NEW.raw_user_meta_data->>'documento', ''),
      '[^0-9]', '', 'g'
    )),
    ''
  );

  -- Se documento já pertence a outro perfil, descartar silenciosamente
  -- (não impede criação da conta, apenas não salva o campo)
  IF v_documento IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles WHERE documento = v_documento
  ) THEN
    v_documento := NULL;
  END IF;

  INSERT INTO public.profiles (id, nome, email, role, documento)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'nome'), ''),
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public."Role",
      'admin'::public."Role"
    ),
    v_documento
  )
  ON CONFLICT (id) DO UPDATE SET
    documento = COALESCE(EXCLUDED.documento, public.profiles.documento);

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Safety net: nunca deixar o auth user falhar por causa do trigger.
  -- Inserir perfil mínimo sem documento como fallback.
  INSERT INTO public.profiles (id, nome, email, role)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'nome'), ''),
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public."Role",
      'admin'::public."Role"
    )
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Migration 28: backfill profile_id for entregadores and clientes
-- Fixes records created before the profile_id link was persisted in the frontend.
-- Matches by email (the common field between auth.users → profiles and each entity).
-- Idempotent: WHERE profile_id IS NULL ensures re-runs cause no harm.

DO $$
DECLARE
  entregadores_fixed INT;
  clientes_fixed     INT;
BEGIN
  -- ── Entregadores ────────────────────────────────────────────────────────────
  UPDATE public.entregadores e
  SET    profile_id = p.id
  FROM   public.profiles p
  WHERE  e.profile_id IS NULL
    AND  lower(e.email) = lower(p.email);

  GET DIAGNOSTICS entregadores_fixed = ROW_COUNT;
  RAISE NOTICE 'Migration 28: % entregador(es) tiveram profile_id corrigido.', entregadores_fixed;

  -- ── Clientes ────────────────────────────────────────────────────────────────
  UPDATE public.clientes c
  SET    profile_id = p.id
  FROM   public.profiles p
  WHERE  c.profile_id IS NULL
    AND  lower(c.email) = lower(p.email);

  GET DIAGNOSTICS clientes_fixed = ROW_COUNT;
  RAISE NOTICE 'Migration 28: % cliente(s) tiveram profile_id corrigido.', clientes_fixed;
END $$;

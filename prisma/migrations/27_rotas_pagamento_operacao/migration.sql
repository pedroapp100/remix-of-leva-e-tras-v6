-- Migration 27: add pagamento_operacao column to rotas
-- Stores whether the delivery fee is billed later (faturar) or paid immediately
-- at the destination (pago_na_hora / descontar_saldo).
-- Default = 'faturar' so all existing rows keep current behaviour.

ALTER TABLE rotas
  ADD COLUMN IF NOT EXISTS pagamento_operacao TEXT NOT NULL DEFAULT 'faturar';

-- Enforce only valid values using a check constraint (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rotas_pagamento_operacao_check'
      AND conrelid = 'public.rotas'::regclass
  ) THEN
    ALTER TABLE rotas
      ADD CONSTRAINT rotas_pagamento_operacao_check
        CHECK (pagamento_operacao IN ('faturar', 'pago_na_hora', 'descontar_saldo'));
  END IF;
END $$;

-- Partial index: fast lookup for rotas that are NOT faturar
-- (used when computing totalTaxas for fatura RPC)
CREATE INDEX IF NOT EXISTS idx_rotas_pagamento_operacao_pago_na_hora
  ON rotas (solicitacao_id)
  WHERE pagamento_operacao <> 'faturar';

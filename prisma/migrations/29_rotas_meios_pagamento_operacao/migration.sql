-- Migration 29: add meios_pagamento_operacao column to rotas
-- Stores the array of forma_pagamento IDs that can be used to pay
-- the delivery fee when pagamento_operacao = 'pago_na_hora'.
-- Default = '{}' so all existing rows keep current behaviour.

ALTER TABLE rotas
  ADD COLUMN IF NOT EXISTS meios_pagamento_operacao TEXT[] NOT NULL DEFAULT '{}';

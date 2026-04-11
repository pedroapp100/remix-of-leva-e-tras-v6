-- Migration: Create despesas_recorrentes table

CREATE TABLE IF NOT EXISTS despesas_recorrentes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL,
  valor_mensal NUMERIC(12,2) NOT NULL DEFAULT 0,
  proximo_vencimento DATE NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT despesas_recorrentes_pkey PRIMARY KEY (id)
);

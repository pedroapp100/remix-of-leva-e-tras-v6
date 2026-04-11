-- Migration 7: Index for rotas time-window queries (EntregasPage)
-- Uses idx_rotas_sol (already exists) for solicitacao_id lookups.
-- This index enables efficient >=created_at range scans.
CREATE INDEX IF NOT EXISTS idx_rotas_created ON rotas(created_at DESC);

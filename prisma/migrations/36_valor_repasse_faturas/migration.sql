-- Migration 36: Add valor_repasse column to faturas
-- Stores the actual amount transferred to the store owner after deducting service fees.

ALTER TABLE faturas ADD COLUMN IF NOT EXISTS valor_repasse DECIMAL(10,2) NULL;

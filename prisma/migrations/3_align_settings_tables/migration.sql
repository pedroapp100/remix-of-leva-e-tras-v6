-- Migration: Align notification_templates and webhooks with frontend types + create integracoes

-- ═══ notification_templates ═══
-- Rename columns to match Portuguese frontend types
ALTER TABLE notification_templates RENAME COLUMN "name" TO evento;
ALTER TABLE notification_templates RENAME COLUMN "type" TO categoria;
ALTER TABLE notification_templates RENAME COLUMN body TO mensagem;

-- subject → titulo (allow NULL → make NOT NULL with default)
ALTER TABLE notification_templates RENAME COLUMN subject TO titulo;
ALTER TABLE notification_templates ALTER COLUMN titulo SET NOT NULL;
ALTER TABLE notification_templates ALTER COLUMN titulo SET DEFAULT '';

-- Convert variables JSONB → TEXT[] variaveis
ALTER TABLE notification_templates
  ALTER COLUMN variables TYPE TEXT[]
  USING COALESCE(ARRAY(SELECT jsonb_array_elements_text(variables)), ARRAY[]::TEXT[]);
ALTER TABLE notification_templates RENAME COLUMN variables TO variaveis;

-- Add new columns
ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS evento_label TEXT NOT NULL DEFAULT '';
ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS canal TEXT NOT NULL DEFAULT 'whatsapp';

-- ═══ webhooks ═══
-- Rename columns
ALTER TABLE webhooks RENAME COLUMN "name" TO nome;
ALTER TABLE webhooks RENAME COLUMN events TO eventos;
ALTER TABLE webhooks RENAME COLUMN secret TO secret_hash;

-- Add status TEXT column, migrate from ativo boolean, then drop ativo
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativo';
UPDATE webhooks SET status = CASE WHEN ativo THEN 'ativo' ELSE 'inativo' END;
ALTER TABLE webhooks DROP COLUMN IF EXISTS ativo;

-- Add ultimo_erro column
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS ultimo_erro TEXT;

-- ═══ integracoes (new table) ═══
CREATE TABLE IF NOT EXISTS integracoes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL DEFAULT 'outro',
  icone TEXT,
  status TEXT NOT NULL DEFAULT 'desconectado',
  ativo BOOLEAN NOT NULL DEFAULT false,
  api_key TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT integracoes_pkey PRIMARY KEY (id)
);

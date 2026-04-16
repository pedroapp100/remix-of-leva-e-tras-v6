-- Migration 13: Logo por cliente + exibição na landing page
-- Adiciona logo_url e exibir_logo_landing na tabela clientes

-- 1) Novas colunas
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS exibir_logo_landing BOOLEAN NOT NULL DEFAULT false;

-- 2) Índice para a query da landing page (filtra por exibir_logo_landing = true)
CREATE INDEX IF NOT EXISTS idx_clientes_landing_logo
  ON clientes (exibir_logo_landing)
  WHERE exibir_logo_landing = true;

-- 3) Criar bucket de storage (público para leitura anon)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-logos',
  'client-logos',
  true,
  2097152,  -- 2 MB
  ARRAY['image/jpeg','image/png','image/webp','image/svg+xml','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/svg+xml','image/gif'];

-- 4) Storage policies
DROP POLICY IF EXISTS "client_logos_anon_select"    ON storage.objects;
DROP POLICY IF EXISTS "client_logos_auth_insert"    ON storage.objects;
DROP POLICY IF EXISTS "client_logos_auth_update"    ON storage.objects;
DROP POLICY IF EXISTS "client_logos_auth_delete"    ON storage.objects;

CREATE POLICY "client_logos_anon_select"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'client-logos');

CREATE POLICY "client_logos_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'client-logos');

CREATE POLICY "client_logos_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'client-logos');

CREATE POLICY "client_logos_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'client-logos');

-- 5) RLS policy para a landing page (anon pode ler nome + logo de clientes autorizados)
DROP POLICY IF EXISTS "landing_logos_anon_select" ON clientes;

CREATE POLICY "landing_logos_anon_select"
  ON clientes FOR SELECT
  TO anon
  USING (exibir_logo_landing = true);

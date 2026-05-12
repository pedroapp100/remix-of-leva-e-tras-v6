-- Adiciona coluna valor_total_taxas na tabela solicitacoes
-- Armazena o total pre-calculado: soma de taxa_resolvida + taxas_extras de todas as rotas
ALTER TABLE solicitacoes
  ADD COLUMN IF NOT EXISTS valor_total_taxas numeric(10,2);

-- Indice parcial para acelerar queries de faturamento que filtram por valor > 0
CREATE INDEX IF NOT EXISTS idx_solicitacoes_valor_total_taxas
  ON solicitacoes (valor_total_taxas)
  WHERE valor_total_taxas IS NOT NULL;

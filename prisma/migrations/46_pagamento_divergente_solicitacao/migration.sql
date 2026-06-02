-- Adiciona flag de pagamento divergente na solicitação
-- Permite que o entregador sinalize ao admin quando o cliente pagou
-- de forma diferente do configurado na rota (ex: faturado pagou em dinheiro)

ALTER TABLE solicitacoes
  ADD COLUMN IF NOT EXISTS pagamento_divergente BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS observacao_divergencia TEXT;

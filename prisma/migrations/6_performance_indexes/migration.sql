-- Migration 6: Performance indexes for high-volume queries
-- Reduces full table scans on solicitacoes and rotas as data grows.
-- All indexes use IF NOT EXISTS — safe to re-run.

-- solicitacoes: ordered by date (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_sol_data
  ON solicitacoes (data_solicitacao DESC);

-- solicitacoes: filter by status (tabs, metrics, triggers)
CREATE INDEX IF NOT EXISTS idx_sol_status
  ON solicitacoes (status);

-- solicitacoes: filter by cliente (ClientProfileModal, MinhasSolicitacoesPage)
CREATE INDEX IF NOT EXISTS idx_sol_cliente
  ON solicitacoes (cliente_id);

-- solicitacoes: filter by entregador (EntregadorPages, useComissao)
CREATE INDEX IF NOT EXISTS idx_sol_entregador
  ON solicitacoes (entregador_id);

-- rotas: join from solicitacoes (useAllRotas, getRotasBySolicitacao)
CREATE INDEX IF NOT EXISTS idx_rotas_sol
  ON rotas (solicitacao_id);

-- rotas: filter by bairro (pricing lookups, reports)
CREATE INDEX IF NOT EXISTS idx_rotas_bairro
  ON rotas (bairro_destino_id);

-- pagamentos_solicitacao: join lookup by solicitacao
CREATE INDEX IF NOT EXISTS idx_pag_sol
  ON pagamentos_solicitacao (solicitacao_id);

-- historico_solicitacoes: always queried by solicitacao_id
CREATE INDEX IF NOT EXISTS idx_hist_sol
  ON historico_solicitacoes (solicitacao_id);

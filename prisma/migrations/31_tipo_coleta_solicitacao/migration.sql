-- Migration 31: tipo_coleta_solicitacao
-- Adiciona coluna tipo_coleta a solicitacoes para distinguir o fluxo da entrega:
--   'loja_cliente' (default) -- entregador coleta na loja e entrega ao cliente (fluxo normal)
--   'cliente_loja'           -- entregador coleta no cliente e entrega na loja (fluxo inverso)
--   'ponto_ponto'            -- coleta e entrega em pontos personalizados
--
-- Best practices aplicadas:
--   * ADD COLUMN IF NOT EXISTS + DEFAULT -- safe, retrocompativel com registros existentes
--   * CHECK constraint inline -- PostgreSQL valida no INSERT/UPDATE, nao precisa trigger
--   * text com CHECK em vez de enum -- mais facil de extender sem ALTER TYPE
--   * NOT NULL DEFAULT 'loja_cliente' -- todos registros existentes assumem fluxo padrao
--   * Index em tipo_coleta -- acelera filtros/relatorios por modalidade de entrega

-- 1) Adicionar coluna com CHECK constraint
ALTER TABLE public.solicitacoes
  ADD COLUMN IF NOT EXISTS tipo_coleta text NOT NULL DEFAULT 'loja_cliente'
    CHECK (tipo_coleta IN ('loja_cliente', 'cliente_loja', 'ponto_ponto'));

-- 2) Index para filtros por tipo de coleta (relatorios, dashboards)
CREATE INDEX IF NOT EXISTS idx_solicitacoes_tipo_coleta
  ON public.solicitacoes (tipo_coleta);
-- ================================================================
-- CLEANUP DE DADOS DE TESTE
-- Executar no Supabase SQL Editor (roda como postgres/service_role)
--
-- Paginas limpas:     Solicitacoes, Entregas, Faturas, Caixas, Financeiro,
--                     Comissoes, Recargas, Logs
-- Paginas preservadas: Entregadores, Clientes, Configuracoes
--
-- AVISO: irreversivel apos COMMIT. Faca backup antes se necessario.
-- ================================================================

BEGIN;

-- ----------------------------------------------------------------
-- Nivel 1: filhas folha (ninguem depende delas)
-- ----------------------------------------------------------------

-- Formas de pagamento vinculadas a rotas (FK RESTRICT em rotas)
DELETE FROM rota_forma_pagamento;

-- Taxas extras vinculadas a rotas (FK RESTRICT em rotas)
DELETE FROM rota_taxa_extra;

-- Pagamentos de solicitacoes (FK RESTRICT em rotas E solicitacoes)
DELETE FROM pagamentos_solicitacao;

-- Historico de status das solicitacoes (FK RESTRICT em solicitacoes)
DELETE FROM historico_solicitacoes;

-- Recebimentos dentro de cada caixa (FK RESTRICT em caixas_entregadores)
DELETE FROM recebimentos_caixa;

-- Ajustes manuais de faturas (FK RESTRICT em faturas)
DELETE FROM ajustes_financeiros;

-- Historico de alteracoes de faturas (FK RESTRICT em faturas)
DELETE FROM historico_faturas;

-- Trilha de auditoria financeira (independente de faturas/solicitacoes)
DELETE FROM auditoria_financeira;

-- ----------------------------------------------------------------
-- Nivel 2: intermedias
-- ----------------------------------------------------------------

-- Lancamentos financeiros — limpa todos os registros contabeis
DELETE FROM lancamentos_financeiros;

-- Rotas de entrega (FK RESTRICT em solicitacoes)
DELETE FROM rotas;

-- Caixas dos entregadores (livre apos recebimentos_caixa zerada)
DELETE FROM caixas_entregadores;

-- ----------------------------------------------------------------
-- Nivel 3: pais de operacao
-- ----------------------------------------------------------------

-- Faturas dos clientes (FK RESTRICT em clientes — clientes preservados)
DELETE FROM faturas;

-- Solicitacoes de entrega (FK RESTRICT em clientes — clientes preservados)
DELETE FROM solicitacoes;

-- ----------------------------------------------------------------
-- Nivel 4: financeiro e operacional independente
-- ----------------------------------------------------------------

DELETE FROM despesas;
DELETE FROM despesas_recorrentes;
DELETE FROM receitas;

-- Recargas de saldo pre-pago dos clientes
DELETE FROM recargas_pre_pago;

-- ----------------------------------------------------------------
-- Nivel 5: comissoes dos entregadores
-- ----------------------------------------------------------------

-- Ciclos mensais de comissao (operacional — entregadores preservados)
DELETE FROM ciclos_comissao_meta;

-- Faixas de comissao por entregador (configuracao — entregadores preservados)
DELETE FROM comissao_faixas;

-- ----------------------------------------------------------------
-- Nivel 6: logs e auditoria do sistema
-- ----------------------------------------------------------------

DELETE FROM logs_auditoria;

-- ----------------------------------------------------------------
-- COMMIT — so executa se todos os DELETEs acima passaram
-- ----------------------------------------------------------------
COMMIT;


-- ================================================================
-- VERIFICACAO POS-LIMPEZA
-- Cole e execute este bloco separadamente apos o COMMIT acima.
-- Todos os valores de "deve_ser_zero" devem ser 0.
-- clientes_ok e entregadores_ok devem ser > 0.
-- ================================================================

/*
SELECT
  (SELECT COUNT(*) FROM solicitacoes)            AS solicitacoes,
  (SELECT COUNT(*) FROM rotas)                   AS rotas,
  (SELECT COUNT(*) FROM rota_forma_pagamento)    AS rota_formas_pgto,
  (SELECT COUNT(*) FROM rota_taxa_extra)         AS rota_taxas,
  (SELECT COUNT(*) FROM pagamentos_solicitacao)  AS pagamentos,
  (SELECT COUNT(*) FROM historico_solicitacoes)  AS historico_sol,
  (SELECT COUNT(*) FROM faturas)                 AS faturas,
  (SELECT COUNT(*) FROM historico_faturas)       AS historico_fat,
  (SELECT COUNT(*) FROM ajustes_financeiros)     AS ajustes,
  (SELECT COUNT(*) FROM lancamentos_financeiros) AS lancamentos,
  (SELECT COUNT(*) FROM auditoria_financeira)    AS auditoria_fin,
  (SELECT COUNT(*) FROM caixas_entregadores)     AS caixas,
  (SELECT COUNT(*) FROM recebimentos_caixa)      AS recebimentos,
  (SELECT COUNT(*) FROM despesas)                AS despesas,
  (SELECT COUNT(*) FROM receitas)                AS receitas,
  (SELECT COUNT(*) FROM recargas_pre_pago)       AS recargas,
  (SELECT COUNT(*) FROM ciclos_comissao_meta)    AS ciclos_comissao,
  (SELECT COUNT(*) FROM comissao_faixas)         AS comissao_faixas,
  (SELECT COUNT(*) FROM logs_auditoria)          AS logs,
  -- Preservados — devem permanecer com dados
  (SELECT COUNT(*) FROM clientes)                AS clientes_ok,
  (SELECT COUNT(*) FROM entregadores)            AS entregadores_ok;
*/

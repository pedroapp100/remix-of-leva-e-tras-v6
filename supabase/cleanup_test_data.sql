-- ================================================================
-- CLEANUP DE DADOS DE TESTE
-- Executar no Supabase SQL Editor (roda como postgres/service_role)
--
-- Paginas limpas:     Solicitacoes, Entregas, Faturas, Caixas, Financeiro
-- Paginas preservadas: Entregadores, Clientes, Configuracoes
--
-- AVISO: irreversivel apos COMMIT. Faca backup antes se necessario.
-- ================================================================

BEGIN;

-- ----------------------------------------------------------------
-- Nivel 1: filhas folha (ninguem depende delas)
-- ----------------------------------------------------------------

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

-- ----------------------------------------------------------------
-- Nivel 2: intermédias
-- ----------------------------------------------------------------

-- Lancamentos financeiros — limpa tudo incluindo debitos pre-pago
-- Efeito: saldo pre-pago dos clientes aparecera zerado na UI
-- (recargas em recargas_pre_pago sao preservadas)
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
-- Nivel 4: financeiro independente
-- ----------------------------------------------------------------

DELETE FROM despesas;
DELETE FROM despesas_recorrentes;
DELETE FROM receitas;

-- ----------------------------------------------------------------
-- COMMIT — so executa se todos os DELETEs acima passaram
-- ----------------------------------------------------------------
COMMIT;


-- ================================================================
-- VERIFICACAO POS-LIMPEZA
-- Cole e execute este bloco separadamente apos o COMMIT acima.
-- Todos os primeiros 7 valores devem ser 0.
-- clientes_ok e entregadores_ok devem ser > 0.
-- ================================================================

/*
SELECT
  (SELECT COUNT(*) FROM solicitacoes)            AS solicitacoes,
  (SELECT COUNT(*) FROM rotas)                   AS rotas,
  (SELECT COUNT(*) FROM faturas)                 AS faturas,
  (SELECT COUNT(*) FROM caixas_entregadores)     AS caixas,
  (SELECT COUNT(*) FROM despesas)                AS despesas,
  (SELECT COUNT(*) FROM receitas)                AS receitas,
  (SELECT COUNT(*) FROM lancamentos_financeiros) AS lancamentos,
  -- Preservados — devem permanecer com dados
  (SELECT COUNT(*) FROM clientes)                AS clientes_ok,
  (SELECT COUNT(*) FROM entregadores)            AS entregadores_ok;
*/

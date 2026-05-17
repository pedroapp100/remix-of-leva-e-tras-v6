-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 41_corrigir_fatura_bellissima_credito
--
-- PROBLEMA:
--   A fatura FAT-202605-00014 (Bellissima / LT-20260516-00001) foi criada
--   durante um teste manual com p_total_recebido=0. As rotas 1 e 3 têm
--   meio_cobranca_destino='dinheiro' e destino_dinheiro='repassar_empresa',
--   gerando R$119,00 de crédito loja que nunca foi registrado.
--
-- CORREÇÃO (atômica):
--   1. Inserir lancamento credito_loja R$119,00 para LT-20260516-00001
--   2. Atualizar fatura: total_creditos_loja=119, saldo_liquido=80
--   3. Registrar correção no histórico
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1) Lançamento crédito loja faltante
INSERT INTO lancamentos_financeiros (
  solicitacao_id,
  cliente_id,
  fatura_id,
  tipo,
  valor,
  sinal,
  status_liquidacao,
  descricao,
  referencia_origem
) VALUES (
  'ea61fc78-4929-40a4-8f91-2b24b4927206',  -- LT-20260516-00001
  '7071a28a-b9f3-41ed-b73b-556381070631',  -- Bellissima
  '4f666ce2-a1e0-4331-aca0-0fb9818a9f88',  -- FAT-202605-00014
  'credito_loja'::tipo_lancamento,
  119.00,
  'credito'::sinal_lancamento,
  'pendente'::status_liquidacao,
  'Valores recebidos do cliente — LT-20260516-00001 (Rota 1: R$70,00 + Rota 3: R$49,00)',
  'LT-20260516-00001'
);

-- 2) Corrigir totais da fatura
UPDATE faturas SET
  total_creditos_loja = 119.00,
  saldo_liquido       = 119.00 - 39.00,  -- = 80.00 (creditos - debitos)
  updated_at          = now()
WHERE id = '4f666ce2-a1e0-4331-aca0-0fb9818a9f88';

-- 3) Registrar correção no histórico
INSERT INTO historico_faturas (fatura_id, tipo, descricao)
VALUES (
  '4f666ce2-a1e0-4331-aca0-0fb9818a9f88',
  'correcao',
  'Correção: crédito loja R$ 119,00 inserido (Rotas 1+3 dinheiro→empresa). Dado original criado via teste manual com p_total_recebido=0.'
);

COMMIT;

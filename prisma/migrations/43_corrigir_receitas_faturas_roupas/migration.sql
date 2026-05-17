-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 43_corrigir_receitas_faturas_roupas
--
-- PROBLEMA:
--   FAT-202605-00001 (Roupas): receita lançada com R$78,00 em vez de R$39,00.
--   O auto-repasse gravou total_debitos_loja = R$78 naquele momento (fatura
--   tinha valores diferentes antes de uma correção manual posterior).
--   Após a correção da fatura, o total_debitos_loja voltou para R$39,00 mas a
--   receita já estava persistida com R$78,00, gerando divergência no dashboard.
--
--   FAT-202605-00002 (Roupas): fatura Finalizada sem receita correspondente.
--   Foi quitada via pagamento PIX de R$61,00 (saldo zerado) mas o lançamento
--   automático de receita não ocorreu (finalizada antes da lógica ser adicionada).
--
-- CORREÇÃO (atômica):
--   1. Corrigir receita FAT-202605-00001: R$78 → R$39
--   2. Inserir receita faltante FAT-202605-00002: R$39
--   3. Registrar ambas as correções no historico_faturas
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. Corrigir valor da receita de FAT-202605-00001 (R$78 → R$39) ─────────
UPDATE receitas SET
  valor     = 39.00,
  descricao = 'Taxas de Serviço — Fatura FAT-202605-00001'
WHERE id = '85018295-b312-4c5b-acd7-694efaa33772';

INSERT INTO historico_faturas (fatura_id, tipo, descricao)
VALUES (
  '5e254d10-ffa0-4df2-b68f-a11a4ceecc07',
  'correcao',
  'Correção: receita de taxas ajustada de R$ 78,00 → R$ 39,00 '
    '(valor foi gravado com total_debitos_loja antes de correção manual da fatura)'
);

-- ── 2. Inserir receita faltante de FAT-202605-00002 (R$39) ──────────────────
INSERT INTO receitas (
  descricao,
  valor,
  data_recebimento,
  cliente_id,
  observacao
) VALUES (
  'Taxas de Serviço — Fatura FAT-202605-00002',
  39.00,
  CURRENT_DATE,
  '1f7d0d05-a323-473f-8512-b33fb40e4162',  -- Roupas
  'Fatura FAT-202605-00002'
);

INSERT INTO historico_faturas (fatura_id, tipo, descricao)
VALUES (
  'a6333b60-3b5d-4a85-b1a4-e5f6c918877e',
  'receita_lancada',
  'Receita de taxas R$ 39,00 lançada retroativamente '
    '(fatura finalizada antes da lógica de auto-receita ser adicionada)'
);

COMMIT;

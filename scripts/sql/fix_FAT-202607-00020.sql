-- ─────────────────────────────────────────────────────────────────────────────
-- Correção pontual de dados — FAT-202607-00020
--
-- PROBLEMA:
--   A fatura mostra total_debitos_loja = 45,00, mas o valor real é 15,00.
--   As 2 rotas de LT-20260703-00020 (R$30,00) foram remarcadas como
--   "pago no ato" DEPOIS do faturamento, por um caminho de reabertura que não
--   reverteu o financeiro (useReabrirSolicitacao não grava reaberta_em, e a
--   reconciliação seguinte caiu no guard de idempotência de
--   concluir_fatura_entrega — retornou already_processed sem fazer nada).
--   O lançamento original de R$30 ficou órfão na fatura.
--
-- CORREÇÃO:
--   1) Ajuste compensatório em ajustes_financeiros no formato que
--      fn_valor_atual_entrega_fatura / recalcular_totais_fatura entendem
--      (tipo='credito' + tipo_lancamento='debito_loja' + solicitacao_id).
--   2) recalcular_totais_fatura() re-agrega o razão: 45 − 30 = 15.
--
-- COMO RODAR: Supabase SQL Editor, bloco inteiro. Confira o resultado do
-- passo 4 ANTES do COMMIT — se divergir do esperado, rode ROLLBACK.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1) Estado atual (esperado: debitos 45,00 / creditos 0,00 / saldo -45,00)
SELECT numero, total_debitos_loja, total_creditos_loja, saldo_liquido, status_geral
FROM faturas WHERE numero = 'FAT-202607-00020';

-- 2) Ajuste que reverte o débito órfão das 2 rotas de LT-20260703-00020
INSERT INTO ajustes_financeiros (fatura_id, solicitacao_id, tipo, tipo_lancamento, valor, motivo, usuario_id)
SELECT
  f.id,
  s.id,
  'credito'::tipo_ajuste,
  'debito_loja'::tipo_lancamento,
  30.00,
  'Correção manual — rotas de LT-20260703-00020 pagas no ato, mas o lançamento original de R$30 nunca foi revertido (reabertura fora do fluxo da fatura; reconciliação seguinte tratada como já processada).',
  (SELECT id FROM profiles WHERE email = 'pedroaps100@gmail.com')
FROM faturas f, solicitacoes s
WHERE f.numero = 'FAT-202607-00020'
  AND s.codigo = 'LT-20260703-00020';

-- 3) Recalcula os totais da fatura a partir do razão (agora com o ajuste)
SELECT recalcular_totais_fatura(
  (SELECT id FROM faturas WHERE numero = 'FAT-202607-00020'),
  (SELECT id FROM profiles WHERE email = 'pedroaps100@gmail.com')
);

-- 4) Conferência (esperado: debitos 15,00 / creditos 0,00 / saldo -15,00)
SELECT numero, total_debitos_loja, total_creditos_loja, saldo_liquido
FROM faturas WHERE numero = 'FAT-202607-00020';

-- Se o passo 4 bater com o esperado:
COMMIT;
-- Caso contrário, rode no lugar do COMMIT:
-- ROLLBACK;

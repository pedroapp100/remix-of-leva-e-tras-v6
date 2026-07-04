-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 69_formas_pagamento_retido_pela_loja
--
-- PROBLEMA:
--   O valor que uma entrega gera de "crédito para a loja" na fatura era
--   calculado a partir de rotas.meio_cobranca_destino/destino_dinheiro — um
--   campo preenchido no momento do CADASTRO da rota (antes da entrega
--   acontecer) e que nunca é sincronizado com o que foi de fato conciliado
--   depois em pagamentos_solicitacao. Quando o plano e a realidade divergem
--   (ex: planejado "Dinheiro", mas na prática o cliente pagou na "Máquina da
--   Loja"), a fatura fecha com o valor errado — caso real: LT-20260702-00027.
--
-- SOLUÇÃO:
--   formas_pagamento passa a ter uma coluna explícita, retido_pela_loja, que
--   diz se aquela forma de pagamento significa "a loja já recebeu o dinheiro
--   direto, sem passar pela empresa" (ex: Máquina da Loja). O cálculo de
--   crédito passa a usar pagamentos_solicitacao (o que foi realmente
--   conciliado) cruzado com essa coluna, e só cai no campo antigo da rota
--   como estimativa quando ainda não existe nenhuma conciliação registrada.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.formas_pagamento
  ADD COLUMN IF NOT EXISTS retido_pela_loja boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.formas_pagamento.retido_pela_loja IS
  'true = a loja recebe direto nesta forma (ex: Máquina da Loja) e o valor NÃO deve virar crédito na fatura da empresa.';

-- "Máquina da Loja" é, hoje, a única forma cadastrada em que o dinheiro nunca
-- passa pela empresa — a loja recebe direto na própria maquininha.
UPDATE public.formas_pagamento
SET retido_pela_loja = true
WHERE name = 'Máquina da Loja';

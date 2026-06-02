-- ============================================================
-- Migration 47: Índice UNIQUE Parcial em recebimentos_caixa
--
-- Previne duplicação quando addRecebimentoAutomatico (frontend)
-- insere o mesmo (caixa_id, solicitacao_id) mais de uma vez
-- com rota_id IS NULL (race condition ou duplo clique).
--
-- Entradas criadas pelo trigger fn_sync_pagamento_to_caixa
-- (rota_id IS NOT NULL) não são afetadas por este índice.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_recebimentos_caixa_sol_no_rota
  ON recebimentos_caixa (caixa_id, solicitacao_id)
  WHERE rota_id IS NULL;

-- ============================================================
-- Migration 49: Limpeza de Recebimentos Duplicados
--
-- Remove entradas duplicadas em recebimentos_caixa causadas
-- pelo bug de dois caminhos paralelos (frontend + trigger).
-- Mantém apenas o registro mais antigo de cada par
-- (caixa_id, solicitacao_id) com rota_id IS NULL.
--
-- EXECUTAR UMA ÚNICA VEZ após aplicar migração 47.
-- ============================================================

-- Passo 1: Remove duplicatas, mantendo a entrada mais antiga
DELETE FROM recebimentos_caixa
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY caixa_id, solicitacao_id
        ORDER BY created_at ASC
      ) AS rn
    FROM recebimentos_caixa
    WHERE rota_id IS NULL
  ) ranked
  WHERE rn > 1
);

-- Passo 2: Verificação — deve retornar 0 linhas após limpeza
-- SELECT caixa_id, solicitacao_id, COUNT(*)
-- FROM recebimentos_caixa
-- WHERE rota_id IS NULL
-- GROUP BY caixa_id, solicitacao_id
-- HAVING COUNT(*) > 1;

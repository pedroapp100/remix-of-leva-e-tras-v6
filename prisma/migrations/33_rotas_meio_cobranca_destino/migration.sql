-- ── Migration 33: Adiciona meio_cobranca_destino e destino_dinheiro à tabela rotas ──
--
-- Esses campos registram COMO o entregador recebe o valor cobrado no destino.
-- São essenciais para calcular corretamente se a empresa deve ou não gerar um
-- crédito (credito_loja) para o lojista na fatura.
--
-- Regra de negócio:
--   - pix_empresa              → empresa recebeu → gera credito_loja ✅
--   - dinheiro + repassar_empresa → empresa recebeu → gera credito_loja ✅
--   - maquina_loja             → lojista recebeu direto → NÃO gera credito_loja ❌
--   - pix_loja                 → lojista recebeu direto → NÃO gera credito_loja ❌
--   - dinheiro + devolver_loja → lojista recebeu direto → NÃO gera credito_loja ❌

ALTER TABLE rotas
  ADD COLUMN IF NOT EXISTS meio_cobranca_destino TEXT,
  ADD COLUMN IF NOT EXISTS destino_dinheiro TEXT;

COMMENT ON COLUMN rotas.meio_cobranca_destino IS
  'Como o entregador cobra no destino: dinheiro | maquina_loja | pix_loja | pix_empresa';

COMMENT ON COLUMN rotas.destino_dinheiro IS
  'Destino do dinheiro quando meio_cobranca_destino = dinheiro: devolver_loja | repassar_empresa';

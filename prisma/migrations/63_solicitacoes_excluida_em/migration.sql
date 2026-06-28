-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 63_solicitacoes_excluida_em
--
-- PROBLEMA:
--   Uma solicitação que já gerou lançamento financeiro nunca pode ser apagada
--   de verdade: o lançamento é imutável (trigger), a FK
--   lancamentos_financeiros_solicitacao_id_fkey não tem ON DELETE CASCADE, e
--   deleteSolicitacao() já bloqueia no app por essa razão. Mesmo assim, o
--   usuário precisa de uma "exclusão definitiva" pela lixeira da fatura —
--   algo que faça a entrega desaparecer de vez de toda tela do sistema
--   (Entregas Incluídas E Solicitações, em todas as abas), sem violar a
--   imutabilidade do lançamento.
--
-- SOLUÇÃO:
--   Exclusão lógica: nova coluna solicitacoes.excluida_em. Quando preenchida,
--   toda função de leitura em services/solicitacoes.ts passa a filtrar essas
--   linhas (próxima migration/commit no front) — a solicitação some de 100%
--   das telas (admin, entregador, cliente, relatórios), mas o registro e o
--   lançamento financeiro continuam no banco para auditoria.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.solicitacoes ADD COLUMN excluida_em timestamptz NULL;

CREATE INDEX idx_solicitacoes_excluida_em ON public.solicitacoes (excluida_em)
  WHERE excluida_em IS NOT NULL;

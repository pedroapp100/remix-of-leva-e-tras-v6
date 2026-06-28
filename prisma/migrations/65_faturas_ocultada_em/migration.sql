-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 65_faturas_ocultada_em
--
-- PROBLEMA:
--   Usuário pediu um ícone de excluir para faturas Canceladas (aba "Canceladas"
--   em FaturasPage.tsx). Apagar a linha de verdade é impossível: toda fatura
--   que chega a "Cancelada" (via excluir_entrega_faturada, migrations 61/64) já
--   teve pelo menos um lançamento financeiro — e lancamentos_financeiros é
--   imutável por trigger, com FK sem ON DELETE CASCADE para faturas. Ou seja,
--   toda fatura Cancelada SEMPRE vai ter pelo menos um lançamento vinculado,
--   tornando a exclusão física impossível em qualquer caso, não só neste.
--
-- SOLUÇÃO:
--   Mesmo padrão já usado em solicitacoes.excluida_em (migration 63): nova
--   coluna faturas.ocultada_em. Quando preenchida, a fatura desaparece de toda
--   listagem (todas as abas), mas o registro continua no banco para auditoria.
--   Diferente da exclusão de entrega, aqui não precisa de RPC nem reversão
--   financeira — a fatura já chega zerada (saldo 0, sem entregas) antes de
--   poder ser ocultada; um UPDATE simples via updateFatura() já existente basta.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.faturas ADD COLUMN ocultada_em timestamptz NULL;

CREATE INDEX idx_faturas_ocultada_em ON public.faturas (ocultada_em)
  WHERE ocultada_em IS NOT NULL;

-- A migration 54 usou CREATE OR REPLACE FUNCTION adicionando um parâmetro novo
-- (p_usuario_id) ao final de concluir_fatura_entrega. Isso NÃO substitui a função
-- existente — Postgres trata uma lista de tipos de parâmetro diferente (9 → 10
-- argumentos) como uma função sobrecarregada (overload) nova, e mantém a antiga
-- viva. Resultado: ficaram 2 versões de concluir_fatura_entrega no banco —
-- chamadas sem p_usuario_id (ex.: useConcluirComCaixa.ts) resolveriam para a
-- versão ANTIGA, sem a correção pós-reabertura da migration 54.
--
-- Remove explicitamente a versão antiga (9 parâmetros), deixando só a nova
-- (10 parâmetros, com p_usuario_id DEFAULT NULL) — chamadas que não passam
-- esse parâmetro continuam funcionando normalmente, usando o default.
DROP FUNCTION IF EXISTS public.concluir_fatura_entrega(
  uuid, uuid, uuid, text, text, numeric, numeric, text, integer
);

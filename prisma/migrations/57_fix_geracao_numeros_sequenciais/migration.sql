-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 57_fix_geracao_numeros_sequenciais
--
-- PROBLEMA:
--   gerar_numero_fatura() e gerar_codigo_solicitacao() calculavam o próximo
--   número/código com `SELECT COUNT(*) + 1` — conta quantas linhas existem,
--   não qual é o maior número já usado. Excluir qualquer fatura/solicitação
--   (ex.: limpeza de dados de teste) deixa um buraco na sequência, e a próxima
--   chamada recalcula um número que já existe, colidindo com a unique
--   constraint (faturas_numero_key / solicitacoes_codigo_key) e revertendo
--   silenciosamente toda a transação — inclusive o lançamento financeiro.
--   Caso real: exclusão de 2 faturas de teste (FAT-202606-00161/-00164) deixou
--   a contagem em 162 enquanto a maior fatura já era FAT-202606-00163;
--   COUNT(*)+1 = 163 colidiu, e a solicitação LT-20260625-00022 (cliente
--   "Teste Anapolis") perdeu R$28 em taxas (taxa nunca lançada).
--
--   Mesmo corrigindo a fórmula, duas chamadas concorrentes ainda podem ler a
--   mesma contagem antes de qualquer uma comitar — por isso também é preciso
--   serializar com um advisory lock.
--
-- SOLUÇÃO:
--   Troca COUNT(*)+1 por COALESCE(MAX(sufixo), 0)+1 (imune a buracos) e
--   adiciona pg_advisory_xact_lock no início de cada função (serializa por
--   mês/dia, liberado automaticamente no commit/rollback da transação que já
--   envolve concluir_fatura_entrega / criação de solicitação).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.gerar_numero_fatura()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_mes text := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYYMM');
  v_seq int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('gerar_numero_fatura_' || v_mes)::bigint);

  SELECT COALESCE(MAX(replace(numero, 'FAT-' || v_mes || '-', '')::int), 0) + 1
    INTO v_seq
    FROM faturas
    WHERE numero LIKE 'FAT-' || v_mes || '-%';

  RETURN 'FAT-' || v_mes || '-' || lpad(v_seq::text, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.gerar_codigo_solicitacao()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_data text := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYYMMDD');
  v_seq  int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('gerar_codigo_solicitacao_' || v_data)::bigint);

  SELECT COALESCE(MAX(replace(codigo, 'LT-' || v_data || '-', '')::int), 0) + 1
    INTO v_seq
    FROM solicitacoes
    WHERE codigo LIKE 'LT-' || v_data || '-%';

  RETURN 'LT-' || v_data || '-' || lpad(v_seq::text, 5, '0');
END;
$$;

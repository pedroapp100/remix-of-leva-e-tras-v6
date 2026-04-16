-- ============================================================
-- Migration 24: logs_auditoria — Retenção automática
-- Estratégia: particionamento mensal + pg_cron para expirar
-- partições com mais de 24 meses.
--
-- NOTA: Esta migration prepara a infraestrutura de retenção.
-- A conversão da tabela existente para particionada requer
-- janela de manutenção e está documentada abaixo como
-- procedimento manual para ser executado em produção.
-- ============================================================

-- ── 1. Função de retenção — expira logs com mais de 24 meses ─────────────────
-- Deleta registros antigos de forma segura sem precisar de partições.
-- Quando o volume justificar particionamento, a conversão da tabela
-- pode ser feita com a estratégia documentada no bloco comentado abaixo.
CREATE OR REPLACE FUNCTION public.fn_expire_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff timestamptz;
  v_deleted bigint;
BEGIN
  v_cutoff := NOW() - INTERVAL '24 months';

  -- Deleta em lotes de 10k para não travar a tabela
  LOOP
    DELETE FROM public.logs_auditoria
    WHERE id IN (
      SELECT id FROM public.logs_auditoria
      WHERE created_at < v_cutoff
      LIMIT 10000
    );

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    EXIT WHEN v_deleted = 0;

    -- Pequena pausa entre lotes para reduzir pressão no WAL
    PERFORM pg_sleep(0.1);
  END LOOP;
END;
$$;

-- ── 2. Agendamento via pg_cron — todo dia 1º do mês às 03:00 ─────────────────
-- pg_cron deve estar habilitado no projeto Supabase (Extensions → pg_cron).
-- Se não estiver habilitado, execute manualmente ou via Edge Function.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Remove agendamento anterior se existir
    PERFORM cron.unschedule('expire-old-logs');

    -- Agenda: minuto=0, hora=3, dia=1, mês=*, dia-semana=*
    PERFORM cron.schedule(
      'expire-old-logs',
      '0 3 1 * *',
      'SELECT public.fn_expire_old_logs()'
    );

    RAISE NOTICE 'pg_cron: job "expire-old-logs" agendado com sucesso.';
  ELSE
    RAISE NOTICE 'pg_cron não disponível — execute fn_expire_old_logs() manualmente ou via Edge Function.';
  END IF;
END;
$$;

-- ── 3. Índice para acelerar a query de expiração ──────────────────────────────
-- Sem índice, o DELETE de logs antigos faria seq scan. Este índice
-- usa WHERE created_at < NOW() - INTERVAL '23 months' como partial index
-- para cobrir apenas registros "próximos de expirar".
CREATE INDEX IF NOT EXISTS logs_auditoria_expiry_idx
  ON public.logs_auditoria (created_at ASC)
  WHERE created_at < NOW() - INTERVAL '23 months';

-- ══════════════════════════════════════════════════════════════
-- PROCEDIMENTO MANUAL: Conversão para tabela particionada
-- Execute em janela de manutenção quando o volume justificar.
--
-- ALTER TABLE public.logs_auditoria RENAME TO logs_auditoria_legacy;
--
-- CREATE TABLE public.logs_auditoria (
--   LIKE public.logs_auditoria_legacy INCLUDING ALL
-- ) PARTITION BY RANGE (created_at);
--
-- -- Partição inicial cobrindo todos os dados históricos
-- CREATE TABLE public.logs_auditoria_historico
--   PARTITION OF public.logs_auditoria
--   FOR VALUES FROM (MINVALUE) TO ('2026-05-01');
--
-- -- Partição corrente
-- CREATE TABLE public.logs_auditoria_2026_05
--   PARTITION OF public.logs_auditoria
--   FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
--
-- INSERT INTO public.logs_auditoria SELECT * FROM public.logs_auditoria_legacy;
-- DROP TABLE public.logs_auditoria_legacy;
-- ══════════════════════════════════════════════════════════════

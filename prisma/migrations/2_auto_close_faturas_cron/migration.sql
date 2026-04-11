-- ═══════════════════════════════════════════════════════════════════════
-- Migration: Auto-close faturas by calendar frequency (diario/semanal/mensal)
-- Uses pg_cron to run daily at 3 AM BRT (6 AM UTC).
-- ═══════════════════════════════════════════════════════════════════════

-- 1) Install pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;

-- 2) Function: fechar_faturas_por_calendario
-- Closes open faturas based on each client's configured billing frequency.
-- Called daily by pg_cron. Safe no-op if nothing to close.
CREATE OR REPLACE FUNCTION fechar_faturas_por_calendario()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today         DATE := CURRENT_DATE;
  v_dow_today     TEXT;       -- day of week in Portuguese (lowercase)
  v_dom_today     INT;        -- day of month (1-31)
  v_days_in_month INT;        -- total days in current month
  v_count         INT := 0;
  v_rec           RECORD;
  v_now           TIMESTAMPTZ := now();
BEGIN
  -- Pre-calculate calendar values once
  -- Map English day names to Portuguese to match dia_semana enum
  v_dow_today := CASE EXTRACT(DOW FROM v_today)
    WHEN 0 THEN 'domingo'
    WHEN 1 THEN 'segunda'
    WHEN 2 THEN 'terca'
    WHEN 3 THEN 'quarta'
    WHEN 4 THEN 'quinta'
    WHEN 5 THEN 'sexta'
    WHEN 6 THEN 'sabado'
  END;
  v_dom_today := EXTRACT(DAY FROM v_today);
  v_days_in_month := EXTRACT(DAY FROM
    (date_trunc('month', v_today) + INTERVAL '1 month - 1 day')
  );

  -- Find all open faturas for clients with automatic billing enabled
  -- and whose closing condition is met today
  FOR v_rec IN
    SELECT
      f.id          AS fatura_id,
      f.numero      AS fatura_numero,
      c.nome        AS cliente_nome,
      c.frequencia_faturamento::TEXT AS freq,
      c.dia_da_semana_faturamento::TEXT AS dia_semana,
      c.dia_do_mes_faturamento AS dia_mes
    FROM faturas f
    JOIN clientes c ON c.id = f.cliente_id
    WHERE f.status_geral = 'Aberta'::status_geral
      AND c.ativar_faturamento_automatico = true
      AND c.frequencia_faturamento IS NOT NULL
      AND c.frequencia_faturamento::TEXT IN ('diario', 'semanal', 'mensal')
      -- Frequency-specific conditions:
      AND (
        -- DIÁRIO: close any fatura opened before today
        (c.frequencia_faturamento::TEXT = 'diario' AND f.data_emissao < v_today)
        OR
        -- SEMANAL: close if today matches the client's configured day of week
        (c.frequencia_faturamento::TEXT = 'semanal'
         AND c.dia_da_semana_faturamento IS NOT NULL
         AND c.dia_da_semana_faturamento::TEXT = v_dow_today)
        OR
        -- MENSAL: close if today matches the client's configured day of month
        -- (handles months with fewer days: if client is set to day 31 and month
        -- has 28 days, closes on day 28 — the last day of the month)
        (c.frequencia_faturamento::TEXT = 'mensal'
         AND c.dia_do_mes_faturamento IS NOT NULL
         AND v_dom_today = LEAST(c.dia_do_mes_faturamento, v_days_in_month))
      )
  LOOP
    -- Close the fatura
    UPDATE faturas
    SET status_geral = 'Fechada'::status_geral,
        updated_at   = v_now
    WHERE id = v_rec.fatura_id;

    -- Record in history
    INSERT INTO historico_faturas (fatura_id, tipo, descricao)
    VALUES (
      v_rec.fatura_id,
      'fechamento_automatico',
      'Fatura fechada automaticamente (frequência: '
        || v_rec.freq || ') — '
        || v_rec.cliente_nome
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 3) Schedule: run daily at 6:00 UTC (= 3:00 AM BRT, UTC-3)
SELECT cron.schedule(
  'fechar-faturas-auto',
  '0 6 * * *',
  'SELECT fechar_faturas_por_calendario()'
);

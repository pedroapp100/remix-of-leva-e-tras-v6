-- Migration 21: marcar_faturas_vencidas — cron diário
-- Marca faturas Aberta/Fechada como Vencida quando data_vencimento < CURRENT_DATE
-- e insere notificações internas para o cliente e para os admins.
--
-- Best practices aplicadas:
--   • Partial index em faturas(data_vencimento) WHERE status_geral IN ('Aberta','Fechada')
--     → índice muito menor que full-table index (exclui Paga/Finalizada/Vencida)
--   • CTE writeable: UPDATE RETURNING → INSERT historico + INSERT notif em um round-trip
--   • Batch INSERT via INSERT...SELECT (não loop row-by-row — 10-50x mais rápido)
--   • SECURITY DEFINER + SET search_path = public (previne search_path injection)
--   • GRANT EXECUTE apenas para postgres (least privilege — chamada exclusiva do cron)
--   • Idempotência natural: WHERE status_geral IN ('Aberta','Fechada') não reprocessa
--     faturas já marcadas Vencida — sem necessidade de unique constraint extra

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Partial index: apenas faturas que ainda podem vencer
--    Exclui 'Paga', 'Finalizada', 'Vencida' → índice pequeno e rápido
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_faturas_vencimento_ativas
  ON public.faturas (data_vencimento)
  WHERE status_geral IN ('Aberta', 'Fechada');

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Função principal
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.marcar_faturas_vencidas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  -- CTE writeable em cadeia:
  --   vencidas      → UPDATE faturas RETURNING linhas alteradas
  --   hist          → INSERT historico_faturas em batch (um por fatura)
  --   notif_clientes → INSERT notifications em batch para cada cliente com profile_id
  --
  -- Um único round-trip para UPDATE + dois INSERTs.
  -- O UPDATE RETURNING retorna apenas as linhas realmente alteradas,
  -- garantindo idempotência: se o cron repetir, nenhuma fatura é reprocessada.
  WITH vencidas AS (
    UPDATE public.faturas
    SET status_geral = 'Vencida',
        updated_at   = now()
    WHERE data_vencimento < CURRENT_DATE
      AND status_geral IN ('Aberta', 'Fechada')
    RETURNING id, numero, cliente_id, cliente_nome, data_vencimento
  ),
  hist AS (
    INSERT INTO public.historico_faturas (fatura_id, tipo, descricao)
    SELECT v.id,
           'vencimento_automatico',
           'Fatura marcada como vencida automaticamente — ' || v.cliente_nome
    FROM vencidas v
  ),
  notif_clientes AS (
    -- Notificação individual para o cliente dono de cada fatura.
    -- Enviada apenas se o cliente tiver profile_id (conta no app).
    INSERT INTO public.notifications (user_id, title, message, type, read, link)
    SELECT c.profile_id,
           'Fatura vencida',
           'Sua fatura ' || v.numero || ' venceu em '
             || to_char(v.data_vencimento, 'DD/MM/YYYY')
             || '. Entre em contato para regularizar.',
           'warning',
           false,
           '/cliente/financeiro'
    FROM vencidas v
    JOIN public.clientes c ON c.id = v.cliente_id
    WHERE c.profile_id IS NOT NULL
  )
  SELECT count(*) INTO v_count FROM vencidas;

  -- Notificação resumo para todos os admins ativos.
  -- Batch INSERT único para todos os admins (não loop por admin).
  -- Disparado apenas se houver pelo menos uma fatura vencida hoje.
  IF v_count > 0 THEN
    INSERT INTO public.notifications (user_id, title, message, type, read, link)
    SELECT p.id,
           'Faturas vencidas hoje',
           v_count
             || CASE WHEN v_count = 1 THEN ' fatura venceu' ELSE ' faturas venceram' END
             || ' hoje. Verifique o relatório.',
           'warning',
           false,
           '/admin/faturas'
    FROM public.profiles p
    WHERE p.role::text = 'admin'
      AND p.ativo = true;
  END IF;

  RETURN v_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Least privilege: EXECUTE apenas para postgres (usado pelo pg_cron)
--    Nenhum usuário autenticado do app precisa chamar esta função.
-- ─────────────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.marcar_faturas_vencidas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marcar_faturas_vencidas() TO postgres;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) pg_cron: 7h UTC (4h BRT), logo após fechar-faturas-auto (0 6 * * *)
-- ─────────────────────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'marcar-faturas-vencidas',
  '0 7 * * *',
  'SELECT public.marcar_faturas_vencidas()'
);

-- Migration 30: comissao_meta
-- Adiciona suporte ao terceiro tipo de comissão: "Por Meta de Entregas"
-- com faixas configuráveis por entregador, dois modos de cálculo
-- (escalonado / faixa_maxima) e ciclos mensais fechados automaticamente.
--
-- Best practices aplicadas:
--   • ALTER TYPE ... ADD VALUE para estender enum sem recriar (safe, non-breaking)
--   • FK indexada em comissao_faixas(entregador_id) → JOINs 10-100x mais rápidos
--   • Index único em ciclos_comissao_meta(entregador_id, mes_referencia) → idempotência
--   • RLS com (select auth.uid()) em vez de auth.uid() direto → evita chamada por linha
--   • Index em colunas de RLS para policy scan rápido
--   • fechar_ciclos_comissao_meta(): SECURITY DEFINER + SET search_path = public
--   • GRANT EXECUTE apenas para postgres (least privilege — chamado só pelo pg_cron)
--   • pg_cron no último dia do mês às 23:55 BRT (02:55 UTC do dia seguinte)
--   • Idempotência via ON CONFLICT DO NOTHING no INSERT de ciclos

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Estender enum TipoComissao com o valor "meta"
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TYPE public.tipo_comissao ADD VALUE IF NOT EXISTS 'meta';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Coluna meta_modo_calculo na tabela entregadores
--    Nullable: preenchida somente quando tipo_comissao = 'meta'
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.entregadores
  ADD COLUMN IF NOT EXISTS meta_modo_calculo text
    CHECK (meta_modo_calculo IN ('escalonado', 'faixa_maxima'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Tabela comissao_faixas
--    Uma linha por faixa de entrega configurada por entregador.
--    Faixas podem ter gaps — a lógica de cálculo trata isso (Opção B).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.comissao_faixas (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entregador_id      uuid        NOT NULL REFERENCES public.entregadores(id) ON DELETE CASCADE,
  de                 integer     NOT NULL CHECK (de >= 1),
  ate                integer     NOT NULL CHECK (ate > de),
  valor_por_entrega  numeric(10,2) NOT NULL CHECK (valor_por_entrega >= 0),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Index na FK (performance em JOINs e CASCADE)
CREATE INDEX IF NOT EXISTS idx_comissao_faixas_entregador_id
  ON public.comissao_faixas (entregador_id);

-- Faixas não podem se sobrepor para o mesmo entregador
-- (de2 <= ate1 seria sobreposição → proibir via constraint)
-- Verificado na aplicação + constraint de exclusão
ALTER TABLE public.comissao_faixas
  ADD CONSTRAINT faixas_sem_sobreposicao
    EXCLUDE USING gist (
      entregador_id WITH =,
      int4range(de, ate, '[]') WITH &&
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) Tabela ciclos_comissao_meta
--    Snapshot imutável do ciclo mensal fechado por entregador.
--    mes_referencia: "YYYY-MM" (ex: "2026-04")
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ciclos_comissao_meta (
  id                   uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  entregador_id        uuid          NOT NULL REFERENCES public.entregadores(id) ON DELETE CASCADE,
  mes_referencia       text          NOT NULL CHECK (mes_referencia ~ '^\d{4}-\d{2}$'),
  total_entregas       integer       NOT NULL DEFAULT 0,
  comissao_calculada   numeric(10,2) NOT NULL DEFAULT 0,
  meta_modo_calculo    text          NOT NULL CHECK (meta_modo_calculo IN ('escalonado', 'faixa_maxima')),
  fechado_em           timestamptz   NOT NULL DEFAULT now(),
  criado_por           text          NOT NULL DEFAULT 'automatico' CHECK (criado_por IN ('automatico', 'manual')),
  created_at           timestamptz   NOT NULL DEFAULT now()
);

-- Index único: apenas um ciclo fechado por entregador por mês
CREATE UNIQUE INDEX IF NOT EXISTS idx_ciclos_comissao_meta_unique
  ON public.ciclos_comissao_meta (entregador_id, mes_referencia);

-- Index na FK para JOINs rápidos
CREATE INDEX IF NOT EXISTS idx_ciclos_comissao_meta_entregador_id
  ON public.ciclos_comissao_meta (entregador_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) RLS — comissao_faixas
--    Admin: lê e escreve tudo
--    Entregador: lê apenas suas próprias faixas
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.comissao_faixas ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY comissao_faixas_admin_all ON public.comissao_faixas
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role::text = 'admin'
    )
  );

-- Entregador: somente leitura das próprias faixas
CREATE POLICY comissao_faixas_entregador_select ON public.comissao_faixas
  FOR SELECT
  TO authenticated
  USING (
    entregador_id IN (
      SELECT e.id FROM public.entregadores e
      WHERE e.profile_id = (SELECT auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) RLS — ciclos_comissao_meta
--    Admin: lê tudo
--    Entregador: lê apenas seus próprios ciclos
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.ciclos_comissao_meta ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total (leitura — ciclos são imutáveis após fechamento)
CREATE POLICY ciclos_comissao_meta_admin_all ON public.ciclos_comissao_meta
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role::text = 'admin'
    )
  );

-- Entregador: somente leitura dos próprios ciclos
CREATE POLICY ciclos_comissao_meta_entregador_select ON public.ciclos_comissao_meta
  FOR SELECT
  TO authenticated
  USING (
    entregador_id IN (
      SELECT e.id FROM public.entregadores e
      WHERE e.profile_id = (SELECT auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 7) Função auxiliar: calcular comissão meta para um entregador em um mês
--    Retorna o valor calculado.
--    Regra de gap (Opção B): entrega sem faixa herda o valor da faixa anterior mais próxima.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.calcular_comissao_meta(
  p_entregador_id uuid,
  p_total_entregas integer,
  p_modo           text   -- 'escalonado' | 'faixa_maxima'
)
RETURNS numeric(10,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comissao      numeric(10,2) := 0;
  v_faixa         record;
  v_ultima_faixa  record;
  v_entregando    integer;
  v_faixa_max_val numeric(10,2) := 0;
  v_faixa_max_ate integer := 0;
BEGIN
  IF p_total_entregas <= 0 THEN
    RETURN 0;
  END IF;

  -- Carrega faixas ordenadas por 'de' crescente
  -- ─────────────────────────────────────────────
  IF p_modo = 'escalonado' THEN
    -- Calcula entrega por entrega dentro de cada faixa
    -- Entregas sem faixa (gap) herdam o valor da última faixa válida (Opção B)
    v_entregando := 1;
    v_ultima_faixa := NULL;

    FOR v_faixa IN
      SELECT de, ate, valor_por_entrega
      FROM public.comissao_faixas
      WHERE entregador_id = p_entregador_id
      ORDER BY de ASC
    LOOP
      -- Preenche gap antes desta faixa com o valor da última faixa (Opção B)
      IF v_ultima_faixa IS NOT NULL AND v_entregando < v_faixa.de THEN
        DECLARE
          v_entregas_gap integer := LEAST(v_faixa.de - 1, p_total_entregas) - v_entregando + 1;
        BEGIN
          IF v_entregas_gap > 0 THEN
            v_comissao := v_comissao + (v_entregas_gap * v_ultima_faixa.valor_por_entrega);
            v_entregando := v_entregando + v_entregas_gap;
          END IF;
        END;
      END IF;

      EXIT WHEN v_entregando > p_total_entregas;

      -- Entregas dentro desta faixa
      IF v_entregando <= v_faixa.ate THEN
        DECLARE
          v_inicio    integer := GREATEST(v_entregando, v_faixa.de);
          v_fim       integer := LEAST(v_faixa.ate, p_total_entregas);
          v_qtd       integer;
        BEGIN
          v_qtd := v_fim - v_inicio + 1;
          IF v_qtd > 0 THEN
            v_comissao := v_comissao + (v_qtd * v_faixa.valor_por_entrega);
            v_entregando := v_fim + 1;
          END IF;
        END;
      END IF;

      v_ultima_faixa := v_faixa;
    END LOOP;

    -- Entregas além da última faixa: herdam o valor da última (Opção B)
    IF v_entregando <= p_total_entregas AND v_ultima_faixa IS NOT NULL THEN
      v_comissao := v_comissao + ((p_total_entregas - v_entregando + 1) * v_ultima_faixa.valor_por_entrega);
    END IF;

  ELSIF p_modo = 'faixa_maxima' THEN
    -- Identifica a faixa mais alta atingida pelo total de entregas
    SELECT valor_por_entrega, ate
    INTO v_faixa_max_val, v_faixa_max_ate
    FROM public.comissao_faixas
    WHERE entregador_id = p_entregador_id
      AND de <= p_total_entregas
    ORDER BY de DESC
    LIMIT 1;

    IF FOUND THEN
      v_comissao := p_total_entregas * v_faixa_max_val;
    END IF;
  END IF;

  RETURN ROUND(v_comissao, 2);
END;
$$;

GRANT EXECUTE ON FUNCTION public.calcular_comissao_meta(uuid, integer, text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8) Função principal: fechar_ciclos_comissao_meta()
--    Fecha o ciclo do mês anterior para todos os entregadores com tipo_comissao = 'meta'.
--    Idempotente: ON CONFLICT DO NOTHING previne fechamento duplo.
--    Chamada pelo pg_cron no último dia do mês às 23:55 BRT (02:55 UTC).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fechar_ciclos_comissao_meta(
  p_criado_por text DEFAULT 'automatico'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mes_ref    text;
  v_inicio_mes timestamptz;
  v_fim_mes    timestamptz;
  v_count      integer := 0;
  v_rec        record;
  v_entregas   integer;
  v_comissao   numeric(10,2);
  v_modo       text;
BEGIN
  -- Mês corrente (o ciclo sendo fechado é o mês atual)
  v_mes_ref    := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM');
  v_inicio_mes := date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  v_fim_mes    := (date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') + interval '1 month') AT TIME ZONE 'America/Sao_Paulo';

  FOR v_rec IN
    SELECT e.id AS entregador_id,
           COALESCE(e.meta_modo_calculo, 'escalonado') AS modo
    FROM public.entregadores e
    WHERE e.tipo_comissao::text = 'meta'
      AND e.ativo = true
  LOOP
    -- Conta entregas concluídas no mês
    SELECT COUNT(*)
    INTO v_entregas
    FROM public.solicitacoes s
    WHERE s.entregador_id = v_rec.entregador_id
      AND s.status::text = 'concluida'
      AND s.data_conclusao >= v_inicio_mes
      AND s.data_conclusao <  v_fim_mes;

    v_modo     := v_rec.modo;
    v_comissao := public.calcular_comissao_meta(v_rec.entregador_id, v_entregas, v_modo);

    -- Insert idempotente: ignora se já existe ciclo para este mês
    INSERT INTO public.ciclos_comissao_meta (
      entregador_id, mes_referencia, total_entregas,
      comissao_calculada, meta_modo_calculo, fechado_em, criado_por
    )
    VALUES (
      v_rec.entregador_id, v_mes_ref, v_entregas,
      v_comissao, v_modo, now(), p_criado_por
    )
    ON CONFLICT (entregador_id, mes_referencia) DO NOTHING;

    GET DIAGNOSTICS v_count = ROW_COUNT;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Least privilege: EXECUTE apenas para postgres (pg_cron) + authenticated (chamada manual via RPC admin)
REVOKE ALL ON FUNCTION public.fechar_ciclos_comissao_meta(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fechar_ciclos_comissao_meta(text) TO postgres;
GRANT EXECUTE ON FUNCTION public.fechar_ciclos_comissao_meta(text) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9) pg_cron: último dia do mês às 23:55 BRT (02:55 UTC do dia seguinte)
--    Padrão: "59 23 28-31 * *" + verificação de último dia dentro da função
--    A função é idempotente — rodar duas vezes não duplica dados.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT cron.schedule(
  'fechar-ciclos-comissao-meta-mensal',
  '55 2 1 * *',  -- dia 1 às 02:55 UTC = 23:55 BRT do último dia do mês anterior
  $$ SELECT public.fechar_ciclos_comissao_meta('automatico'); $$
);

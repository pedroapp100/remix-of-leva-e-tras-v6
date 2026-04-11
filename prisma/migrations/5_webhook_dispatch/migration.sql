-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 5: Webhook Dispatch via pg_net + triggers em solicitacoes/faturas
-- ═══════════════════════════════════════════════════════════════════════════
-- A service_role_key é embutida diretamente no SET clause da função
-- SECURITY DEFINER — padrão PostgreSQL para funções que precisam de
-- configuração própria sem ALTER DATABASE (que requer superuser no Supabase).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Extensão pg_net (necessária para HTTP calls do PostgreSQL) ────────────
-- pg_net cria o schema net automaticamente; não especificamos SCHEMA
-- para compatibilidade com o Supabase managed extensions.
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── 2. Função central de dispatch ────────────────────────────────────────────
-- Chamada por todos os triggers; encapsula o pg_net.http_post.
-- SECURITY DEFINER: roda com privilégios do owner (postgres), não do caller.
-- A service_role_key é declarada como constante no corpo — evita a necessidade
-- de ALTER DATABASE ou SET em nível de função (ambos requerem superuser no Supabase).
-- EXCEPTION catch: garante que uma falha no dispatch NUNCA aborta a transação.
CREATE OR REPLACE FUNCTION dispatch_webhook_event(
  p_evento  TEXT,
  p_payload JSONB
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
DECLARE
  l_url TEXT := 'https://qbumfnkrqqsthmsgrhfi.supabase.co/functions/v1/dispatch-webhook';
  l_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFidW1mbmtycXFzdGhtc2dyaGZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY3MzQ5MiwiZXhwIjoyMDkxMjQ5NDkyfQ.mV9so76SdTxTeqSsBu7jYmsKvMuvBpis8m7AuUUj8D0';
BEGIN
  -- Disparo assíncrono; não bloqueia nem aborta a transação principal
  PERFORM net.http_post(
    url                  := l_url,
    headers              := jsonb_build_object(
                              'Content-Type',  'application/json',
                              'Authorization', 'Bearer ' || l_key
                            ),
    body                 := jsonb_build_object('evento', p_evento, 'payload', p_payload)::text,
    timeout_milliseconds := 5000
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[dispatch_webhook_event] Falhou para evento %: %', p_evento, SQLERRM;
END;
$$;

-- ── 3. Trigger: solicitacoes ─────────────────────────────────────────────────
-- Eventos: criada · aceita · rejeitada · em_andamento · concluida · cancelada
--          entrega.entregador_atribuido (quando entregador_id é preenchido)
CREATE OR REPLACE FUNCTION trg_webhook_solicitacao()
RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
DECLARE
  l_evento TEXT;
BEGIN
  -- Determinar evento conforme a operação e mudança de status
  IF TG_OP = 'INSERT' THEN
    l_evento := 'solicitacao.criada';

  ELSIF TG_OP = 'UPDATE' THEN
    -- Entregador atribuído pela primeira vez
    IF OLD.entregador_id IS NULL AND NEW.entregador_id IS NOT NULL THEN
      PERFORM dispatch_webhook_event(
        'entrega.entregador_atribuido',
        jsonb_build_object(
          'id',            NEW.id,
          'codigo',        NEW.codigo,
          'cliente_id',    NEW.cliente_id,
          'entregador_id', NEW.entregador_id,
          'status',        NEW.status
        )
      );
    END IF;

    -- Mudança de status
    IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
      RETURN NEW; -- nenhum evento de status a disparar
    END IF;

    CASE NEW.status
      WHEN 'aceita'       THEN l_evento := 'solicitacao.aceita';
      WHEN 'rejeitada'    THEN l_evento := 'solicitacao.rejeitada';
      WHEN 'em_andamento' THEN l_evento := 'solicitacao.em_andamento';
      WHEN 'concluida'    THEN l_evento := 'solicitacao.concluida';
      WHEN 'cancelada'    THEN l_evento := 'solicitacao.cancelada';
      ELSE RETURN NEW;
    END CASE;
  ELSE
    RETURN NEW;
  END IF;

  PERFORM dispatch_webhook_event(
    l_evento,
    jsonb_build_object(
      'id',               NEW.id,
      'codigo',           NEW.codigo,
      'cliente_id',       NEW.cliente_id,
      'entregador_id',    NEW.entregador_id,
      'status',           NEW.status,
      'tipo_operacao',    NEW.tipo_operacao,
      'ponto_coleta',     NEW.ponto_coleta,
      'data_solicitacao', NEW.data_solicitacao,
      'data_conclusao',   NEW.data_conclusao
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS webhook_on_solicitacao ON solicitacoes;
CREATE TRIGGER webhook_on_solicitacao
  AFTER INSERT OR UPDATE ON solicitacoes
  FOR EACH ROW EXECUTE FUNCTION trg_webhook_solicitacao();

-- ── 4. Trigger: faturas ──────────────────────────────────────────────────────
-- Eventos: fatura.gerada · fatura.paga · fatura.vencida · fatura.finalizada
CREATE OR REPLACE FUNCTION trg_webhook_fatura()
RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
DECLARE
  l_evento TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    l_evento := 'fatura.gerada';

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status_geral IS NOT DISTINCT FROM NEW.status_geral THEN
      RETURN NEW; -- sem mudança de status
    END IF;

    CASE NEW.status_geral
      WHEN 'Paga'       THEN l_evento := 'fatura.paga';
      WHEN 'Vencida'    THEN l_evento := 'fatura.vencida';
      WHEN 'Finalizada' THEN l_evento := 'fatura.finalizada';
      ELSE RETURN NEW;
    END CASE;
  ELSE
    RETURN NEW;
  END IF;

  PERFORM dispatch_webhook_event(
    l_evento,
    jsonb_build_object(
      'id',              NEW.id,
      'numero',          NEW.numero,
      'cliente_id',      NEW.cliente_id,
      'cliente_nome',    NEW.cliente_nome,
      'status_geral',    NEW.status_geral,
      'saldo_liquido',   NEW.saldo_liquido,
      'total_entregas',  NEW.total_entregas,
      'data_emissao',    NEW.data_emissao,
      'data_vencimento', NEW.data_vencimento
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS webhook_on_fatura ON faturas;
CREATE TRIGGER webhook_on_fatura
  AFTER INSERT OR UPDATE ON faturas
  FOR EACH ROW EXECUTE FUNCTION trg_webhook_fatura();

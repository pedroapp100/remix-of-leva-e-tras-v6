-- ============================================================
-- Migration 45: Sync Pagamento Dinheiro → Caixa
--
-- Trigger fn_sync_pagamento_to_caixa: ao registrar um
-- pagamento em dinheiro, cria automaticamente o recebimento
-- no caixa aberto do entregador naquele dia.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_sync_pagamento_to_caixa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entregador_id uuid;
  v_caixa_id      uuid;
  v_forma_nome    text;
BEGIN
  -- Só processa formas de pagamento "dinheiro"
  SELECT name INTO v_forma_nome
  FROM formas_pagamento
  WHERE id = NEW.forma_pagamento_id;

  IF v_forma_nome IS NULL OR lower(v_forma_nome) NOT LIKE '%dinheiro%' THEN
    RETURN NEW;
  END IF;

  -- Busca entregador da solicitação
  SELECT entregador_id INTO v_entregador_id
  FROM solicitacoes
  WHERE id = NEW.solicitacao_id;

  IF v_entregador_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Busca caixa aberto do entregador na data de hoje
  SELECT id INTO v_caixa_id
  FROM caixas_entregadores
  WHERE entregador_id = v_entregador_id
    AND status = 'aberto'
    AND data = CURRENT_DATE
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_caixa_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Evita duplicação para a mesma rota/solicitação
  IF EXISTS (
    SELECT 1 FROM recebimentos_caixa
    WHERE caixa_id      = v_caixa_id
      AND solicitacao_id = NEW.solicitacao_id
      AND (rota_id = NEW.rota_id OR (rota_id IS NULL AND NEW.rota_id IS NULL))
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO recebimentos_caixa (
    caixa_id, solicitacao_id, rota_id,
    forma_pagamento_id, valor, pertence_a, observacao
  ) VALUES (
    v_caixa_id, NEW.solicitacao_id, NEW.rota_id,
    NEW.forma_pagamento_id, NEW.valor, NEW.pertence_a,
    'Sincronizado automaticamente via pagamento registrado'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_pagamento_to_caixa ON pagamentos_solicitacao;

CREATE TRIGGER trg_sync_pagamento_to_caixa
  AFTER INSERT ON pagamentos_solicitacao
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_pagamento_to_caixa();

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 68_auto_abrir_caixa_recebimento_orfao
--
-- PROBLEMA:
--   Auditoria pós migration 67 encontrou 27 entregas concluídas em 26-27/06/2026
--   (Bruno, Rafael, Rodrigo, Sergio, "Pedro Paulo Teste"), somando R$3.994,40 em
--   dinheiro esperado no caixa, que nunca foram registradas em recebimentos_caixa.
--   Causa: nenhum desses entregadores tinha caixa aberto naquele momento (todos
--   fecharam o caixa em 06/06 e só abriram outro em 29/06) — provável
--   reconciliação em lote de entregas atrasadas feita nesse intervalo.
--
--   Hoje, tanto fn_sync_pagamento_to_caixa quanto addRecebimentoAutomatico
--   (CaixaStore.tsx) já sabem detectar "sem caixa aberto" — mas nos dois casos
--   a reação é só disparar um aviso passageiro (log + evento de UI) e desistir.
--   Nenhum registro persistente e recuperável é criado; se ninguém vir o aviso
--   na hora (fácil de perder numa reconciliação em lote de várias entregas
--   seguidas), o valor não fica anotado em lugar nenhum.
--
-- SOLUÇÃO:
--   fn_sync_pagamento_to_caixa passa a abrir automaticamente um caixa com
--   troco_inicial = 0 para o entregador quando não encontra nenhum aberto, em
--   vez de desistir — garantindo que o dinheiro sempre tem onde cair. O mesmo
--   ajuste é replicado no lado do frontend (addRecebimentoAutomatico, arquivo
--   separado) para o caminho que não passa por pagamentos_solicitacao.
-- ─────────────────────────────────────────────────────────────────────────────

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

  -- Busca qualquer caixa aberto do entregador — sem restrição de data
  SELECT id INTO v_caixa_id
  FROM caixas_entregadores
  WHERE entregador_id = v_entregador_id
    AND status = 'aberto'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Nunca deixa o dinheiro sem lugar pra cair: se o entregador não tem caixa
  -- aberto agora, abre um automaticamente com troco zero em vez de desistir.
  IF v_caixa_id IS NULL THEN
    INSERT INTO caixas_entregadores (entregador_id, data, troco_inicial, status, observacoes)
    VALUES (
      v_entregador_id, CURRENT_DATE, 0, 'aberto',
      'Aberto automaticamente ao sincronizar um recebimento em dinheiro sem caixa aberto'
    )
    RETURNING id INTO v_caixa_id;
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

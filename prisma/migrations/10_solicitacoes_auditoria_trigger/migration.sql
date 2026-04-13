-- Fix #15: garantir auditoria de criação de solicitação no backend

CREATE OR REPLACE FUNCTION public.fn_log_solicitacao_criada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_nome text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NOT NULL THEN
    SELECT nome INTO v_user_nome
    FROM public.profiles
    WHERE id = v_user_id
    LIMIT 1;
  END IF;

  INSERT INTO public.logs_auditoria (
    categoria,
    acao,
    entidade_id,
    descricao,
    detalhes,
    usuario_id,
    usuario_nome
  ) VALUES (
    'solicitacao',
    'solicitacao_criada',
    NEW.id::text,
    format('Solicitação %s criada.', NEW.codigo),
    jsonb_build_object(
      'codigo', NEW.codigo,
      'cliente_id', NEW.cliente_id,
      'entregador_id', NEW.entregador_id,
      'tipo_operacao', NEW.tipo_operacao,
      'status', NEW.status,
      'retroativo', NEW.retroativo,
      'data_solicitacao', NEW.data_solicitacao
    ),
    v_user_id,
    COALESCE(v_user_nome, 'Sistema')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_solicitacao_criada ON public.solicitacoes;
CREATE TRIGGER trg_log_solicitacao_criada
AFTER INSERT ON public.solicitacoes
FOR EACH ROW
EXECUTE FUNCTION public.fn_log_solicitacao_criada();

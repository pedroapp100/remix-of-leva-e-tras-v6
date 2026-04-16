-- ============================================================
-- Migration 23: logs_auditoria — Cobertura total via triggers
-- Cobre as 4 categorias que nunca eram populadas:
--   • cliente      — INSERT / UPDATE / DELETE em clientes
--   • entregador   — INSERT / UPDATE / DELETE em entregadores
--   • fatura       — UPDATE status_geral em faturas
--   • solicitacao  — UPDATE status em solicitacoes (pós-criação)
--   • autenticacao — INSERT em profiles (novo usuário)
-- Todos usam fn_current_user_nome() para nome consistente.
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- CATEGORIA: cliente
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_log_cliente_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.logs_auditoria (
    categoria, acao, entidade_id, descricao, detalhes, usuario_id, usuario_nome
  ) VALUES (
    'cliente',
    'cliente_criado',
    NEW.id::text,
    format('Cliente "%s" cadastrado.', NEW.razao_social),
    jsonb_build_object(
      'razao_social', NEW.razao_social,
      'nome_fantasia', NEW.nome_fantasia,
      'cnpj_cpf', NEW.cnpj_cpf,
      'modalidade', NEW.modalidade
    ),
    (SELECT auth.uid()),
    public.fn_current_user_nome()
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_log_cliente_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só loga se algo relevante mudou
  IF OLD.razao_social IS DISTINCT FROM NEW.razao_social
  OR OLD.ativo        IS DISTINCT FROM NEW.ativo
  OR OLD.modalidade   IS DISTINCT FROM NEW.modalidade
  OR OLD.telefone     IS DISTINCT FROM NEW.telefone
  OR OLD.endereco     IS DISTINCT FROM NEW.endereco
  THEN
    INSERT INTO public.logs_auditoria (
      categoria, acao, entidade_id, descricao, detalhes, usuario_id, usuario_nome
    ) VALUES (
      'cliente',
      CASE WHEN OLD.ativo IS DISTINCT FROM NEW.ativo
           THEN CASE WHEN NEW.ativo THEN 'cliente_ativado' ELSE 'cliente_desativado' END
           ELSE 'cliente_editado'
      END,
      NEW.id::text,
      format('Cliente "%s" atualizado.', NEW.razao_social),
      jsonb_build_object(
        'anterior', jsonb_build_object(
          'razao_social', OLD.razao_social,
          'ativo', OLD.ativo,
          'modalidade', OLD.modalidade
        ),
        'novo', jsonb_build_object(
          'razao_social', NEW.razao_social,
          'ativo', NEW.ativo,
          'modalidade', NEW.modalidade
        )
      ),
      (SELECT auth.uid()),
      public.fn_current_user_nome()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_log_cliente_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.logs_auditoria (
    categoria, acao, entidade_id, descricao, detalhes, usuario_id, usuario_nome
  ) VALUES (
    'cliente',
    'cliente_removido',
    OLD.id::text,
    format('Cliente "%s" removido.', OLD.razao_social),
    jsonb_build_object('razao_social', OLD.razao_social, 'cnpj_cpf', OLD.cnpj_cpf),
    (SELECT auth.uid()),
    public.fn_current_user_nome()
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_cliente_insert ON public.clientes;
CREATE TRIGGER trg_log_cliente_insert
  AFTER INSERT ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_cliente_insert();

DROP TRIGGER IF EXISTS trg_log_cliente_update ON public.clientes;
CREATE TRIGGER trg_log_cliente_update
  AFTER UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_cliente_update();

DROP TRIGGER IF EXISTS trg_log_cliente_delete ON public.clientes;
CREATE TRIGGER trg_log_cliente_delete
  AFTER DELETE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_cliente_delete();


-- ══════════════════════════════════════════════════════════════
-- CATEGORIA: entregador
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_log_entregador_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome text;
BEGIN
  SELECT nome INTO v_nome FROM public.profiles WHERE id = NEW.profile_id LIMIT 1;

  INSERT INTO public.logs_auditoria (
    categoria, acao, entidade_id, descricao, detalhes, usuario_id, usuario_nome
  ) VALUES (
    'entregador',
    'entregador_criado',
    NEW.id::text,
    format('Entregador "%s" cadastrado.', COALESCE(v_nome, NEW.id::text)),
    jsonb_build_object(
      'profile_id', NEW.profile_id,
      'tipo_veiculo', NEW.tipo_veiculo,
      'tipo_comissao', NEW.tipo_comissao,
      'valor_comissao', NEW.valor_comissao
    ),
    (SELECT auth.uid()),
    public.fn_current_user_nome()
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_log_entregador_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome text;
BEGIN
  IF OLD.ativo           IS DISTINCT FROM NEW.ativo
  OR OLD.tipo_veiculo    IS DISTINCT FROM NEW.tipo_veiculo
  OR OLD.tipo_comissao   IS DISTINCT FROM NEW.tipo_comissao
  OR OLD.valor_comissao  IS DISTINCT FROM NEW.valor_comissao
  THEN
    SELECT nome INTO v_nome FROM public.profiles WHERE id = NEW.profile_id LIMIT 1;

    INSERT INTO public.logs_auditoria (
      categoria, acao, entidade_id, descricao, detalhes, usuario_id, usuario_nome
    ) VALUES (
      'entregador',
      CASE WHEN OLD.ativo IS DISTINCT FROM NEW.ativo
           THEN CASE WHEN NEW.ativo THEN 'entregador_ativado' ELSE 'entregador_desativado' END
           ELSE 'entregador_editado'
      END,
      NEW.id::text,
      format('Entregador "%s" atualizado.', COALESCE(v_nome, NEW.id::text)),
      jsonb_build_object(
        'anterior', jsonb_build_object('ativo', OLD.ativo, 'tipo_comissao', OLD.tipo_comissao, 'valor_comissao', OLD.valor_comissao),
        'novo',     jsonb_build_object('ativo', NEW.ativo, 'tipo_comissao', NEW.tipo_comissao, 'valor_comissao', NEW.valor_comissao)
      ),
      (SELECT auth.uid()),
      public.fn_current_user_nome()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_entregador_insert ON public.entregadores;
CREATE TRIGGER trg_log_entregador_insert
  AFTER INSERT ON public.entregadores
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_entregador_insert();

DROP TRIGGER IF EXISTS trg_log_entregador_update ON public.entregadores;
CREATE TRIGGER trg_log_entregador_update
  AFTER UPDATE ON public.entregadores
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_entregador_update();


-- ══════════════════════════════════════════════════════════════
-- CATEGORIA: fatura
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_log_fatura_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Loga apenas quando algum status mudar
  IF OLD.status_geral    IS DISTINCT FROM NEW.status_geral
  OR OLD.status_taxas    IS DISTINCT FROM NEW.status_taxas
  OR OLD.status_repasse  IS DISTINCT FROM NEW.status_repasse
  OR OLD.status_cobranca IS DISTINCT FROM NEW.status_cobranca
  THEN
    INSERT INTO public.logs_auditoria (
      categoria, acao, entidade_id, descricao, detalhes, usuario_id, usuario_nome
    ) VALUES (
      'fatura',
      'fatura_status_alterado',
      NEW.id::text,
      format('Fatura %s — status alterado para "%s".', NEW.numero, NEW.status_geral),
      jsonb_build_object(
        'numero', NEW.numero,
        'cliente_nome', NEW.cliente_nome,
        'anterior', jsonb_build_object(
          'status_geral',    OLD.status_geral,
          'status_taxas',    OLD.status_taxas,
          'status_repasse',  OLD.status_repasse,
          'status_cobranca', OLD.status_cobranca
        ),
        'novo', jsonb_build_object(
          'status_geral',    NEW.status_geral,
          'status_taxas',    NEW.status_taxas,
          'status_repasse',  NEW.status_repasse,
          'status_cobranca', NEW.status_cobranca
        )
      ),
      (SELECT auth.uid()),
      public.fn_current_user_nome()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_fatura_status ON public.faturas;
CREATE TRIGGER trg_log_fatura_status
  AFTER UPDATE ON public.faturas
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_fatura_status();


-- ══════════════════════════════════════════════════════════════
-- CATEGORIA: solicitacao — mudanças de status pós-criação
-- (o trigger de INSERT já existe na migration 10)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_log_solicitacao_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.logs_auditoria (
      categoria, acao, entidade_id, descricao, detalhes, usuario_id, usuario_nome
    ) VALUES (
      'solicitacao',
      'solicitacao_status_alterado',
      NEW.id::text,
      format('Solicitação %s: "%s" → "%s".', NEW.codigo, OLD.status, NEW.status),
      jsonb_build_object(
        'codigo', NEW.codigo,
        'status_anterior', OLD.status,
        'status_novo', NEW.status,
        'entregador_id', NEW.entregador_id
      ),
      (SELECT auth.uid()),
      public.fn_current_user_nome()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_solicitacao_status ON public.solicitacoes;
CREATE TRIGGER trg_log_solicitacao_status
  AFTER UPDATE ON public.solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_solicitacao_status();


-- ══════════════════════════════════════════════════════════════
-- CATEGORIA: autenticacao — novo usuário cadastrado
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.fn_log_auth_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.logs_auditoria (
    categoria, acao, entidade_id, descricao, detalhes, usuario_id, usuario_nome
  ) VALUES (
    'autenticacao',
    'usuario_cadastrado',
    NEW.id::text,
    format('Novo usuário "%s" cadastrado com role "%s".', NEW.nome, NEW.role),
    jsonb_build_object(
      'nome', NEW.nome,
      'email', NEW.email,
      'role', NEW.role
    ),
    NEW.id,
    NEW.nome
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_auth_signup ON public.profiles;
CREATE TRIGGER trg_log_auth_signup
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_auth_signup();

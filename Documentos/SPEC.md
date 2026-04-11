# SPEC — Implementação do Banco de Dados
## Leva e Traz v2.0 — Supabase + PostgreSQL + Prisma
**Data:** 2026-04-08  
**Referência:** DB_ARCHITECTURE_PLAN.md  
**Status geral:** 🔴 Não iniciado

---

## Como usar este documento

Cada etapa segue o mesmo **Raph-Loop**:

```
1. PREPARAR  — leia os pré-requisitos e o que você vai fazer
2. EXECUTAR  — rode o SQL ou comando no ambiente correto
3. VALIDAR   — rode EXATAMENTE os blocos "✅ TESTE DE VALIDAÇÃO"
4. CHECAR    — todos os resultados esperados batem?
     ✅ SIM → marcar etapa como concluída → avançar
     ❌ NÃO → ler seção "❌ SE FALHAR" → corrigir → voltar ao passo 2
```

**Regra:** NUNCA avance para a próxima etapa sem ter passado em 100% dos testes da etapa atual.

---

## Ambientes

| Ambiente | Quando usar |
|---|---|
| **Supabase SQL Editor** | Para executar SQL das etapas |
| **Terminal do projeto** | Para comandos Prisma |
| **Supabase Dashboard > Table Editor** | Para confirmar tabelas criadas |
| **Supabase Dashboard > Auth** | Para criar usuário admin |

---

## Mapa de Etapas

| # | Etapa | Status | Depende de |
|---|---|---|---|
| 1 | Extensões e infraestrutura | 🔴 | — |
| 2 | Tabelas de configuração | 🔴 | 1 |
| 3 | Profiles e Auth trigger | 🔴 | 2 |
| 4 | Clientes e Entregadores | 🔴 | 3 |
| 5 | Tabela de preços e Bairros | 🔴 | 4 |
| 6 | Solicitações e Rotas | 🔴 | 5 |
| 7 | Módulo financeiro | 🔴 | 6 |
| 8 | Caixas de Entregadores | 🔴 | 6 |
| 9 | Faturas e históricos | 🔴 | 7 |
| 10 | Configurações e webhooks | 🔴 | 2 |
| 11 | RLS — Segurança completa | 🔴 | 3,4,6,7,8,9 |
| 12 | Seeds técnicos | 🔴 | 10 |
| 13 | Usuário admin inicial | 🔴 | 11,12 |
| 14 | Integração Prisma | 🔴 | 13 |
| 15 | Validação end-to-end | 🔴 | 14 |

---

---

# ETAPA 1 — Extensões e Infraestrutura

**Status:** 🔴 Não iniciado  
**Ambiente:** Supabase SQL Editor  
**Tempo estimado:** 5 minutos  
**Pré-requisitos:** Projeto Supabase criado e acessível

## O que fazer

Instalar extensões PostgreSQL necessárias e criar funções utilitárias base que serão usadas em todas as etapas seguintes.

## SQL para executar

```sql
-- =========================================================
-- ETAPA 1: Extensões e funções utilitárias
-- =========================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Tentar instalar pg_uuidv7 (disponível em Supabase >= 15)
-- Se falhar, não é bloqueante — UUIDs v4 ainda funcionam
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "pg_uuidv7";
  RAISE NOTICE 'pg_uuidv7 instalado com sucesso';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_uuidv7 não disponível — usando uuid-ossp (aceitável)';
END;
$$;

-- Função utilitária para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Função para gerar código de solicitação no formato LT-YYYYMMDD-NNNNN
CREATE OR REPLACE FUNCTION gerar_codigo_solicitacao()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_data text := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYYMMDD');
  v_seq  int;
  v_codigo text;
BEGIN
  SELECT COUNT(*) + 1
    INTO v_seq
    FROM solicitacoes
    WHERE codigo LIKE 'LT-' || v_data || '-%';

  v_codigo := 'LT-' || v_data || '-' || lpad(v_seq::text, 5, '0');
  RETURN v_codigo;
END;
$$;

-- Função para gerar número de fatura no formato FAT-YYYYMM-NNNNN
CREATE OR REPLACE FUNCTION gerar_numero_fatura()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_mes  text := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYYMM');
  v_seq  int;
  v_num  text;
BEGIN
  SELECT COUNT(*) + 1
    INTO v_seq
    FROM faturas
    WHERE numero LIKE 'FAT-' || v_mes || '-%';

  v_num := 'FAT-' || v_mes || '-' || lpad(v_seq::text, 5, '0');
  RETURN v_num;
END;
$$;
```

## ✅ TESTE DE VALIDAÇÃO

Execute cada bloco abaixo separadamente e confirme o resultado esperado:

```sql
-- TESTE 1.1 — Extensões instaladas
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_stat_statements');
-- ESPERADO: 3 linhas retornadas (ou 4 se pg_uuidv7 disponível)

-- TESTE 1.2 — Função set_updated_at existe
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'set_updated_at';
-- ESPERADO: 1 linha com 'set_updated_at'

-- TESTE 1.3 — Funções de geração de código existem
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('gerar_codigo_solicitacao', 'gerar_numero_fatura');
-- ESPERADO: 2 linhas
```

## ❌ SE FALHAR

- **Extensão não instalada:** Supabase por padrão permite extensões via SQL Editor. Confirme que está executando como `postgres` (role padrão no SQL Editor).
- **Permissão negada em CREATE EXTENSION:** No Supabase SQL Editor, você tem permissão. Se ainda assim falhar, vá em Dashboard > Database > Extensions e habilite manualmente.
- **Função não criada:** Verifique se não há erro de sintaxe — execute bloco por bloco isoladamente.

## ✅ Marcar como concluído quando

Todos os 3 testes retornarem os resultados esperados.

---

---

# ETAPA 2 — Tabelas de Configuração

**Status:** 🔴 Não iniciado  
**Ambiente:** Supabase SQL Editor  
**Tempo estimado:** 10 minutos  
**Pré-requisitos:** Etapa 1 concluída ✅

## O que fazer

Criar todas as tabelas de configuração e referência. Estas são a base que todas as outras tabelas referenciam via FK.

## SQL para executar

```sql
-- =========================================================
-- ETAPA 2: Tabelas de configuração e referência
-- =========================================================

-- 2.1 CARGOS
CREATE TABLE IF NOT EXISTS cargos (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL UNIQUE,
  description text,
  permissions text[]      NOT NULL DEFAULT '{}',
  sistema     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2.2 REGIÕES
CREATE TABLE IF NOT EXISTS regioes (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL UNIQUE,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2.3 BAIRROS
CREATE TABLE IF NOT EXISTS bairros (
  id           uuid           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome         text           NOT NULL,
  region_id    uuid           NOT NULL REFERENCES regioes(id),
  taxa_entrega numeric(10,2)  NOT NULL DEFAULT 0,
  created_at   timestamptz    NOT NULL DEFAULT now(),
  updated_at   timestamptz    NOT NULL DEFAULT now(),
  CONSTRAINT uk_bairro_regiao UNIQUE (nome, region_id)
);
CREATE TRIGGER trg_bairros_updated_at
  BEFORE UPDATE ON bairros
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2.4 FORMAS DE PAGAMENTO
CREATE TABLE IF NOT EXISTS formas_pagamento (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text        NOT NULL UNIQUE,
  description text,
  enabled     boolean     NOT NULL DEFAULT true,
  "order"     integer     NOT NULL DEFAULT 100,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2.5 TAXAS EXTRAS DE CONFIGURAÇÃO
CREATE TABLE IF NOT EXISTS taxas_extras_config (
  id           uuid           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome         text           NOT NULL,
  valor_padrao numeric(10,2)  NOT NULL DEFAULT 0,
  ativo        boolean        NOT NULL DEFAULT true,
  created_at   timestamptz    NOT NULL DEFAULT now(),
  updated_at   timestamptz    NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_taxas_extras_updated_at
  BEFORE UPDATE ON taxas_extras_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2.6 TIPOS DE OPERAÇÃO (dinâmicos)
CREATE TABLE IF NOT EXISTS tipos_operacao_config (
  id             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome           text        NOT NULL UNIQUE,
  descricao      text,
  dias_semana    text[]      NOT NULL DEFAULT '{}',
  horario_inicio time,
  horario_fim    time,
  aplica_feriado boolean     NOT NULL DEFAULT false,
  cor            text        NOT NULL DEFAULT '#3B82F6',
  ativo          boolean     NOT NULL DEFAULT true,
  prioridade     integer     NOT NULL DEFAULT 100,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_tipos_operacao_updated_at
  BEFORE UPDATE ON tipos_operacao_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2.7 FERIADOS
CREATE TABLE IF NOT EXISTS feriados (
  id         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome       text        NOT NULL,
  data       date        NOT NULL,
  recorrente boolean     NOT NULL DEFAULT false,
  ativo      boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.8 CATEGORIAS FINANCEIRAS
CREATE TABLE IF NOT EXISTS categorias_financeiras (
  id         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome       text        NOT NULL UNIQUE,
  tipo       text        NOT NULL CHECK (tipo IN ('despesa','receita','ambos')),
  ativo      boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2.9 CONFIGURAÇÕES DO SISTEMA
CREATE TABLE IF NOT EXISTS system_settings (
  key        text        NOT NULL PRIMARY KEY,
  value      text,
  updated_by uuid,       -- FK para profiles adicionada na Etapa 3
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2.10 TEMPLATES DE NOTIFICAÇÃO
CREATE TABLE IF NOT EXISTS notification_templates (
  id         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento     text        NOT NULL UNIQUE,
  categoria  text        NOT NULL,
  mensagem   text        NOT NULL,
  variaveis  text[]      NOT NULL DEFAULT '{}',
  ativo      boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_notif_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2.11 WEBHOOKS
CREATE TABLE IF NOT EXISTS webhooks (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome        text        NOT NULL,
  url         text        NOT NULL,
  secret_hash text,
  eventos     text[]      NOT NULL DEFAULT '{}',
  status      text        NOT NULL DEFAULT 'ativo'
                CHECK (status IN ('ativo','inativo','erro')),
  ultimo_erro text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_webhooks_updated_at
  BEFORE UPDATE ON webhooks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

## ✅ TESTE DE VALIDAÇÃO

```sql
-- TESTE 2.1 — Todas as tabelas de configuração existem
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'cargos','regioes','bairros','formas_pagamento',
    'taxas_extras_config','tipos_operacao_config','feriados',
    'categorias_financeiras','system_settings',
    'notification_templates','webhooks'
  )
ORDER BY table_name;
-- ESPERADO: 11 linhas

-- TESTE 2.2 — Constraint de tipo em categorias_financeiras funciona
DO $$
BEGIN
  INSERT INTO categorias_financeiras (nome, tipo) VALUES ('__teste__', 'invalido');
  RAISE EXCEPTION 'FALHOU: constraint não bloqueou valor inválido';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASSOU: constraint de tipo funciona corretamente';
END;
$$;
-- ESPERADO: NOTICE "PASSOU"

-- TESTE 2.3 — Trigger de updated_at funciona em bairros
INSERT INTO regioes (name) VALUES ('__Regiao Teste__');
INSERT INTO bairros (nome, region_id, taxa_entrega)
  SELECT '__Bairro Teste__', id, 5.00 FROM regioes WHERE name = '__Regiao Teste__';

SELECT pg_sleep(0.01); -- garante diferença de timestamp

UPDATE bairros SET taxa_entrega = 6.00 WHERE nome = '__Bairro Teste__';

SELECT
  CASE
    WHEN updated_at > created_at THEN 'PASSOU: updated_at foi atualizado'
    ELSE 'FALHOU: updated_at não mudou'
  END AS resultado
FROM bairros WHERE nome = '__Bairro Teste__';
-- ESPERADO: 'PASSOU: updated_at foi atualizado'

-- Limpar dados de teste
DELETE FROM bairros WHERE nome = '__Bairro Teste__';
DELETE FROM regioes WHERE name = '__Regiao Teste__';

-- TESTE 2.4 — Unique constraint em bairros funciona
INSERT INTO regioes (name) VALUES ('__Regiao Dup__');
INSERT INTO bairros (nome, region_id, taxa_entrega)
  SELECT 'Centro', id, 5.00 FROM regioes WHERE name = '__Regiao Dup__';
DO $$
BEGIN
  INSERT INTO bairros (nome, region_id, taxa_entrega)
    SELECT 'Centro', id, 7.00 FROM regioes WHERE name = '__Regiao Dup__';
  RAISE EXCEPTION 'FALHOU: duplicata foi inserida';
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'PASSOU: unique constraint de bairro funciona';
END;
$$;
DELETE FROM bairros WHERE nome = 'Centro';
DELETE FROM regioes WHERE name = '__Regiao Dup__';
-- ESPERADO: NOTICE "PASSOU"
```

## ❌ SE FALHAR

- **Tabela já existe:** Adicione `IF NOT EXISTS` (já está no script). Se receber erro de conflito de constraints, a tabela pode estar parcialmente criada — drope e recrie: `DROP TABLE nome CASCADE;`
- **Trigger falhou:** Confirme que a função `set_updated_at()` existe (Etapa 1). Execute `\df set_updated_at` ou o Teste 1.2.
- **Constraint não bloqueou:** Confirme que o `CHECK` está dentro do `CREATE TABLE`, não separado.

## ✅ Marcar como concluído quando

Todos os 4 testes retornarem os resultados esperados.

---

---

# ETAPA 3 — Profiles e Auth Trigger

**Status:** 🔴 Não iniciado  
**Ambiente:** Supabase SQL Editor  
**Tempo estimado:** 10 minutos  
**Pré-requisitos:** Etapa 2 concluída ✅

## O que fazer

Criar a tabela `profiles` (espelho de `auth.users`) e o trigger que popula automaticamente quando um novo usuário é criado no Supabase Auth. Este é o ponto de integração entre autenticação e dados de negócio.

## SQL para executar

```sql
-- =========================================================
-- ETAPA 3: Profiles e Auth integration
-- =========================================================

-- 3.1 Criar o tipo ENUM de roles
DO $$ BEGIN
  CREATE TYPE role AS ENUM ('admin', 'cliente', 'entregador');
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Tipo role já existe — ignorando';
END $$;

-- 3.2 Tabela profiles
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid        NOT NULL PRIMARY KEY,
  -- id = auth.users.id (sem geração automática — vem do Supabase Auth)
  nome       text        NOT NULL,
  email      text        NOT NULL UNIQUE,
  role       role        NOT NULL DEFAULT 'admin',
  avatar     text,
  cargo_id   uuid        REFERENCES cargos(id) ON DELETE SET NULL,
  ativo      boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- FK de system_settings para profiles (adicionar agora que profiles existe)
ALTER TABLE system_settings
  ADD CONSTRAINT fk_system_settings_profile
  FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- 3.3 Trigger de criação automática de profile ao criar usuário no Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, role)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'nome',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.role,
      'admin'::public.role
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Remover trigger anterior se existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3.4 Preferências do usuário
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  key        text        NOT NULL,
  value      jsonb       NOT NULL,
  PRIMARY KEY (user_id, key)
);
```

## ✅ TESTE DE VALIDAÇÃO

```sql
-- TESTE 3.1 — Tabela profiles existe com colunas corretas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;
-- ESPERADO: colunas id, nome, email, role, avatar, cargo_id, ativo, created_at

-- TESTE 3.2 — Tipo ENUM role existe
SELECT typname, enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname = 'role'
ORDER BY e.enumsortorder;
-- ESPERADO: 3 linhas — admin, cliente, entregador

-- TESTE 3.3 — Trigger on_auth_user_created existe
SELECT trigger_name, event_object_table, event_manipulation
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
-- ESPERADO: 1 linha

-- TESTE 3.4 — FK de system_settings para profiles existe
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'system_settings'
  AND tc.constraint_type = 'FOREIGN KEY';
-- ESPERADO: 1 linha referenciando profiles

-- TESTE 3.5 — Inserção manual em profiles funciona (simulando Auth)
INSERT INTO profiles (id, nome, email, role)
VALUES (gen_random_uuid(), 'Teste Profile', 'teste@validacao.com', 'admin');

SELECT COUNT(*) AS total FROM profiles WHERE email = 'teste@validacao.com';
-- ESPERADO: 1

DELETE FROM profiles WHERE email = 'teste@validacao.com';
```

## ❌ SE FALHAR

- **Tipo role já existe com valores errados:** `DROP TYPE role CASCADE;` e recrie. Cuidado — CASCADE vai remover colunas que dependem dele.
- **Trigger não dispara:** No Supabase, triggers em `auth.users` requerem a função `SECURITY DEFINER`. Confirme que `SET search_path = ''` está presente — sem isso o trigger pode falhar silenciosamente.
- **FK de system_settings falhou:** Verifique se `profiles` foi criada sem erros primeiro.

## ✅ Marcar como concluído quando

Todos os 5 testes retornarem os resultados esperados.

---

---

# ETAPA 4 — Clientes e Entregadores

**Status:** 🔴 Não iniciado  
**Ambiente:** Supabase SQL Editor  
**Tempo estimado:** 10 minutos  
**Pré-requisitos:** Etapa 3 concluída ✅

## O que fazer

Criar as tabelas `clientes` e `entregadores` com o campo `profile_id` que os vincula ao Supabase Auth. Este vínculo é o que torna os portais self-service possíveis.

## SQL para executar

```sql
-- =========================================================
-- ETAPA 4: Clientes e Entregadores
-- =========================================================

-- Enums necessários
DO $$ BEGIN
  CREATE TYPE modalidade AS ENUM ('pre_pago', 'faturado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE frequencia_faturamento AS ENUM ('diario','semanal','mensal','por_entrega');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dia_semana AS ENUM ('domingo','segunda','terca','quarta','quinta','sexta','sabado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_comissao AS ENUM ('percentual','fixo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_veiculo AS ENUM ('moto','carro','bicicleta','a_pe');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4.1 CLIENTES
CREATE TABLE IF NOT EXISTS clientes (
  id                                uuid           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id                        uuid           UNIQUE REFERENCES profiles(id) ON DELETE SET NULL,
  nome                              text           NOT NULL,
  tipo                              text           NOT NULL CHECK (tipo IN ('pessoa_fisica','pessoa_juridica')),
  documento                         text,          -- CPF ou CNPJ
  email                             text           NOT NULL UNIQUE,
  telefone                          text           NOT NULL,
  endereco                          text           NOT NULL,
  bairro                            text           NOT NULL,
  cidade                            text           NOT NULL,
  uf                                char(2)        NOT NULL,
  chave_pix                         text,
  status                            text           NOT NULL DEFAULT 'ativo'
                                      CHECK (status IN ('ativo','inativo','bloqueado')),
  modalidade                        modalidade     NOT NULL DEFAULT 'pre_pago',
  ativar_faturamento_automatico     boolean        NOT NULL DEFAULT false,
  frequencia_faturamento            frequencia_faturamento,
  numero_de_entregas_para_faturamento integer,
  dia_da_semana_faturamento         dia_semana,
  dia_do_mes_faturamento            integer        CHECK (dia_do_mes_faturamento BETWEEN 1 AND 28),
  created_at                        timestamptz    NOT NULL DEFAULT now(),
  updated_at                        timestamptz    NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_clientes_profile_id ON clientes(profile_id);
CREATE INDEX idx_clientes_status     ON clientes(status);
CREATE INDEX idx_clientes_modalidade ON clientes(modalidade);

-- 4.2 ENTREGADORES
CREATE TABLE IF NOT EXISTS entregadores (
  id              uuid           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id      uuid           UNIQUE REFERENCES profiles(id) ON DELETE SET NULL,
  nome            text           NOT NULL,
  documento       text           NOT NULL,     -- CPF
  email           text           NOT NULL UNIQUE,
  telefone        text           NOT NULL,
  cidade          text           NOT NULL,
  bairro          text           NOT NULL,
  veiculo         tipo_veiculo   NOT NULL,
  status          text           NOT NULL DEFAULT 'ativo'
                    CHECK (status IN ('ativo','inativo')),
  avatar          text,
  tipo_comissao   tipo_comissao  NOT NULL,
  valor_comissao  numeric(10,2)  NOT NULL CHECK (valor_comissao >= 0),
  created_at      timestamptz    NOT NULL DEFAULT now(),
  updated_at      timestamptz    NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_entregadores_updated_at
  BEFORE UPDATE ON entregadores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_entregadores_profile_id ON entregadores(profile_id);
CREATE INDEX idx_entregadores_status     ON entregadores(status);
```

## ✅ TESTE DE VALIDAÇÃO

```sql
-- TESTE 4.1 — Tabelas criadas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('clientes','entregadores');
-- ESPERADO: 2 linhas

-- TESTE 4.2 — profile_id é único (não permite duplicata)
INSERT INTO profiles (id, nome, email, role)
  VALUES (gen_random_uuid(), 'P Teste', 'p_teste@test.com', 'cliente')
  RETURNING id INTO TEMP TABLE tmp_profile_id;

DO $$
DECLARE v_pid uuid;
BEGIN
  SELECT id INTO v_pid FROM tmp_profile_id;

  INSERT INTO clientes (nome, tipo, email, telefone, endereco, bairro, cidade, uf, profile_id)
    VALUES ('Cliente A', 'pessoa_juridica', 'ca@test.com', '11999999999', 'Rua A', 'Centro', 'SP', 'SP', v_pid);

  BEGIN
    INSERT INTO clientes (nome, tipo, email, telefone, endereco, bairro, cidade, uf, profile_id)
      VALUES ('Cliente B', 'pessoa_juridica', 'cb@test.com', '11999999999', 'Rua B', 'Centro', 'SP', 'SP', v_pid);
    RAISE EXCEPTION 'FALHOU: profile_id duplicado foi aceito';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASSOU: profile_id é único';
  END;

  DELETE FROM clientes WHERE email IN ('ca@test.com','cb@test.com');
  DELETE FROM profiles WHERE id = v_pid;
END;
$$;
-- ESPERADO: NOTICE "PASSOU"

-- TESTE 4.3 — CHECK de status inválido é bloqueado
DO $$
BEGIN
  INSERT INTO clientes (nome, tipo, email, telefone, endereco, bairro, cidade, uf, status)
    VALUES ('X','pessoa_fisica','x@x.com','1','R','B','C','SP','suspendido');
  RAISE EXCEPTION 'FALHOU: status inválido foi aceito';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'PASSOU: check de status funciona';
END;
$$;
-- ESPERADO: NOTICE "PASSOU"

-- TESTE 4.4 — Índices foram criados
SELECT indexname FROM pg_indexes
WHERE tablename IN ('clientes','entregadores')
  AND indexname LIKE 'idx_%';
-- ESPERADO: 5 linhas (profile_id, status e modalidade de clientes + profile_id e status de entregadores)
```

## ❌ SE FALHAR

- **Enum já existe:** Os blocos `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object` já tratam isso.
- **FK para profiles falhou:** Certifique-se que a Etapa 3 está completa e `profiles` existe.
- **CHECK de dia_do_mes falhou:** O constraint `BETWEEN 1 AND 28` só é válido para modalidade faturado com frequência mensal — isso é validado na aplicação, não no banco.

## ✅ Marcar como concluído quando

Todos os 4 testes retornarem os resultados esperados.

---

---

# ETAPA 5 — Tabela de Preços e Configuração de Tarifas

**Status:** 🔴 Não iniciado  
**Ambiente:** Supabase SQL Editor  
**Tempo estimado:** 8 minutos  
**Pré-requisitos:** Etapa 4 concluída ✅

## O que fazer

Criar a `tabela_precos_cliente` com as partial unique indexes que garantem que não existam regras duplicadas (problema crítico identificado no diagnóstico).

## SQL para executar

```sql
-- =========================================================
-- ETAPA 5: Tabela de preços por cliente
-- =========================================================

CREATE TABLE IF NOT EXISTS tabela_precos_cliente (
  id                uuid           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id        uuid           NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  bairro_destino_id uuid           REFERENCES bairros(id),
  regiao_id         uuid           REFERENCES regioes(id),
  tipo_operacao     text           NOT NULL DEFAULT 'todos',
  taxa_base         numeric(10,2)  NOT NULL CHECK (taxa_base >= 0),
  taxa_retorno      numeric(10,2)  NOT NULL DEFAULT 0 CHECK (taxa_retorno >= 0),
  taxa_espera       numeric(10,2)  NOT NULL DEFAULT 0 CHECK (taxa_espera >= 0),
  taxa_urgencia     numeric(10,2)  NOT NULL DEFAULT 0 CHECK (taxa_urgencia >= 0),
  ativo             boolean        NOT NULL DEFAULT true,
  prioridade        integer        NOT NULL DEFAULT 100,
  observacao        text,
  created_at        timestamptz    NOT NULL DEFAULT now(),
  updated_at        timestamptz    NOT NULL DEFAULT now(),

  -- Não pode ter bairro E região ao mesmo tempo
  CONSTRAINT chk_bairro_ou_regiao CHECK (
    (bairro_destino_id IS NOT NULL AND regiao_id IS NULL)
    OR
    (regiao_id IS NOT NULL AND bairro_destino_id IS NULL)
    OR
    (bairro_destino_id IS NULL AND regiao_id IS NULL)
  )
);

CREATE TRIGGER trg_tabela_precos_updated_at
  BEFORE UPDATE ON tabela_precos_cliente
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Partial unique indexes (não expressáveis no Prisma @@unique — precisam de SQL manual)
-- Regra de bairro específico: única por cliente + bairro + tipo
CREATE UNIQUE INDEX uq_precos_bairro
  ON tabela_precos_cliente(cliente_id, bairro_destino_id, tipo_operacao)
  WHERE bairro_destino_id IS NOT NULL AND regiao_id IS NULL;

-- Regra regional: única por cliente + região + tipo
CREATE UNIQUE INDEX uq_precos_regiao
  ON tabela_precos_cliente(cliente_id, regiao_id, tipo_operacao)
  WHERE regiao_id IS NOT NULL AND bairro_destino_id IS NULL;

-- Índice de lookup (algoritmo de resolução de tarifa — query crítica)
CREATE INDEX idx_tabela_precos_lookup
  ON tabela_precos_cliente(cliente_id, bairro_destino_id, tipo_operacao, ativo, prioridade)
  WHERE ativo = true;
```

## ✅ TESTE DE VALIDAÇÃO

```sql
-- TESTE 5.1 — Tabela criada
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'tabela_precos_cliente';
-- ESPERADO: 1 linha

-- TESTE 5.2 — Constraint bairro_ou_regiao funciona
DO $$
DECLARE v_cid uuid; v_bid uuid; v_rid uuid;
BEGIN
  -- Inserir dados base
  INSERT INTO regioes (name) VALUES ('__R__') RETURNING id INTO v_rid;
  INSERT INTO bairros (nome, region_id, taxa_entrega) VALUES ('__B__', v_rid, 5) RETURNING id INTO v_bid;
  INSERT INTO clientes (nome,tipo,email,telefone,endereco,bairro,cidade,uf)
    VALUES ('__C__','pessoa_juridica','__c__@t.com','1','R','B','C','SP') RETURNING id INTO v_cid;

  -- Tentar inserir com AMBOS bairro e região (deve falhar)
  BEGIN
    INSERT INTO tabela_precos_cliente (cliente_id, bairro_destino_id, regiao_id, tipo_operacao, taxa_base)
      VALUES (v_cid, v_bid, v_rid, 'todos', 10);
    RAISE EXCEPTION 'FALHOU: inseriu com bairro E região';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASSOU: constraint bairro_ou_regiao funciona';
  END;

  DELETE FROM clientes WHERE id = v_cid;
  DELETE FROM bairros WHERE id = v_bid;
  DELETE FROM regioes WHERE id = v_rid;
END;
$$;
-- ESPERADO: NOTICE "PASSOU"

-- TESTE 5.3 — Partial unique index funciona para bairro
DO $$
DECLARE v_cid uuid; v_bid uuid; v_rid uuid;
BEGIN
  INSERT INTO regioes (name) VALUES ('__R2__') RETURNING id INTO v_rid;
  INSERT INTO bairros (nome, region_id, taxa_entrega) VALUES ('__B2__', v_rid, 5) RETURNING id INTO v_bid;
  INSERT INTO clientes (nome,tipo,email,telefone,endereco,bairro,cidade,uf)
    VALUES ('__C2__','pessoa_juridica','__c2__@t.com','1','R','B','C','SP') RETURNING id INTO v_cid;

  INSERT INTO tabela_precos_cliente (cliente_id, bairro_destino_id, tipo_operacao, taxa_base)
    VALUES (v_cid, v_bid, 'todos', 10);

  BEGIN
    INSERT INTO tabela_precos_cliente (cliente_id, bairro_destino_id, tipo_operacao, taxa_base)
      VALUES (v_cid, v_bid, 'todos', 15); -- mesma combinação
    RAISE EXCEPTION 'FALHOU: duplicata de regra foi inserida';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASSOU: partial unique index de bairro funciona';
  END;

  DELETE FROM tabela_precos_cliente WHERE cliente_id = v_cid;
  DELETE FROM clientes WHERE id = v_cid;
  DELETE FROM bairros WHERE id = v_bid;
  DELETE FROM regioes WHERE id = v_rid;
END;
$$;
-- ESPERADO: NOTICE "PASSOU"

-- TESTE 5.4 — Índices criados
SELECT indexname FROM pg_indexes
WHERE tablename = 'tabela_precos_cliente';
-- ESPERADO: uq_precos_bairro, uq_precos_regiao, idx_tabela_precos_lookup (+ PK)
```

## ✅ Marcar como concluído quando

Todos os 4 testes retornarem os resultados esperados.

---

---

# ETAPA 6 — Solicitações e Rotas

**Status:** 🔴 Não iniciado  
**Ambiente:** Supabase SQL Editor  
**Tempo estimado:** 12 minutos  
**Pré-requisitos:** Etapa 5 concluída ✅

## SQL para executar

```sql
-- =========================================================
-- ETAPA 6: Solicitações, Rotas e tabelas de junção
-- =========================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE status_solicitacao AS ENUM (
    'pendente','aceita','em_andamento','concluida','cancelada','rejeitada'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pertence_a AS ENUM ('operacao','loja');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6.1 SOLICITAÇÕES
CREATE TABLE IF NOT EXISTS solicitacoes (
  id               uuid                NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo           text                NOT NULL UNIQUE,
  cliente_id       uuid                NOT NULL REFERENCES clientes(id),
  entregador_id    uuid                REFERENCES entregadores(id),
  status           status_solicitacao  NOT NULL DEFAULT 'pendente',
  tipo_operacao    text                NOT NULL,
  ponto_coleta     text                NOT NULL,
  data_solicitacao timestamptz         NOT NULL DEFAULT now(),
  data_inicio      timestamptz,
  data_conclusao   timestamptz,
  justificativa    text,
  retroativo       boolean             NOT NULL DEFAULT false,
  created_at       timestamptz         NOT NULL DEFAULT now(),
  updated_at       timestamptz         NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_solicitacoes_updated_at
  BEFORE UPDATE ON solicitacoes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_sol_status                ON solicitacoes(status);
CREATE INDEX idx_sol_cliente_status_data   ON solicitacoes(cliente_id, status, data_solicitacao DESC);
CREATE INDEX idx_sol_entregador_status     ON solicitacoes(entregador_id, status)
  WHERE status IN ('aceita','em_andamento');
CREATE INDEX idx_sol_data_conclusao        ON solicitacoes(data_conclusao);
CREATE INDEX idx_sol_codigo                ON solicitacoes(codigo);

-- 6.2 HISTÓRICO DE SOLICITAÇÕES (substitui o campo historico Json[])
CREATE TABLE IF NOT EXISTS historico_solicitacoes (
  id               uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_id   uuid        NOT NULL REFERENCES solicitacoes(id),
  tipo             text        NOT NULL,
  status_anterior  text,
  status_novo      text,
  usuario_id       uuid        REFERENCES profiles(id),
  descricao        text,
  metadata         jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hist_sol ON historico_solicitacoes(solicitacao_id, created_at DESC);

-- 6.3 ROTAS
CREATE TABLE IF NOT EXISTS rotas (
  id                uuid           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_id    uuid           NOT NULL REFERENCES solicitacoes(id),
  bairro_destino_id uuid           NOT NULL REFERENCES bairros(id),
  responsavel       text           NOT NULL,
  telefone          text           NOT NULL,
  observacoes       text,
  receber_do_cliente boolean       NOT NULL DEFAULT false,
  valor_a_receber   numeric(10,2),
  taxa_resolvida    numeric(10,2),
  regra_preco_id    uuid           REFERENCES tabela_precos_cliente(id),
  status            text           NOT NULL DEFAULT 'ativa'
                      CHECK (status IN ('ativa','concluida','cancelada')),
  created_at        timestamptz    NOT NULL DEFAULT now(),
  updated_at        timestamptz    NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_rotas_updated_at
  BEFORE UPDATE ON rotas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_rotas_solicitacao_id   ON rotas(solicitacao_id);
CREATE INDEX idx_rotas_bairro_destino   ON rotas(bairro_destino_id);

-- 6.4 JUNÇÃO: Formas de pagamento por rota
CREATE TABLE IF NOT EXISTS rota_forma_pagamento (
  rota_id            uuid NOT NULL REFERENCES rotas(id) ON DELETE CASCADE,
  forma_pagamento_id uuid NOT NULL REFERENCES formas_pagamento(id),
  PRIMARY KEY (rota_id, forma_pagamento_id)
);

-- 6.5 JUNÇÃO: Taxas extras por rota
CREATE TABLE IF NOT EXISTS rota_taxa_extra (
  rota_id      uuid           NOT NULL REFERENCES rotas(id) ON DELETE CASCADE,
  taxa_extra_id uuid           NOT NULL REFERENCES taxas_extras_config(id),
  valor         numeric(10,2)  NOT NULL,
  PRIMARY KEY (rota_id, taxa_extra_id)
);
```

## ✅ TESTE DE VALIDAÇÃO

```sql
-- TESTE 6.1 — Tabelas criadas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('solicitacoes','historico_solicitacoes','rotas',
                     'rota_forma_pagamento','rota_taxa_extra');
-- ESPERADO: 5 linhas

-- TESTE 6.2 — Código de solicitação é único
DO $$
DECLARE v_cid uuid;
BEGIN
  INSERT INTO clientes (nome,tipo,email,telefone,endereco,bairro,cidade,uf)
    VALUES ('__S__','pessoa_juridica','_s_@t.com','1','R','B','C','SP') RETURNING id INTO v_cid;

  INSERT INTO solicitacoes (codigo, cliente_id, tipo_operacao, ponto_coleta)
    VALUES ('LT-TEST-00001', v_cid, 'Normal', 'Rua Teste 1');

  BEGIN
    INSERT INTO solicitacoes (codigo, cliente_id, tipo_operacao, ponto_coleta)
      VALUES ('LT-TEST-00001', v_cid, 'Normal', 'Rua Teste 2');
    RAISE EXCEPTION 'FALHOU: código duplicado foi aceito';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASSOU: código de solicitação é único';
  END;

  DELETE FROM solicitacoes WHERE codigo = 'LT-TEST-00001';
  DELETE FROM clientes WHERE id = v_cid;
END;
$$;
-- ESPERADO: NOTICE "PASSOU"

-- TESTE 6.3 — Índices compostos criados
SELECT indexname FROM pg_indexes WHERE tablename = 'solicitacoes';
-- ESPERADO: ver idx_sol_cliente_status_data, idx_sol_entregador_status, etc.
```

## ✅ Marcar como concluído quando

Todos os 3 testes retornarem os resultados esperados.

---

---

# ETAPA 7 — Módulo Financeiro

**Status:** 🔴 Não iniciado  
**Ambiente:** Supabase SQL Editor  
**Tempo estimado:** 15 minutos  
**Pré-requisitos:** Etapa 6 concluída ✅

## O que fazer

Criar o coração financeiro: pagamentos, lançamentos (imutável), e o trigger de imutabilidade.

## SQL para executar

```sql
-- =========================================================
-- ETAPA 7: Módulo Financeiro
-- =========================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE tipo_lancamento AS ENUM (
    'receita_operacao','credito_loja','debito_loja','ajuste'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sinal_lancamento AS ENUM ('credito','debito');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE status_liquidacao AS ENUM ('pendente','liquidado','estornado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_ajuste AS ENUM ('credito','debito');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE status_despesa AS ENUM ('Pendente','Atrasado','Pago');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 7.1 PAGAMENTOS DA SOLICITAÇÃO (por rota)
CREATE TABLE IF NOT EXISTS pagamentos_solicitacao (
  id                 uuid           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_id     uuid           NOT NULL REFERENCES solicitacoes(id),
  rota_id            uuid           NOT NULL REFERENCES rotas(id),
  forma_pagamento_id uuid           NOT NULL REFERENCES formas_pagamento(id),
  valor              numeric(10,2)  NOT NULL CHECK (valor > 0),
  pertence_a         pertence_a     NOT NULL,
  observacao         text,
  created_by         uuid           REFERENCES profiles(id),
  created_at         timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX idx_pag_solicitacao_id ON pagamentos_solicitacao(solicitacao_id);
CREATE INDEX idx_pag_rota_id        ON pagamentos_solicitacao(rota_id);

-- 7.2 LANÇAMENTOS FINANCEIROS (razão contábil — IMUTÁVEL)
CREATE TABLE IF NOT EXISTS lancamentos_financeiros (
  id                uuid               NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_id    uuid               REFERENCES solicitacoes(id),
  cliente_id        uuid               NOT NULL REFERENCES clientes(id),
  fatura_id         uuid,              -- FK adicionada na Etapa 9 (após criar faturas)
  tipo              tipo_lancamento    NOT NULL,
  valor             numeric(10,2)      NOT NULL CHECK (valor > 0),
  sinal             sinal_lancamento   NOT NULL,
  status_liquidacao status_liquidacao  NOT NULL DEFAULT 'pendente',
  descricao         text,
  referencia_origem text,
  usuario_id        uuid               REFERENCES profiles(id),
  created_at        timestamptz        NOT NULL DEFAULT now()
);

CREATE INDEX idx_lanc_cliente_data   ON lancamentos_financeiros(cliente_id, created_at DESC);
CREATE INDEX idx_lanc_solicitacao    ON lancamentos_financeiros(solicitacao_id);
CREATE INDEX idx_lanc_tipo           ON lancamentos_financeiros(tipo);
CREATE INDEX idx_lanc_sinal_status   ON lancamentos_financeiros(sinal, status_liquidacao);

-- TRIGGER DE IMUTABILIDADE — lançamentos financeiros nunca podem ser alterados
CREATE OR REPLACE FUNCTION prevent_lancamentos_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'lancamentos_financeiros é imutável. Para corrigir, crie um lançamento de estorno.'
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER trg_lancamentos_immutable
  BEFORE UPDATE OR DELETE ON lancamentos_financeiros
  FOR EACH ROW EXECUTE FUNCTION prevent_lancamentos_mutation();

-- 7.3 RECARGAS PRÉ-PAGO
CREATE TABLE IF NOT EXISTS recargas_pre_pago (
  id                uuid           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id        uuid           NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  valor             numeric(10,2)  NOT NULL CHECK (valor > 0),
  observacao        text,
  registrado_por_id uuid           NOT NULL REFERENCES profiles(id),
  created_at        timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX idx_recargas_cliente_id ON recargas_pre_pago(cliente_id);

-- 7.4 DESPESAS
CREATE TABLE IF NOT EXISTS despesas (
  id               uuid           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao        text           NOT NULL,
  categoria_id     uuid           REFERENCES categorias_financeiras(id),
  fornecedor       text           NOT NULL,
  vencimento       date           NOT NULL,
  valor            numeric(10,2)  NOT NULL CHECK (valor > 0),
  status           status_despesa NOT NULL DEFAULT 'Pendente',
  data_pagamento   date,
  usuario_pagou_id uuid           REFERENCES profiles(id),
  observacao       text,
  created_at       timestamptz    NOT NULL DEFAULT now(),
  updated_at       timestamptz    NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_despesas_updated_at
  BEFORE UPDATE ON despesas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_despesas_status     ON despesas(status);
CREATE INDEX idx_despesas_vencimento ON despesas(vencimento);
CREATE INDEX idx_despesas_categoria  ON despesas(categoria_id);

-- 7.5 RECEITAS MANUAIS
CREATE TABLE IF NOT EXISTS receitas (
  id               uuid           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao        text           NOT NULL,
  categoria_id     uuid           REFERENCES categorias_financeiras(id),
  cliente_id       uuid           REFERENCES clientes(id),
  data_recebimento date           NOT NULL,
  valor            numeric(10,2)  NOT NULL CHECK (valor > 0),
  observacao       text,
  created_at       timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX idx_receitas_data      ON receitas(data_recebimento);
CREATE INDEX idx_receitas_categoria ON receitas(categoria_id);
```

## ✅ TESTE DE VALIDAÇÃO

```sql
-- TESTE 7.1 — Tabelas financeiras criadas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('pagamentos_solicitacao','lancamentos_financeiros',
                     'recargas_pre_pago','despesas','receitas');
-- ESPERADO: 5 linhas

-- TESTE 7.2 — IMUTABILIDADE: UPDATE em lancamentos_financeiros é bloqueado
DO $$
DECLARE v_cid uuid; v_lid uuid;
BEGIN
  INSERT INTO clientes (nome,tipo,email,telefone,endereco,bairro,cidade,uf)
    VALUES ('__LF__','pessoa_juridica','_lf_@t.com','1','R','B','C','SP') RETURNING id INTO v_cid;

  INSERT INTO lancamentos_financeiros
    (cliente_id, tipo, valor, sinal)
    VALUES (v_cid, 'receita_operacao', 10.00, 'credito')
    RETURNING id INTO v_lid;

  BEGIN
    UPDATE lancamentos_financeiros SET value = 99 WHERE id = v_lid;
    RAISE EXCEPTION 'FALHOU: UPDATE foi permitido em lancamento imutável';
  EXCEPTION WHEN restrict_violation THEN
    RAISE NOTICE 'PASSOU: UPDATE bloqueado em lancamentos_financeiros';
  END;

  BEGIN
    DELETE FROM lancamentos_financeiros WHERE id = v_lid;
    RAISE EXCEPTION 'FALHOU: DELETE foi permitido em lancamento imutável';
  EXCEPTION WHEN restrict_violation THEN
    RAISE NOTICE 'PASSOU: DELETE bloqueado em lancamentos_financeiros';
  END;

  -- Limpar via truncate direto (admin)
  DELETE FROM lancamentos_financeiros WHERE id = v_lid; -- vai falhar pelo trigger mesmo aqui!
  -- Usar service role ou desabilitar trigger temporariamente para limpar no dev
EXCEPTION WHEN restrict_violation THEN
  RAISE NOTICE 'INFO: cleanup do teste também foi bloqueado pelo trigger (comportamento correto)';
  DELETE FROM clientes WHERE id = v_cid; -- isso vai falhar se houver FK — ignorar
END;
$$;
-- ESPERADO: 2x "PASSOU"

-- TESTE 7.3 — Trigger de imutabilidade existe
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'trg_lancamentos_immutable';
-- ESPERADO: 1 linha

-- NOTA: Para limpar dados de teste da tabela lancamentos_financeiros no DEV,
-- desabilite temporariamente o trigger:
-- ALTER TABLE lancamentos_financeiros DISABLE TRIGGER trg_lancamentos_immutable;
-- DELETE FROM lancamentos_financeiros WHERE ...;
-- ALTER TABLE lancamentos_financeiros ENABLE TRIGGER trg_lancamentos_immutable;
```

## ✅ Marcar como concluído quando

Testes 7.1 e 7.3 passam. Teste 7.2 mostra 2x "PASSOU".

---

---

# ETAPA 8 — Caixas de Entregadores

**Status:** 🔴 Não iniciado  
**Ambiente:** Supabase SQL Editor  
**Tempo estimado:** 8 minutos  
**Pré-requisitos:** Etapas 4 e 6 concluídas ✅

## SQL para executar

```sql
-- =========================================================
-- ETAPA 8: Caixas de entregadores
-- =========================================================

DO $$ BEGIN
  CREATE TYPE status_caixa AS ENUM ('aberto','fechado','divergente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS caixas_entregadores (
  id                         uuid           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entregador_id              uuid           NOT NULL REFERENCES entregadores(id),
  data                       date           NOT NULL DEFAULT CURRENT_DATE,
  troco_inicial              numeric(10,2)  NOT NULL DEFAULT 0 CHECK (troco_inicial >= 0),
  valor_devolvido            numeric(10,2)  CHECK (valor_devolvido >= 0),
  diferenca                  numeric(10,2),
  status                     status_caixa   NOT NULL DEFAULT 'aberto',
  justificativa_divergencia  text,
  observacoes                text,
  aberto_por_id              uuid           REFERENCES profiles(id),
  fechado_por_id             uuid           REFERENCES profiles(id),
  created_at                 timestamptz    NOT NULL DEFAULT now(),
  updated_at                 timestamptz    NOT NULL DEFAULT now(),

  -- Um entregador só pode ter UM caixa aberto por dia
  CONSTRAINT uk_caixa_entregador_dia UNIQUE (entregador_id, data)
);

CREATE TRIGGER trg_caixas_updated_at
  BEFORE UPDATE ON caixas_entregadores
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_caixa_entregador_data ON caixas_entregadores(entregador_id, data DESC);
CREATE INDEX idx_caixa_status          ON caixas_entregadores(status);

-- Recebimentos dentro do caixa
CREATE TABLE IF NOT EXISTS recebimentos_caixa (
  id                 uuid           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caixa_id           uuid           NOT NULL REFERENCES caixas_entregadores(id),
  solicitacao_id     uuid           REFERENCES solicitacoes(id),
  rota_id            uuid           REFERENCES rotas(id),
  forma_pagamento_id uuid           REFERENCES formas_pagamento(id),
  valor              numeric(10,2)  NOT NULL CHECK (valor > 0),
  pertence_a         pertence_a     NOT NULL,
  observacao         text,
  created_at         timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX idx_recebimentos_caixa_id  ON recebimentos_caixa(caixa_id);
CREATE INDEX idx_recebimentos_sol_id    ON recebimentos_caixa(solicitacao_id);
```

## ✅ TESTE DE VALIDAÇÃO

```sql
-- TESTE 8.1 — Tabelas criadas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('caixas_entregadores','recebimentos_caixa');
-- ESPERADO: 2 linhas

-- TESTE 8.2 — Apenas um caixa por entregador por dia
DO $$
DECLARE v_eid uuid;
BEGIN
  INSERT INTO entregadores (nome,documento,email,telefone,cidade,bairro,veiculo,tipo_comissao,valor_comissao)
    VALUES ('__E__','000.000.000-00','_e_@t.com','1','SP','Centro','moto','percentual',10)
    RETURNING id INTO v_eid;

  INSERT INTO caixas_entregadores (entregador_id, data, troco_inicial)
    VALUES (v_eid, CURRENT_DATE, 50);

  BEGIN
    INSERT INTO caixas_entregadores (entregador_id, data, troco_inicial)
      VALUES (v_eid, CURRENT_DATE, 100);
    RAISE EXCEPTION 'FALHOU: segundo caixa no mesmo dia foi aceito';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASSOU: unique constraint por entregador+dia funciona';
  END;

  DELETE FROM caixas_entregadores WHERE entregador_id = v_eid;
  DELETE FROM entregadores WHERE id = v_eid;
END;
$$;
-- ESPERADO: NOTICE "PASSOU"
```

## ✅ Marcar como concluído quando

Ambos os testes passam.

---

---

# ETAPA 9 — Faturas e Históricos

**Status:** 🔴 Não iniciado  
**Ambiente:** Supabase SQL Editor  
**Tempo estimado:** 12 minutos  
**Pré-requisitos:** Etapa 7 concluída ✅

## SQL para executar

```sql
-- =========================================================
-- ETAPA 9: Faturas, Ajustes, Auditoria e Históricos
-- =========================================================

-- Enums de fatura
DO $$ BEGIN
  CREATE TYPE status_geral AS ENUM ('Aberta','Fechada','Paga','Finalizada','Vencida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE status_taxas AS ENUM ('Pendente','Paga','Vencida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE status_repasse AS ENUM ('Pendente','Repassado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE status_cobranca AS ENUM ('Nao_aplicavel','Pendente','Cobrado','Inadimplente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_faturamento AS ENUM ('por_entrega','semanal','mensal','diario','manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 9.1 FATURAS
CREATE TABLE IF NOT EXISTS faturas (
  id                  uuid              NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero              text              NOT NULL UNIQUE,
  cliente_id          uuid              NOT NULL REFERENCES clientes(id),
  cliente_nome        text              NOT NULL,  -- snapshot
  tipo_faturamento    tipo_faturamento  NOT NULL,
  total_entregas      integer           NOT NULL DEFAULT 0,
  data_emissao        date              NOT NULL,
  data_vencimento     date              NOT NULL,
  total_creditos_loja numeric(10,2)     NOT NULL DEFAULT 0,
  total_debitos_loja  numeric(10,2)     NOT NULL DEFAULT 0,
  saldo_liquido       numeric(10,2)     NOT NULL DEFAULT 0,
  status_geral        status_geral      NOT NULL DEFAULT 'Aberta',
  status_taxas        status_taxas      NOT NULL DEFAULT 'Pendente',
  status_repasse      status_repasse    NOT NULL DEFAULT 'Pendente',
  status_cobranca     status_cobranca   NOT NULL DEFAULT 'Nao_aplicavel',
  observacoes         text,
  created_at          timestamptz       NOT NULL DEFAULT now(),
  updated_at          timestamptz       NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_faturas_updated_at
  BEFORE UPDATE ON faturas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_faturas_cliente_status ON faturas(cliente_id, status_geral);
CREATE INDEX idx_faturas_status_geral   ON faturas(status_geral);
CREATE INDEX idx_faturas_vencimento     ON faturas(data_vencimento)
  WHERE status_geral IN ('Aberta','Vencida');

-- 9.2 Adicionar FK de lancamentos_financeiros → faturas (agora que faturas existe)
ALTER TABLE lancamentos_financeiros
  ADD CONSTRAINT fk_lancamentos_faturas
  FOREIGN KEY (fatura_id) REFERENCES faturas(id);

CREATE INDEX idx_lanc_fatura ON lancamentos_financeiros(fatura_id);

-- 9.3 HISTÓRICO DE FATURAS (substitui historico Json[])
CREATE TABLE IF NOT EXISTS historico_faturas (
  id             uuid           NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fatura_id      uuid           NOT NULL REFERENCES faturas(id),
  tipo           text           NOT NULL,
  usuario_id     uuid           REFERENCES profiles(id),
  descricao      text,
  valor_anterior numeric(10,2),
  valor_novo     numeric(10,2),
  metadata       jsonb,
  created_at     timestamptz    NOT NULL DEFAULT now()
);

CREATE INDEX idx_hist_fat ON historico_faturas(fatura_id, created_at DESC);

-- 9.4 AJUSTES FINANCEIROS
CREATE TABLE IF NOT EXISTS ajustes_financeiros (
  id             uuid       NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fatura_id      uuid       NOT NULL REFERENCES faturas(id),
  solicitacao_id uuid       REFERENCES solicitacoes(id),
  tipo           tipo_ajuste NOT NULL,
  valor          numeric(10,2) NOT NULL CHECK (valor > 0),
  motivo         text       NOT NULL,
  usuario_id     uuid       NOT NULL REFERENCES profiles(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ajustes_fatura_id ON ajustes_financeiros(fatura_id);

-- 9.5 AUDITORIA FINANCEIRA (imutável — nunca deletar)
CREATE TABLE IF NOT EXISTS auditoria_financeira (
  id             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entidade       text        NOT NULL,
  entidade_id    uuid        NOT NULL,
  campo          text,
  valor_anterior jsonb,
  valor_novo     jsonb,
  motivo         text        NOT NULL,
  usuario_id     uuid        NOT NULL REFERENCES profiles(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_auditoria_entidade   ON auditoria_financeira(entidade, entidade_id);
CREATE INDEX idx_auditoria_usuario    ON auditoria_financeira(usuario_id);
CREATE INDEX idx_auditoria_created_at ON auditoria_financeira(created_at DESC);
```

## ✅ TESTE DE VALIDAÇÃO

```sql
-- TESTE 9.1 — Tabelas criadas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('faturas','historico_faturas','ajustes_financeiros','auditoria_financeira');
-- ESPERADO: 4 linhas

-- TESTE 9.2 — FK de lancamentos → faturas foi adicionada
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name = 'lancamentos_financeiros'
  AND constraint_type = 'FOREIGN KEY'
  AND constraint_name = 'fk_lancamentos_faturas';
-- ESPERADO: 1 linha

-- TESTE 9.3 — Número de fatura é único
DO $$
DECLARE v_cid uuid;
BEGIN
  INSERT INTO clientes (nome,tipo,email,telefone,endereco,bairro,cidade,uf)
    VALUES ('__F__','pessoa_juridica','_f_@t.com','1','R','B','C','SP') RETURNING id INTO v_cid;

  INSERT INTO faturas (numero,cliente_id,cliente_nome,tipo_faturamento,data_emissao,data_vencimento)
    VALUES ('FAT-TEST-00001', v_cid, 'Teste', 'manual', CURRENT_DATE, CURRENT_DATE + 30);

  BEGIN
    INSERT INTO faturas (numero,cliente_id,cliente_nome,tipo_faturamento,data_emissao,data_vencimento)
      VALUES ('FAT-TEST-00001', v_cid, 'Teste', 'manual', CURRENT_DATE, CURRENT_DATE + 30);
    RAISE EXCEPTION 'FALHOU: número de fatura duplicado aceito';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASSOU: número de fatura é único';
  END;

  DELETE FROM faturas WHERE numero = 'FAT-TEST-00001';
  DELETE FROM clientes WHERE id = v_cid;
END;
$$;
-- ESPERADO: NOTICE "PASSOU"
```

## ✅ Marcar como concluído quando

Todos os 3 testes passam.

---

---

# ETAPA 10 — Verificação do Schema Completo

**Status:** 🔴 Não iniciado  
**Ambiente:** Supabase SQL Editor  
**Tempo estimado:** 5 minutos  
**Pré-requisitos:** Etapas 1–9 concluídas ✅

## O que fazer

Confirmar que todas as tabelas existem, sem nenhuma faltando.

## ✅ TESTE DE VALIDAÇÃO

```sql
-- TESTE 10.1 — Contagem total de tabelas criadas
SELECT COUNT(*) as total
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';
-- ESPERADO: 31 tabelas (pode variar ±1 dependendo se pg_uuidv7 cria alguma tabela auxiliar)

-- TESTE 10.2 — Lista completa de tabelas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
-- ESPERADO: as seguintes tabelas devem estar presentes:
-- ajustes_financeiros, auditoria_financeira, bairros, caixas_entregadores,
-- categorias_financeiras, clientes, despesas, entregadores, faturas,
-- feriados, formas_pagamento, historico_faturas, historico_solicitacoes,
-- lancamentos_financeiros, notification_templates, pagamentos_solicitacao,
-- profiles, recargas_pre_pago, receitas, regioes, rotas,
-- rota_forma_pagamento, rota_taxa_extra, solicitacoes,
-- system_settings, tabela_precos_cliente, taxas_extras_config,
-- tipos_operacao_config, user_preferences, webhooks, cargos,
-- recebimentos_caixa

-- TESTE 10.3 — Todos os enums criados
SELECT typname FROM pg_type
WHERE typcategory = 'E'
ORDER BY typname;
-- ESPERADO: modalidade, dia_semana, frequencia_faturamento, pertence_a,
-- role, sinal_lancamento, status_caixa, status_cobranca, status_despesa,
-- status_geral, status_liquidacao, status_repasse, status_solicitacao,
-- status_taxas, tipo_ajuste, tipo_comissao, tipo_faturamento,
-- tipo_lancamento, tipo_veiculo
```

## ✅ Marcar como concluído quando

Teste 10.2 retorna todas as tabelas esperadas.

---

---

# ETAPA 11 — RLS: Row Level Security

**Status:** 🔴 Não iniciado  
**Ambiente:** Supabase SQL Editor  
**Tempo estimado:** 20 minutos  
**Pré-requisitos:** Etapa 10 concluída ✅

## O que fazer

Habilitar RLS em todas as tabelas e criar as policies de acesso por role. Este é o passo de segurança mais crítico.

## SQL para executar

```sql
-- =========================================================
-- ETAPA 11: Row Level Security
-- =========================================================

-- 11.1 FUNÇÕES HELPER (executadas uma vez, usadas em todas as policies)

CREATE OR REPLACE FUNCTION auth_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role::text FROM public.profiles
  WHERE id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin' AND ativo = true
  );
$$;

CREATE OR REPLACE FUNCTION cliente_id_atual()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.clientes
  WHERE profile_id = (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION entregador_id_atual()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.entregadores
  WHERE profile_id = (SELECT auth.uid());
$$;

-- 11.2 HABILITAR RLS EM TODAS AS TABELAS

DO $$
DECLARE
  t text;
  tabelas text[] := ARRAY[
    'profiles','cargos','clientes','entregadores',
    'regioes','bairros','formas_pagamento','taxas_extras_config',
    'tipos_operacao_config','feriados','categorias_financeiras',
    'tabela_precos_cliente','solicitacoes','historico_solicitacoes',
    'rotas','rota_forma_pagamento','rota_taxa_extra',
    'pagamentos_solicitacao','lancamentos_financeiros','recargas_pre_pago',
    'faturas','historico_faturas','ajustes_financeiros','auditoria_financeira',
    'caixas_entregadores','recebimentos_caixa',
    'despesas','receitas',
    'notification_templates','webhooks','system_settings','user_preferences'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    RAISE NOTICE 'RLS habilitado em %', t;
  END LOOP;
END;
$$;

-- 11.3 PROFILES

CREATE POLICY "profiles_admin_all" ON profiles
  FOR ALL TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "profiles_self_select" ON profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- 11.4 TABELAS DE CONFIGURAÇÃO (admin gerencia, autenticados leem)

DO $$
DECLARE t text;
DECLARE conf_tables text[] := ARRAY[
  'cargos','regioes','bairros','formas_pagamento','taxas_extras_config',
  'tipos_operacao_config','feriados','categorias_financeiras',
  'notification_templates','webhooks'
];
BEGIN
  FOREACH t IN ARRAY conf_tables LOOP
    EXECUTE format(
      'CREATE POLICY "%s_admin_all" ON %I FOR ALL TO authenticated USING ((SELECT is_admin()))',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "%s_auth_read" ON %I FOR SELECT TO authenticated USING (true)',
      t, t
    );
    RAISE NOTICE 'Policies criadas para %', t;
  END LOOP;
END;
$$;

-- 11.5 SYSTEM_SETTINGS (apenas admin)
CREATE POLICY "system_settings_admin_only" ON system_settings
  FOR ALL TO authenticated
  USING ((SELECT is_admin()));

-- 11.6 CLIENTES

CREATE POLICY "clientes_admin_all" ON clientes
  FOR ALL TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "clientes_self_select" ON clientes
  FOR SELECT TO authenticated
  USING (
    profile_id = (SELECT auth.uid())
    AND (SELECT auth_role()) = 'cliente'
  );

-- 11.7 ENTREGADORES

CREATE POLICY "entregadores_admin_all" ON entregadores
  FOR ALL TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "entregadores_self_select" ON entregadores
  FOR SELECT TO authenticated
  USING (
    profile_id = (SELECT auth.uid())
    AND (SELECT auth_role()) = 'entregador'
  );

-- 11.8 SOLICITAÇÕES

CREATE POLICY "solicitacoes_admin_all" ON solicitacoes
  FOR ALL TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "solicitacoes_cliente_select" ON solicitacoes
  FOR SELECT TO authenticated
  USING (
    cliente_id = (SELECT cliente_id_atual())
    AND (SELECT auth_role()) = 'cliente'
  );

CREATE POLICY "solicitacoes_entregador_select" ON solicitacoes
  FOR SELECT TO authenticated
  USING (
    entregador_id = (SELECT entregador_id_atual())
    AND (SELECT auth_role()) = 'entregador'
  );

-- 11.9 ROTAS (mesma lógica de solicitações)

CREATE POLICY "rotas_admin_all" ON rotas
  FOR ALL TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "rotas_cliente_select" ON rotas
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM solicitacoes s
      WHERE s.id = rotas.solicitacao_id
        AND s.cliente_id = (SELECT cliente_id_atual())
    )
    AND (SELECT auth_role()) = 'cliente'
  );

CREATE POLICY "rotas_entregador_select" ON rotas
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM solicitacoes s
      WHERE s.id = rotas.solicitacao_id
        AND s.entregador_id = (SELECT entregador_id_atual())
    )
    AND (SELECT auth_role()) = 'entregador'
  );

-- 11.10 LANCAMENTOS_FINANCEIROS (imutável + restrito)

CREATE POLICY "lancamentos_admin_select" ON lancamentos_financeiros
  FOR SELECT TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "lancamentos_admin_insert" ON lancamentos_financeiros
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin()));

CREATE POLICY "lancamentos_cliente_select" ON lancamentos_financeiros
  FOR SELECT TO authenticated
  USING (
    cliente_id = (SELECT cliente_id_atual())
    AND (SELECT auth_role()) = 'cliente'
  );
-- Sem policy de UPDATE ou DELETE = bloqueado por padrão

-- 11.11 FATURAS

CREATE POLICY "faturas_admin_all" ON faturas
  FOR ALL TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "faturas_cliente_select" ON faturas
  FOR SELECT TO authenticated
  USING (
    cliente_id = (SELECT cliente_id_atual())
    AND (SELECT auth_role()) = 'cliente'
  );

-- 11.12 CAIXAS DE ENTREGADORES

CREATE POLICY "caixas_admin_all" ON caixas_entregadores
  FOR ALL TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "caixas_entregador_select" ON caixas_entregadores
  FOR SELECT TO authenticated
  USING (
    entregador_id = (SELECT entregador_id_atual())
    AND (SELECT auth_role()) = 'entregador'
  );

-- 11.13 USER_PREFERENCES (apenas o próprio usuário)

CREATE POLICY "prefs_own" ON user_preferences
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 11.14 AUDITORIA (apenas admin com permissão especial — sem update/delete)

CREATE POLICY "auditoria_admin_select" ON auditoria_financeira
  FOR SELECT TO authenticated
  USING ((SELECT is_admin()));

CREATE POLICY "auditoria_admin_insert" ON auditoria_financeira
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin()));

-- 11.15 Tabelas restantes — admin controla, sem acesso de cliente/entregador
DO $$
DECLARE t text;
DECLARE admin_only_tables text[] := ARRAY[
  'historico_solicitacoes','historico_faturas','ajustes_financeiros',
  'pagamentos_solicitacao','recargas_pre_pago','despesas','receitas',
  'tabela_precos_cliente','rota_forma_pagamento','rota_taxa_extra',
  'recebimentos_caixa'
];
BEGIN
  FOREACH t IN ARRAY admin_only_tables LOOP
    EXECUTE format(
      'CREATE POLICY "%s_admin_all" ON %I FOR ALL TO authenticated USING ((SELECT is_admin()))',
      t, t
    );
  END LOOP;
END;
$$;
```

## ✅ TESTE DE VALIDAÇÃO

```sql
-- TESTE 11.1 — RLS habilitado em todas as tabelas críticas
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT LIKE 'pg_%';
-- ESPERADO: 0 linhas (todas as tabelas têm RLS habilitado)

-- TESTE 11.2 — Funções helper existem
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_admin','auth_role','cliente_id_atual','entregador_id_atual');
-- ESPERADO: 4 linhas

-- TESTE 11.3 — Policies criadas (contagem mínima)
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
-- ESPERADO: >= 30 policies

-- TESTE 11.4 — Policies de solicitações por role
SELECT policyname, tablename FROM pg_policies
WHERE tablename = 'solicitacoes'
ORDER BY policyname;
-- ESPERADO: 3 policies — admin_all, cliente_select, entregador_select
```

## ❌ SE FALHAR

- **Tabela sem RLS:** Re-execute `ALTER TABLE <nome> ENABLE ROW LEVEL SECURITY; ALTER TABLE <nome> FORCE ROW LEVEL SECURITY;`
- **Policy já existe:** `DROP POLICY IF EXISTS "nome" ON tabela;` antes de recriar
- **Função criada com search_path errado:** Droppar e recriar com `SET search_path = ''`

## ✅ Marcar como concluído quando

- Teste 11.1 retorna 0 linhas (RLS 100% habilitado)
- Testes 11.2, 11.3 e 11.4 passam

---

---

# ETAPA 12 — Seeds Técnicos

**Status:** 🔴 Não iniciado  
**Ambiente:** Supabase SQL Editor  
**Tempo estimado:** 10 minutos  
**Pré-requisitos:** Etapa 11 concluída ✅

## O que fazer

Inserir os dados iniciais obrigatórios sem os quais o sistema não funciona.

## SQL para executar

```sql
-- =========================================================
-- ETAPA 12: Seeds técnicos obrigatórios
-- =========================================================

-- 12.1 CARGO ADMIN MASTER (id fixo — nunca deletar)
INSERT INTO cargos (id, name, description, sistema, permissions)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin-master',
  'Acesso total ao sistema. Não pode ser excluído.',
  true,
  ARRAY[
    'solicitacoes.view','solicitacoes.create','solicitacoes.edit',
    'solicitacoes.cancel','solicitacoes.reject','solicitacoes.assign_driver',
    'solicitacoes.conciliar','solicitacoes.conciliar_edit',
    'clientes.view','clientes.create','clientes.edit','clientes.delete','clientes.view_financeiro',
    'entregadores.view','entregadores.create','entregadores.edit','entregadores.delete',
    'entregas.view',
    'caixas.view','caixas.abrir','caixas.fechar','caixas.editar','caixas.justificar',
    'faturas.view','faturas.create','faturas.edit','faturas.delete','faturas.liquidar','faturas.edit_finalizada',
    'financeiro.view','financeiro.despesas_create','financeiro.despesas_edit','financeiro.despesas_pagar',
    'financeiro.receitas_create','financeiro.receitas_edit','financeiro.ajustes',
    'financeiro.auditoria_view','financeiro.edit_pos_fechamento',
    'relatorios.view','relatorios.export',
    'logs.view','logs.export',
    'settings.view','settings.bairros','settings.regioes','settings.formas_pagamento',
    'settings.cargos','settings.usuarios','settings.tipos_operacao','settings.tabela_precos',
    'settings.taxas_extras','settings.notificacoes','settings.webhooks','settings.integracoes'
  ]
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO cargos (name, description, sistema, permissions)
VALUES (
  'operador',
  'Operador padrão com acesso operacional',
  false,
  ARRAY[
    'solicitacoes.view','solicitacoes.create','solicitacoes.assign_driver','solicitacoes.conciliar',
    'clientes.view','entregadores.view','entregas.view',
    'caixas.view','caixas.abrir','caixas.fechar',
    'faturas.view','financeiro.view','relatorios.view','logs.view'
  ]
)
ON CONFLICT (name) DO NOTHING;

-- 12.2 FORMAS DE PAGAMENTO
INSERT INTO formas_pagamento (name, "order", enabled) VALUES
  ('Dinheiro',          1, true),
  ('PIX',               2, true),
  ('Cartão de Crédito', 3, true),
  ('Cartão de Débito',  4, true)
ON CONFLICT (name) DO NOTHING;

-- 12.3 CATEGORIAS FINANCEIRAS
INSERT INTO categorias_financeiras (nome, tipo) VALUES
  ('Combustível',       'despesa'),
  ('Manutenção',        'despesa'),
  ('Salários',          'despesa'),
  ('Aluguel',           'despesa'),
  ('Marketing',         'despesa'),
  ('Taxas Bancárias',   'despesa'),
  ('Outros',            'despesa'),
  ('Taxas de Entrega',  'receita'),
  ('Serviços Avulsos',  'receita'),
  ('Outros',            'receita')
ON CONFLICT (nome) DO NOTHING;

-- 12.4 TIPOS DE OPERAÇÃO INICIAIS
INSERT INTO tipos_operacao_config (nome, dias_semana, cor, ativo, prioridade) VALUES
  ('Normal',  ARRAY['seg','ter','qua','qui','sex'], '#3B82F6', true, 100),
  ('Urgente', ARRAY['seg','ter','qua','qui','sex','sab'], '#EF4444', true, 50),
  ('Noturno', ARRAY['seg','ter','qua','qui','sex','sab'], '#8B5CF6', true, 75)
ON CONFLICT (nome) DO NOTHING;

-- 12.5 CONFIGURAÇÕES DO SISTEMA
INSERT INTO system_settings (key, value) VALUES
  ('limite_saldo_pre_pago', '100.00'),
  ('fuso_horario',          'America/Sao_Paulo'),
  ('moeda',                 'BRL'),
  ('versao_sistema',        '2.0.0')
ON CONFLICT (key) DO NOTHING;

-- 12.6 TEMPLATES DE NOTIFICAÇÃO
INSERT INTO notification_templates (evento, categoria, mensagem, variaveis) VALUES
  (
    'solicitacao.criada', 'solicitacao',
    'Olá {{cliente_nome}}! Sua solicitação {{codigo}} foi recebida.',
    ARRAY['cliente_nome','codigo']
  ),
  (
    'solicitacao.aceita', 'solicitacao',
    'Solicitação {{codigo}} aceita! Entregador: {{entregador_nome}}.',
    ARRAY['codigo','entregador_nome']
  ),
  (
    'solicitacao.concluida', 'solicitacao',
    'Entrega {{codigo}} concluída. Total: R$ {{valor_total}}.',
    ARRAY['codigo','valor_total']
  ),
  (
    'fatura.gerada', 'fatura',
    'Fatura {{numero}} gerada. Vencimento: {{data_vencimento}}.',
    ARRAY['numero','data_vencimento']
  ),
  (
    'saldo.baixo', 'financeiro',
    'Atenção {{cliente_nome}}! Saldo pré-pago: R$ {{saldo_atual}}.',
    ARRAY['cliente_nome','saldo_atual']
  )
ON CONFLICT (evento) DO NOTHING;
```

## ✅ TESTE DE VALIDAÇÃO

```sql
-- TESTE 12.1 — Cargo admin-master com ID fixo
SELECT id, name, sistema FROM cargos WHERE name = 'admin-master';
-- ESPERADO: 1 linha com id = '00000000-0000-0000-0000-000000000001' e sistema = true

-- TESTE 12.2 — 4 formas de pagamento
SELECT COUNT(*) FROM formas_pagamento;
-- ESPERADO: 4

-- TESTE 12.3 — Categorias financeiras
SELECT COUNT(*) FROM categorias_financeiras;
-- ESPERADO: >= 9

-- TESTE 12.4 — Tipos de operação iniciais
SELECT nome, ativo FROM tipos_operacao_config ORDER BY prioridade;
-- ESPERADO: Urgente (50), Noturno (75), Normal (100)

-- TESTE 12.5 — Settings básicos
SELECT key, value FROM system_settings WHERE key IN ('limite_saldo_pre_pago','fuso_horario');
-- ESPERADO: 2 linhas com os valores corretos
```

## ✅ Marcar como concluído quando

Todos os 5 testes passam.

---

---

# ETAPA 13 — Usuário Admin Inicial

**Status:** 🔴 Não iniciado  
**Ambiente:** Supabase Dashboard > Authentication  
**Tempo estimado:** 5 minutos  
**Pré-requisitos:** Etapa 12 concluída ✅

## O que fazer

Criar o primeiro usuário admin via Supabase Dashboard (não via SQL diretamente — usar o Auth).

## Passo a passo

1. Acesse **Supabase Dashboard → Authentication → Users**
2. Clique em **"Add user"**
3. Preencha:
   - **Email:** `admin@seudominio.com.br`
   - **Password:** uma senha forte (min 12 chars, letras, números, símbolo)
   - **Auto Confirm User:** ✅ marcado
4. Clique em **"Create user"**
5. O trigger `on_auth_user_created` vai criar automaticamente o `profile`
6. Agora vincule o cargo admin-master ao profile:

```sql
-- Executar no SQL Editor após criar o usuário no Auth
UPDATE profiles
SET cargo_id = '00000000-0000-0000-0000-000000000001'
WHERE email = 'admin@seudominio.com.br';
-- Substituir pelo email real usado no passo 3
```

## ✅ TESTE DE VALIDAÇÃO

```sql
-- TESTE 13.1 — Profile do admin foi criado pelo trigger
SELECT id, nome, email, role, cargo_id
FROM profiles
WHERE email = 'admin@seudominio.com.br'; -- email real
-- ESPERADO: 1 linha com role='admin' e cargo_id preenchido

-- TESTE 13.2 — Cargo admin-master está vinculado
SELECT p.email, c.name as cargo
FROM profiles p
JOIN cargos c ON c.id = p.cargo_id
WHERE p.email = 'admin@seudominio.com.br';
-- ESPERADO: 1 linha com cargo = 'admin-master'
```

## ❌ SE FALHAR

- **Profile não foi criado:** O trigger pode ter falhado. Verificar em Dashboard > Database > Logs. Criar manualmente:
```sql
INSERT INTO profiles (id, nome, email, role)
VALUES ('<uuid-do-auth-user>', 'Admin', 'admin@seudominio.com.br', 'admin');
```
- **Trigger não existe:** Verificar Etapa 3 — reexecutar o SQL do trigger.

## ✅ Marcar como concluído quando

Ambos os testes passam. Login no frontend funciona e redireciona para `/admin`.

---

---

# ETAPA 14 — Integração com Prisma

**Status:** 🔴 Não iniciado  
**Ambiente:** Terminal do projeto  
**Tempo estimado:** 15 minutos  
**Pré-requisitos:** Etapa 13 concluída ✅

## O que fazer

Configurar o Prisma para usar o banco Supabase real, atualizar o `schema.prisma` e gerar o client.

## Passo a passo

### 14.1 Configurar variáveis de ambiente

Criar/atualizar `.env` na raiz do projeto:

```env
# Pooler (porta 6543) — usar para runtime/queries
DATABASE_URL="postgresql://postgres.[SEU-REF]:[SUA-SENHA]@aws-0-[REGIAO].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Conexão direta (porta 5432) — usar para migrations
DIRECT_URL="postgresql://postgres.[SEU-REF]:[SUA-SENHA]@aws-0-[REGIAO].pooler.supabase.com:5432/postgres"
```

> As strings exatas estão em: Supabase Dashboard → Settings → Database → Connection string

### 14.2 Atualizar datasource no schema.prisma

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### 14.3 Substituir o schema.prisma

Substituir o conteúdo do `Documentos/schema.prisma` pelo schema corrigido do `DB_ARCHITECTURE_PLAN.md` (Seção 5.1).

### 14.4 Sincronizar Prisma com banco real

```bash
# Verificar status das migrations
npx prisma migrate status

# Como o banco foi criado via SQL direto (não via Prisma migrate),
# marcar o estado inicial como baseline:
npx prisma migrate resolve --applied "0_init"

# Gerar o Prisma Client
npx prisma generate

# Validar schema
npx prisma validate
```

## ✅ TESTE DE VALIDAÇÃO

```bash
# TESTE 14.1 — Prisma consegue conectar
npx prisma db pull --print
# ESPERADO: sem erros de conexão, imprime schema detectado

# TESTE 14.2 — Prisma generate sem erros
npx prisma generate
# ESPERADO: "✔ Generated Prisma Client"

# TESTE 14.3 — Validação do schema
npx prisma validate
# ESPERADO: "The schema at prisma/schema.prisma is valid"
```

## ❌ SE FALHAR

- **Erro de conexão:** Verificar se `DATABASE_URL` está correto e se a senha não tem caracteres especiais não escapados (`@`, `#` precisam ser URL-encoded).
- **`P1001 Can't reach database`:** Use o `DIRECT_URL` temporariamente para testar conexão.
- **Divergência de schema:** Se `prisma db pull` mostrar diferenças, ajustar o `schema.prisma` conforme o banco real.

## ✅ Marcar como concluído quando

Todos os 3 testes terminam sem erros.

---

---

# ETAPA 15 — Validação End-to-End

**Status:** 🔴 Não iniciado  
**Ambiente:** App rodando localmente + Supabase  
**Tempo estimado:** 20 minutos  
**Pré-requisitos:** Etapa 14 concluída ✅

## O que fazer

Testar o fluxo completo do sistema para confirmar que banco, auth, RLS e Prisma estão integrados corretamente.

## Checklist de testes manuais

```
□ 1. Login do admin funciona e redireciona para /admin
□ 2. Dashboard admin carrega sem erros de console
□ 3. Configurações > Bairros: criar uma região e um bairro
□ 4. Configurações > Formas de Pagamento: as 4 formas aparecem
□ 5. Clientes: criar um cliente (pré-pago)
□ 6. Entregadores: criar um entregador
□ 7. Solicitações: criar uma solicitação com 1 rota
□ 8. Solicitações: aceitar → atribuir entregador → iniciar → conciliar
□ 9. Caixas: abrir caixa para o entregador, fechar caixa
□ 10. Financeiro: verificar lançamento criado pela conciliação
□ 11. Faturas: verificar se fatura foi gerada (se modalidade faturado)
□ 12. Login do cliente: verificar que só vê suas próprias solicitações
□ 13. Login do entregador: verificar que só vê suas próprias solicitações
□ 14. Cliente tentando acessar /admin → redirecionado para /cliente
```

## ✅ TESTE SQL DE VALIDAÇÃO FINAL

```sql
-- TESTE 15.1 — Fluxo financeiro: solicitação concluída gera lançamento
SELECT
  s.codigo,
  lf.tipo,
  lf.valor,
  lf.sinal
FROM solicitacoes s
JOIN lancamentos_financeiros lf ON lf.solicitacao_id = s.id
WHERE s.status = 'concluida'
ORDER BY lf.created_at DESC
LIMIT 5;
-- ESPERADO: linhas com tipo 'receita_operacao' ou 'credito_loja'

-- TESTE 15.2 — RLS: usuário não admin não vê dados de outros
-- (executar como o usuário cliente no Supabase — via anon key no app)
-- A query no app deve retornar apenas os dados do próprio cliente.

-- TESTE 15.3 — Caixa criado para o entregador existe
SELECT e.nome, c.data, c.status, c.troco_inicial
FROM caixas_entregadores c
JOIN entregadores e ON e.id = c.entregador_id
ORDER BY c.created_at DESC
LIMIT 3;
-- ESPERADO: caixa do entregador criado nos testes manuais
```

## ✅ Sistema pronto para uso real quando

- Todos os 14 itens do checklist manual marcados ✅
- Nenhum erro de console no browser
- Nenhum dado de outro usuário visível nos portais de cliente/entregador

---

---

## Resumo de Status Final

| Etapa | Descrição | Status |
|---|---|---|
| 1 | Extensões e infraestrutura | 🔴 |
| 2 | Tabelas de configuração | 🔴 |
| 3 | Profiles e Auth trigger | 🔴 |
| 4 | Clientes e Entregadores | 🔴 |
| 5 | Tabela de preços | 🔴 |
| 6 | Solicitações e Rotas | 🔴 |
| 7 | Módulo financeiro | 🔴 |
| 8 | Caixas de Entregadores | 🔴 |
| 9 | Faturas e Históricos | 🔴 |
| 10 | Verificação do schema completo | 🔴 |
| 11 | RLS — Segurança | 🔴 |
| 12 | Seeds técnicos | 🔴 |
| 13 | Usuário admin inicial | 🔴 |
| 14 | Integração Prisma | 🔴 |
| 15 | Validação end-to-end | 🔴 |

**Legenda:** 🔴 Não iniciado · 🟡 Em andamento · ✅ Concluído

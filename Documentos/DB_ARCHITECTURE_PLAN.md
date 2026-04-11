# Plano Completo de Arquitetura de Banco de Dados
## Leva e Traz v2.0 — Supabase + PostgreSQL + Prisma
**Elaborado em:** 2026-04-08  
**Revisão:** Arquiteto Sênior — Análise profunda do PRD v3.0 + schema.prisma atual

---

## 1. Resumo Executivo

O schema.prisma atual está **estruturalmente bem encaminhado**, com modelagem financeira sólida e documentação inline excelente. No entanto, existem **11 problemas críticos** que, se não corrigidos antes da virada para dados reais, vão gerar retrabalho, falhas de segurança e inconsistências contábeis em produção.

Os problemas mais graves são:
1. **`CaixaEntregador` completamente ausente** do schema — módulo inteiro sem tabela
2. **`Entregador` e `Cliente` desconectados do auth** — sem FK para `profiles`, impossível filtrar dados por usuário logado
3. **RLS zero** — todas as tabelas expostas sem política de acesso
4. **`RecargaPrePago.registradoPor` é String** em vez de UUID FK — auditoria quebrada
5. **`historico Json[]`** em `Solicitacao` e `Fatura` — não é consultável, não tem índice, não tem FK
6. **UUID v4 aleatório** como PK em todas as tabelas — gera fragmentação de índice em escala
7. **Unique constraint fraca** em `TabelaPrecoCliente` com campo nullable — permite duplicatas de regras regionais
8. **`SystemSetting` armazena chaves de API em texto puro** — risco crítico de segurança
9. **`TipoOperacaoConfig.horarioInicio/Fim` como `String`** em vez de `TIME`
10. **`Webhook` e `NotificacaoTemplate` ausentes** do schema — mencionados no PRD
11. **`permissions String[]` duplicado** em `Profile` como snapshot — pode divergir do cargo

---

## 2. Diagnóstico do Estado Atual

### 2.1 O que está bem

| Aspecto | Avaliação |
|---|---|
| Separação `operacao` vs `loja` em `PertenceA` | Excelente — resolve o risco financeiro central |
| `LancamentoFinanceiro` imutável com `TipoLancamento` | Correto — razão contábil sólido |
| Snapshot de tarifa em `Rota.taxaResolvida + regraPrecoId` | Correto — protege histório de preços |
| Algoritmo de resolução de tarifa documentado no schema | Excelente — clareza de precedência |
| Tipos de operação dinâmicos via `TipoOperacaoConfig` | Correto — extensibilidade futura |
| `AuditoriaFinanceira` como trilha imutável | Correto — compliance contábil |
| Enums bem definidos e semanticamente claros | Bom |
| `@@map()` para padronizar nomes de tabelas em snake_case | Bom |
| Documentação inline com `///` | Excelente |

### 2.2 Mapeamento completo de problemas

---

## 3. Problemas Encontrados

### PROBLEMA 1 — CaixaEntregador AUSENTE
**Gravidade:** CRÍTICO  
**O que está errado:** O modelo `CaixaEntregador` (caixa diário do entregador) não existe no schema, apesar do módulo `/admin/caixas-entregadores` e `/entregador/caixa` serem módulos de produção completos no PRD.  
**Por que é problema:** Sem a tabela, os dados do caixa não persistem — apenas existem em memória (Zustand), perdendo todos os dados ao recarregar a página.  
**Impacto real:** Impossibilidade de rastrear troco, divergências, recebimentos diários. O módulo financeiro fica sem base real.  
**Correção:**
```sql
CREATE TABLE caixas_entregadores (
  id            uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  entregador_id uuid NOT NULL REFERENCES entregadores(id),
  data_abertura timestamptz NOT NULL DEFAULT now(),
  data_fechamento timestamptz,
  troco_inicial numeric(10,2) NOT NULL DEFAULT 0,
  valor_devolvido numeric(10,2),
  total_recebido numeric(10,2) GENERATED ALWAYS AS (/* via função */) STORED,
  diferenca     numeric(10,2),
  status        text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','fechado','divergente')),
  justificativa_divergencia text,
  observacoes   text,
  aberto_por    uuid REFERENCES profiles(id),
  fechado_por   uuid REFERENCES profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
```

---

### PROBLEMA 2 — Entregador e Cliente sem vínculo com auth.users
**Gravidade:** CRÍTICO  
**O que está errado:** `Entregador` e `Cliente` não têm um campo `profileId` referenciando `profiles.id`. A tabela `profiles` existe e está correta (id = UUID do Supabase auth), mas não há como o sistema saber "qual entregador logado corresponde a este registro".  
**Por que é problema:** O portal do entregador (`/entregador/*`) e do cliente (`/cliente/*`) filtram dados por usuário. Sem esse vínculo, qualquer usuário autenticado como `entregador` pode ver dados de outro entregador — ou nenhum dado aparece, porque não há como fazer o JOIN correto.  
**Impacto real:** RLS impossível de implementar corretamente. Portais do cliente e entregador não funcionam com dados reais.  
**Correção:**
```prisma
model Cliente {
  profileId String? @unique @map("profile_id") @db.Uuid
  profile   Profile? @relation(fields: [profileId], references: [id])
  // ... resto do modelo
}

model Entregador {
  profileId String? @unique @map("profile_id") @db.Uuid
  profile   Profile? @relation(fields: [profileId], references: [id])
  // ... resto do modelo
}
```

---

### PROBLEMA 3 — RLS ausente em todas as tabelas
**Gravidade:** CRÍTICO  
**O que está errado:** Nenhuma tabela tem RLS habilitado, nenhuma policy existe.  
**Por que é problema:** Com Supabase, a API REST/realtime é exposta diretamente ao banco. Sem RLS, qualquer usuário autenticado pode fazer `SELECT * FROM clientes` via PostgREST e ver todos os clientes de todos os tenants.  
**Impacto real:** Vazamento completo de dados. Violação de LGPD. Crítico em ambiente de produção.  
**Correção:** Ver Seção 7 — Segurança e RLS. Cada tabela precisa de políticas explícitas.

---

### PROBLEMA 4 — RecargaPrePago.registradoPor é String
**Gravidade:** ALTO  
**O que está errado:**
```prisma
registradoPor String @map("registrado_por") // ID ou nome do admin
```
É uma string livre, não uma FK tipada para `profiles.id`.  
**Por que é problema:** Não há integridade referencial. Pode ser populado com qualquer string. Joins impossíveis. Auditoria quebrada.  
**Impacto real:** Impossível rastrear quem fez a recarga. Auditoria financeira incompleta.  
**Correção:**
```prisma
registradoPorId String  @map("registrado_por_id") @db.Uuid
registradoPor   Profile @relation(fields: [registradoPorId], references: [id])
```

---

### PROBLEMA 5 — historico Json[] em Solicitacao e Fatura
**Gravidade:** ALTO  
**O que está errado:** O histórico de eventos é armazenado como `Json[]` arrays nas próprias tabelas de `Solicitacao` e `Fatura`.  
**Por que é problema:**
- Arrays JSON no PostgreSQL não têm índice eficiente
- Não é possível fazer queries como "todas alterações feitas pelo usuário X"
- Grow-only — a linha de solicitação cresce indefinidamente com o histórico
- Impossível paginar, filtrar, ou auditar histórico de forma eficiente
- Viola a imutabilidade pretendida (pode ser sobrescrito)

**Impacto real:** Queries de log lentas, impossível exportar histórico padronizado, dificuldade de auditoria.  
**Correção:** Criar tabelas dedicadas:
```sql
CREATE TABLE historico_solicitacoes (
  id             uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  solicitacao_id uuid NOT NULL REFERENCES solicitacoes(id),
  tipo           text NOT NULL,
  status_anterior text,
  status_novo    text,
  usuario_id     uuid REFERENCES profiles(id),
  descricao      text,
  metadata       jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON historico_solicitacoes(solicitacao_id, created_at DESC);

CREATE TABLE historico_faturas (
  id         uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  fatura_id  uuid NOT NULL REFERENCES faturas(id),
  tipo       text NOT NULL,
  usuario_id uuid REFERENCES profiles(id),
  descricao  text,
  valor_anterior numeric(10,2),
  valor_novo     numeric(10,2),
  metadata       jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON historico_faturas(fatura_id, created_at DESC);
```

---

### PROBLEMA 6 — UUID v4 como PK em todas as tabelas
**Gravidade:** MÉDIO-ALTO  
**O que está errado:** Todas as PKs usam `@default(uuid())` que gera UUID v4 aleatório.  
**Por que é problema:** UUID v4 é aleatório — inserts em tabelas grandes causam fragmentação de índice B-tree, aumentando I/O, tamanho de índice e degradando performance de INSERT progressivamente.  
**Impacto real:** Em tabelas como `lancamentos_financeiros`, `historico_solicitacoes`, `pagamentos_solicitacao` (alta frequência de insert), a degradação é perceptível ao atingir ~500K–1M registros.  
**Correção:** Usar `uuid_generate_v7()` (UUIDv7, time-ordered) com a extensão `pg_uuidv7`:
```sql
CREATE EXTENSION IF NOT EXISTS pg_uuidv7;
-- Todas as novas tabelas: DEFAULT uuid_generate_v7()
```
Para tabelas de configuração de baixo volume (ex: `cargos`, `bairros`, `regioes`), UUID v4 é aceitável.

---

### PROBLEMA 7 — Unique constraint fraca em TabelaPrecoCliente
**Gravidade:** ALTO  
**O que está errado:**
```prisma
@@unique([clienteId, bairroDestinoId, tipoOperacao], name: "uq_cliente_bairro_tipo")
```
`bairroDestinoId` pode ser `NULL` (para regras regionais). Em PostgreSQL, `NULL ≠ NULL` em constraints UNIQUE — duas linhas com `(clienteId=X, bairroDestinoId=NULL, tipoOperacao=Y)` **não violam** a constraint porque NULL não é igual a NULL.  
**Por que é problema:** É possível ter múltiplas regras regionais duplicadas para o mesmo cliente + tipo, quebrando o algoritmo de resolução de tarifa.  
**Correção:** Usar partial unique indexes:
```sql
-- Regras de bairro específico
CREATE UNIQUE INDEX uq_tabela_precos_bairro
  ON tabela_precos_cliente(cliente_id, bairro_destino_id, tipo_operacao)
  WHERE bairro_destino_id IS NOT NULL AND regiao_id IS NULL;

-- Regras regionais
CREATE UNIQUE INDEX uq_tabela_precos_regiao
  ON tabela_precos_cliente(cliente_id, regiao_id, tipo_operacao)
  WHERE regiao_id IS NOT NULL AND bairro_destino_id IS NULL;
```

---

### PROBLEMA 8 — SystemSetting armazena chaves de API em texto puro
**Gravidade:** CRÍTICO (segurança)  
**O que está errado:** `SystemSetting.value String?` armazena `stripe_secret_key`, `whatsapp_token`, `google_maps_key` como texto puro no banco.  
**Por que é problema:** Qualquer admin com acesso ao Supabase Dashboard, em qualquer query ad-hoc, vê as chaves. Backups expõem segredos. Logs de query podem vazar tokens.  
**Impacto real:** Comprometimento de integrações externas via acesso indevido ao banco.  
**Correção:** Usar **Supabase Vault** para chaves sensíveis:
```sql
-- Armazenar segredo
SELECT vault.create_secret('whatsapp_token', 'Bearer XXXX', 'WhatsApp API Token');
-- Ler segredo (apenas service role)
SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'whatsapp_token';
```
Em `SystemSetting`, armazenar apenas a referência (nome do secret no vault), nunca o valor:
```sql
-- Em vez de: value = 'Bearer XXXX'
-- Armazenar: value = 'vault:whatsapp_token'
```

---

### PROBLEMA 9 — TipoOperacaoConfig.horarioInicio/Fim como String
**Gravidade:** BAIXO-MÉDIO  
**O que está errado:** `horarioInicio String?` e `horarioFim String?` com formato `"HH:mm"` como string.  
**Por que é problema:** Sem validação de tipo no banco. Ordenaçao e comparação temporal impossível sem cast. Possível entrada inválida ("25:99").  
**Correção:**
```prisma
horarioInicio DateTime? @map("horario_inicio") @db.Time
horarioFim    DateTime? @map("horario_fim")    @db.Time
```
No Prisma, `@db.Time` mapeia para `TIME WITHOUT TIME ZONE` no PostgreSQL.

---

### PROBLEMA 10 — Webhook e NotificacaoTemplate ausentes
**Gravidade:** MÉDIO  
**O que está errado:** O PRD descreve (seção 5.11.11 e 5.11.12) CRUD completo de templates de notificação WhatsApp e endpoints webhook, mas nenhum dos dois modelos existe no schema.  
**Por que é problema:** Dados temporários no Zustand, perdidos ao recarregar.  
**Correção:** Adicionar modelos (ver Seção 4 — Modelagem ideal).

---

### PROBLEMA 11 — permissions[] duplicado em Profile
**Gravidade:** MÉDIO  
**O que está errado:**
```prisma
model Profile {
  permissions String[] // Snapshot das permissões do cargo no último login
```
**Por que é problema:** Esse array pode divergir do cargo atual (se permissões do cargo forem alteradas, os snapshots ficam stale até o próximo login). É uma fonte de inconsistência silenciosa.  
**Impacto real:** Usuário que teve permissão revogada ainda a vê até re-logar. Pior: permissão concedida não aparece até re-logar.  
**Correção:** Remover `permissions[]` de `Profile`. Sempre derivar permissões do relacionamento com `Cargo` em tempo real via query ou policy. O snapshot já é o papel do `Cargo.permissions[]`.

---

### PROBLEMA 12 — Modelo Bairro mapeado para "neighborhoods" (inglês)
**Gravidade:** BAIXO  
**O que está errado:** `@@map("neighborhoods")` sendo que todos os outros modelos usam português.  
**Por que é problema:** Inconsistência de nomenclatura — dificulta leitura de queries SQL diretas.  
**Correção:** `@@map("bairros")`

---

### PROBLEMA 13 — Fatura tem campos "legados" sem deprecation clara
**Gravidade:** MÉDIO  
**O que está errado:** `valorTaxas`, `valorRepasse` (campos legados) coexistem com `totalCreditosLoja`, `totalDebitosLoja`, `saldoLiquido` (campos novos) sem mecanismo de enforcement de qual usar.  
**Por que é problema:** Possível leitura de campo errado por código legacy ou novo desenvolvedor.  
**Correção:** Mover campos legados para uma view de compatibilidade ou removê-los junto com `valorTotalTaxas`/`valorTotalRepasse` em `Solicitacao`. Documentar explicitamente no schema qual é a fonte de verdade.

---

### PROBLEMA 14 — Despesa.categoria como String livre
**Gravidade:** MÉDIO  
**O que está errado:** `categoria String` em `Despesa` e `Receita` sem referência a tabela de categorias. O PRD menciona que categorias são gerenciadas em configurações.  
**Por que é problema:** Categorias podem ser digitadas errado, criando inconsistência nos relatórios de despesas por categoria.  
**Correção:** Criar tabela `categoria_financeira` com CRUD e FK.

---

## 4. Modelagem Ideal Proposta

### 4.1 Diagrama de entidades (resumo de relacionamentos)

```
auth.users (Supabase)
    └── profiles (1:1)
            ├── cargos (N:1)
            ├── clientes (1:1, via profile_id)
            ├── entregadores (1:1, via profile_id)
            └── user_preferences (1:N)

clientes
    ├── solicitacoes (1:N)
    ├── faturas (1:N)
    ├── tabela_precos_cliente (1:N)
    ├── lancamentos_financeiros (1:N)
    └── recargas_pre_pago (1:N)

entregadores
    ├── solicitacoes (1:N)
    └── caixas_entregadores (1:N)

solicitacoes
    ├── rotas (1:N)
    │       ├── rota_forma_pagamento (N:M com formas_pagamento)
    │       ├── rota_taxa_extra (N:M com taxas_extras_config)
    │       └── pagamentos_solicitacao (1:N)
    ├── lancamentos_financeiros (1:N)
    ├── ajustes_financeiros (1:N)
    └── historico_solicitacoes (1:N)  ← NOVO

faturas
    ├── lancamentos_financeiros (1:N)
    ├── ajustes_financeiros (1:N)
    └── historico_faturas (1:N)  ← NOVO

regioes
    └── bairros (1:N)

bairros
    ├── tabela_precos_cliente (N:M)
    └── rotas (1:N)

caixas_entregadores  ← NOVO
    └── recebimentos_caixa (1:N)  ← NOVO

categorias_financeiras  ← NOVO
    ├── despesas (1:N)
    └── receitas (1:N)

notification_templates  ← NOVO
webhooks  ← NOVO
```

### 4.2 Tabelas novas a criar

#### `caixas_entregadores`
```sql
CREATE TABLE caixas_entregadores (
  id                          uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  entregador_id               uuid NOT NULL REFERENCES entregadores(id),
  data                        date NOT NULL DEFAULT CURRENT_DATE,
  troco_inicial               numeric(10,2) NOT NULL DEFAULT 0,
  valor_devolvido             numeric(10,2),
  diferenca                   numeric(10,2),
  status                      text NOT NULL DEFAULT 'aberto'
                                CHECK (status IN ('aberto','fechado','divergente')),
  justificativa_divergencia   text,
  observacoes                 text,
  aberto_por_id               uuid REFERENCES profiles(id),
  fechado_por_id              uuid REFERENCES profiles(id),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uk_caixa_entregador_dia UNIQUE (entregador_id, data)
  -- Um entregador só pode ter um caixa por dia
);
CREATE INDEX ON caixas_entregadores(entregador_id, data DESC);
CREATE INDEX ON caixas_entregadores(status);
```

#### `recebimentos_caixa`
```sql
CREATE TABLE recebimentos_caixa (
  id                  uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  caixa_id            uuid NOT NULL REFERENCES caixas_entregadores(id),
  solicitacao_id      uuid REFERENCES solicitacoes(id),
  rota_id             uuid REFERENCES rotas(id),
  forma_pagamento_id  uuid REFERENCES formas_pagamento(id),
  valor               numeric(10,2) NOT NULL,
  pertence_a          text NOT NULL CHECK (pertence_a IN ('operacao','loja')),
  observacao          text,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON recebimentos_caixa(caixa_id);
CREATE INDEX ON recebimentos_caixa(solicitacao_id);
```

#### `historico_solicitacoes` (substitui `historico Json[]`)
```sql
CREATE TABLE historico_solicitacoes (
  id               uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  solicitacao_id   uuid NOT NULL REFERENCES solicitacoes(id),
  tipo             text NOT NULL,
  status_anterior  text,
  status_novo      text,
  usuario_id       uuid REFERENCES profiles(id),
  descricao        text,
  metadata         jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON historico_solicitacoes(solicitacao_id, created_at DESC);
CREATE INDEX ON historico_solicitacoes(usuario_id);
```

#### `historico_faturas` (substitui `historico Json[]`)
```sql
CREATE TABLE historico_faturas (
  id             uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  fatura_id      uuid NOT NULL REFERENCES faturas(id),
  tipo           text NOT NULL,
  usuario_id     uuid REFERENCES profiles(id),
  descricao      text,
  valor_anterior numeric(10,2),
  valor_novo     numeric(10,2),
  metadata       jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON historico_faturas(fatura_id, created_at DESC);
```

#### `categorias_financeiras`
```sql
CREATE TABLE categorias_financeiras (
  id          uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  nome        text NOT NULL UNIQUE,
  tipo        text NOT NULL CHECK (tipo IN ('despesa','receita','ambos')),
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
-- Seeds obrigatórios para despesas: Combustível, Manutenção, Salários, Aluguel, Marketing, Outros
-- Seeds obrigatórios para receitas: Taxas de Entrega, Serviços Avulsos, Outros
```

#### `notification_templates`
```sql
CREATE TABLE notification_templates (
  id           uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  evento       text NOT NULL UNIQUE,
  categoria    text NOT NULL,
  mensagem     text NOT NULL,
  variaveis    text[] NOT NULL DEFAULT '{}',
  ativo        boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
```

#### `webhooks`
```sql
CREATE TABLE webhooks (
  id         uuid DEFAULT uuid_generate_v7() PRIMARY KEY,
  nome       text NOT NULL,
  url        text NOT NULL,
  secret     text,   -- armazenar hash, nunca plain text
  eventos    text[] NOT NULL DEFAULT '{}',
  status     text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','erro')),
  ultimo_erro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

---

## 5. Ajustes no Schema Prisma

### 5.1 Schema Prisma corrigido e expandido

Abaixo está o schema completo com todas as correções aplicadas. As seções marcadas com `// ← CORRIGIDO` ou `// ← NOVO` indicam mudanças em relação ao schema atual.

```prisma
// =============================================================================
// PRISMA SCHEMA — LEVA E TRAZ v2.0 — REVISADO PARA PRODUÇÃO
// =============================================================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")        // Pooler (porta 6543) para runtime
  directUrl = env("DIRECT_URL")          // Conexão direta para migrations
}

// =============================================================================
// ENUMS (sem alterações, todos corretos)
// =============================================================================

enum Role {
  admin
  cliente
  entregador
}

enum StatusSolicitacao {
  pendente
  aceita
  em_andamento
  concluida
  cancelada
  rejeitada
}

enum Modalidade {
  pre_pago
  faturado
}

enum FrequenciaFaturamento {
  diario
  semanal
  mensal
  por_entrega
}

enum DiaSemana {
  domingo
  segunda
  terca
  quarta
  quinta
  sexta
  sabado
}

enum DiaSemanaConfig {
  seg
  ter
  qua
  qui
  sex
  sab
  dom
}

enum TipoComissao {
  percentual
  fixo
}

enum TipoVeiculo {
  moto
  carro
  bicicleta
  a_pe
}

enum StatusGeral {
  Aberta
  Fechada
  Paga
  Finalizada
  Vencida
}

enum StatusTaxas {
  Pendente
  Paga
  Vencida
}

enum StatusRepasse {
  Pendente
  Repassado
}

enum StatusCobranca {
  Nao_aplicavel
  Pendente
  Cobrado
  Inadimplente
}

enum TipoFaturamento {
  por_entrega
  semanal
  mensal
  diario
  manual
}

enum StatusDespesa {
  Pendente
  Atrasado
  Pago
}

enum PertenceA {
  operacao
  loja
}

enum TipoLancamento {
  receita_operacao
  credito_loja
  debito_loja
  ajuste
}

enum SinalLancamento {
  credito
  debito
}

enum StatusLiquidacao {
  pendente
  liquidado
  estornado
}

enum TipoAjuste {
  credito
  debito
}

enum StatusCaixa {                           // ← NOVO
  aberto
  fechado
  divergente
}

// =============================================================================
// AUTENTICAÇÃO E PERFIS
// =============================================================================

/// Perfil do usuário autenticado via Supabase Auth.
/// id = UUID do auth.users do Supabase.
/// CORRIGIDO: removido permissions[] — sempre derivar do cargo em tempo real.
model Profile {
  id      String  @id @db.Uuid
  nome    String
  email   String  @unique
  role    Role
  avatar  String?
  cargoId String? @map("cargo_id") @db.Uuid
  ativo   Boolean @default(true)             // ← NOVO: para inativar sem deletar

  cargo Cargo? @relation(fields: [cargoId], references: [id])

  // Vínculos com entidades de negócio
  clienteVinculado    Cliente?    @relation("ProfileCliente")    // ← NOVO
  entregadorVinculado Entregador? @relation("ProfileEntregador") // ← NOVO

  // Relações de auditoria
  despesasPagas       Despesa[]              @relation("DespesaPagaPor")
  lancamentos         LancamentoFinanceiro[]
  pagamentos          PagamentoSolicitacao[]
  ajustes             AjusteFinanceiro[]
  auditoria           AuditoriaFinanceira[]
  systemSettingsEdits SystemSetting[]
  preferencias        UserPreference[]
  caixasAbertos       CaixaEntregador[]      @relation("CaixaAbertoPor")  // ← NOVO
  caixasFechados      CaixaEntregador[]      @relation("CaixaFechadoPor") // ← NOVO
  recargasRegistradas RecargaPrePago[]                                    // ← NOVO (FK corrigida)

  createdAt DateTime @default(now()) @map("created_at")

  @@map("profiles")
}

model Cargo {
  id          String   @id @default(uuid()) @db.Uuid
  name        String   @unique
  description String?
  permissions String[]
  sistema     Boolean  @default(false)       // ← NOVO: cargos sistema não podem ser deletados

  users Profile[]

  @@map("cargos")
}

// =============================================================================
// CLIENTES (LOJAS)
// =============================================================================

model Cliente {
  id        String  @id @default(uuid()) @db.Uuid
  profileId String? @unique @map("profile_id") @db.Uuid // ← NOVO: vínculo com auth
  nome      String
  tipo      String  // 'pessoa_fisica' | 'pessoa_juridica'
  documento String? // ← NOVO: CPF ou CNPJ (era ausente)
  email     String  @unique
  telefone  String
  endereco  String
  bairro    String
  cidade    String
  uf        String  @db.Char(2)
  chavePix  String?

  status     String    @default("ativo") // 'ativo' | 'inativo' | 'bloqueado'
  modalidade Modalidade @default(pre_pago)

  ativarFaturamentoAutomatico     Boolean                @default(false) @map("ativar_faturamento_automatico")
  frequenciaFaturamento           FrequenciaFaturamento? @map("frequencia_faturamento")
  numeroDeEntregasParaFaturamento Int?                   @map("numero_de_entregas_para_faturamento")
  diaDaSemanaFaturamento          DiaSemana?             @map("dia_da_semana_faturamento")
  diaDoMesFaturamento             Int?                   @map("dia_do_mes_faturamento")

  profile      Profile?               @relation("ProfileCliente", fields: [profileId], references: [id]) // ← NOVO
  solicitacoes Solicitacao[]
  faturas      Fatura[]
  tabelaPrecos TabelaPrecoCliente[]
  lancamentos  LancamentoFinanceiro[]
  recargas     RecargaPrePago[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([status])
  @@index([modalidade])
  @@map("clientes")
}

// =============================================================================
// ENTREGADORES
// =============================================================================

model Entregador {
  id        String      @id @default(uuid()) @db.Uuid
  profileId String?     @unique @map("profile_id") @db.Uuid // ← NOVO: vínculo com auth
  nome      String
  documento String      // CPF
  email     String      @unique
  telefone  String
  cidade    String
  bairro    String
  veiculo   TipoVeiculo
  status    String      @default("ativo") // 'ativo' | 'inativo'
  avatar    String?

  tipoComissao  TipoComissao @map("tipo_comissao")
  valorComissao Decimal      @map("valor_comissao") @db.Decimal(10, 2)

  profile      Profile?        @relation("ProfileEntregador", fields: [profileId], references: [id]) // ← NOVO
  solicitacoes Solicitacao[]
  caixas       CaixaEntregador[]                                                                      // ← NOVO

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([status])
  @@map("entregadores")
}

// =============================================================================
// CAIXA DE ENTREGADORES — NOVO
// =============================================================================

/// Caixa diário do entregador.
/// REGRA: Um entregador só pode ter um caixa aberto por dia (UNIQUE por entregador+data).
/// REGRA: Ao fechar, calcular diferenca = totalRecebido - trocoInicial - valorDevolvido.
/// REGRA: diferenca != 0 → status = divergente.
model CaixaEntregador {
  id                        String      @id @default(uuid()) @db.Uuid
  entregadorId              String      @map("entregador_id") @db.Uuid
  data                      DateTime    @db.Date
  trocoInicial              Decimal     @default(0) @map("troco_inicial") @db.Decimal(10, 2)
  valorDevolvido            Decimal?    @map("valor_devolvido") @db.Decimal(10, 2)
  diferenca                 Decimal?    @db.Decimal(10, 2)
  status                    StatusCaixa @default(aberto)
  justificativaDivergencia  String?     @map("justificativa_divergencia")
  observacoes               String?
  abertoPorId               String?     @map("aberto_por_id") @db.Uuid
  fechadoPorId              String?     @map("fechado_por_id") @db.Uuid

  entregador  Entregador        @relation(fields: [entregadorId], references: [id])
  abertoPor   Profile?          @relation("CaixaAbertoPor", fields: [abertoPorId], references: [id])
  fechadoPor  Profile?          @relation("CaixaFechadoPor", fields: [fechadoPorId], references: [id])
  recebimentos RecebimentoCaixa[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@unique([entregadorId, data])
  @@index([entregadorId, data])
  @@index([status])
  @@map("caixas_entregadores")
}

/// Recebimentos registrados no caixa do entregador durante o dia.
model RecebimentoCaixa {
  id               String    @id @default(uuid()) @db.Uuid
  caixaId          String    @map("caixa_id") @db.Uuid
  solicitacaoId    String?   @map("solicitacao_id") @db.Uuid
  rotaId           String?   @map("rota_id") @db.Uuid
  formaPagamentoId String?   @map("forma_pagamento_id") @db.Uuid
  valor            Decimal   @db.Decimal(10, 2)
  pertenceA        PertenceA @map("pertence_a")
  observacao       String?

  caixa          CaixaEntregador @relation(fields: [caixaId], references: [id])
  solicitacao    Solicitacao?    @relation(fields: [solicitacaoId], references: [id])
  formaPagamento FormaPagamento? @relation(fields: [formaPagamentoId], references: [id])

  createdAt DateTime @default(now()) @map("created_at")

  @@index([caixaId])
  @@index([solicitacaoId])
  @@map("recebimentos_caixa")
}

// =============================================================================
// CATEGORIAS FINANCEIRAS — NOVO
// =============================================================================

model CategoriaFinanceira {
  id     String  @id @default(uuid()) @db.Uuid
  nome   String  @unique
  tipo   String  // 'despesa' | 'receita' | 'ambos'
  ativo  Boolean @default(true)

  despesas Despesa[]
  receitas Receita[]

  createdAt DateTime @default(now()) @map("created_at")

  @@map("categorias_financeiras")
}

// =============================================================================
// NOTIFICAÇÕES E WEBHOOKS — NOVO
// =============================================================================

model NotificacaoTemplate {
  id        String   @id @default(uuid()) @db.Uuid
  evento    String   @unique
  categoria String
  mensagem  String
  variaveis String[] @default([])
  ativo     Boolean  @default(true)

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("notification_templates")
}

model Webhook {
  id        String   @id @default(uuid()) @db.Uuid
  nome      String
  url       String
  secretHash String? @map("secret_hash") // Hash do secret, nunca o valor plain
  eventos   String[] @default([])
  status    String   @default("ativo") // 'ativo' | 'inativo' | 'erro'
  ultimoErro String? @map("ultimo_erro")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("webhooks")
}

// =============================================================================
// CONFIGURAÇÕES GEOGRÁFICAS E DE PRECIFICAÇÃO
// (sem alterações estruturais, apenas correção do @@map de Bairro)
// =============================================================================

model Regiao {
  id          String  @id @default(uuid()) @db.Uuid
  name        String  @unique
  description String?

  bairros      Bairro[]
  tabelaPrecos TabelaPrecoCliente[]

  @@map("regioes")
}

model Bairro {
  id          String  @id @default(uuid()) @db.Uuid
  nome        String
  regionId    String  @map("region_id") @db.Uuid
  taxaEntrega Decimal @map("taxa_entrega") @db.Decimal(10, 2)

  regiao  Regiao               @relation(fields: [regionId], references: [id])
  rotas   Rota[]
  precos  TabelaPrecoCliente[]

  @@unique([nome, regionId])  // ← NOVO: bairro único por região
  @@map("bairros")            // ← CORRIGIDO: era "neighborhoods"
}

model FormaPagamento {
  id          String  @id @default(uuid()) @db.Uuid
  name        String  @unique
  description String?
  enabled     Boolean @default(true)
  order       Int     @default(100)

  pagamentos       PagamentoSolicitacao[]
  rotas            RotaFormaPagamento[]
  recebimentosCaixa RecebimentoCaixa[]   // ← NOVO

  @@map("formas_pagamento")
}

model TaxaExtraConfig {
  id          String  @id @default(uuid()) @db.Uuid
  nome        String
  valorPadrao Decimal @map("valor_padrao") @db.Decimal(10, 2)
  ativo       Boolean @default(true)

  rotasTaxasExtras RotaTaxaExtra[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("taxas_extras_config")
}

model TipoOperacaoConfig {
  id            String            @id @default(uuid()) @db.Uuid
  nome          String            @unique
  descricao     String?
  diasSemana    DiaSemanaConfig[] @map("dias_semana")
  horarioInicio DateTime?         @map("horario_inicio") @db.Time  // ← CORRIGIDO: era String
  horarioFim    DateTime?         @map("horario_fim")    @db.Time  // ← CORRIGIDO: era String
  aplicaFeriado Boolean           @default(false) @map("aplica_feriado")
  cor           String
  ativo         Boolean           @default(true)
  prioridade    Int               @default(100)

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("tipos_operacao_config")
}

model Feriado {
  id         String   @id @default(uuid()) @db.Uuid
  nome       String
  data       DateTime @db.Date
  recorrente Boolean  @default(false)
  ativo      Boolean  @default(true)

  createdAt DateTime @default(now()) @map("created_at")

  @@map("feriados")
}

// =============================================================================
// TABELA DE PREÇOS POR CLIENTE
// =============================================================================

model TabelaPrecoCliente {
  id              String  @id @default(uuid()) @db.Uuid
  clienteId       String  @map("cliente_id") @db.Uuid
  bairroDestinoId String? @map("bairro_destino_id") @db.Uuid
  regiaoId        String? @map("regiao_id") @db.Uuid
  tipoOperacao    String  @default("todos") @map("tipo_operacao")
  taxaBase        Decimal @map("taxa_base") @db.Decimal(10, 2)
  taxaRetorno     Decimal @default(0) @map("taxa_retorno") @db.Decimal(10, 2)
  taxaEspera      Decimal @default(0) @map("taxa_espera") @db.Decimal(10, 2)
  taxaUrgencia    Decimal @default(0) @map("taxa_urgencia") @db.Decimal(10, 2)
  ativo           Boolean @default(true)
  prioridade      Int     @default(100)
  observacao      String?

  cliente Cliente  @relation(fields: [clienteId], references: [id], onDelete: Cascade)
  bairro  Bairro?  @relation(fields: [bairroDestinoId], references: [id])
  regiao  Regiao?  @relation(fields: [regiaoId], references: [id])
  rotas   Rota[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // CORRIGIDO: Unique constraints separadas para regras de bairro e região
  // (via partial indexes em SQL — não suportado diretamente no Prisma @@unique com WHERE)
  // Aplicar via migration SQL:
  // CREATE UNIQUE INDEX uq_precos_bairro ON tabela_precos_cliente(cliente_id, bairro_destino_id, tipo_operacao)
  //   WHERE bairro_destino_id IS NOT NULL AND regiao_id IS NULL;
  // CREATE UNIQUE INDEX uq_precos_regiao ON tabela_precos_cliente(cliente_id, regiao_id, tipo_operacao)
  //   WHERE regiao_id IS NOT NULL AND bairro_destino_id IS NULL;
  @@index([clienteId, bairroDestinoId, tipoOperacao, ativo, prioridade], name: "idx_tabela_precos_lookup")
  @@map("tabela_precos_cliente")
}

// =============================================================================
// SOLICITAÇÕES
// =============================================================================

model Solicitacao {
  id              String  @id @default(uuid()) @db.Uuid
  codigo          String  @unique
  clienteId       String  @map("cliente_id") @db.Uuid
  entregadorId    String? @map("entregador_id") @db.Uuid
  status          StatusSolicitacao @default(pendente)
  tipoOperacao    String  @map("tipo_operacao")
  pontoColeta     String  @map("ponto_coleta")
  dataSolicitacao DateTime @default(now()) @map("data_solicitacao")
  dataInicio      DateTime? @map("data_inicio")
  dataConclusao   DateTime? @map("data_conclusao")
  justificativa   String?
  retroativo      Boolean @default(false)

  // DEPRECIADO — mantido apenas para compatibilidade. Não usar em código novo.
  // Fonte de verdade: lancamentos_financeiros
  // valorTotalTaxas   Decimal? @map("valor_total_taxas") @db.Decimal(10, 2)
  // valorTotalRepasse Decimal? @map("valor_total_repasse") @db.Decimal(10, 2)

  cliente    Cliente     @relation(fields: [clienteId], references: [id])
  entregador Entregador? @relation(fields: [entregadorId], references: [id])
  rotas      Rota[]
  pagamentos PagamentoSolicitacao[]
  lancamentos LancamentoFinanceiro[]
  ajustes    AjusteFinanceiro[]
  historico  HistoricoSolicitacao[]   // ← CORRIGIDO: era Json[]
  recebimentos RecebimentoCaixa[]     // ← NOVO

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([status])
  @@index([clienteId, status])
  @@index([entregadorId, status])
  @@index([dataSolicitacao])
  @@index([dataConclusao])
  @@index([codigo])
  @@map("solicitacoes")
}

/// Histórico de eventos da solicitação — substitui historico Json[].
model HistoricoSolicitacao {
  id             String  @id @default(uuid()) @db.Uuid
  solicitacaoId  String  @map("solicitacao_id") @db.Uuid
  tipo           String
  statusAnterior String? @map("status_anterior")
  statusNovo     String? @map("status_novo")
  usuarioId      String? @map("usuario_id") @db.Uuid
  descricao      String?
  metadata       Json?

  solicitacao Solicitacao @relation(fields: [solicitacaoId], references: [id])

  createdAt DateTime @default(now()) @map("created_at")

  @@index([solicitacaoId, createdAt(sort: Desc)])
  @@map("historico_solicitacoes")
}

model Rota {
  id              String  @id @default(uuid()) @db.Uuid
  solicitacaoId   String  @map("solicitacao_id") @db.Uuid
  bairroDestinoId String  @map("bairro_destino_id") @db.Uuid
  responsavel     String
  telefone        String
  observacoes     String?
  receberDoCliente Boolean @default(false) @map("receber_do_cliente")
  valorAReceber   Decimal? @map("valor_a_receber") @db.Decimal(10, 2)
  taxaResolvida   Decimal? @map("taxa_resolvida") @db.Decimal(10, 2)
  regraPrecoId    String?  @map("regra_preco_id") @db.Uuid
  status          String   @default("ativa") // 'ativa' | 'concluida' | 'cancelada'

  solicitacao Solicitacao        @relation(fields: [solicitacaoId], references: [id])
  bairro      Bairro             @relation(fields: [bairroDestinoId], references: [id])
  regraPreco  TabelaPrecoCliente? @relation(fields: [regraPrecoId], references: [id])

  meiosPagamentoAceitos RotaFormaPagamento[]
  taxasExtras           RotaTaxaExtra[]
  pagamentos            PagamentoSolicitacao[]

  @@index([solicitacaoId])
  @@index([bairroDestinoId])
  @@map("rotas")
}

model RotaFormaPagamento {
  rotaId           String @map("rota_id") @db.Uuid
  formaPagamentoId String @map("forma_pagamento_id") @db.Uuid

  rota  Rota           @relation(fields: [rotaId], references: [id])
  forma FormaPagamento @relation(fields: [formaPagamentoId], references: [id])

  @@id([rotaId, formaPagamentoId])
  @@map("rota_forma_pagamento")
}

model RotaTaxaExtra {
  rotaId      String  @map("rota_id") @db.Uuid
  taxaExtraId String  @map("taxa_extra_id") @db.Uuid
  valor       Decimal @db.Decimal(10, 2)

  rota Rota            @relation(fields: [rotaId], references: [id])
  taxa TaxaExtraConfig @relation(fields: [taxaExtraId], references: [id])

  @@id([rotaId, taxaExtraId])
  @@map("rota_taxa_extra")
}

// =============================================================================
// CONCILIAÇÃO
// =============================================================================

model PagamentoSolicitacao {
  id               String    @id @default(uuid()) @db.Uuid
  solicitacaoId    String    @map("solicitacao_id") @db.Uuid
  rotaId           String    @map("rota_id") @db.Uuid
  formaPagamentoId String    @map("forma_pagamento_id") @db.Uuid
  valor            Decimal   @db.Decimal(10, 2)
  pertenceA        PertenceA @map("pertence_a")
  observacao       String?
  createdBy        String?   @map("created_by") @db.Uuid

  solicitacao    Solicitacao    @relation(fields: [solicitacaoId], references: [id])
  rota           Rota           @relation(fields: [rotaId], references: [id])
  formaPagamento FormaPagamento @relation(fields: [formaPagamentoId], references: [id])
  criador        Profile?       @relation(fields: [createdBy], references: [id])

  createdAt DateTime @default(now()) @map("created_at")

  @@index([solicitacaoId])
  @@index([rotaId])
  @@map("pagamentos_solicitacao")
}

// =============================================================================
// LANÇAMENTOS FINANCEIROS
// =============================================================================

model LancamentoFinanceiro {
  id               String           @id @default(uuid()) @db.Uuid
  solicitacaoId    String?          @map("solicitacao_id") @db.Uuid
  clienteId        String           @map("cliente_id") @db.Uuid
  faturaId         String?          @map("fatura_id") @db.Uuid
  tipo             TipoLancamento
  valor            Decimal          @db.Decimal(10, 2)
  sinal            SinalLancamento
  statusLiquidacao StatusLiquidacao @default(pendente) @map("status_liquidacao")
  descricao        String?
  referenciaOrigem String?          @map("referencia_origem")
  usuarioId        String?          @map("usuario_id") @db.Uuid

  solicitacao Solicitacao? @relation(fields: [solicitacaoId], references: [id])
  cliente     Cliente      @relation(fields: [clienteId], references: [id])
  fatura      Fatura?      @relation(fields: [faturaId], references: [id])
  usuario     Profile?     @relation(fields: [usuarioId], references: [id])

  createdAt DateTime @default(now()) @map("created_at")

  @@index([clienteId, createdAt])
  @@index([solicitacaoId])
  @@index([faturaId])
  @@index([tipo])
  @@index([sinal, statusLiquidacao])
  @@map("lancamentos_financeiros")
}

// =============================================================================
// FATURAS
// =============================================================================

model Fatura {
  id              String          @id @default(uuid()) @db.Uuid
  numero          String          @unique
  clienteId       String          @map("cliente_id") @db.Uuid
  clienteNome     String          @map("cliente_nome")
  tipoFaturamento TipoFaturamento @map("tipo_faturamento")
  totalEntregas   Int             @default(0) @map("total_entregas")
  dataEmissao     DateTime        @map("data_emissao")
  dataVencimento  DateTime        @map("data_vencimento")

  // Campos calculados dos lancamentos_financeiros (fonte de verdade)
  totalCreditosLoja Decimal @default(0) @map("total_creditos_loja") @db.Decimal(10, 2)
  totalDebitosLoja  Decimal @default(0) @map("total_debitos_loja") @db.Decimal(10, 2)
  saldoLiquido      Decimal @default(0) @map("saldo_liquido") @db.Decimal(10, 2)

  statusGeral    StatusGeral    @default(Aberta) @map("status_geral")
  statusTaxas    StatusTaxas    @default(Pendente) @map("status_taxas")
  statusRepasse  StatusRepasse  @default(Pendente) @map("status_repasse")
  statusCobranca StatusCobranca @default(Nao_aplicavel) @map("status_cobranca")

  observacoes String?

  cliente     Cliente                @relation(fields: [clienteId], references: [id])
  lancamentos LancamentoFinanceiro[]
  ajustes     AjusteFinanceiro[]
  historico   HistoricoFatura[]      // ← CORRIGIDO: era Json[]

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([clienteId, statusGeral])
  @@index([statusGeral])
  @@index([dataVencimento])
  @@map("faturas")
}

/// Histórico de eventos da fatura — substitui historico Json[].
model HistoricoFatura {
  id             String   @id @default(uuid()) @db.Uuid
  faturaId       String   @map("fatura_id") @db.Uuid
  tipo           String
  usuarioId      String?  @map("usuario_id") @db.Uuid
  descricao      String?
  valorAnterior  Decimal? @map("valor_anterior") @db.Decimal(10, 2)
  valorNovo      Decimal? @map("valor_novo") @db.Decimal(10, 2)
  metadata       Json?

  fatura Fatura @relation(fields: [faturaId], references: [id])

  createdAt DateTime @default(now()) @map("created_at")

  @@index([faturaId, createdAt(sort: Desc)])
  @@map("historico_faturas")
}

// =============================================================================
// FINANCEIRO OPERACIONAL
// =============================================================================

model Despesa {
  id           String        @id @default(uuid()) @db.Uuid
  descricao    String
  categoriaId  String?       @map("categoria_id") @db.Uuid  // ← CORRIGIDO: era String livre
  fornecedor   String
  vencimento   DateTime
  valor        Decimal       @db.Decimal(10, 2)
  status       StatusDespesa @default(Pendente)
  dataPagamento  DateTime?   @map("data_pagamento")
  usuarioPagouId String?     @map("usuario_pagou_id") @db.Uuid
  observacao   String?

  categoria    CategoriaFinanceira? @relation(fields: [categoriaId], references: [id])
  usuarioPagou Profile?             @relation("DespesaPagaPor", fields: [usuarioPagouId], references: [id])

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([status])
  @@index([vencimento])
  @@index([categoriaId])
  @@map("despesas")
}

model Receita {
  id              String   @id @default(uuid()) @db.Uuid
  descricao       String
  categoriaId     String?  @map("categoria_id") @db.Uuid  // ← CORRIGIDO: era String livre
  clienteId       String?  @map("cliente_id") @db.Uuid
  dataRecebimento DateTime @map("data_recebimento")
  valor           Decimal  @db.Decimal(10, 2)
  observacao      String?

  categoria CategoriaFinanceira? @relation(fields: [categoriaId], references: [id])

  createdAt DateTime @default(now()) @map("created_at")

  @@index([dataRecebimento])
  @@index([categoriaId])
  @@map("receitas")
}

// =============================================================================
// RECARGAS PRÉ-PAGO
// =============================================================================

model RecargaPrePago {
  id              String   @id @default(uuid()) @db.Uuid
  clienteId       String   @map("cliente_id") @db.Uuid
  valor           Decimal  @db.Decimal(10, 2)
  observacao      String?
  registradoPorId String   @map("registrado_por_id") @db.Uuid  // ← CORRIGIDO: era String livre

  cliente       Cliente @relation(fields: [clienteId], references: [id], onDelete: Cascade)
  registradoPor Profile @relation(fields: [registradoPorId], references: [id])

  createdAt DateTime @default(now()) @map("created_at")

  @@index([clienteId])
  @@map("recargas_pre_pago")
}

// =============================================================================
// AUDITORIA E AJUSTES FINANCEIROS
// =============================================================================

model AjusteFinanceiro {
  id            String     @id @default(uuid()) @db.Uuid
  faturaId      String     @map("fatura_id") @db.Uuid
  solicitacaoId String?    @map("solicitacao_id") @db.Uuid
  tipo          TipoAjuste
  valor         Decimal    @db.Decimal(10, 2)
  motivo        String
  usuarioId     String     @map("usuario_id") @db.Uuid

  fatura      Fatura      @relation(fields: [faturaId], references: [id])
  solicitacao Solicitacao? @relation(fields: [solicitacaoId], references: [id])
  usuario     Profile      @relation(fields: [usuarioId], references: [id])

  createdAt DateTime @default(now()) @map("created_at")

  @@index([faturaId])
  @@map("ajustes_financeiros")
}

model AuditoriaFinanceira {
  id         String  @id @default(uuid()) @db.Uuid
  entidade   String
  entidadeId String  @map("entidade_id") @db.Uuid
  campo      String?
  valorAnterior Json?  @map("valor_anterior")
  valorNovo     Json?  @map("valor_novo")
  motivo     String
  usuarioId  String  @map("usuario_id") @db.Uuid
  usuario    Profile @relation(fields: [usuarioId], references: [id])

  createdAt DateTime @default(now()) @map("created_at")

  @@index([entidade, entidadeId])
  @@index([usuarioId])
  @@index([createdAt])
  @@map("auditoria_financeira")
}

// =============================================================================
// CONFIGURAÇÕES DO SISTEMA
// =============================================================================

/// IMPORTANTE: Nunca armazenar segredos (API keys, tokens) diretamente em value.
/// Use Supabase Vault para segredos e armazene apenas 'vault:<nome_do_secret>' aqui.
model SystemSetting {
  key       String  @id
  value     String? // Para segredos: 'vault:<nome_do_secret>'
  updatedBy String? @map("updated_by") @db.Uuid

  usuario Profile? @relation(fields: [updatedBy], references: [id])

  updatedAt DateTime @default(now()) @updatedAt @map("updated_at")

  @@map("system_settings")
}

model UserPreference {
  userId String @map("user_id") @db.Uuid
  key    String
  value  Json

  user Profile @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([userId, key])
  @@map("user_preferences")
}
```

---

## 6. Plano de Implementação em Fases

### FASE 1 — Extensões e Infraestrutura (Pré-requisito)
**Objetivo:** Preparar o banco para todas as fases seguintes.  
**Dependências:** Nenhuma — executar primeiro.

```sql
-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_uuidv7";      -- UUIDs time-ordered
CREATE EXTENSION IF NOT EXISTS "pgcrypto";        -- hash de secrets
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- monitoramento de queries
-- Supabase Vault (já habilitado por padrão em projetos Supabase)

-- Função helper para updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

**Critério de conclusão:** Extensões instaladas, função `set_updated_at` criada.

---

### FASE 2 — Tabelas de Configuração e Referência
**Objetivo:** Criar tabelas que são referenciadas por todo o resto.  
**Ordem exata de criação:**

1. `cargos`
2. `profiles` (após auth.users existir)
3. `regioes`
4. `bairros`
5. `formas_pagamento`
6. `taxas_extras_config`
7. `tipos_operacao_config`
8. `feriados`
9. `categorias_financeiras`

**Cuidado:** `profiles` deve ser criada antes de qualquer tabela que referencia usuários.

**Critério de conclusão:** Todas as tabelas de configuração criadas com PKs e UQs. Seeds básicos inseridos (ver Fase 8).

---

### FASE 3 — Entidades de Negócio Principais
**Objetivo:** Criar tabelas operacionais.  
**Ordem:**

1. `clientes` (referencia `profiles`)
2. `entregadores` (referencia `profiles`)
3. `tabela_precos_cliente` (referencia `clientes`, `bairros`, `regioes`)
4. `solicitacoes` (referencia `clientes`, `entregadores`)
5. `rotas` (referencia `solicitacoes`, `bairros`, `tabela_precos_cliente`)
6. `rota_forma_pagamento` (referencia `rotas`, `formas_pagamento`)
7. `rota_taxa_extra` (referencia `rotas`, `taxas_extras_config`)

**Cuidado:** Aplicar partial unique indexes em `tabela_precos_cliente` aqui (não podem ser expressados no Prisma, exigem SQL manual):
```sql
CREATE UNIQUE INDEX uq_precos_bairro
  ON tabela_precos_cliente(cliente_id, bairro_destino_id, tipo_operacao)
  WHERE bairro_destino_id IS NOT NULL AND regiao_id IS NULL;

CREATE UNIQUE INDEX uq_precos_regiao
  ON tabela_precos_cliente(cliente_id, regiao_id, tipo_operacao)
  WHERE regiao_id IS NOT NULL AND bairro_destino_id IS NULL;
```

**Critério de conclusão:** Tabelas operacionais criadas. Constraints validadas.

---

### FASE 4 — Módulo Financeiro
**Objetivo:** Criar o coração financeiro do sistema.  
**Ordem:**

1. `pagamentos_solicitacao`
2. `lancamentos_financeiros`
3. `faturas`
4. `historico_faturas`
5. `historico_solicitacoes`
6. `ajustes_financeiros`
7. `auditoria_financeira`
8. `recargas_pre_pago`
9. `despesas`
10. `receitas`

**Cuidado:** `lancamentos_financeiros` deve ser configurada como append-only via RLS (INSERT permitido, UPDATE e DELETE negados — ver Fase 5).

**Critério de conclusão:** Módulo financeiro completo. Trigger de imutabilidade em `lancamentos_financeiros` ativo.

```sql
-- Trigger de imutabilidade
CREATE OR REPLACE FUNCTION prevent_lancamentos_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'lancamentos_financeiros é imutável. Crie um estorno para corrigir.';
END;
$$;

CREATE TRIGGER lancamentos_financeiros_immutable
  BEFORE UPDATE OR DELETE ON lancamentos_financeiros
  FOR EACH ROW EXECUTE FUNCTION prevent_lancamentos_update();
```

---

### FASE 5 — Caixas de Entregadores
**Objetivo:** Criar módulo de caixa diário.  
**Ordem:**

1. `caixas_entregadores`
2. `recebimentos_caixa`

**Constraint crítica:** Apenas um caixa por entregador por dia.

**Critério de conclusão:** Tabelas criadas, constraint `UNIQUE(entregador_id, data)` aplicada.

---

### FASE 6 — Configurações Extras
**Objetivo:** Criar tabelas de suporte às configurações do sistema.  
**Ordem:**

1. `notification_templates`
2. `webhooks`
3. `system_settings`
4. `user_preferences`

**Critério de conclusão:** Tabelas criadas. Seeds de `notification_templates` inseridos.

---

### FASE 7 — Autenticação e Vínculo com Supabase Auth

**Objetivo:** Integrar `profiles` com `auth.users` e habilitar o fluxo de login.

```sql
-- Trigger para criar profile automaticamente ao criar usuário no Supabase Auth
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
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.role, 'admin')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Fluxo de criação de cliente/entregador:**
1. Admin cria cliente → sistema cria `auth.user` com role 'cliente' → trigger cria `profiles` → admin faz UPDATE em `clientes.profile_id = novo_profile.id`
2. Mesmo fluxo para entregador

**Critério de conclusão:** Trigger funcionando. Primeiro usuário admin criado. Login funcional redirecionando por role.

---

### FASE 8 — Segurança e RLS
**Objetivo:** Aplicar Row Level Security em todas as tabelas.  
**Ver Seção 7 para detalhes completos.**

**Critério de conclusão:** RLS habilitado em todas as tabelas. Policies testadas para cada role (admin, cliente, entregador). Nenhuma tabela acessível sem autenticação exceto `profiles` com policy correta.

---

### FASE 9 — Seeds e Dados Iniciais
**Ver Seção 10 para seeds detalhados.**

**Critério de conclusão:** Admin master cadastrado. Configurações básicas inseridas. Sistema operável sem configuração manual.

---

### FASE 10 — Integração com Prisma e Testes
**Objetivo:** Garantir que o Prisma Client gerado reflita o banco real.

```bash
# 1. Configurar .env com DATABASE_URL e DIRECT_URL
# DATABASE_URL=postgresql://[user]:[password]@[pooler-host]:6543/postgres?pgbouncer=true
# DIRECT_URL=postgresql://[user]:[password]@[direct-host]:5432/postgres

# 2. Fazer pull do schema real para validar
npx prisma db pull

# 3. Gerar o client
npx prisma generate

# 4. Rodar migrations (modo produção)
npx prisma migrate deploy
```

**Critério de conclusão:** `prisma generate` sem erros. `prisma validate` limpo. Queries básicas funcionando.

---

### FASE 11 — Preparação para Produção
**Ver Seção 11 para detalhes completos.**

---

## 7. Segurança e RLS

### 7.1 Estratégia geral

O sistema tem 3 roles com acesso completamente separado:
- `admin` — acesso total a tudo (filtrado por cargo/permissões na aplicação)
- `cliente` — vê apenas seus próprios dados
- `entregador` — vê apenas suas próprias solicitações e caixa

**Regra fundamental:** `auth.uid()` em policies deve ser sempre envolvido em `(SELECT auth.uid())` para evitar chamada por linha (100x+ mais lento):

```sql
-- ERRADO — auth.uid() chamado para cada linha
CREATE POLICY "..." ON tabela USING (user_id = auth.uid());

-- CORRETO — chamado uma vez, cacheado
CREATE POLICY "..." ON tabela USING (user_id = (SELECT auth.uid()));
```

### 7.2 Funções helper de segurança

```sql
-- Verificar role do usuário atual
CREATE OR REPLACE FUNCTION auth_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role::text FROM public.profiles WHERE id = (SELECT auth.uid());
$$;

-- Verificar se usuário é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'admin');
$$;

-- Obter cliente_id do usuário logado (se for cliente)
CREATE OR REPLACE FUNCTION cliente_id_atual()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.clientes WHERE profile_id = (SELECT auth.uid());
$$;

-- Obter entregador_id do usuário logado (se for entregador)
CREATE OR REPLACE FUNCTION entregador_id_atual()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM public.entregadores WHERE profile_id = (SELECT auth.uid());
$$;
```

### 7.3 Policies por tabela crítica

#### `profiles`
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

-- Admin vê todos
CREATE POLICY "admin_all" ON profiles
  FOR ALL TO authenticated
  USING ((SELECT is_admin()));

-- Usuário vê apenas seu próprio perfil
CREATE POLICY "self_select" ON profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "self_update" ON profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));
```

#### `solicitacoes`
```sql
ALTER TABLE solicitacoes ENABLE ROW LEVEL SECURITY;

-- Admin vê tudo
CREATE POLICY "admin_all" ON solicitacoes
  FOR ALL TO authenticated
  USING ((SELECT is_admin()));

-- Cliente vê apenas suas solicitações
CREATE POLICY "cliente_select" ON solicitacoes
  FOR SELECT TO authenticated
  USING (
    cliente_id = (SELECT cliente_id_atual())
    AND (SELECT auth_role()) = 'cliente'
  );

-- Entregador vê apenas solicitações atribuídas a ele
CREATE POLICY "entregador_select" ON solicitacoes
  FOR SELECT TO authenticated
  USING (
    entregador_id = (SELECT entregador_id_atual())
    AND (SELECT auth_role()) = 'entregador'
  );
```

#### `lancamentos_financeiros`
```sql
ALTER TABLE lancamentos_financeiros ENABLE ROW LEVEL SECURITY;

-- INSERT: apenas service role e authenticated (via RPC)
CREATE POLICY "admin_insert" ON lancamentos_financeiros
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin()));

-- SELECT: admin vê tudo; cliente vê apenas seus lançamentos
CREATE POLICY "admin_select" ON lancamentos_financeiros
  FOR SELECT TO authenticated
  USING (
    (SELECT is_admin())
    OR cliente_id = (SELECT cliente_id_atual())
  );

-- UPDATE e DELETE: NINGUÉM (imutável — enforced também via trigger)
-- Nenhuma policy de UPDATE ou DELETE = bloqueado por padrão
```

#### `caixas_entregadores`
```sql
ALTER TABLE caixas_entregadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all" ON caixas_entregadores
  FOR ALL TO authenticated
  USING ((SELECT is_admin()));

-- Entregador vê apenas seu próprio caixa
CREATE POLICY "entregador_select" ON caixas_entregadores
  FOR SELECT TO authenticated
  USING (
    entregador_id = (SELECT entregador_id_atual())
    AND (SELECT auth_role()) = 'entregador'
  );
```

#### `clientes`
```sql
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all" ON clientes
  FOR ALL TO authenticated
  USING ((SELECT is_admin()));

-- Cliente vê apenas seu próprio registro
CREATE POLICY "self_select" ON clientes
  FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));

-- Cliente pode atualizar apenas campos de perfil (não status, modalidade, etc.)
-- Isso é melhor enforced via RPC/função do que via RLS diretamente
```

#### `system_settings`
```sql
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Apenas admins, nunca expor ao public
CREATE POLICY "admin_only" ON system_settings
  FOR ALL TO authenticated
  USING ((SELECT is_admin()));
```

#### `auditoria_financeira`
```sql
ALTER TABLE auditoria_financeira ENABLE ROW LEVEL SECURITY;

-- Apenas SELECT para admin (com permissão financeiro.auditoria_view)
-- INSERT via service role apenas
CREATE POLICY "admin_select" ON auditoria_financeira
  FOR SELECT TO authenticated
  USING ((SELECT is_admin()));

-- Sem UPDATE, sem DELETE — tabela apenas cresce
```

### 7.4 Tabelas públicas de referência (read-only para autenticados)
```sql
-- formas_pagamento, bairros, regioes, tipos_operacao_config
-- São dados de configuração — qualquer role autenticado pode ler
ALTER TABLE formas_pagamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_read" ON formas_pagamento
  FOR SELECT TO authenticated USING (true);
-- Repetir para bairros, regioes, tipos_operacao_config, taxas_extras_config
```

### 7.5 Riscos comuns no Supabase

| Risco | Prevenção |
|---|---|
| Tabelas criadas sem RLS ficam expostas pela API REST | Sempre `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` imediatamente |
| `auth.uid()` chamado por linha em policies | Sempre usar `(SELECT auth.uid())` |
| Service role key exposta no frontend | NUNCA usar service role no cliente React — apenas no backend/edge functions |
| Backup expõe dados sensíveis | Usar Supabase Vault para segredos, criptografia em repouso já é padrão |
| Policies excessivamente permissivas em desenvolvimento | Auditar todas as policies antes de ir para produção |

---

## 8. Performance e Escalabilidade

### 8.1 Índices essenciais além dos já definidos

```sql
-- Lookup de solicitações por cliente+status (tela mais acessada)
CREATE INDEX idx_sol_cliente_status_data
  ON solicitacoes(cliente_id, status, data_solicitacao DESC);

-- Lookup rápido de solicitações ativas do entregador
CREATE INDEX idx_sol_entregador_status
  ON solicitacoes(entregador_id, status)
  WHERE status IN ('aceita', 'em_andamento');

-- Conciliação: pagamentos por solicitação (frequente na abertura do modal)
CREATE INDEX idx_pag_sol_rota
  ON pagamentos_solicitacao(solicitacao_id, rota_id);

-- Relatórios financeiros por período
CREATE INDEX idx_lanc_cliente_data
  ON lancamentos_financeiros(cliente_id, created_at DESC);

CREATE INDEX idx_lanc_tipo_sinal
  ON lancamentos_financeiros(tipo, sinal, status_liquidacao);

-- Faturas vencidas (badge no header)
CREATE INDEX idx_faturas_vencidas
  ON faturas(data_vencimento)
  WHERE status_geral IN ('Aberta', 'Vencida');

-- Alertas de saldo pré-pago (consulta frequente)
CREATE INDEX idx_clientes_modalidade_status
  ON clientes(modalidade, status)
  WHERE modalidade = 'pre_pago' AND status = 'ativo';

-- Caixa do dia (carregado ao abrir portal do entregador)
CREATE INDEX idx_caixa_entregador_data
  ON caixas_entregadores(entregador_id, data DESC);

-- Lookup de tabela de preços (algoritmo de resolução — crítico)
-- Já está definido no schema, mas confirmar:
CREATE INDEX IF NOT EXISTS idx_tabela_precos_lookup
  ON tabela_precos_cliente(cliente_id, bairro_destino_id, tipo_operacao, ativo, prioridade)
  WHERE ativo = true;

-- Histórico por entidade (para os novos modelos de historico)
CREATE INDEX idx_hist_sol ON historico_solicitacoes(solicitacao_id, created_at DESC);
CREATE INDEX idx_hist_fat ON historico_faturas(fatura_id, created_at DESC);
```

### 8.2 Índices para RLS policies (obrigatório)
```sql
-- Todas as colunas usadas em RLS policies devem ter índice
CREATE INDEX IF NOT EXISTS idx_clientes_profile_id ON clientes(profile_id);
CREATE INDEX IF NOT EXISTS idx_entregadores_profile_id ON entregadores(profile_id);
-- profiles.id já é PK — não precisa de índice adicional
```

### 8.3 Paginação

**Sempre usar cursor-based pagination** para listas grandes (solicitações, lançamentos, logs):

```sql
-- ERRADO — OFFSET degrada com volume
SELECT * FROM solicitacoes ORDER BY created_at DESC LIMIT 20 OFFSET 1000;

-- CORRETO — cursor-based
SELECT * FROM solicitacoes
WHERE created_at < $last_cursor
ORDER BY created_at DESC
LIMIT 20;
```

No Prisma:
```typescript
const items = await prisma.solicitacao.findMany({
  take: 20,
  skip: 1, // pula o cursor
  cursor: { id: lastId },
  orderBy: { dataSolicitacao: 'desc' }
});
```

### 8.4 N+1 Query prevention

Problemas comuns nesse schema:

```typescript
// ERRADO — N+1 ao listar solicitações com entregador e cliente
const solic = await prisma.solicitacao.findMany();
// Para cada uma: await prisma.cliente.findOne(...)

// CORRETO — eager loading
const solic = await prisma.solicitacao.findMany({
  include: {
    cliente: { select: { id: true, nome: true } },
    entregador: { select: { id: true, nome: true } },
    rotas: { select: { id: true, bairro: true, status: true } },
    _count: { select: { rotas: true } }
  }
});
```

### 8.5 Vistas materializadas para relatórios pesados

Para relatórios que agregam dados de meses (financeiro, comissões):
```sql
CREATE MATERIALIZED VIEW resumo_financeiro_mensal AS
SELECT
  date_trunc('month', lf.created_at) AS mes,
  lf.cliente_id,
  lf.tipo,
  SUM(CASE WHEN lf.sinal = 'credito' THEN lf.valor ELSE -lf.valor END) AS total
FROM lancamentos_financeiros lf
GROUP BY 1, 2, 3;

CREATE UNIQUE INDEX ON resumo_financeiro_mensal(mes, cliente_id, tipo);

-- Refrescar periodicamente (Edge Function agendada)
REFRESH MATERIALIZED VIEW CONCURRENTLY resumo_financeiro_mensal;
```

### 8.6 Quando desnormalizar

| Situação | Decisão |
|---|---|
| `solicitacoes.codigo` já é gerado e armazenado | Correto — evita recálculo |
| `faturas.cliente_nome` snapshot | Correto — protege histórico |
| `rotas.taxa_resolvida` snapshot | Correto — imutabilidade tarifária |
| Saldo do cliente (pré-pago) | **NÃO desnormalizar** — calcular de `recargas_pre_pago - SUM(lançamentos)` com cache Redis/Edge Function, ou view materializada. Saldo armazenado diretamente em `clientes` gera risco de inconsistência |
| Métricas de dashboard | Usar views materializadas ou Edge Functions com cache, não armazenar em tabelas |

---

## 9. Estratégia de Migrations

### 9.1 Configuração dual URL (obrigatório no Supabase)

```env
# .env
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

O `DATABASE_URL` com pooler é usado pelo Prisma Client em runtime.  
O `DIRECT_URL` é usado **exclusivamente** pelo `prisma migrate` para evitar problemas com prepared statements no PgBouncer.

### 9.2 Workflow de migrations

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Local Dev     │ → │   Supabase Dev  │ → │   Supabase Prod │
│ (Docker Postgres│    │  (branch)       │    │  (main)         │
│  ou Supabase CLI│    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Fluxo:**
1. Alterar `schema.prisma` localmente
2. `npx prisma migrate dev --name descricao_da_mudanca` → cria arquivo em `prisma/migrations/`
3. Testar localmente
4. `git push` → CI roda `npx prisma migrate deploy` no branch Supabase
5. Validar no branch Supabase (staging)
6. Merge para main → `npx prisma migrate deploy` em produção

### 9.3 Migrations perigosas — como lidar

| Operação perigosa | Abordagem segura |
|---|---|
| Renomear coluna | Adicionar nova coluna → copiar dados → atualizar código → remover antiga (3 deploys) |
| DROP TABLE | Nunca em produção diretamente — mover para schema de arquivo primeiro |
| ALTER TABLE ADD COLUMN NOT NULL sem default | Primeiro adicionar com DEFAULT → atualizar dados → remover DEFAULT |
| Alterar enum | Adicionar novo valor primeiro (é seguro) → migrar dados → remover valor antigo |
| Alterar tipo de coluna | Criar nova coluna → trigger de sincronização → migrar → swap |
| Índice em tabela grande | `CREATE INDEX CONCURRENTLY` — não bloqueia escritas |

### 9.4 Evitar drift Prisma ↔ banco

Migrations manuais SQL (como os partial unique indexes e triggers) devem ser incluídas nos arquivos de migration do Prisma como SQL raw:

```typescript
// Em um arquivo de migration gerado pelo Prisma
-- SQL manual para partial unique indexes
CREATE UNIQUE INDEX uq_precos_bairro
  ON tabela_precos_cliente(cliente_id, bairro_destino_id, tipo_operacao)
  WHERE bairro_destino_id IS NOT NULL AND regiao_id IS NULL;
```

Ou via `prisma/migrations/manual_TIMESTAMP_descricao.sql` + `npx prisma migrate resolve`.

### 9.5 Validação antes de subir

```bash
# Verificar se schema está em sync com banco
npx prisma migrate status

# Dry-run para ver SQL que seria executado
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script
```

---

## 10. Seeds e Dados Iniciais

### 10.1 Regra fundamental

Separar seed **técnico** (necessário para funcionar) do seed **demonstração** (dados de teste/mockados).

```
prisma/
  seed.ts         → seed técnico (obrigatório em TODOS os ambientes)
  seed-demo.ts    → seed de demonstração (apenas dev/staging)
```

### 10.2 Seeds obrigatórios (técnicos)

#### Cargos
```typescript
const cargos = [
  {
    id: '00000000-0000-0000-0000-000000000001', // ID fixo — não deletável
    name: 'admin-master',
    description: 'Acesso total ao sistema',
    sistema: true,
    permissions: [/* todas as permissions */],
  },
  {
    name: 'operador',
    description: 'Operador padrão',
    sistema: false,
    permissions: ['solicitacoes.view', 'solicitacoes.create', /* ... */],
  }
];
```

#### Formas de Pagamento
```typescript
const formasPagamento = [
  { name: 'Dinheiro',           order: 1, enabled: true },
  { name: 'PIX',                order: 2, enabled: true },
  { name: 'Cartão de Crédito',  order: 3, enabled: true },
  { name: 'Cartão de Débito',   order: 4, enabled: true },
];
```

#### Categorias Financeiras
```typescript
const categorias = [
  { nome: 'Combustível',         tipo: 'despesa' },
  { nome: 'Manutenção',          tipo: 'despesa' },
  { nome: 'Salários',            tipo: 'despesa' },
  { nome: 'Aluguel',             tipo: 'despesa' },
  { nome: 'Marketing',           tipo: 'despesa' },
  { nome: 'Taxas Bancárias',     tipo: 'despesa' },
  { nome: 'Outros (Despesa)',    tipo: 'despesa' },
  { nome: 'Taxas de Entrega',    tipo: 'receita' },
  { nome: 'Serviços Avulsos',    tipo: 'receita' },
  { nome: 'Outros (Receita)',    tipo: 'receita' },
];
```

#### System Settings iniciais
```typescript
const settings = [
  { key: 'limite_saldo_pre_pago', value: '100.00' },
  { key: 'fuso_horario',          value: 'America/Sao_Paulo' },
  { key: 'moeda',                 value: 'BRL' },
];
```

#### Tipos de Operação iniciais
```typescript
const tiposOperacao = [
  {
    nome: 'Normal',
    diasSemana: ['seg','ter','qua','qui','sex'],
    cor: '#3B82F6',
    ativo: true,
    prioridade: 100
  },
  {
    nome: 'Urgente',
    diasSemana: ['seg','ter','qua','qui','sex','sab'],
    cor: '#EF4444',
    ativo: true,
    prioridade: 50
  },
];
```

#### Notification Templates iniciais
```typescript
const templates = [
  {
    evento: 'solicitacao.criada',
    categoria: 'solicitacao',
    mensagem: 'Olá {{cliente_nome}}! Sua solicitação {{codigo}} foi recebida e está em análise.',
    variaveis: ['cliente_nome', 'codigo']
  },
  {
    evento: 'solicitacao.aceita',
    categoria: 'solicitacao',
    mensagem: 'Solicitação {{codigo}} aceita! Entregador: {{entregador_nome}}.',
    variaveis: ['codigo', 'entregador_nome']
  },
  {
    evento: 'solicitacao.concluida',
    categoria: 'solicitacao',
    mensagem: 'Entrega {{codigo}} concluída. Total: {{valor_total}}.',
    variaveis: ['codigo', 'valor_total']
  },
  {
    evento: 'fatura.gerada',
    categoria: 'fatura',
    mensagem: 'Fatura {{numero}} gerada. Vencimento: {{data_vencimento}}. Valor: {{saldo_liquido}}.',
    variaveis: ['numero', 'data_vencimento', 'saldo_liquido']
  },
  {
    evento: 'saldo.baixo',
    categoria: 'financeiro',
    mensagem: 'Atenção {{cliente_nome}}! Seu saldo pré-pago é de {{saldo_atual}}. Recarregue para continuar.',
    variaveis: ['cliente_nome', 'saldo_atual']
  },
];
```

### 10.3 Usuario admin inicial
```typescript
// Criar via Supabase Auth Admin API — não diretamente no banco
const { data: user } = await supabase.auth.admin.createUser({
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
  email_confirm: true,
  user_metadata: {
    nome: 'Administrador',
    role: 'admin'
  }
});
// O trigger on_auth_user_created cuida do INSERT em profiles automaticamente
```

---

## 11. Estrutura para Ambiente Real

### 11.1 Variáveis de ambiente necessárias

```env
# === BANCO DE DADOS ===
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# === SUPABASE ===
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # NUNCA expor no frontend

# === ADMIN INICIAL ===
ADMIN_EMAIL=admin@seudominio.com.br
ADMIN_PASSWORD=...                        # Forte, trocar no primeiro login

# === SEEDS ===
SEED_ENV=production                       # 'development' ou 'production' — controla seed-demo
```

### 11.2 Preparação para produção — checklist de banco

| Item | Ação |
|---|---|
| Connection pooling | Usar porta 6543 (PgBouncer) em produção. Configurar `max_connections` adequado |
| Timeout de conexões ociosas | `pool_mode = transaction` no Supabase, `idle_timeout = 10s` |
| Backups | Habilitar PITR (Point-in-Time Recovery) no Supabase — retención mínima 7 dias |
| Extensions | Revisar extensões instaladas — remover as não usadas em produção |
| SSL | Forçado por padrão no Supabase — não desabilitar |
| `pg_stat_statements` | Habilitado para monitoramento de queries lentas |

### 11.3 Monitoramento mínimo

**Queries lentas (imediato):**
```sql
-- Top 10 queries mais lentas
SELECT query, calls, total_exec_time, mean_exec_time, rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Tabelas sem índice em uso:**
```sql
SELECT schemaname, tablename, seq_scan, idx_scan
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_scan DESC;
```

**Supabase Dashboard:** Habilitar "Query Performance" no Supabase Studio. Verificar semanalmente.

### 11.4 Edge Functions necessárias

| Função | Trigger | Propósito |
|---|---|---|
| `gerar-fatura-automatica` | Cron (diário 00:00) | Fechamento automático por frequência |
| `verificar-faturas-vencidas` | Cron (diário 08:00) | Atualizar status Vencida + notificar |
| `calcular-saldo-pre-pago` | On-demand | Calcular saldo atual de cliente |
| `enviar-whatsapp` | Trigger de evento | Processar fila de notificações WhatsApp |
| `disparar-webhooks` | Trigger de evento | Disparar webhooks cadastrados |

### 11.5 Prevenção de falhas críticas

| Risco | Prevenção |
|---|---|
| Concorrência em criação de caixa | `UNIQUE(entregador_id, data)` + tratamento de `23505` no backend |
| Dupla conciliação na mesma solicitação | Lock via `SELECT FOR UPDATE` na RPC de conciliação |
| Saldo negativo em pré-pago | Verificação de saldo ANTES de aceitar solicitação (via RPC) |
| Fatura duplicada | `UNIQUE(numero)` na tabela + geração serializada |
| Código de solicitação duplicado | `UNIQUE(codigo)` + sequência baseada em timestamp |

---

## 12. Checklist Final por Prioridade

### 🔴 CRÍTICO — Bloqueia produção

- [ ] Criar tabela `caixas_entregadores` e `recebimentos_caixa`
- [ ] Adicionar `profile_id` em `clientes` e `entregadores`
- [ ] Habilitar RLS e criar policies em **todas** as tabelas
- [ ] Configurar trigger `on_auth_user_created` para criar `profiles`
- [ ] Mover chaves de API para Supabase Vault (remover de `SystemSetting.value`)
- [ ] Criar trigger de imutabilidade em `lancamentos_financeiros`
- [ ] Configurar `DIRECT_URL` para migrations separado do `DATABASE_URL` (pooler)
- [ ] Criar funções helper de segurança RLS (`is_admin`, `cliente_id_atual`, etc.)
- [ ] Corrigir `RecargaPrePago.registradoPor` para FK UUID tipada
- [ ] Criar partial unique indexes em `tabela_precos_cliente`

### 🟡 IMPORTANTE — Implementar antes de ter usuários reais

- [ ] Criar tabelas `historico_solicitacoes` e `historico_faturas` (substituir `Json[]`)
- [ ] Criar modelo `CategoriaFinanceira` e vincular a `Despesa` e `Receita`
- [ ] Criar modelos `NotificacaoTemplate` e `Webhook`
- [ ] Remover `permissions String[]` de `Profile` (usar cargo em tempo real)
- [ ] Corrigir `TipoOperacaoConfig.horarioInicio/Fim` para tipo `Time`
- [ ] Corrigir `@@map("neighborhoods")` → `@@map("bairros")`
- [ ] Adicionar `ativo Boolean` em `Profile` para inativar sem deletar
- [ ] Adicionar `documento` em `Cliente` (CPF/CNPJ ausente)
- [ ] Criar índices para colunas de RLS policies (`profile_id` em clientes/entregadores)
- [ ] Implementar seeds técnicos (cargos, formas pagamento, categorias, tipos operação)
- [ ] Criar usuário admin inicial via Supabase Auth Admin API
- [ ] Configurar Supabase PITR (backup point-in-time)
- [ ] Adicionar `UNIQUE(nome, regionId)` em `Bairro`
- [ ] Criar índices compostos para queries de relatório e dashboard
- [ ] Implementar `prisma/seed.ts` com seed técnico separado de seed demo

### 🟢 MELHORIA FUTURA — Após estabilização

- [ ] Migrar PKs para UUIDv7 (`uuid_generate_v7()`) nas tabelas de alto volume
- [ ] Criar views materializadas para relatórios mensais pesados
- [ ] Implementar cursor-based pagination no backend (substituir OFFSET)
- [ ] Criar Edge Functions de automação (faturamento, vencimentos)
- [ ] Adicionar `pg_stat_statements` e dashboard de queries lentas
- [ ] Implementar soft delete com `deleted_at` em `clientes` e `entregadores` se necessário
- [ ] Criar view de compatibilidade para campos depreciados antes de removê-los
- [ ] Avaliar particionamento de `lancamentos_financeiros` por mês quando >1M registros
- [ ] Adicionar full-text search em `solicitacoes.codigo` e `clientes.nome` (tsvector)
- [ ] Documentar via `COMMENT ON TABLE/COLUMN` no banco para exploração futura

---

*Fim do plano. Próximo passo recomendado: executar FASE 1 (extensões) e FASE 2 (tabelas de configuração) no Supabase dev branch, depois aplicar Fase 8 (RLS) antes de qualquer dado real entrar no sistema.*

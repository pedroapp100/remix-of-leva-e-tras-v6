# PRD TÉCNICO DEFINITIVO — SISTEMA LEVA E TRAZ
## Blueprint Oficial de Reconstrução v2.0

| Campo | Valor |
|-------|-------|
| Sistema | Leva e Traz — SaaS de Gestão Logística |
| Versão | 2.0 — Definitivo |
| Data | 14 de Março de 2026 |
| Base | Alpha v0.0.0 + análise de regras de negócio operacional |
| Status | APROVADO PARA DESENVOLVIMENTO |

---

## ÍNDICE

1. Visão Geral do Produto
2. Estratégia de Reconstrução
3. Stack Tecnológica
4. Modelo de Dados — Schemas e Migrações
5. Fases de Construção
6. Mapa Global de Rotas
7. Documentação Página por Página
8. Modelagem de Estado
9. Modelagem de Componentes
10. Regras de Negócio Consolidadas
11. Dependências entre Módulos
12. Critérios de Aceite por Fase
13. Roadmap de Implementação
14. Dívidas Técnicas a Corrigir
15. Lacunas e Hipóteses

---

## 1. VISÃO GERAL DO PRODUTO

### 1.1 Nome do Sistema
**Leva e Traz** — Plataforma SaaS de Gestão Operacional e Financeira para Empresas de Delivery Logístico

### 1.2 Objetivo do Sistema

O sistema Leva e Traz é uma plataforma unificada para gestão de operações de entrega, projetada para administrar em um único ambiente:

- O ciclo completo de solicitações de entrega (criar → aceitar → iniciar → conciliar)
- O controle financeiro **bidirecional** entre a operadora logística e seus clientes (lojas)
- A gestão operacional de entregadores com extrato de comissões
- O fechamento contábil por cliente com trilha de auditoria

**O princípio financeiro central do sistema:** em cada entrega existem dois proprietários de valor distintos — a operação logística (que recebe a taxa de serviço) e o cliente/loja (que pode ter valores coletados em seu nome pelo entregador durante a entrega). Confundir esses dois fluxos é o principal risco financeiro do negócio. Um entregador que recebe R$ 329,90 numa entrega pode estar carregando R$ 299,90 que pertencem à loja — e apenas R$ 30,00 que são da operação. O sistema deve rastrear e separar isso com precisão absoluta.

### 1.3 Problemas que o Sistema Resolve

| Problema | Impacto | Severidade |
|----------|---------|------------|
| Gestão manual e descentralizada de solicitações | Perda de rastreabilidade operacional | Alta |
| Falta de controle de faturamento automático por cliente | Erros de cobrança e inadimplência não rastreada | Alta |
| Ausência de separação entre valor da operação e valor da loja | Prejuízo financeiro direto e irrecuperável | **Crítica** |
| Precificação genérica por bairro sem distinção por loja de origem | Tarifação errada, margens negativas | **Crítica** |
| Sem auditoria financeira pós-fechamento | Impossibilidade de rastrear disputas | Alta |
| Relatórios inexistentes ou incompletos | Decisões sem base de dados confiável | Média |
| Portais cliente e entregador não funcionais | Alto volume de suporte manual | Alta |

### 1.4 Perfis de Usuário

| Perfil | Role | Responsabilidades | Escopo de Acesso |
|--------|------|-------------------|-----------------|
| Administrador | `admin` | Gestão completa: solicitações, clientes, entregadores, financeiro, relatórios, configurações | Total — todos os módulos |
| Cliente (Loja) | `cliente` | Acompanhar suas entregas, histórico financeiro, solicitar novos pedidos, gerir perfil | Portal isolado: `/cliente/*` |
| Entregador | `entregador` | Ver corridas atribuídas, histórico de entregas, extrato de comissões, perfil | Portal isolado: `/entregador/*` |

### 1.5 Escopo da Reconstrução

Reescrita completa do sistema com foco em:
- Corrigir todas as 18 dívidas técnicas identificadas
- Implementar o novo modelo financeiro normalizado (razão por lançamento)
- Implementar precificação personalizada por cliente com precedência de regras
- Completar os portais de cliente e entregador
- Adicionar auditoria imutável em todas as operações financeiras pós-fechamento
- Paginação server-side em todas as listagens

### 1.6 O que Será Mantido

- Stack: React 19, TypeScript, Vite, TailwindCSS, shadcn/ui, Radix UI, Supabase
- Arquitetura de hooks de dados por entidade (`useXxxData`)
- Padrão de contextos globais (Auth, Sidebar, Theme, Notifications, Faturas, Transactions)
- Estrutura de rotas e separação por portais (admin / cliente / entregador)
- Design system baseado em shadcn/ui

### 1.7 O que Será Melhorado

| Área | De | Para |
|------|----|------|
| Modelo financeiro | Campos resumidos (valorTaxas, valorRepasse) | Lançamentos normalizados por entrega em tabela própria |
| Conciliação | Formulário simples sem distinção de dono do valor | Fechamento operacional por rota com campo `pertenceA` obrigatório |
| Fatura | Documento de cálculo com valores hardcoded | Consolidador de lançamentos já apurados na conciliação |
| Tarifação | Taxa flat por bairro (igual para todos os clientes) | Tabela de preços por cliente + bairro com regras e prioridades |
| Auditoria | Sem rastreamento de alterações pós-fechamento | Trilha imutável em `auditoria_financeira` |
| Estados de UI | Loading/vazio/erro ausentes ou incompletos | Tratamento completo em todas as telas |
| Métricas | Valores hardcoded (42 entregas, 18h, 15m) | Calculados dinamicamente do banco |
| Portais | Dados mockados (R$ 532, R$ 875) | Dados reais com RLS por tenant |

---

## 2. ESTRATÉGIA DE RECONSTRUÇÃO

### 2.1 Abordagem

**Clean Rebuild com migração progressiva de dados.** O sistema atual continua operando em paralelo. A nova versão é desenvolvida em ambiente separado e substitui o atual somente após validação funcional completa.

> **Decisão arquitetural crítica:** A nova versão não compartilha código com o sistema atual. Todo o código é reescrito. As tabelas do Supabase existentes são mantidas e evoluídas com migrations versionadas.

### 2.2 Separação por Módulos

| Módulo | Responsabilidade | Portal |
|--------|-----------------|--------|
| Auth | Autenticação, autorização, recuperação de senha, sessão | Todos |
| Dashboard Admin | Métricas gerenciais em tempo real | Admin |
| Solicitações | Ciclo completo: criar → aceitar → iniciar → conciliar | Admin |
| Clientes | CRUD de lojas, configuração comercial e de faturamento | Admin |
| Entregadores | CRUD de entregadores, comissão, veículo | Admin |
| Faturas / Fechamentos | Consolidação financeira por cliente, cobrança e repasse | Admin |
| Financeiro | Despesas, receitas, livro caixa, gráficos | Admin |
| Relatórios | Comissões, despesas, resumo financeiro por período | Admin |
| Configurações | Bairros, regiões, formas de pagamento, cargos, tabela de preços | Admin |
| Portal Cliente | Dashboard, solicitações, financeiro, perfil da loja | Cliente |
| Portal Entregador | Dashboard, corridas, histórico, extrato, perfil | Entregador |

### 2.3 Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Migração com dados inconsistentes | Alta | Alto | Scripts de validação prévia + rollback |
| Regressão em regras financeiras complexas | Média | Crítico | Testes automatizados por cenário de conciliação |
| Complexidade do novo modelo de lançamentos | Alta | Alto | Implementar e validar em sandbox antes de produção |
| Usuários em produção durante migração | Certa | Médio | Janela de migração em horário de baixo volume |

---

## 3. STACK TECNOLÓGICA

### 3.1 Frontend

| Componente | Tecnologia | Versão | Função |
|------------|------------|--------|--------|
| Framework | React | ^19.1.0 | Base da SPA |
| Linguagem | TypeScript | ^5.8 | Tipagem estática completa |
| Build Tool | Vite | ^5.3 | Bundler e dev server |
| Roteamento | React Router DOM | ^7.x | Navegação client-side com layouts aninhados |
| Estilização | TailwindCSS | ^3.4 | Utilitários CSS atomizados |
| Design System | shadcn/ui | Latest | Componentes acessíveis baseados em Radix UI |
| Primitivos UI | Radix UI | 20+ pacotes | Comportamentos acessíveis sem estilo |
| Ícones | Lucide React | ^0.541 | Ícones SVG consistentes |
| Formulários | React Hook Form | ^7.x | Gerenciamento performático de formulários |
| Validação | Zod | ^4.x | Schema TypeScript-first |
| Estado Servidor | React Query (TanStack) | ^5.x | **NOVO** — cache, paginação, revalidação |
| Gráficos | Recharts | ^2.12 | Gráficos composicionais SVG |
| Animações | Framer Motion | ^12.x | Animações declarativas |
| Notificações | Sonner | ^2.x | Toast notifications |
| Date Picker | react-day-picker | ^8.x | Seleção de datas e períodos |
| Export PDF | jsPDF + jspdf-autotable | ^3.x | Exportação client-side PDF |
| Export Excel | xlsx | ^0.18 | Exportação client-side Excel |
| Tema | next-themes | Latest | Suporte dark/light mode |
| Drag and drop | @dnd-kit/sortable | Latest | **NOVO** — reordenação de prioridades na tabela de preços |

### 3.2 Backend / Infraestrutura

| Componente | Tecnologia | Detalhe |
|------------|------------|---------|
| BaaS | Supabase | Plataforma completa: Auth + PostgreSQL + Storage + Realtime |
| Banco de Dados | PostgreSQL 15+ | Row Level Security (RLS) habilitado em todas as tabelas |
| Autenticação | Supabase Auth (JWT) | Email + senha, refresh automático de token |
| Storage | Supabase Storage | Avatares de usuários |
| Realtime | Supabase Realtime | Atualizações em tempo real (notificações, status) |
| Edge Functions | Supabase Edge Functions | **NOVO** — lógica server-side segura: criação de usuários, fechamento financeiro atômico |
| Deploy Frontend | Vercel | CI/CD automático com preview por branch |
| Monitoramento | Supabase Dashboard + Vercel Analytics | Logs, queries lentas, métricas de uso |

### 3.3 Contextos Globais de Estado

| Context | Arquivo | Estado Mantido | Compartilhado Com |
|---------|---------|---------------|-------------------|
| `AuthContext` | AuthContext.tsx | user, loading, role, clientData, entregadorData | Toda a aplicação |
| `SidebarContext` | SidebarContext.tsx | isOpen, isMobile | AppShell, Sidebar, Header |
| `NotificationContext` | NotificationContext.tsx | notifications por módulo, totalUnread | Sidebar badges, header |
| `ThemeProvider` | ThemeProvider.tsx | theme, resolvedTheme | Toda a aplicação |
| `FaturasContext` | FaturasContext.tsx | activeFaturas, loading, refetch | FaturasPage, Dashboard |
| `TransactionContext` | TransactionContext.tsx | transactions recentes, loading | Dashboard |

### 3.4 Hooks de Dados (React Query)

| Hook | Query Key | staleTime | refetchInterval |
|------|-----------|-----------|-----------------|
| `useDashboardData` | `['dashboard', 'metrics']` | 30s | 60s |
| `useSolicitacoesData` | `['solicitacoes', filters]` | 10s | 30s |
| `useClientsData` | `['clientes']` | 5min | — |
| `useEntregadoresData` | `['entregadores']` | 5min | — |
| `useFaturasData` | `['faturas', 'ativas']` | 30s | 60s |
| `useFinanceiroData` | `['financeiro', 'despesas', period]` | 2min | — |
| `useRelatoriosData` | `['relatorios', period]` | 5min | — |
| `useSettingsData` | `['settings']` | 10min | — |
| `useTabelaPrecosData` | `['settings', 'tabela_precos', clienteId]` | 5min | — |

---

## 4. MODELO DE DADOS — SCHEMAS E MIGRAÇÕES

### 4.1 Tabelas Existentes (Manter + Evoluir)

```
profiles
├── id (uuid PK)
├── nome, email, role, avatar, cargo_id
└── permissions[] — MANTER, mas verificar via cargo sempre

clientes
├── id (uuid PK)
├── nome, tipo, email, telefone, endereco, bairro, cidade, uf
├── chavePix, status, modalidade
├── ativarFaturamentoAutomatico, frequenciaFaturamento
├── numeroDeEntregasParaFaturamento, diaDaSemanaFaturamento, diaDoMesFaturamento
└── REMOVER: totalPedidos, valorTotal — calcular dinamicamente

entregadores
├── id (uuid PK)
├── nome, documento, email, telefone, cidade, bairro, veiculo
├── status, avatar
└── tipoComissao (percentual|fixo), valorComissao

solicitacoes
├── id (uuid PK), codigo (único, LT-YYYYMMDD-NNNNN)
├── clienteId (FK), entregadorId (FK)
├── status (pendente|aceita|em_andamento|concluida|cancelada|rejeitada)
├── dataSolicitacao, tipoOperacao, pontoColeta
├── valorTotalTaxas, valorTotalRepasse (campos legados — manter para compatibilidade)
├── justificativa, historico[] (JSON)
├── rotas[] (array de Rota) — evoluir com taxaResolvida e regraPrecoId
└── DEPRECAR: conciliacao (JSON) — substituído por pagamentos_solicitacao

rotas (sub-entidade de solicitacoes)
├── id, bairroDestinoId (FK), responsavel, telefone, observacoes
├── receberDoCliente (boolean), valorAReceber
├── meiosPagamentoAceitos[] (array de IDs)
├── taxaEntrega (snapshot no momento da criação)
├── taxasExtrasIds[], status
├── NOVO: taxaResolvida (decimal) — snapshot da tarifa final aplicada
└── NOVO: regraPrecoId (FK) — qual regra de tabela_precos_cliente foi usada (null = fallback)

bairros
├── id (uuid PK), nome, regionId (FK)
└── taxaEntrega (decimal) — FALLBACK EXPLÍCITO: só usado quando não há regra em tabela_precos_cliente

regioes
└── id (uuid PK), name, description

formas_pagamento
└── id (uuid PK), name, description, enabled (boolean)

cargos
└── id (uuid PK), name, description, permissions[] (array de strings)

faturas (evoluir para fechamentos_cliente)
├── id (uuid PK), numero (único), clienteId, clienteNome
├── tipoFaturamento, totalEntregas
├── dataEmissao, dataVencimento
├── valorTaxas (legado), statusTaxas
├── valorRepasse (legado), statusRepasse
├── statusGeral, observacoes, historico[]
├── entregas[] (EntregaIncluida)
├── NOVO: saldoLiquido (decimal) — calculado dos lancamentos_financeiros
├── NOVO: totalCreditosLoja (decimal)
├── NOVO: totalDebitosLoja (decimal)
└── NOVO: statusCobranca (Nao_aplicavel|Pendente|Cobrado|Inadimplente)

despesas
├── id (uuid PK), descricao, categoria, fornecedor, vencimento, valor, status
├── NOVO: dataPagamento (timestamptz) — registrado ao marcar como Pago
└── NOVO: usuarioPagouId (FK profiles) — quem marcou como pago
```

### 4.2 Novas Tabelas (Migrations Necessárias)

```sql
-- ============================================================
-- MIGRATION 1: pagamentos_solicitacao
-- Registra cada pagamento recebido por linha de rota na conciliação
-- com separação obrigatória do dono do valor
-- ============================================================
CREATE TABLE pagamentos_solicitacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES solicitacoes(id) ON DELETE RESTRICT,
  rota_id UUID NOT NULL,
  forma_pagamento_id UUID NOT NULL REFERENCES formas_pagamento(id),
  valor NUMERIC(10, 2) NOT NULL CHECK (valor > 0),
  pertence_a TEXT NOT NULL CHECK (pertence_a IN ('operacao', 'loja')),
  -- 'operacao' = taxa de entrega pertence à transportadora
  -- 'loja' = valor coletado pertence ao cliente/loja remetente
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

-- ============================================================
-- MIGRATION 2: lancamentos_financeiros
-- Razão financeiro normalizado por solicitação
-- IMUTÁVEL após criação — origem de verdade contábil
-- ============================================================
CREATE TABLE lancamentos_financeiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID REFERENCES solicitacoes(id),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  fatura_id UUID REFERENCES faturas(id),
  tipo TEXT NOT NULL CHECK (tipo IN (
    'receita_operacao',  -- taxa de entrega recebida pela operação
    'credito_loja',      -- valor recebido em nome da loja (deve ser repassado)
    'debito_loja',       -- taxa que a loja deve pagar à operação
    'ajuste'             -- ajuste manual com permissão elevada
  )),
  valor NUMERIC(10, 2) NOT NULL CHECK (valor > 0),
  sinal TEXT NOT NULL CHECK (sinal IN ('credito', 'debito')),
  status_liquidacao TEXT DEFAULT 'pendente' CHECK (
    status_liquidacao IN ('pendente', 'liquidado', 'estornado')
  ),
  descricao TEXT,
  referencia_origem TEXT, -- código da solicitação, número da fatura, etc.
  usuario_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MIGRATION 3: tabela_precos_cliente
-- Tarifas personalizadas por cliente + bairro de destino
-- Soluciona o problema de taxa flat por bairro
-- ============================================================
CREATE TABLE tabela_precos_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  bairro_destino_id UUID REFERENCES neighborhoods(id),
  -- NULL = regra regional (aplica para todos os bairros da região)
  regiao_id UUID REFERENCES regioes(id),
  -- NULL = regra de bairro específico
  tipo_operacao TEXT NOT NULL DEFAULT 'todos' CHECK (
    tipo_operacao IN ('standard', 'express', 'retorno', 'todos')
  ),
  taxa_base NUMERIC(10, 2) NOT NULL CHECK (taxa_base > 0),
  taxa_retorno NUMERIC(10, 2) DEFAULT 0,
  taxa_espera NUMERIC(10, 2) DEFAULT 0, -- por hora
  taxa_urgencia NUMERIC(10, 2) DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  prioridade INTEGER NOT NULL DEFAULT 100,
  -- menor número = maior prioridade de aplicação
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_cliente_bairro_tipo
    UNIQUE (cliente_id, bairro_destino_id, tipo_operacao)
    -- impede duas regras ativas iguais para o mesmo par
);

-- Índice de performance para a query de resolução de tarifa
CREATE INDEX idx_tabela_precos_lookup
  ON tabela_precos_cliente (cliente_id, bairro_destino_id, tipo_operacao, ativo, prioridade);

-- ============================================================
-- MIGRATION 4: auditoria_financeira
-- Trilha imutável de todas as alterações em dados financeiros pós-fechamento
-- ============================================================
CREATE TABLE auditoria_financeira (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade TEXT NOT NULL, -- 'fatura', 'lancamento_financeiro', 'solicitacao', etc.
  entidade_id UUID NOT NULL,
  campo TEXT, -- campo alterado (null para eventos de status)
  valor_anterior JSONB,
  valor_novo JSONB,
  motivo TEXT NOT NULL, -- justificativa obrigatória
  usuario_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MIGRATION 5: ajustes_financeiros
-- Ajustes manuais em fechamentos com rastreabilidade completa
-- ============================================================
CREATE TABLE ajustes_financeiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fatura_id UUID NOT NULL REFERENCES faturas(id),
  solicitacao_id UUID REFERENCES solicitacoes(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('credito', 'debito')),
  valor NUMERIC(10, 2) NOT NULL CHECK (valor > 0),
  motivo TEXT NOT NULL,
  usuario_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MIGRATION 6: system_settings
-- Configurações globais do sistema (chaves de integração, etc.)
-- ============================================================
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

-- ============================================================
-- MIGRATION 7: user_preferences
-- Preferências de notificação por usuário
-- ============================================================
CREATE TABLE user_preferences (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  key TEXT,
  value JSONB,
  PRIMARY KEY (user_id, key)
);

-- ============================================================
-- FUNCTION: resolver_tarifa
-- RPC para resolução de tarifa com precedência de regras
-- ============================================================
CREATE OR REPLACE FUNCTION resolver_tarifa(
  p_cliente_id UUID,
  p_bairro_destino_id UUID,
  p_tipo_operacao TEXT DEFAULT 'standard'
) RETURNS TABLE (
  taxa_base NUMERIC,
  taxa_retorno NUMERIC,
  taxa_espera NUMERIC,
  taxa_urgencia NUMERIC,
  regra_id UUID,
  tipo_regra TEXT, -- 'especifica', 'regional', 'fallback_bairro', 'sem_tarifa'
  usando_fallback BOOLEAN
) AS $$
DECLARE
  v_regiao_id UUID;
BEGIN
  -- Busca o regionId do bairro para regras regionais
  SELECT region_id INTO v_regiao_id FROM neighborhoods WHERE id = p_bairro_destino_id;

  -- 1. Regra específica: cliente + bairro + tipo_operacao
  RETURN QUERY
    SELECT t.taxa_base, t.taxa_retorno, t.taxa_espera, t.taxa_urgencia,
           t.id, 'especifica'::TEXT, false
    FROM tabela_precos_cliente t
    WHERE t.cliente_id = p_cliente_id
      AND t.bairro_destino_id = p_bairro_destino_id
      AND t.tipo_operacao = p_tipo_operacao
      AND t.ativo = true
    ORDER BY t.prioridade ASC LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  -- 2. Regra geral do bairro: cliente + bairro + 'todos'
  RETURN QUERY
    SELECT t.taxa_base, t.taxa_retorno, t.taxa_espera, t.taxa_urgencia,
           t.id, 'especifica_todos'::TEXT, false
    FROM tabela_precos_cliente t
    WHERE t.cliente_id = p_cliente_id
      AND t.bairro_destino_id = p_bairro_destino_id
      AND t.tipo_operacao = 'todos'
      AND t.ativo = true
    ORDER BY t.prioridade ASC LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  -- 3. Regra regional: cliente + região + tipo
  IF v_regiao_id IS NOT NULL THEN
    RETURN QUERY
      SELECT t.taxa_base, t.taxa_retorno, t.taxa_espera, t.taxa_urgencia,
             t.id, 'regional'::TEXT, false
      FROM tabela_precos_cliente t
      WHERE t.cliente_id = p_cliente_id
        AND t.regiao_id = v_regiao_id
        AND t.bairro_destino_id IS NULL
        AND t.tipo_operacao = p_tipo_operacao
        AND t.ativo = true
      ORDER BY t.prioridade ASC LIMIT 1;
    IF FOUND THEN RETURN; END IF;

    -- 4. Regra regional geral: cliente + região + 'todos'
    RETURN QUERY
      SELECT t.taxa_base, t.taxa_retorno, t.taxa_espera, t.taxa_urgencia,
             t.id, 'regional_todos'::TEXT, true
      FROM tabela_precos_cliente t
      WHERE t.cliente_id = p_cliente_id
        AND t.regiao_id = v_regiao_id
        AND t.bairro_destino_id IS NULL
        AND t.tipo_operacao = 'todos'
        AND t.ativo = true
      ORDER BY t.prioridade ASC LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- 5. Fallback: taxa padrão do bairro (com aviso visual obrigatório)
  RETURN QUERY
    SELECT b.delivery_fee, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC,
           NULL::UUID, 'fallback_bairro'::TEXT, true
    FROM neighborhoods b
    WHERE b.id = p_bairro_destino_id
      AND b.delivery_fee > 0;
  IF FOUND THEN RETURN; END IF;

  -- 6. Sem tarifa: retorna NULL — DEVE BLOQUEAR CRIAÇÃO DA ROTA
  RETURN QUERY SELECT NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC, NULL::NUMERIC,
                      NULL::UUID, 'sem_tarifa'::TEXT, true;
END;
$$ LANGUAGE plpgsql;
```

### 4.3 RLS (Row Level Security) — Policies por Portal

```sql
-- Clientes: veem apenas seus dados
ALTER TABLE solicitacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cliente_vê_suas_solicitacoes" ON solicitacoes
  FOR SELECT USING (
    auth.uid() IN (
      SELECT p.id FROM profiles p
      JOIN clientes c ON c.email = p.email
      WHERE c.id = solicitacoes.cliente_id
        AND p.role = 'cliente'
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Entregadores: veem apenas suas corridas
CREATE POLICY "entregador_vê_suas_corridas" ON solicitacoes
  FOR SELECT USING (
    auth.uid() IN (
      SELECT p.id FROM profiles p
      JOIN entregadores e ON e.email = p.email
      WHERE e.id = solicitacoes.entregador_id
        AND p.role = 'entregador'
    )
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- lancamentos_financeiros: apenas admin
ALTER TABLE lancamentos_financeiros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apenas_admin" ON lancamentos_financeiros
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- tabela_precos_cliente: apenas admin
ALTER TABLE tabela_precos_cliente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apenas_admin" ON tabela_precos_cliente
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

---

## 5. FASES DE CONSTRUÇÃO

### FASE 1 — Fundação do Projeto (Semana 1)

**Objetivo:** Configurar repositório, build system, CI/CD, estrutura base e schema completo do banco.

**Entregáveis:**
- Repositório Git com estrutura de diretórios: `src/pages/`, `src/components/`, `src/hooks/`, `src/lib/`, `src/types/`, `src/contexts/`
- Vite + React 19 + TypeScript com aliases absolutos (`@/components`, `@/hooks`, etc.)
- TailwindCSS + shadcn/ui + Radix UI configurados
- ESLint + Prettier + Husky (pre-commit hooks)
- Variáveis de ambiente documentadas: `.env.local`, `.env.production`
- Pipeline CI/CD no Vercel com preview automático por PR
- Todas as migrations do banco executadas no Supabase (Seção 4.2)
- RLS configurada e testada (Seção 4.3)
- Design tokens definidos (cores, tipografia, espaçamentos)
- ThemeProvider configurado com suporte dark/light/system

**Critérios de Aceite:**
- `npm run dev` inicia sem erros TypeScript
- `npm run build` gera bundle válido
- Deploy automático no Vercel em menos de 2 minutos
- Todas as tabelas existem no banco com as colunas corretas
- RLS bloqueando acesso cross-tenant nos testes

---

### FASE 2 — Autenticação e Controle de Acesso (Semana 2)

**Objetivo:** Implementar autenticação completa com Supabase Auth e sistema de rotas protegidas por role.

**Entregáveis:**
- `LoginPage` (`/login`) com validação Zod + React Hook Form + estado de loading no botão
- `ForgotPasswordPage` (`/login/reset`) — formulário de email + `supabase.auth.resetPasswordForEmail()`
- `ResetPasswordPage` — formulário de nova senha + `supabase.auth.updateUser({ password })`
- `AuthContext` completo: `user`, `role`, `loading`, `login()`, `logout()`, `updateUser()`, `updatePassword()`
- `ProtectedRoute` genérico parametrizável por `allowedRoles[]`
- Redirect inteligente por role após login: `admin→/`, `cliente→/cliente`, `entregador→/entregador`
- `usePermissions()` hook para verificação granular
- Tabela `profiles` com RLS
- `rememberMe`: sessão persistente configurável no Supabase Auth
- Bloqueio após 5 tentativas de login em 5 minutos

**Critérios de Aceite:**
- Login com credenciais válidas redireciona para portal correto por role
- Login inválido exibe toast de erro sem travar a UI
- Botão exibe loading durante a chamada
- `rememberMe` persiste sessão após fechar o browser
- Link "Esqueceu a senha?" envia email de recuperação
- 5 tentativas consecutivas bloqueiam por 60 segundos

---

### FASE 3 — Shell da Aplicação e Navegação (Semana 3)

**Objetivo:** Construir o layout base (shell) de cada portal com sidebar, header e navegação funcional.

**Entregáveis:**
- `AdminLayout`: Sidebar + Header + Content Area + SidebarContext
- `ClientLayout`: Sidebar simplificada para portal do cliente (4 itens)
- `DriverLayout`: Sidebar simplificada para portal do entregador (4 itens)
- Sidebar Admin com 9 itens + badges de notificação por módulo
- Header: avatar do usuário, notificações, theme toggle, logout
- Sidebar collapsible em mobile com overlay
- Breadcrumb por rota
- `NotificationContext` com badges por módulo
- Página 404 personalizada
- Todos os itens da sidebar roteando corretamente

**Critérios de Aceite:**
- Sidebar exibe itens corretos por perfil com ícones
- Badge de notificações atualiza quando há solicitações pendentes
- Sidebar colapsa em mobile e expande com botão
- Header exibe nome e avatar do usuário logado
- Logout limpa sessão e redireciona para `/login`
- Theme toggle alterna dark/light e persiste no localStorage

---

### FASE 4 — Componentes Compartilhados (Semana 3-4)

**Objetivo:** Construir a biblioteca de componentes reutilizáveis usados por todos os módulos.

**Componentes a criar:**

| Componente | Arquivo | Função |
|------------|---------|--------|
| `MetricCard` | shared/MetricCard.tsx | Card com título, valor, subtítulo, ícone, delta percentual |
| `DataTable<T>` | shared/DataTable.tsx | Tabela genérica com sorting, paginação server-side, seleção |
| `SearchInput` | shared/SearchInput.tsx | Input com debounce 300ms e ícone |
| `DatePickerWithRange` | shared/DatePickerWithRange.tsx | Seletor de período duplo |
| `StatusBadge` | shared/StatusBadge.tsx | Badge colorido por status com mapeamento de cor |
| `ConfirmDialog` | shared/ConfirmDialog.tsx | AlertDialog genérico para ações destrutivas |
| `JustificationDialog` | shared/JustificationDialog.tsx | Dialog com textarea obrigatória (mín. 10 chars) |
| `ExportDropdown` | shared/ExportDropdown.tsx | Dropdown PDF + Excel funcional |
| `EmptyState` | shared/EmptyState.tsx | Estado vazio com ícone, título, subtítulo e ação |
| `ErrorState` | shared/ErrorState.tsx | Estado de erro com botão retry |
| `LoadingSkeleton` | shared/LoadingSkeleton.tsx | Skeleton parametrizável por shape |
| `CurrencyInput` | shared/CurrencyInput.tsx | Input com formatação BRL automática |
| `PhoneInput` | shared/PhoneInput.tsx | Input com máscara de telefone |
| `AvatarWithFallback` | shared/AvatarWithFallback.tsx | Avatar com fallback por iniciais |
| `PermissionGuard` | shared/PermissionGuard.tsx | Renderiza children apenas se usuário tem permissão |
| `PageContainer` | ui/PageContainer.tsx | Container padrão de página com header e ações |

---

### FASE 5 — Módulos Core Admin (Semanas 4-7)

**Objetivo:** Implementar todos os módulos do portal administrativo. Ver Seção 7 para documentação detalhada de cada página.

**Ordem de implementação:**
1. Dashboard (depende de todos, implementar por último dentro desta fase)
2. Configurações (base para todos os outros)
3. Clientes
4. Entregadores
5. Solicitações (o mais complexo — ConciliacaoDialog novo)
6. Entregas
7. Faturas / Fechamentos
8. Financeiro
9. Relatórios
10. Dashboard (com todas as métricas já disponíveis)

---

### FASE 6 — Portais Self-Service (Semanas 8-9)

**Objetivo:** Implementar portais de Cliente e Entregador com dados reais, RLS configurado.

- Portal Cliente: dashboard dinâmico, solicitações, financeiro com download de PDF, perfil persistente
- Portal Entregador: dashboard de corridas, histórico, extrato de comissões, perfil persistente

**Dependência crítica:** RLS do Supabase deve estar configurada e testada antes desta fase.

---

### FASE 7 — Hardening e Observabilidade (Semanas 10-11)

**Objetivo:** Testes, performance, acessibilidade e preparação para produção.

**Entregáveis:**
- Paginação server-side em todas as tabelas (pageSize = 20)
- Filtros preservados na URL como query params (useSearchParams)
- Testes E2E dos fluxos críticos: login, criar solicitação, conciliar, gerar fechamento
- Índices PostgreSQL otimizados para queries lentas
- Monitoramento de erros frontend (Sentry ou equivalente)
- Auditoria de acessibilidade (WCAG 2.1 AA)
- Plano de migração de dados de produção com validação prévia

---

## 6. MAPA GLOBAL DE ROTAS

| Rota | Página | Role | Componente Principal | APIs Principais |
|------|--------|------|----------------------|-----------------|
| `/login` | LoginPage | Público | LoginForm | supabase.auth.signInWithPassword |
| `/login/reset` | ResetPasswordPage | Público | ResetPasswordForm | supabase.auth.resetPasswordForEmail |
| `/` | DashboardPage | admin | DashboardPage | useDashboardData, useTransactionsData |
| `/solicitacoes` | SolicitacoesPage | admin | SolicitacoesTable, LaunchSolicitacaoDialog | useSolicitacoesData |
| `/clientes` | ClientsPage | admin | ClientsTable, ClientFormDialog | useClientsData |
| `/entregadores` | EntregadoresPage | admin | EntregadoresTable, EntregadorFormDialog | useEntregadoresData |
| `/entregas` | EntregasPage | admin | EntregasTable | useSolicitacoesData |
| `/faturas` | FaturasPage | admin | FaturasTable, FaturaDetailsModal | useFaturasData |
| `/faturas/finalizadas` | FaturasFinalizadasPage | admin | FaturasFinalizadasTable | useFaturasData |
| `/financeiro` | FinanceiroPage | admin | DespesasTab, ReceitasTab, LivroCaixaTab | useFinanceiroData |
| `/relatorios` | RelatoriosPage | admin | ResumoTab, ComissoesTab, DespesasRelTab | useRelatoriosData |
| `/configuracoes` | SettingsPage | admin | BairrosTab, RegioesTab, PagamentosTab, CargosTab, TabelaPrecosTab | useSettingsData |
| `/cliente` | ClientDashboardPage | cliente | ClientMetricCards, RecentSolicitacoes | useClientDashboard |
| `/cliente/solicitacoes` | ClientSolicitacoesPage | cliente | ClientSolicitacoesTable | useClientSolicitacoes |
| `/cliente/financeiro` | ClientFinanceiroPage | cliente | ClientFaturasList, SaldoCard | useClientFinanceiro |
| `/cliente/perfil` | ClientPerfilPage | cliente | ProfileForm, AvatarUpload | useClientProfile |
| `/entregador` | DriverDashboardPage | entregador | DriverMetricCards, CorridasAtivas | useDriverDashboard |
| `/entregador/historico` | DriverHistoricoPage | entregador | DriverHistoricoTable | useDriverHistorico |
| `/entregador/financeiro` | DriverFinanceiroPage | entregador | ComissoesTable, ExtratoCard | useDriverFinanceiro |
| `/entregador/perfil` | DriverPerfilPage | entregador | DriverProfileForm | useDriverProfile |
| `*` | Redirect | — | — | → `/login` |

---

## 7. DOCUMENTAÇÃO PÁGINA POR PÁGINA

---

### 7.1 — Login (`/login`)

| Atributo | Valor |
|----------|-------|
| Rota | `/login` |
| Perfil | Público (redireciona autenticados para seu portal) |
| Contexto de Uso | Ponto de entrada único para todos os perfis |
| Origem | Acesso direto, redirect de ProtectedRoute, logout |
| Destinos | `/` (admin), `/cliente`, `/entregador`, `/login/reset` |

#### 7.1.1 Estrutura Visual
Grid 2 colunas em `≥ lg`: formulário à esquerda (50%), painel decorativo com branding à direita (50%). Em mobile, apenas o formulário.

#### 7.1.2 Componentes

| Componente | Tipo | Função | Estado Interno |
|------------|------|--------|----------------|
| `LoginForm` | Form (RHF) | Formulário principal | `email`, `password`, `rememberMe`, `isLoading`, `errors` |
| `EmailInput` | Input controlado | Campo email com validação | `value`, `error`, `touched` |
| `PasswordInput` | Input + toggle | Campo senha com show/hide | `value`, `showPassword`, `error` |
| `RememberMeCheckbox` | Checkbox | Persistência de sessão | `checked` |
| `SubmitButton` | Button loading | Dispara autenticação | `isLoading` |
| `ForgotPasswordLink` | Link | Navega para `/login/reset` | — |
| `BrandingPanel` | Div decorativa | Logo, imagem, tagline | — |

#### 7.1.3 Estados da Interface

| Estado | Comportamento Visual | Gatilho |
|--------|---------------------|---------|
| Inicial | Formulário vazio, botão habilitado | Mount |
| Loading | Botão com spinner + "Entrando..." + campos desabilitados | Submit |
| Erro credenciais | Toast error + campos mantidos preenchidos | API error |
| Erro rede | Toast error "Sem conexão. Tente novamente." | Network error |
| Sucesso | Toast success + redirect por role | Login OK |
| Bloqueado | Countdown visual + campos desabilitados | 5 tentativas falhas |
| Já autenticado | Redirect imediato ao portal correspondente | Mount com sessão ativa |

#### 7.1.4 Validação (Zod)
```typescript
const loginSchema = z.object({
  email: z.string().email("Por favor, insira um email válido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  rememberMe: z.boolean().default(false),
});
```

#### 7.1.5 Fluxo de Autenticação
```typescript
async function handleLogin(data: LoginFormData) {
  setIsLoading(true);
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });
  if (error) {
    incrementAttempts(); // controle de bloqueio
    toast.error(getAuthErrorMessage(error.message));
    setIsLoading(false);
    return;
  }
  // AuthContext.onAuthStateChange → fetchProfile → redirect por role
}

function getAuthErrorMessage(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Email ou senha incorretos.';
  if (msg.includes('Email not confirmed')) return 'Confirme seu email antes de entrar.';
  return 'Erro ao fazer login. Tente novamente.';
}
```

---

### 7.2 — Dashboard Admin (`/`)

| Atributo | Valor |
|----------|-------|
| Rota | `/` |
| Perfil | `admin` |
| Origem | Login, sidebar (item Dashboard) |
| Destinos | Qualquer módulo admin via sidebar |

#### 7.2.1 MetricCards (5 cards — todos dinâmicos, animados com Framer Motion)

| Card | Query | Ícone | Cor |
|------|-------|-------|-----|
| Contas a Pagar | `SUM(despesas WHERE status IN ('Pendente','Atrasado'))` | DollarSign | Vermelho se atrasadas > 0 |
| Faturas Vencidas | `COUNT(faturas WHERE statusGeral='Vencida')` + valor | FileText | Vermelho se > 0 |
| Entregas Hoje | `COUNT(solicitacoes WHERE dataFinalização=hoje)` vs média | Truck | Verde/vermelho vs média |
| Taxas Recebidas | `SUM(lancamentos_financeiros WHERE tipo='receita_operacao' AND mês_atual)` | DollarSign | Verde |
| Novas Solicitações | `COUNT(solicitacoes WHERE status='pendente')` | Clock | Laranja se > 0 |

#### 7.2.2 RecentTransactions
Lista das últimas 10 transações (receitas + despesas). Cada item: tipo, descrição, valor BRL, data. Link "Ver todas" → `/financeiro`.

#### 7.2.3 Estados

| Estado | Comportamento |
|--------|---------------|
| Loading | 5 MetricCard skeletons + skeleton de lista de transações |
| Sem dados | `EmptyState` com ícone de gráfico + "Comece adicionando clientes e solicitações" — **NUNCA** `return null` |
| Com dados | Cards com animação `opacity 0→1`, `y -20→0`, stagger 0.1s por card |
| Erro | Toast de aviso + botão "Tentar novamente" |

#### 7.2.4 Cálculo de Variação
```typescript
function calcVariation(today: number, dailyAverage: number): { text: string; color: 'green' | 'red' } {
  if (dailyAverage === 0) return { text: '—', color: 'green' };
  const pct = ((today / dailyAverage) * 100) - 100;
  return {
    text: pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`,
    color: pct >= 0 ? 'green' : 'red',
  };
}
```

---

### 7.3 — Central de Solicitações (`/solicitacoes`)

| Atributo | Valor |
|----------|-------|
| Rota | `/solicitacoes` |
| Perfil | `admin` |
| Gatilho de entrada | Limpa badge de notificações pendentes ao entrar |
| Filtros na URL | `?status=pendente&search=baruc&from=2026-01-01&to=2026-03-14` |

#### 7.3.1 MetricCards (5 cards — todos dinâmicos)

| Card | Cálculo | Observação |
|------|---------|------------|
| Pendentes | `COUNT(status='pendente')` | Badge laranja se > 0 |
| Aceitas | `COUNT(status='aceita')` | — |
| Em Andamento | `COUNT(status='em_andamento')` | — |
| Concluídas (hoje) | `COUNT(status='concluida' AND dataConclusao=hoje)` | — |
| Tempo Médio | `AVG(dataConclusao - dataSolicitacao)` das concluídas | **CORRIGIR: estava hardcoded como '15m'** |

#### 7.3.2 Componentes

| Componente | Props | Comportamento |
|------------|-------|---------------|
| `SearchInput` | `value`, `onChange` | Filtra `clienteNome` OR `codigo`, debounce 300ms |
| `DatePickerWithRange` | `dateRange`, `onChange` | Filtra por `dataSolicitacao` dentro do intervalo |
| `SolicitacoesTabs` | `activeTab`, `counts` | Cada aba exibe badge com contagem do status |
| `SolicitacoesTable` | `solicitacoes[]`, `onAction` | Paginada server-side, 20 por página |
| `SolicitacaoRowActions` | `status`, `solicitacaoId` | Botões contextuais por status (ver tabela 7.3.3) |
| `LaunchSolicitacaoDialog` | `mode`, `initialData?` | Formulário multi-step para criar/editar |
| `AssignDriverDialog` | `solicitacaoId` | Lista entregadores ativos |
| `ViewSolicitacaoDialog` | `solicitacao` | Visualização read-only |
| `ConciliacaoDialog` | `solicitacao`, `mode` | **CRÍTICO** — ver detalhamento 7.3.5 |
| `JustificationDialog` | `type`, `onConfirm` | Texto obrigatório mínimo 10 caracteres |

#### 7.3.3 Abas de Status

| Aba | Filtro | Badge | Ações nas Linhas |
|-----|--------|-------|------------------|
| Todas | `todas` | total | Conforme status individual |
| Pendentes | `pendente` | Laranja se > 0 | Ver, Aceitar, Rejeitar, Cancelar |
| Aceitas | `aceita` | Normal | Ver, Iniciar, Editar, Cancelar |
| Em Andamento | `em_andamento` | Normal | Ver, Finalizar (Conciliar), Cancelar |
| Concluídas | `concluida` | Normal | Ver, Ver/Editar Conciliação |
| Canceladas | `cancelada` | Normal | Ver apenas |
| Rejeitadas | `rejeitada` | Normal | Ver apenas |

#### 7.3.4 Máquina de Estados das Solicitações

| Status Origem | Ação | Status Destino | Pré-condições | Efeitos Colaterais |
|--------------|------|----------------|---------------|-------------------|
| `pendente` | Aceitar | `aceita` | Entregador selecionado | Notificação para entregador (futuro) |
| `pendente` | Rejeitar | `rejeitada` | Justificativa ≥ 10 chars | Registro em `historico[]` |
| `pendente` | Cancelar | `cancelada` | Justificativa ≥ 10 chars | Registro em `historico[]` |
| `aceita` | Iniciar | `em_andamento` | — (pode reatribuir entregador) | Timestamp de início registrado |
| `aceita` | Cancelar | `cancelada` | Justificativa | Registro em `historico[]` |
| `em_andamento` | Finalizar | `concluida` | `ConciliacaoDialog` completo e validado | Gera `pagamentos_solicitacao`, `lancamentos_financeiros`, atualiza `fechamento_cliente` |
| `em_andamento` | Cancelar | `cancelada` | Justificativa + permissão elevada | Registro em `historico[]` |
| `concluida` | Editar Conciliação | `concluida` | Permissão `solicitacoes.conciliar_edit` + justificativa | Registro em `auditoria_financeira` |

#### 7.3.5 ConciliacaoDialog — Detalhamento Completo

> **COMPONENTE CRÍTICO:** Este é o núcleo do modelo financeiro. Cada interação aqui gera lançamentos imutáveis no razão financeiro. A implementação deve ser rigorosamente precisa.

**O dialog apresenta uma seção por rota da solicitação. Para cada rota, o operador registra os pagamentos recebidos. Cada pagamento tem três dimensões obrigatórias:**

1. **Meio de pagamento** — select de `formas_pagamento` com `enabled=true`
2. **Valor recebido** — numérico com 2 casas decimais
3. **Pertence a** — `'operacao'` (taxa é da transportadora) ou `'loja'` (valor foi coletado para o cliente)

**Exibição por rota:**
```
Rota 1: Bairro Boa Vista — Responsável: João Silva
├── Valor esperado da taxa: R$ 30,00  (taxaBase R$ 15,00 + taxaExtra R$ 15,00)
├── Valor a receber da loja: R$ 299,90  (conforme configurado na criação da rota)
│
├── [+ Adicionar recebimento]
│   ├── Forma: [Dinheiro ▼]   Valor: [R$ 30,00]   Pertence a: [● Operação ○ Loja]
│   └── Forma: [Cartão Loja ▼] Valor: [R$ 299,90]  Pertence a: [○ Operação ● Loja]
│
├── Resumo calculado em tempo real:
│   ├── Receita da operação: R$ 30,00  (esperado: R$ 30,00)  ✅
│   ├── Crédito da loja:     R$ 299,90 (esperado: R$ 299,90) ✅
│   └── Diferença: R$ 0,00 ← deve ser zero para permitir conclusão
```

**Cálculos automáticos em tempo real:**
```typescript
const receitaOperacao = pagamentos
  .filter(p => p.pertenceA === 'operacao')
  .reduce((sum, p) => sum + p.valor, 0);

const creditoLoja = pagamentos
  .filter(p => p.pertenceA === 'loja')
  .reduce((sum, p) => sum + p.valor, 0);

const totalEsperadoOperacao = rota.taxaEntrega + rota.taxasExtrasValor;
const totalEsperadoLoja = rota.valorAReceber;

const diferencaOperacao = receitaOperacao - totalEsperadoOperacao;
const diferencaLoja = creditoLoja - totalEsperadoLoja;
```

> **⚠️ REGRA CRÍTICA:** Diferença diferente de zero **BLOQUEIA** a conclusão ou exige justificativa formal registrada em `auditoria_financeira`. **Nunca aplicar tolerância silenciosa.**

**Ao confirmar a conciliação, o sistema executa em transação atômica (Supabase RPC ou Edge Function):**

```typescript
// Operações em ordem, dentro de uma única transação
async function concluirConciliacao(solicitacaoId: string, pagamentos: Pagamento[]) {
  await supabase.rpc('concluir_conciliacao', {
    p_solicitacao_id: solicitacaoId,
    p_pagamentos: pagamentos.map(p => ({
      rota_id: p.rotaId,
      forma_pagamento_id: p.formaPagamentoId,
      valor: p.valor,
      pertence_a: p.pertenceA,
      observacao: p.observacao || null,
    })),
  });
  // A RPC executa:
  // 1. INSERT N linhas em pagamentos_solicitacao
  // 2. INSERT lançamentos em lancamentos_financeiros:
  //    - tipo 'receita_operacao' para pagamentos pertenceA='operacao'
  //    - tipo 'credito_loja' para pagamentos pertenceA='loja'
  // 3. UPDATE ou INSERT em fechamento_cliente (acumula saldos)
  // 4. UPDATE solicitacao.status = 'concluida'
  // 5. INSERT em solicitacao.historico[] com evento de conclusão
}
```

#### 7.3.6 LaunchSolicitacaoDialog — Formulário Multi-step

**Step 1 — Dados Básicos:**

| Campo | Tipo | Obrigatório | Regra |
|-------|------|-------------|-------|
| `clienteId` | Select buscável | Sim | Apenas clientes com `status='ativo'` |
| `tipoOperacao` | Select | Sim | `standard` \| `express` \| `retorno` |
| `pontoColeta` | Text | Sim | Endereço de coleta do produto |
| `entregadorId` | Select | Não | Apenas entregadores `status='ativo'` (pode atribuir depois) |

**Step 2 — Rotas (mínimo 1, sem limite):**

| Campo | Tipo | Obrigatório | Regra |
|-------|------|-------------|-------|
| `bairroDestinoId` | Select buscável | Sim | Apenas bairros cadastrados; ao selecionar → chama `resolver_tarifa()` |
| `responsavel` | Text | Sim | Nome do destinatário |
| `telefone` | Text com máscara | Sim | `(99) 99999-9999` |
| `valorAReceber` | Currency | Condicional | Obrigatório se entregador irá coletar valor para a loja |
| `meiosPagamentoAceitos` | Multiselect | Sim | Apenas formas com `enabled=true` |
| `taxasExtrasIds` | Multiselect | Não | Taxas extras configuradas no sistema |

**Resolução de tarifa ao selecionar bairro:**
```typescript
async function onBairroChange(bairroId: string) {
  const tarifa = await supabase.rpc('resolver_tarifa', {
    p_cliente_id: form.watch('clienteId'),
    p_bairro_destino_id: bairroId,
    p_tipo_operacao: form.watch('tipoOperacao'),
  });

  if (tarifa.tipo_regra === 'sem_tarifa') {
    // BLOQUEAR o avanço com mensagem clara
    setError(`Nenhuma tarifa encontrada para ${clienteNome} → ${bairroNome}.
      Configure a tabela de preços antes de continuar.`);
    return;
  }

  if (tarifa.usando_fallback) {
    // Exibir aviso amarelo: "⚠️ Usando taxa padrão do bairro (R$ X,XX).
    // Considere configurar uma tarifa específica para este cliente."
    setWarning(`Usando taxa padrão do bairro: R$ ${tarifa.taxa_base}`);
  }

  // Salvar snapshot: taxaResolvida e regraPrecoId na rota
  setValue(`rotas.${index}.taxaResolvida`, tarifa.taxa_base);
  setValue(`rotas.${index}.regraPrecoId`, tarifa.regra_id);
}
```

**Step 3 — Revisão e Confirmação:**
- Resumo de todas as rotas com taxas resolvidas
- Valor total de taxas calculado
- Botão "Criar Solicitação" com estado de loading

#### 7.3.7 Regras de Negócio Críticas

1. Código único no formato `LT-YYYYMMDD-NNNNN` gerado no momento da criação
2. Resolução de tarifa obrigatória ao selecionar bairro — sem tarifa = bloqueio
3. Nenhum fallback silencioso — sempre alertar visualmente quando usando taxa padrão
4. Ao entrar na página, limpar notificações do módulo de solicitações
5. Exportação usa apenas os registros do filtro atual, nunca o dataset completo
6. Entregador pode ser reatribuído ao iniciar (`aceita→em_andamento`), mas não após iniciar
7. Cancelamento de `em_andamento` exige justificativa + permissão `solicitacoes.cancel_andamento`
8. Rejeição disponível apenas no status `pendente`

#### 7.3.8 Observações Técnicas
- Paginação server-side: `pageSize = 20`, com offset. **Nunca** carregar todas as solicitações em memória
- Filtros devem atualizar a URL como query params para compartilhamento e back/forward
- `ConciliacaoDialog` deve usar transação atômica (RPC ou Edge Function) para garantir consistência

---

### 7.4 — Gestão de Clientes (`/clientes`)

| Atributo | Valor |
|----------|-------|
| Rota | `/clientes` |
| Perfil | `admin` |
| Paginação | 20 itens por página, server-side |

#### 7.4.1 Estrutura Visual
`PageContainer` com título + botão "Adicionar Cliente" + `ExportDropdown`. Linha de filtros (busca por nome/email + select de status). `DataTable` com paginação. Em mobile, cards individuais por cliente.

#### 7.4.2 Tabela

| Coluna | Dado |
|--------|------|
| Cliente | `AvatarWithFallback` + `nome` + `email` |
| Contato | `telefone` formatado |
| Modalidade | Badge "Faturado" (azul) / "Pré-pago" (verde) |
| Status | Badge verde (ativo) / vermelho (inativo) |
| Ações | 👁 Ver perfil \| ✏️ Editar \| 🗑️ Excluir |

#### 7.4.3 ClientFormDialog — Campos

**Seção 1: Dados Cadastrais**

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| `nome` | Text | Sim | Mínimo 3 chars |
| `tipo` | Select | Sim | `pessoa_fisica` \| `pessoa_juridica` |
| `email` | Email | Sim | Formato válido; validação assíncrona de unicidade no blur |
| `telefone` | Text + máscara | Sim | `(99) 99999-9999` |
| `endereco` | Text | Sim | — |
| `bairro` | Text | Sim | — |
| `cidade` | Text | Sim | — |
| `uf` | Select | Sim | 27 UFs brasileiras |
| `chavePix` | Text | Não | Livre (CPF, CNPJ, email, telefone, chave aleatória) |
| `status` | Select | Sim | `ativo` \| `inativo` |

**Seção 2: Configurações Financeiras**

| Campo | Tipo | Condição de Exibição | Validação |
|-------|------|----------------------|-----------|
| `modalidade` | Select | Sempre | `pre-pago` \| `faturado` |
| `ativarFaturamentoAutomatico` | Toggle | Se `modalidade=faturado` | — |
| `frequenciaFaturamento` | Select | Se `ativarFaturamentoAutomatico=true` | `diario` \| `semanal` \| `mensal` \| `por_entrega` |
| `numeroDeEntregasParaFaturamento` | Number | Se `frequencia=por_entrega` | Mín. 1 |
| `diaDaSemanaFaturamento` | Select | Se `frequencia=semanal` | Dom–Sáb |
| `diaDoMesFaturamento` | Number | Se `frequencia=mensal` | 1–28 |

#### 7.4.4 ClientProfileModal — Seções
- Dados cadastrais completos
- Configuração de faturamento
- Métricas: total de solicitações, valor total de taxas geradas
- Últimas 5 solicitações com status e data
- Fechamentos recentes com status de pagamento
- Botão "Ver Tabela de Preços" → abre painel `tabela_precos_cliente` filtrado por `clienteId`

#### 7.4.5 Regras de Negócio

1. Email único: validação assíncrona ao sair do campo (blur) verificando no Supabase
2. Cliente inativo não aparece no select de `clienteId` do `LaunchSolicitacaoDialog`
3. Exclusão bloqueada se existir solicitação associada — sugerir inativação
4. Modalidade `pré-pago`: sem faturamento automático
5. Modalidade `faturado`: trigger de fechamento conforme frequência configurada

---

### 7.5 — Gestão de Entregadores (`/entregadores`)

| Atributo | Valor |
|----------|-------|
| Rota | `/entregadores` |
| Perfil | `admin` |

#### 7.5.1 MetricCards (4 cards — todos dinâmicos)

| Card | Cálculo | Observação |
|------|---------|------------|
| Total de Entregadores | `COUNT(*) FROM entregadores` | — |
| Entregadores Ativos | `COUNT(*) WHERE status='ativo'` | — |
| Entregas Hoje | `COUNT(*) FROM solicitacoes WHERE dataConclusao=hoje` | **CORRIGIR: estava hardcoded como 42** |
| Horas Trabalhadas | `SUM(duracao) das entregas de hoje / 60` em horas | **CORRIGIR: estava hardcoded como 18h** |

#### 7.5.2 EntregadorFormDialog

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| `nome` | Text | Sim | Mín. 3 chars |
| `documento` | Text + máscara | Sim | CPF (`000.000.000-00`) ou CNPJ (`00.000.000/0000-00`) |
| `email` | Email | Sim | Único no sistema |
| `telefone` | Text + máscara | Sim | `(99) 99999-9999` |
| `cidade` | Text | Sim | — |
| `bairro` | Text | Sim | — |
| `veiculo` | Select | Sim | `moto` \| `carro` \| `bicicleta` \| `a_pe` |
| `status` | Select | Sim | `ativo` \| `inativo` |
| `tipoComissao` | Select | Sim | `percentual` \| `fixo` |
| `valorComissao` | Number | Sim | Se percentual: 0–100%; se fixo: valor em R$ |

#### 7.5.3 Regras de Negócio

1. Comissão incide sobre receita operacional da entrega (**NUNCA** sobre valores coletados para a loja)
2. Entregador inativo não aparece no `AssignDriverDialog`
3. Exclusão bloqueada se existir solicitação ativa (`status != concluida/cancelada/rejeitada`)
4. Email único — usado para identificação no portal do entregador

---

### 7.6 — Financeiro (`/financeiro`)

| Atributo | Valor |
|----------|-------|
| Rota | `/financeiro` |
| Perfil | `admin` |
| Abas | Despesas (existente) + Receitas (**NOVO**) + Livro Caixa (**NOVO**) |

#### 7.6.1 MetricCards (4 cards — todos dinâmicos)

| Card | Cálculo | Observação |
|------|---------|------------|
| Total de Despesas | `SUM(valor) FROM despesas` no período | % vs período anterior: `((atual-anterior)/anterior)*100` |
| Despesas Pendentes | `SUM(valor) WHERE status IN ('Pendente','Atrasado')` | Subtexto: qtd de despesas pendentes |
| Despesas Pagas | `SUM(valor) WHERE status='Pago'` | — |
| Receitas | `SUM(valor) FROM lancamentos_financeiros WHERE tipo='receita_operacao'` | **CORRIGIR: implementar cálculo real** |

#### 7.6.2 Aba Despesas

**Tabela:**

| Coluna | Dado | Ação |
|--------|------|------|
| Descrição | `d.descricao` | — |
| Categoria | `d.categoria` | Filtro rápido ao clicar |
| Fornecedor | `d.fornecedor` | — |
| Vencimento | `dd/MM/yyyy` + indicador de atraso em vermelho | — |
| Valor | Formatado BRL | — |
| Status | Badge Pendente/Atrasado/Pago | — |
| Ações | Ver + Dropdown | Editar, Marcar como Paga (**CORRIGIR: implementar onClick**), Excluir |

**Lógica de status:**
- `Pendente`: `vencimento >= hoje`
- `Atrasado`: `vencimento < hoje AND status != 'Pago'` — calculado em runtime
- `Pago`: marcação manual via "Marcar como Paga" — atualiza `status + dataPagamento + usuarioPagouId`

**DespesaFormDialog:**

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| `descricao` | Text | Sim | Mín. 3 chars |
| `categoria` | Select + opção "Outra" | Sim | Lista de `categories WHERE type='despesa'` |
| `fornecedor` | Text | Sim | — |
| `vencimento` | DatePicker | Sim | Não pode ser retroativo sem confirmação explícita |
| `valor` | Currency | Sim | > 0 |
| `status` | Select | Sim | `Pendente` \| `Pago` |
| `observacao` | Textarea | Não | — |

#### 7.6.3 Aba Receitas (NOVO — implementar na reconstrução)

Listagem de `lancamentos_financeiros WHERE tipo='receita_operacao'`. Mostra entradas financeiras da operação derivadas das conciliações. Filtro por período. Exportação PDF/Excel.

#### 7.6.4 Aba Livro Caixa (NOVO)

Visão consolidada de entradas e saídas por período com saldo acumulado. Combina receitas operacionais e despesas numa linha do tempo. Saldo final do período calculado.

#### 7.6.5 Gráficos

- **PieChart — Despesas por Categoria:** Recharts com tooltip e legenda. Máximo 8 categorias; demais agrupadas em "Outros".
- **BarChart — Fluxo de Caixa:** Últimos 6 meses. Barras: Receitas (verde) vs Despesas (vermelho). Tooltip com valores BRL.
- Ambos respeitam o filtro de período global da página.

---

### 7.7 — Faturas e Fechamentos (`/faturas`)

| Atributo | Valor |
|----------|-------|
| Rota | `/faturas` (ativas) e `/faturas/finalizadas` |
| Perfil | `admin` |
| Regra | Lista ativa exibe apenas `statusGeral != 'Finalizada'` |

> **Nova abordagem:** A fatura/fechamento deixa de ser o ponto de cálculo manual e passa a ser um **consolidador de lançamentos já apurados na conciliação**. O saldo líquido é calculado automaticamente dos `lancamentos_financeiros`.

#### 7.7.1 Modelo de Fechamento por Cliente

| Bloco | Descrição | Cálculo |
|-------|-----------|---------|
| Créditos da Loja | Valores recebidos pelo entregador em nome da loja | `SUM(lancamentos WHERE tipo='credito_loja' AND clienteId)` |
| Débitos da Loja | Taxas cobradas pela operação | `SUM(lancamentos WHERE tipo='debito_loja' AND clienteId)` |
| Ajustes | Correções manuais com justificativa | `SUM(ajustes_financeiros WHERE clienteId)` |
| **Saldo Líquido** | Créditos - Débitos - Ajustes desfavoráveis | Calculado automaticamente |

#### 7.7.2 Interpretação do Saldo Líquido

| Saldo | Significado | Ação Necessária |
|-------|-------------|-----------------|
| Positivo | A operação deve repassar valor para a loja | `statusRepasse: Pendente → Repassado` |
| Negativo | A loja deve pagar à operação | `statusTaxas: Pendente → Pago` |
| Zero | Fechamento quitado | `statusGeral: Finalizada` |

#### 7.7.3 Dimensões de Status

| Dimensão | Valores | Semântica |
|----------|---------|-----------|
| `statusGeral` | `Aberta \| Fechada \| Paga \| Finalizada \| Vencida` | Estado geral do documento |
| `statusTaxas` | `Pendente \| Paga \| Vencida` | Situação da cobrança de taxas |
| `statusRepasse` | `Pendente \| Repassado` | Situação do repasse para a loja |
| `statusCobranca` | `Nao_aplicavel \| Pendente \| Cobrado \| Inadimplente` | Rastreia ciclo de cobrança quando loja é devedora |

#### 7.7.4 FaturaDetailsModal — Seções

1. **Cabeçalho:** número, cliente, período, data emissão e vencimento
2. **Resumo Financeiro:** Créditos da Loja | Débitos da Loja | Ajustes | **Saldo Líquido** (destacado com cor)
3. **Lista de Entregas:** todas as solicitações incluídas com taxa e valor coletado
4. **Lançamentos Financeiros:** razão detalhado linha a linha (tipo, valor, origem, data)
5. **Ajustes Manuais:** lista de ajustes com motivo e usuário responsável
6. **Histórico de Liquidação:** registro de pagamentos e repasses realizados
7. **Ações no rodapé:** Registrar Cobrança, Registrar Repasse, Adicionar Ajuste, Finalizar

#### 7.7.5 Regras de Negócio Críticas

1. Geração automática de fechamento disparada após cada conciliação conforme `frequenciaFaturamento` do cliente
2. Por Entrega: ao atingir `numeroDeEntregasParaFaturamento`, cria/fecha o documento
3. Semanal: trigger todo `diaDaSemanaFaturamento` às 00:00 via Supabase Edge Function
4. Mensal: trigger todo `diaDoMesFaturamento` às 00:00 via Supabase Edge Function
5. Alterações em fechamentos **finalizados** exigem `faturas.edit_finalizada` + justificativa em `auditoria_financeira`
6. PDF do fechamento inclui: cabeçalho, resumo financeiro, lista de entregas e histórico de liquidação
7. **CORRIGIR:** "Marcar como Paga", "Marcar como Repassada" e "Exportar PDF" devem ser implementados com persistência real

#### 7.7.6 Observações Técnicas
- `FaturaDetailsModal` deve carregar `lancamentos_financeiros` lazy — não pré-carregar ao montar a lista
- Transações de liquidação (cobrança/repasse) devem ser atômicas via Supabase RPC

---

### 7.8 — Relatórios Gerenciais (`/relatorios`)

| Atributo | Valor |
|----------|-------|
| Rota | `/relatorios` |
| Perfil | `admin` |
| Filtro Global | `DatePickerWithRange` no cabeçalho — filtra todas as abas simultaneamente |

#### 7.8.1 Abas

| Aba | Conteúdo | Exportação |
|-----|----------|------------|
| Resumo Financeiro | Cards: Total Receitas, Total Despesas, Lucro Líquido, Margem %. Gráfico de evolução mensal | PDF + Excel (**CORRIGIR: não implementado**) |
| Comissões de Entregadores | Tabela: Entregador, Nº Entregas, Valor Gerado, Comissão. Totais no rodapé | PDF funcional |
| Detalhamento de Despesas | Tabela completa de despesas no período com filtro por categoria e status | PDF funcional |

#### 7.8.2 Cálculo de Comissões
```typescript
// Comissão percentual
const comissao = entregador.tipoComissao === 'percentual'
  ? receitaOperacional * (entregador.valorComissao / 100)
  : entregador.valorComissao * numEntregas; // fixo por entrega

// REGRA CRÍTICA: comissão NUNCA inclui valores coletados para a loja
// receitaOperacional = SUM(lancamentos_financeiros WHERE tipo='receita_operacao' AND entregadorId=X)
```

#### 7.8.3 Resumo Financeiro — Cálculos
- **Total de Receitas:** `SUM(lancamentos WHERE tipo='receita_operacao')` no período
- **Total de Despesas:** `SUM(despesas WHERE vencimento BETWEEN inicio AND fim)`
- **Lucro Líquido:** Total Receitas - Total Despesas
- **Margem:** `(Lucro Líquido / Total Receitas) * 100`

---

### 7.9 — Configurações do Sistema (`/configuracoes`)

| Atributo | Valor |
|----------|-------|
| Rota | `/configuracoes` |
| Perfil | `admin` (acesso por aba controlado por permissões granulares) |
| Contexto de Uso | Central de parametrização. **Alterações aqui afetam diretamente toda a operação.** |
| Impacto no Sistema | CRÍTICO — afeta criação de solicitações, cálculo de tarifas, formas de pagamento e permissões |

#### 7.9.1 Estrutura Visual
Cabeçalho com título "Configurações do Sistema" + subtítulo. Barra de abas horizontal com 5 abas. Em mobile, as abas colapsam para um Select. Cada aba é carregada lazy (React Query por aba).

#### 7.9.2 Mapa das Abas

| Aba | Entidade | Impacto Operacional | Risco |
|-----|----------|--------------------|----|
| Bairros | `bairros` | Define destinos disponíveis nas rotas. `taxaEntrega` é fallback | Alto |
| Regiões | `regioes` | Agrupa bairros para regras regionais de tarifa | Médio |
| Formas de Pagamento | `formas_pagamento` | Controla meios aceitos na criação de rotas e na conciliação | Alto |
| Cargos e Permissões | `cargos` | Define perfis de acesso dos usuários admin | Crítico |
| **Tabela de Preços** | `tabela_precos_cliente` | **NOVO** — tarifas personalizadas por cliente+bairro | Crítico |

#### 7.9.3 Aba: Bairros

**Estrutura:** Título + contador + botão "Novo Bairro" + input de busca. Tabela: Nome | Região | Taxa de Entrega (fallback) | Ações.

**BairroFormDialog:**

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| `nome` | Text | Sim | Mín. 2 chars, único por município |
| `regiaoId` | Select | Sim | Apenas regiões cadastradas |
| `taxaEntrega` | Currency | Sim | ≥ 0. **É FALLBACK** — exibir aviso explicativo abaixo do campo |

**Aviso visual obrigatório no campo `taxaEntrega`:**
> ⚠️ Este valor é um fallback. Ele só será usado quando não houver uma regra específica em Tabela de Preços para o cliente que está fazendo a solicitação. Configure as tarifas por cliente na aba "Tabela de Preços".

**Estados:**

| Estado | Comportamento |
|--------|---------------|
| Loading | Skeleton de tabela com 5 linhas fantasma |
| Vazio | `EmptyState`: ícone MapPin, "Nenhum bairro cadastrado", botão "Cadastrar primeiro bairro" |
| Erro de exclusão | Toast error: "Não é possível excluir: existem rotas ativas com este bairro. Inative o bairro se necessário." |

**Regras de Negócio:**
1. `taxaEntrega` é FALLBACK — exibir aviso visual quando uma solicitação usar esse valor
2. Exclusão bloqueada se existir rota (status != cancelada/rejeitada) com `bairroDestinoId` apontando para este
3. Vínculo com região é obrigatório para que regras regionais funcionem
4. Alteração de `taxaEntrega` **NÃO** afeta solicitações já criadas — o snapshot `taxaResolvida` já foi gravado

#### 7.9.4 Aba: Regiões

**RegiaoFormDialog:** `name` (text, mín 2 chars), `description` (textarea, opcional).

**Regras:**
1. Região não pode ser excluída se existir bairro vinculado
2. Região não pode ser excluída se existir regra em `tabela_precos_cliente` usando `regiaoId`

#### 7.9.5 Aba: Formas de Pagamento

**Estrutura:** Tabela: Nome | Descrição | Toggle habilitado/desabilitado | Ações.

**FormaPagamentoDialog:** `name` (text, único), `description` (textarea), `enabled` (toggle, default true).

**Regras:**
1. Formas com `enabled=false` são OCULTADAS dos selects de criação de rota e conciliação
2. Exclusão somente se nenhum registro em `pagamentos_solicitacao` referenciar esta forma — na prática, sempre desabilitar em vez de excluir
3. Seed obrigatório: Dinheiro, PIX, Cartão de Crédito, Cartão de Débito

#### 7.9.6 Aba: Cargos e Permissões

**Estrutura:** Lista de cargos: Nome | Descrição | Qtd de Permissões | Qtd de Usuários | Ações.

**CargoFormDialog:** `name` (text, único), `description` (textarea), `permissions[]` (checkboxes agrupados por módulo).

**Mapa de Permissões Granulares:**

| Módulo | Permissões |
|--------|------------|
| Solicitações | `solicitacoes.view`, `.create`, `.edit`, `.cancel`, `.reject`, `.assign_driver`, `.conciliar`, `.conciliar_edit` |
| Clientes | `clientes.view`, `.create`, `.edit`, `.delete`, `.view_financeiro` |
| Entregadores | `entregadores.view`, `.create`, `.edit`, `.delete` |
| Faturas | `faturas.view`, `.create`, `.edit`, `.delete`, `.liquidar`, `.edit_finalizada` |
| Financeiro | `financeiro.view`, `.despesas_create`, `.despesas_edit`, `.despesas_pagar` |
| Relatórios | `relatorios.view`, `.export` |
| Configurações | `settings.view`, `.bairros`, `.regioes`, `.formas_pagamento`, `.cargos`, `.tabela_precos` |
| Financeiro Avançado | `financeiro.ajustes`, `.auditoria_view`, `.edit_pos_fechamento` |

**Regras:**
1. Deve existir pelo menos um cargo com TODAS as permissões — este cargo não pode ser excluído
2. Ao alterar permissões de um cargo, invalidar `['auth', 'permissions']` no React Query de todos os usuários com aquele cargo
3. Permissões `edit_pos_fechamento` e `ajustes` devem ser concedidas com extrema cautela

#### 7.9.7 Aba: Tabela de Preços por Cliente (NOVO — MÓDULO CRÍTICO)

> **Este módulo não existe no sistema atual e é a principal adição arquitetural da reconstrução.** Resolve o problema de tarifação genérica por bairro que causa prejuízo quando clientes têm origens e distâncias diferentes.

**Estrutura Visual:**
- Cabeçalho: título + Select de cliente + botão "Nova Regra" (habilitado apenas com cliente selecionado) + botão "Exportar tabela"
- **Indicador de cobertura:** banner/card mostrando cobertura dos bairros
  - Verde: todos os bairros cadastrados têm tarifa para este cliente
  - Laranja: cobertura parcial — "X bairros sem tarifa específica. Entregas para esses bairros usarão o fallback."
  - Vermelho: nenhuma regra configurada — "Este cliente não tem nenhuma tarifa configurada. Adicione regras para evitar tarifação incorreta."
- Tabela de regras: Bairro Destino | Região | Tipo de Operação | Taxa Base | Taxa Retorno | Taxa Espera | Taxa Urgência | Status | Prioridade | Ações
- Linhas ordenadas por prioridade (crescente). Drag-and-drop via `@dnd-kit/sortable` para reordenar.

**RegraPrecoDialog:**

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| `clienteId` | Select (pré-preenchido pela aba) | Sim | Apenas clientes ativos |
| `bairroDestinoId` | Select buscável | Sim | Ao selecionar: exibir fallback do bairro como referência |
| `regiaoId` | Select (opcional) | Não | Preenchido automaticamente ao selecionar bairro; editável para criar regra regional |
| `tipoOperacao` | Select | Sim | `standard` \| `express` \| `retorno` \| `todos` |
| `taxaBase` | Currency (R$) | Sim | > 0 |
| `taxaRetorno` | Currency (R$) | Não | Default 0 |
| `taxaEspera` | Currency (R$/hora) | Não | Default 0 |
| `taxaUrgencia` | Currency (R$) | Não | Default 0 |
| `ativo` | Toggle | Sim | Default true |
| `prioridade` | Number | Sim | Default auto (max_atual + 1) |
| `observacao` | Textarea | Não | Justificativa comercial para uso interno |

**Algoritmo de Resolução de Tarifa (precedência de regras):**

```
1. tabela_precos_cliente WHERE cliente=X AND bairro=Y AND tipo=Z AND ativo=true → ORDER BY prioridade ASC
2. tabela_precos_cliente WHERE cliente=X AND bairro=Y AND tipo='todos' AND ativo=true → ORDER BY prioridade ASC
3. tabela_precos_cliente WHERE cliente=X AND regiao=W AND bairro=NULL AND tipo=Z AND ativo=true
4. tabela_precos_cliente WHERE cliente=X AND regiao=W AND bairro=NULL AND tipo='todos' AND ativo=true
5. bairros.taxaEntrega como FALLBACK EXPLÍCITO → EXIBIR AVISO VISUAL
6. Nenhuma regra encontrada → BLOQUEAR criação com mensagem explicativa
```

**Estados Especiais:**

| Estado | Comportamento Visual |
|--------|---------------------|
| Nenhum cliente selecionado | "Selecione um cliente para visualizar e editar sua tabela de preços" |
| Cliente sem regras | EmptyState + alerta vermelho |
| Cobertura parcial | Banner laranja com botão "Ver bairros sem cobertura" |
| Cobertura total | Banner verde |
| Drag reordenando | Linha arrastada com sombra, prioridades renumeradas ao soltar |

**Regras de Negócio Críticas:**
1. Regra com `bairroDestinoId=NULL` e `regiaoId` preenchido é uma "regra regional" — aplica para todos os bairros da região sem regra específica
2. Prioridade menor = maior precedência. Desempate por `createdAt DESC`
3. **Snapshot obrigatório:** ao criar solicitação, gravar `taxaResolvida` e `regraPrecoId` na rota — alterações futuras na tabela não afetam solicitações já criadas
4. Regra inativa (`ativo=false`) é completamente ignorada na resolução
5. Não pode ter duas regras ativas para o mesmo `(clienteId + bairroDestinoId + tipoOperacao)` — sistema detecta conflito antes de salvar
6. Interface deve mostrar preview da tarifa resultante ao preencher o formulário

**Observações Técnicas:**
- Implementar como Supabase RPC (`resolver_tarifa`) — não fazer múltiplas queries sequenciais client-side
- Indexar `(cliente_id, bairro_destino_id, tipo_operacao, ativo, prioridade)` para performance
- Drag-and-drop faz um único UPDATE batch ao soltar, não um UPDATE por item durante o drag
- Cache React Query: `staleTime = 5min`, invalidado imediatamente após qualquer mutação

---

### 7.10 — Portal do Cliente (`/cliente/*`)

| Atributo | Valor |
|----------|-------|
| Rotas base | `/cliente/*` |
| Perfil | `cliente` |
| Layout | `ClientLayout` com sidebar simplificada |
| Isolamento de dados | RLS filtra automaticamente por `clienteId` via `auth.uid()` |

#### 7.10.1 Dashboard do Cliente (`/cliente`)

**MetricCards:**

| Componente | Dado | Fonte |
|------------|------|-------|
| Pedidos do Mês | Count de solicitações do cliente no mês | `solicitacoes WHERE clienteId = auth.clienteId` |
| Em Andamento | Count de `status='em_andamento'` | — |
| Saldo Devedor | Saldo líquido do fechamento aberto atual (se negativo = cliente deve) | `fechamentos_cliente WHERE clienteId` |
| Saldo a Receber | Saldo líquido (se positivo = operação deve repassar à loja) | — |

> **CORRIGIR:** Saldo e fatura em aberto **estavam hardcoded** como R$ 532,50 e R$ 875,90. Devem ser calculados dinamicamente da tabela `fechamentos_cliente`.

**Lista de Solicitações Recentes:** Últimas 5 solicitações ordenadas por data. Colunas: Solicitação, Data, Status, Entregador (com avatar), Taxa de Entrega, Taxas Extras, Total. Ação: 👁 Visualizar.

#### 7.10.2 Minhas Solicitações (`/cliente/solicitacoes`)

Listagem read-only de todas as solicitações do cliente. Filtros: busca por código/entregador + select de status.

> **Regra de exibição de valores:** `valorTotal` exibido para o cliente = `taxaEntrega + taxasExtras` — **NUNCA** inclui os valores coletados em nome da loja (informação interna da operação).

#### 7.10.3 Meu Financeiro (`/cliente/financeiro`)

**Condicional por modalidade:**
- Se `modalidade != 'faturado'`: Card informativo "Seu plano é pré-pago. Consulte seu saldo."
- Se `modalidade == 'faturado'`: Métricas + lista de fechamentos

**Métricas:** Valor Total em Aberto (dinâmico) + Próximo Vencimento (menor data de fechamento com status `Aberta` ou `Vencida`).

**Abas de fechamentos:**
- "Faturas em Aberto": `statusGeral IN ('Aberta', 'Vencida')`
- "Faturas Pagas": `statusGeral IN ('Paga', 'Finalizada')`

**Ações:** Visualizar (abre `FaturaDetailsModal` em `viewOnly=true`). Download PDF — **CORRIGIR: estava apenas exibindo toast sem gerar arquivo.** Deve gerar PDF real via jsPDF com: cabeçalho, lista de entregas, totais.

#### 7.10.4 Meu Perfil (`/cliente/perfil`)

Campos editáveis: Nome, CPF/CNPJ, Telefone, Avatar (upload via Supabase Storage). Email somente leitura. Alteração de senha funcional via `supabase.auth.updateUser({ password })`.

**CORRIGIR:** `updateUser` deve persistir no Supabase (`UPDATE clientes + UPDATE profiles`), não apenas no AuthContext local.

---

### 7.11 — Portal do Entregador (`/entregador/*`)

| Atributo | Valor |
|----------|-------|
| Rotas base | `/entregador/*` |
| Perfil | `entregador` |
| Layout | `DriverLayout` com sidebar simplificada |
| Isolamento de dados | RLS filtra por `entregadorId` via `auth.uid()` |

#### 7.11.1 Dashboard do Entregador (`/entregador`)

**MetricCards:**

| Componente | Dado | Fonte |
|------------|------|-------|
| Corridas Hoje | Count com conclusão hoje | `solicitacoes WHERE entregadorId` |
| Em Andamento | Corridas com status `em_andamento` | — |
| Comissão do Mês | Comissão calculada do mês atual | `lancamentos_financeiros + entregador.tipoComissao` |

**Lista de Corridas Ativas:** `em_andamento` com dados de cliente, bairro destino, hora prevista. Ação "Finalizar" → `ConciliacaoDialog` (entregador declara formas de pagamento recebidas).

#### 7.11.2 Histórico (`/entregador/historico`)

Todas as corridas concluídas do entregador. Filtro por período. Colunas: Código, Cliente, Data de Conclusão, Taxa, Status.

#### 7.11.3 Meu Financeiro (`/entregador/financeiro`)

Extrato de comissões por período. Lista de entregas realizadas com comissão calculada por entrega. **NÃO exibe** valores coletados para a loja — apenas receita operacional da entrega.

> **Regra de privacidade:** O entregador NÃO vê o valor coletado para a loja nem os dados financeiros internos da operação. Vê apenas sua comissão.

#### 7.11.4 Meu Perfil (`/entregador/perfil`)

Editável: Nome, Telefone, Cidade, Bairro, Veículo, Avatar. Somente leitura: Documento (CPF/CNPJ), Email. Senha alterável. **CORRIGIR:** persistir no Supabase.

---

## 8. MODELAGEM DE ESTADO

### 8.1 Estados Globais (Context API)

| Context | Estado Mantido | Compartilhado Com |
|---------|---------------|-------------------|
| `AuthContext` | `user`, `loading`, `role`, `clientData`, `entregadorData` | Toda a aplicação |
| `SidebarContext` | `isOpen`, `isMobile` | AppShell, Sidebar, Header |
| `NotificationContext` | `notifications: { [module]: number }`, `totalUnread` | Sidebar badges, header |
| `ThemeProvider` | `theme`, `resolvedTheme` | Toda a aplicação (CSS vars) |
| `FaturasContext` | `activeFaturas[]`, `loading`, `refetch()` | FaturasPage, Dashboard |
| `TransactionContext` | `transactions[]`, `loading` | Dashboard |

### 8.2 Cache e Estado de Servidor (React Query)

| Query Key | Dado | staleTime | refetchInterval |
|-----------|------|-----------|-----------------|
| `['dashboard', 'metrics']` | Métricas do dashboard | 30s | 60s |
| `['solicitacoes', filters]` | Lista de solicitações | 10s | 30s |
| `['clientes']` | Lista de clientes | 5min | — |
| `['entregadores']` | Lista de entregadores | 5min | — |
| `['faturas', 'ativas']` | Faturas ativas | 30s | 60s |
| `['financeiro', 'despesas', period]` | Despesas do período | 2min | — |
| `['relatorios', period]` | Dados de relatórios | 5min | — |
| `['settings']` | Configurações gerais | 10min | — |
| `['settings', 'tabela_precos', clienteId]` | Preços do cliente | 5min | — |

### 8.3 Padrão de Estado de Modais

```typescript
// Padrão universal para todos os modais — NUNCA usar estado global para isso
const [dialogState, setDialogState] = useState<{
  isOpen: boolean;
  selectedItem: EntityType | null;
  mode: 'create' | 'edit' | 'view';
  isLoading: boolean;
}>({ isOpen: false, selectedItem: null, mode: 'create', isLoading: false });
```

### 8.4 Estado de Filtros na URL

Filtros de listagem **devem** ser mantidos em URL (query params via `useSearchParams`). Garante:
- Compartilhamento de URL com filtros aplicados
- Back/Forward do browser funcional
- Bookmark de filtros específicos

---

## 9. MODELAGEM DE COMPONENTES

### 9.1 Componentes de Layout

| Componente | Arquivo | Props | Responsabilidade |
|------------|---------|-------|-----------------|
| `AppShell` | layouts/AppShell.tsx | `children`, `portal` | Container principal: sidebar + header + content |
| `AdminLayout` | layouts/AdminLayout.tsx | — | Shell do portal admin com `AdminSidebar` |
| `ClientLayout` | layouts/ClientLayout.tsx | — | Shell do portal cliente com sidebar simplificada |
| `DriverLayout` | layouts/DriverLayout.tsx | — | Shell do portal entregador |
| `ProtectedRoute` | components/ProtectedRoute.tsx | `allowedRoles: string[]` | Verifica auth + role, redireciona se inválido |
| `PageContainer` | components/ui/PageContainer.tsx | `title`, `subtitle`, `actions?`, `breadcrumb?` | Container padrão de página |

### 9.2 Componentes Compartilhados

| Componente | Arquivo | Função |
|------------|---------|--------|
| `MetricCard` | shared/MetricCard.tsx | Card com título, valor, subtítulo, ícone, delta |
| `DataTable<T>` | shared/DataTable.tsx | Tabela genérica com sorting, paginação server-side |
| `SearchInput` | shared/SearchInput.tsx | Input de busca com debounce 300ms |
| `DatePickerWithRange` | shared/DatePickerWithRange.tsx | Seletor de período com dois datepickers |
| `StatusBadge` | shared/StatusBadge.tsx | Badge colorido por status com mapeamento |
| `ConfirmDialog` | shared/ConfirmDialog.tsx | AlertDialog genérico para ações destrutivas |
| `JustificationDialog` | shared/JustificationDialog.tsx | Dialog com textarea obrigatória |
| `ExportDropdown` | shared/ExportDropdown.tsx | Dropdown PDF + Excel funcional |
| `EmptyState` | shared/EmptyState.tsx | Estado vazio padronizado |
| `ErrorState` | shared/ErrorState.tsx | Estado de erro com retry |
| `LoadingSkeleton` | shared/LoadingSkeleton.tsx | Skeleton parametrizável |
| `CurrencyInput` | shared/CurrencyInput.tsx | Input com formatação BRL automática |
| `PhoneInput` | shared/PhoneInput.tsx | Input com máscara de telefone |
| `AvatarWithFallback` | shared/AvatarWithFallback.tsx | Avatar com fallback por iniciais |
| `PermissionGuard` | shared/PermissionGuard.tsx | Renderiza children só se usuário tem permissão |
| `CanAccess` | shared/CanAccess.tsx | Renderiza children só se role do usuário está na lista |

### 9.3 Componentes por Módulo

**Solicitações:**
- `LaunchSolicitacaoDialog` — formulário multi-step com resolução de tarifa
- `AssignDriverDialog` — seleção de entregador
- `ViewSolicitacaoDialog` — visualização read-only
- `JustificationDialog` — justificativa para cancelar/rejeitar
- `ConciliacaoDialog` — **NÚCLEO FINANCEIRO** — registro de pagamentos com `pertenceA`

**Clientes:**
- `ClientFormDialog` — criação/edição com dados cadastrais + faturamento
- `ClientProfileModal` — perfil completo com métricas e histórico

**Faturas:**
- `FaturaDetailsModal` — modal completo com razão financeiro e ações de liquidação

**Configurações:**
- `BairrosTab`, `RegioesTab`, `FormasPagamentoTab`, `CargosTab`, `TabelaPrecosTab`
- `BairroFormDialog`, `RegiaoFormDialog`, `FormaPagamentoDialog`, `CargoFormDialog`, `RegraPrecoDialog`

---

## 10. REGRAS DE NEGÓCIO CONSOLIDADAS

### 10.1 Módulo: Autenticação

1. Login por email + senha via `supabase.auth.signInWithPassword()`
2. Role determina portal: `admin→/`, `cliente→/cliente`, `entregador→/entregador`
3. Tentativa de acesso a rota de outro portal → redirect para `/login`
4. Permissões granulares definidas por cargo, verificadas via `usePermissions()`
5. Recuperação de senha via `supabase.auth.resetPasswordForEmail()` — link para `/login/reset`
6. Máximo 5 tentativas de login por janela de 5 minutos — bloqueio temporário

### 10.2 Módulo: Solicitações

7. Código único no formato `LT-YYYYMMDD-NNNNN` gerado no momento da criação
8. Resolução de tarifa obrigatória ao selecionar bairro na criação
9. Ausência de tarifa válida para o cliente **bloqueia** a criação com mensagem clara
10. **Nenhum fallback silencioso** — sempre alertar quando usando taxa padrão do bairro
11. Conciliação **deve registrar `pertenceA`** para cada pagamento: `'operacao'` ou `'loja'`
12. Diferença financeira na conciliação > R$ 0,01 bloqueia conclusão ou exige justificativa em `auditoria_financeira`
13. Cancelamento após `em_andamento` exige permissão `solicitacoes.cancel_andamento` além de justificativa
14. Rejeição disponível apenas no status `pendente`
15. Histórico de transições preservado em `solicitacoes.historico[]`
16. Exportação usa apenas dados do filtro ativo — nunca o dataset completo
17. Ao entrar na página, limpar notificações pendentes do módulo

### 10.3 Módulo: Financeiro — Lançamentos

18. A conciliação é a origem primária dos lançamentos — não podem ser criados manualmente (exceto ajuste com permissão elevada e auditoria)
19. `lancamentos_financeiros` é **imutável** após criação — alterações geram novo lançamento de estorno + registro em `auditoria_financeira`
20. Comissão do entregador incide somente sobre `receita_operacao`, **nunca** sobre `credito_loja`
21. Saldo líquido do fechamento = `SUM(credito_loja) - SUM(debito_loja) - SUM(ajustes desfavoráveis)`
22. Saldo positivo = repasse da operação para a loja; negativo = cobrança à loja; zero = quitado

### 10.4 Módulo: Faturas / Fechamentos

23. Fechamento automático disparado por: (a) N entregas, (b) corte semanal, (c) corte mensal — conforme `frequenciaFaturamento` do cliente
24. Fechamento finalizado é **imutável** sem permissão `faturas.edit_finalizada` e auditoria
25. `statusGeral='Finalizada'` remove a fatura da lista ativa e move para `/faturas/finalizadas`
26. Vencida: faturas não finalizadas após `dataVencimento`
27. PDF do fechamento inclui: cabeçalho, créditos da loja, débitos, ajustes, saldo líquido, histórico de liquidação

### 10.5 Módulo: Tarifação

28. Precedência: `(cliente+bairro+tipo)` > `(cliente+bairro+todos)` > `(cliente+região+tipo)` > `(cliente+região+todos)` > `bairros.taxaEntrega` > **BLOQUEIO**
29. Ausência de qualquer regra válida para o cliente **bloqueia** a criação da solicitação
30. **Nenhum fallback silencioso** — sempre alertar visualmente quando usando taxa de fallback
31. Snapshot da tarifa aplicada gravado em `rotas.taxaResolvida` no momento da criação
32. Alterações futuras na tabela de preços não afetam solicitações já criadas

### 10.6 Módulo: Portais (Cliente e Entregador)

33. Portal do cliente exibe apenas solicitações e fechamentos com `clienteId = auth.clienteId` (RLS)
34. Portal do entregador exibe apenas corridas com `entregadorId = auth.entregadorId` (RLS)
35. `valorTotal` exibido para o cliente = `taxaEntrega + taxasExtras` — sem valores coletados para a loja
36. Entregador **não vê** valores coletados para a loja — apenas sua comissão

---

## 11. DEPENDÊNCIAS ENTRE MÓDULOS

```
AuthContext
  ├── Todos os ProtectedRoute dependem de AuthContext
  ├── usePermissions() depende de AuthContext (user.cargo)
  └── Portais Cliente/Entregador dependem de AuthContext (clientData/entregadorData)

Configurações → useSettingsData → exporta:
  ├── formas_pagamento habilitadas → LaunchSolicitacaoDialog + ConciliacaoDialog
  ├── tabela_precos_cliente → LaunchSolicitacaoDialog (resolução de tarifa)
  ├── bairros → LaunchSolicitacaoDialog (select de destino)
  ├── taxasExtras → LaunchSolicitacaoDialog
  └── cargos → usePermissions() (toda a aplicação)

Solicitações.conciliação → executa RPC concluir_conciliacao:
  ├── INSERT pagamentos_solicitacao
  ├── INSERT lancamentos_financeiros
  ├── UPDATE fechamento_cliente (FaturasContext invalida)
  └── UPDATE solicitacao.status

FaturasContext
  └── Badge de faturas vencidas → NotificationContext (sidebar)

useDashboardData depende de:
  ├── solicitacoes (entregas hoje, pendentes)
  ├── faturas/fechamentos (vencidas)
  └── despesas (contas a pagar)

useRelatoriosData depende de:
  ├── lancamentos_financeiros (receitas por período)
  ├── entregadores (comissões)
  └── despesas (financeiro operacional)

Portal Cliente depende de:
  ├── solicitacoes (filtrado por clienteId via RLS)
  └── fechamentos_cliente (filtrado por clienteId via RLS)

Portal Entregador depende de:
  ├── solicitacoes (filtrado por entregadorId via RLS)
  └── lancamentos_financeiros (comissões do entregador)
```

---

## 12. CRITÉRIOS DE ACEITE POR FASE

### Fase 1 — Fundação
- `npm run dev` inicia sem erros TypeScript
- `npm run build` gera bundle válido
- TailwindCSS e shadcn/ui renderizando componentes básicos
- ThemeProvider alternando dark/light corretamente
- Deploy automático no Vercel em < 2 minutos
- Todas as migrations executadas no Supabase
- RLS bloqueando acesso cross-tenant em testes

### Fase 2 — Autenticação
- Login com email/senha válidos redireciona para portal correto por role
- Login com credenciais inválidas exibe toast de erro sem travar a UI
- Botão de login exibe loading durante a chamada
- Remember me persiste sessão após fechar o browser
- Link "Esqueceu a senha?" envia email de recuperação via Supabase
- ProtectedRoute com role errado redireciona para `/login`
- 5 tentativas falhas bloqueiam o formulário por 60 segundos

### Fase 3 — Shell
- Sidebar exibe todos os itens de menu com ícones corretos
- Badge de notificações atualiza quando há solicitações pendentes
- Sidebar colapsa em mobile com overlay
- Header exibe nome e avatar do usuário logado
- Logout limpa sessão e redireciona para `/login`
- Theme toggle alterna dark/light e persiste

### Fase 4 — Módulos Core
- Dashboard exibe todas as 5 métricas com valores dinâmicos (sem hardcode)
- Dashboard exibe EmptyState quando não há dados (nunca `return null`)
- Criação de solicitação bloqueia quando não há tarifa para o cliente selecionado
- Resolução de tarifa exibe aviso visual quando usando fallback
- Todas as transições de status da solicitação funcionam
- `ConciliacaoDialog` registra `pertenceA` para cada pagamento
- Diferença financeira ≠ 0 bloqueia conclusão ou exige justificativa
- CRUD de clientes funcional com validação de email único
- CRUD de entregadores funcional com métricas dinâmicas
- Tabela de Preços por Cliente funcional com resolução de tarifa via RPC

### Fase 5 — Financeiro
- `lancamentos_financeiros` gerados automaticamente após conciliação
- Saldo líquido calculado corretamente em `fechamentos_cliente`
- Aba Receitas implementada com dados reais
- Aba Livro Caixa implementada
- "Marcar despesa como Paga" registra `dataPagamento + usuarioPagouId`
- Gráficos exibem dados reais do período selecionado
- PDF de fechamento gerado com todos os blocos: créditos, débitos, ajustes, saldo, histórico
- Exportação de relatórios (PDF/Excel) funciona para todas as abas

### Fase 6 — Portais
- Cliente autenticado vê apenas suas próprias solicitações e fechamentos (RLS)
- Entregador autenticado vê apenas suas próprias corridas e comissões (RLS)
- Saldo e fatura exibidos no portal cliente calculados dinamicamente (sem hardcode)
- Download de PDF de fatura funcional no portal cliente
- Comissão no portal entregador calculada dinamicamente
- `updateUser` nos portais persiste no Supabase
- Portais funcionam completamente em mobile

### Fase 7 — Hardening
- Paginação server-side com 20 itens por página em todas as tabelas grandes
- Filtros preservados na URL como query params
- Tempo de carregamento inicial < 3 segundos em conexão 3G
- Sem erros de acessibilidade de nível A no axe/WAVE
- Testes E2E nos fluxos: login, criar solicitação, conciliar, gerar fechamento

---

## 13. ROADMAP DE IMPLEMENTAÇÃO

| Sprint | Semana | Entregas |
|--------|--------|---------|
| 1 | 1 | Setup do projeto, migrations do banco, RLS, AuthContext + Login + Recuperação de senha |
| 2 | 2 | Shell da aplicação (layouts, sidebar, header, ThemeProvider, NotificationContext) |
| 3 | 3 | Componentes compartilhados completos (todos os itens da Seção 9) |
| 4 | 4 | Configurações (bairros, regiões, formas de pagamento, cargos) |
| 5 | 4-5 | **Tabela de Preços por Cliente** + RPC `resolver_tarifa` |
| 6 | 5 | Clientes (CRUD + ClientProfileModal) + Entregadores (CRUD + métricas dinâmicas) |
| 7 | 6 | Solicitações: LaunchSolicitacaoDialog + AssignDriverDialog + máquina de estados |
| 8 | 6-7 | Solicitações: ConciliacaoDialog + `concluir_conciliacao` RPC |
| 9 | 7 | Faturas / Fechamentos + FaturaDetailsModal + lógica de liquidação |
| 10 | 8 | Financeiro (Despesas + Receitas + Livro Caixa + gráficos) |
| 11 | 8 | Relatórios (3 abas + exportações PDF/Excel) |
| 12 | 9 | Dashboard (todos os 5 MetricCards dinâmicos + EmptyState) |
| 13 | 9-10 | Portal do Cliente (dados dinâmicos, download PDF, updateUser funcional) |
| 14 | 10 | Portal do Entregador (dados dinâmicos, comissões reais, updateUser funcional) |
| 15 | 11-12 | Hardening: paginação, testes E2E, acessibilidade, monitoramento, migração de dados |

---

## 14. DÍVIDAS TÉCNICAS A CORRIGIR NA RECONSTRUÇÃO

| # | Problema | Localização Original | Severidade | Solução |
|---|----------|---------------------|------------|---------|
| 1 | Link "Esqueceu a senha?" com `href="#"` | LoginPage.tsx:93 | Alta | Fluxo completo com `supabase.auth.resetPasswordForEmail` |
| 2 | `rememberMe` capturado mas não aplicado | LoginPage.tsx | Média | Aplicar `sessionType` no Supabase Auth |
| 3 | Tempo Médio hardcoded como `'15m'` | SolicitacoesPage.tsx:90 | Média | Calcular `AVG(dataConclusao - dataSolicitacao)` |
| 4 | Entregas Hoje hardcoded como `42` | EntregadoresPage.tsx:76 | Média | Calcular dinamicamente do Supabase |
| 5 | Horas Trabalhadas hardcoded como `18` | EntregadoresPage.tsx:77 | Média | Calcular baseado em timestamps de início e conclusão |
| 6 | Aba "Receitas" não implementada | FinanceiroPage.tsx:194 | Alta | Implementar com dados de `lancamentos_financeiros` tipo `receita_operacao` |
| 7 | "Marcar como Paga/Repassada" sem onClick | FaturasPage.tsx:94-95 | Alta | Implementar ação com persistência e `dataPagamento + usuarioId` |
| 8 | Botão "Filtros" sem implementação | Múltiplos arquivos | Média | Implementar via `useSearchParams` com URL query params |
| 9 | `updateUser` no AuthContext não persiste no Supabase | AuthContext.tsx:157 | Média | Chamar `supabase.from('profiles').update()` |
| 10 | Subtextos de % no Financeiro hardcoded | FinanceiroPage.tsx | Baixa | Calcular delta vs período anterior dinamicamente |
| 11 | Dashboard retorna `null` quando sem dados | Dashboard.tsx:36 | Média | Sempre renderizar `EmptyState` em vez de `null` |
| 12 | "Exportar PDF" da Fatura sem onClick | FaturasPage.tsx:96 | Média | Implementar geração de PDF do fechamento completo |
| 13 | Saldo e fatura hardcoded no portal cliente | ClientDashboardPage.tsx | Alta | Calcular dinamicamente de `fechamentos_cliente` |
| 14 | Download de faturas no portal cliente sem ação | ClientFinanceiroPage.tsx | Média | Gerar PDF real via jsPDF |
| 15 | updateUser nos portais não persiste | ClientPerfilPage + DriverPerfilPage | Alta | `UPDATE clientes/entregadores + UPDATE profiles` |
| 16 | Conciliação sem distinção do dono do valor | ConciliacaoDialog | **Crítica** | Redesenhar com campo `pertenceA: 'operacao' | 'loja'` obrigatório |
| 17 | Ausência de `pagamentos_solicitacao` com `pertenceA` | Fluxo operacional-financeiro | **Crítica** | Implementar tabela e RPC `concluir_conciliacao` |
| 18 | Fatura concentra cálculo sem razão por lançamento | FaturasPage / entidade faturas | **Crítica** | Implementar `lancamentos_financeiros` como origem de verdade |
| 19 | Tarifação genérica por bairro sem distinção por loja | SettingsPage / `bairros.taxaEntrega` | **Crítica** | Implementar `tabela_precos_cliente` com RPC `resolver_tarifa` |
| 20 | Fallback silencioso para taxa padrão | Regra de cálculo de tarifa | **Crítica** | Bloquear quando sem tarifa; nenhum fallback silencioso |
| 21 | Ausência de trilha de auditoria financeira | Conciliação / faturas / financeiro | Alta | Implementar `auditoria_financeira` imutável |
| 22 | `acaoFaturamento` não salvo no Supabase | `useSettingsData.ts` | Alta | Migration + campo na tabela + persistência real |
| 23 | `addUser` e `deleteUser` são stubs | `useSettingsData.ts` | Alta | Implementar via Supabase Edge Function + Auth Admin |
| 24 | Integrações (Stripe, Maps, WhatsApp) sem persistência | IntegrationsTab.tsx | Média | Salvar em tabela `system_settings` |
| 25 | Preferências de notificação apenas locais | NotificationsTab.tsx | Baixa | Persistir em tabela `user_preferences` |

---

## 15. LACUNAS E HIPÓTESES

| # | Lacuna / Hipótese | Impacto | Validação Necessária |
|---|------------------|---------|---------------------|
| 1 | Saldo pré-pago: modelo de recarga não documentado. Hipótese: admin registra crédito manualmente em `lancamentos_financeiros` | Alto | Definir modelo financeiro do pré-pago com o produto |
| 2 | `useLivroCaixaData` existe mas sem página mapeada. Hipótese: era feature planejada para aba Livro Caixa no Financeiro | Baixo | Confirmar se deve ser implementado ou removido |
| 3 | Supabase Realtime: qual o nível esperado? Hipótese: apenas Dashboard e contadores de Solicitações precisam de updates em tempo real | Médio | Definir com o produto quais páginas precisam de Realtime |
| 4 | Avatar: DiceBear atual ou Supabase Storage com upload real? | Baixo | Definir escopo de upload de imagem |
| 5 | Notificações por WhatsApp: campo de configuração existe mas nenhum código de disparo identificado. Hipótese: fora do escopo da reconstrução v2 | Médio | Confirmar escopo com o produto |
| 6 | `ApiKeysTab.tsx` e `DisplayApiKeyDialog.tsx` não importados no SettingsPage — hipótese: código morto | Baixo | Confirmar se pode ser removido |
| 7 | Extensões de tipo de operação: `standard`, `express`, `retorno` — são suficientes? | Médio | Validar com operação se existem outros tipos |
| 8 | Auditoria financeira: formato do campo `historico[]` nas faturas. Hipótese: array JSON `{ tipo, data, usuarioId, descricao }[]` | Baixo | Verificar implementação atual no código |

---

*PRD Técnico Definitivo — Leva e Traz v2.0 — Blueprint Oficial de Reconstrução*
*Fusão completa: PRD v1.0 (análise reversa completa) + PRD v2.0 (estrutura e novas regras de negócio)*
*Base: Alpha v0.0.0 + regras de negócio operacional validadas — 2026-03-14*

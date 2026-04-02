# PLANO DE DESENVOLVIMENTO — LEVA E TRAZ v2.0
## Roadmap por Etapas para Reconstrução Completa

> **Princípio:** Cada etapa é autocontida, testável e entrega valor incremental.
> **Stack:** React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui + Lovable Cloud (Supabase)

---

## ETAPA 1 — FUNDAÇÃO & DESIGN SYSTEM
**Estimativa:** 1-2 sessões | **Risco:** Baixo | **Dependências:** Nenhuma

### 1.1 Design System (Matte Ceramic)
- [ ] Configurar paleta de cores no `index.css` (dark-first, Deep Charcoal + Spring Green)
- [ ] Configurar tipografia: `Geist Sans` (UI) + `Geist Mono` (dados/números)
- [ ] Tokens: `tracking-tighter` em títulos, `tabular-nums` em valores monetários
- [ ] Raio concêntrico: Inner 8px | Padding 12px | Outer 20px
- [ ] Variantes de componentes shadcn: botões, cards, badges, inputs
- [ ] Transições globais: `cubic-bezier(0.4, 0, 0.2, 1)` 150ms

### 1.2 Estrutura de Diretórios
```
src/
├── components/
│   ├── layouts/        # AppShell, AdminLayout, ClientLayout, DriverLayout
│   ├── shared/         # MetricCard, DataTable, StatusBadge, etc.
│   └── ui/             # shadcn customizados
├── contexts/           # AuthContext, SidebarContext, NotificationContext, etc.
├── hooks/              # usePermissions, useDashboardData, etc.
├── lib/                # supabase client, utils, formatters
├── pages/
│   ├── admin/          # Dashboard, Solicitacoes, Clientes, etc.
│   ├── cliente/        # Portal do Cliente
│   ├── entregador/     # Portal do Entregador
│   └── auth/           # Login, ResetPassword
└── types/              # Tipos TypeScript derivados do schema
```

### 1.3 Tipos TypeScript
- [ ] Criar `src/types/database.ts` com todos os tipos derivados do Prisma schema:
  - Enums: `Role`, `StatusSolicitacao`, `TipoOperacao`, `Modalidade`, `PertenceA`, etc.
  - Interfaces: `Profile`, `Cliente`, `Entregador`, `Solicitacao`, `Rota`, `Fatura`, etc.
  - Interfaces novas: `PagamentoSolicitacao`, `LancamentoFinanceiro`, `TabelaPrecoCliente`, `AuditoriaFinanceira`

### 1.4 Ativar Lovable Cloud
- [ ] Ativar backend (Supabase)
- [ ] Executar migrations das tabelas existentes + novas (Seção 4 do PRD)
- [ ] Configurar RLS básico em todas as tabelas
- [ ] Criar RPC `resolver_tarifa` no banco

**Critério de aceite:** `npm run dev` sem erros, design system renderizando, tipos compilando.

---

## ETAPA 2 — AUTENTICAÇÃO & CONTROLE DE ACESSO
**Estimativa:** 1-2 sessões | **Risco:** Médio | **Dependências:** Etapa 1

### 2.1 Páginas de Auth
- [ ] `LoginPage` (`/login`) — Grid 2 colunas (form + branding panel)
  - Email + senha com validação Zod
  - Remember me (persistência de sessão)
  - Loading state no botão
  - Bloqueio após 5 tentativas em 5 minutos
  - Redirect inteligente por role: `admin→/`, `cliente→/cliente`, `entregador→/entregador`
- [ ] `ForgotPasswordPage` (`/login/reset`) — `supabase.auth.resetPasswordForEmail()`
- [ ] `ResetPasswordPage` — Formulário nova senha

### 2.2 Contexto & Guards
- [ ] `AuthContext`: user, role, loading, login(), logout(), clientData, entregadorData
- [ ] `ProtectedRoute` parametrizável por `allowedRoles[]`
- [ ] `usePermissions()` — verificação granular por cargo
- [ ] Tabela `profiles` com trigger de criação automática no sign-up

### 2.3 Mapeamento de Erros
```typescript
'Invalid login credentials' → 'Email ou senha incorretos.'
'Email not confirmed' → 'Confirme seu email antes de entrar.'
```

**Critério de aceite:** Login funcional, redirect por role, bloqueio de tentativas, recuperação de senha via email.

---

## ETAPA 3 — SHELL DA APLICAÇÃO & NAVEGAÇÃO
**Estimativa:** 1-2 sessões | **Risco:** Baixo | **Dependências:** Etapa 2

### 3.1 Layouts
- [ ] `AppShell` — Container: sidebar + header + content area
- [ ] `AdminLayout` — Sidebar com 9 itens + badges de notificação
- [ ] `ClientLayout` — Sidebar simplificada (4 itens)
- [ ] `DriverLayout` — Sidebar simplificada (4 itens)

### 3.2 Sidebar Admin (9 itens)
| Item | Ícone | Rota | Badge |
|------|-------|------|-------|
| Dashboard | LayoutDashboard | `/` | — |
| Solicitações | ClipboardList | `/solicitacoes` | Pendentes (laranja) |
| Clientes | Users | `/clientes` | — |
| Entregadores | Truck | `/entregadores` | — |
| Entregas | Package | `/entregas` | — |
| Faturas | FileText | `/faturas` | Vencidas (vermelho) |
| Financeiro | DollarSign | `/financeiro` | — |
| Relatórios | BarChart3 | `/relatorios` | — |
| Configurações | Settings | `/configuracoes` | — |

### 3.3 Header
- [ ] Avatar + nome do usuário
- [ ] Notificações (sino com badge)
- [ ] Theme toggle (dark/light)
- [ ] Logout

### 3.4 Contextos
- [ ] `SidebarContext` — isOpen, isMobile
- [ ] `NotificationContext` — badges por módulo
- [ ] `ThemeProvider` — dark/light/system

### 3.5 Responsividade
- [ ] Sidebar collapsible em mobile com overlay
- [ ] Breadcrumb por rota

**Critério de aceite:** Navegação completa, sidebar responsiva, badges funcionais, theme toggle persistente.

---

## ETAPA 4 — COMPONENTES COMPARTILHADOS
**Estimativa:** 1-2 sessões | **Risco:** Baixo | **Dependências:** Etapa 3

### 4.1 Componentes de Dados
- [ ] `MetricCard` — título, valor (animado), subtítulo, ícone, delta percentual, Framer Motion
- [ ] `DataTable<T>` — genérica, sorting, paginação server-side (20/página), seleção
- [ ] `SearchInput` — debounce 300ms, ícone de busca
- [ ] `DatePickerWithRange` — seletor duplo de período
- [ ] `StatusBadge` — colorido por status com mapeamento de cores

### 4.2 Componentes de Ação
- [ ] `ConfirmDialog` — AlertDialog genérico para ações destrutivas
- [ ] `JustificationDialog` — textarea obrigatória (mín. 10 chars)
- [ ] `ExportDropdown` — PDF + Excel funcional

### 4.3 Componentes de Estado
- [ ] `EmptyState` — ícone, título, subtítulo, ação (CTA)
- [ ] `ErrorState` — mensagem + botão retry
- [ ] `LoadingSkeleton` — parametrizável por shape

### 4.4 Componentes de Input
- [ ] `CurrencyInput` — formatação BRL automática (R$ 1.234,56)
- [ ] `PhoneInput` — máscara `(99) 99999-9999`
- [ ] `AvatarWithFallback` — iniciais quando sem imagem

### 4.5 Componentes de Acesso
- [ ] `PermissionGuard` — renderiza children se permissão OK
- [ ] `CanAccess` — renderiza children se role está na lista
- [ ] `PageContainer` — container padrão: header + ações + breadcrumb

**Critério de aceite:** Todos os componentes renderizando em dark/light, props tipadas, Framer Motion nas animações.

---

## ETAPA 5 — CONFIGURAÇÕES DO SISTEMA
**Estimativa:** 2-3 sessões | **Risco:** Alto (base para tudo) | **Dependências:** Etapa 4

> **⚠️ CRÍTICO:** Este módulo é pré-requisito para Solicitações e Faturas. Deve ser implementado primeiro.

### 5.1 Aba: Bairros (`neighborhoods`)
- [ ] CRUD completo com DataTable
- [ ] `BairroFormDialog`: nome, regiaoId (select), taxaEntrega (currency)
- [ ] Aviso visual no campo taxaEntrega: "Este valor é FALLBACK"
- [ ] Exclusão bloqueada se existir rota ativa vinculada
- [ ] EmptyState com CTA "Cadastrar primeiro bairro"

### 5.2 Aba: Regiões (`regioes`)
- [ ] CRUD com nome + descrição
- [ ] Exclusão bloqueada se existir bairro ou regra de preço vinculada

### 5.3 Aba: Formas de Pagamento (`formas_pagamento`)
- [ ] CRUD com nome, descrição, toggle enabled
- [ ] Formas desabilitadas ocultas nos selects de criação/conciliação
- [ ] Seed: Dinheiro, PIX, Cartão de Crédito, Cartão de Débito
- [ ] Nunca excluir, apenas desabilitar

### 5.4 Aba: Cargos e Permissões (`cargos`)
- [ ] CRUD com nome, descrição, checkboxes de permissões agrupadas por módulo
- [ ] 8 módulos × N permissões granulares (ver mapa completo no PRD 7.9.6)
- [ ] Pelo menos 1 cargo com todas as permissões (não deletável)
- [ ] Invalidar cache de permissões ao alterar cargo

### 5.5 Aba: Tabela de Preços por Cliente (NOVO — MÓDULO CRÍTICO)
- [ ] Select de cliente no topo
- [ ] Indicador de cobertura: verde (100%), laranja (parcial), vermelho (zero)
- [ ] DataTable: Bairro | Região | Tipo Operação | Taxa Base | Retorno | Espera | Urgência | Status | Prioridade
- [ ] Drag-and-drop para reordenar prioridade (`@dnd-kit/sortable`)
- [ ] `RegraPrecoDialog`: clienteId, bairroId, regiaoId, tipoOperacao, taxas, prioridade, observação
- [ ] Validação: sem duplicata `(clienteId + bairroId + tipoOperacao)` ativa
- [ ] Preview da tarifa resultante no formulário

### 5.6 RPC `resolver_tarifa`
- [ ] Função PostgreSQL com precedência de 6 níveis
- [ ] Retorna: taxa_base, regra_id, tipo_regra, usando_fallback
- [ ] Sem tarifa → retorna `sem_tarifa` → BLOQUEIA criação

**Critério de aceite:** Todas as 5 abas funcionais, RPC testada, drag-and-drop na tabela de preços.

---

## ETAPA 6 — CLIENTES & ENTREGADORES
**Estimativa:** 1-2 sessões | **Risco:** Médio | **Dependências:** Etapa 5

### 6.1 Gestão de Clientes (`/clientes`)
- [ ] DataTable paginada: Avatar + nome + email | Telefone | Modalidade (badge) | Status (badge) | Ações
- [ ] `ClientFormDialog` — 2 seções:
  - Dados Cadastrais: nome, tipo (PF/PJ), email (único async), telefone, endereço, bairro, cidade, UF, chavePix, status
  - Configurações Financeiras: modalidade, faturamento automático, frequência, dia da semana/mês
- [ ] `ClientProfileModal`: dados + métricas + últimas 5 solicitações + fechamentos recentes + link tabela de preços
- [ ] Regras: email único (validação async), inativo bloqueado para novas solicitações, exclusão bloqueada com dependência

### 6.2 Gestão de Entregadores (`/entregadores`)
- [ ] 4 MetricCards dinâmicos: Total | Ativos | Entregas Hoje | Horas Trabalhadas (DINÂMICO, não hardcoded)
- [ ] DataTable paginada
- [ ] `EntregadorFormDialog`: nome, documento (CPF/CNPJ com máscara), email, telefone, cidade, bairro, veículo, status, tipoComissão, valorComissão
- [ ] Regras: comissão SOMENTE sobre receita operacional, inativo oculto do AssignDriverDialog, exclusão bloqueada

**Critério de aceite:** CRUD completo, métricas dinâmicas, validações de negócio funcionais.

---

## ETAPA 7 — SOLICITAÇÕES (NÚCLEO OPERACIONAL)
**Estimativa:** 3-4 sessões | **Risco:** ALTO | **Dependências:** Etapas 5, 6

> **⚠️ MÓDULO MAIS COMPLEXO** — contém o ConciliacaoDialog que é o núcleo do modelo financeiro.

### 7.1 Listagem (`/solicitacoes`)
- [ ] 5 MetricCards dinâmicos: Pendentes | Aceitas | Em Andamento | Concluídas Hoje | Tempo Médio (DINÂMICO)
- [ ] SearchInput + DatePickerWithRange + SolicitacoesTabs (7 abas com badge)
- [ ] DataTable server-side (20/página) com filtros na URL (useSearchParams)
- [ ] `SolicitacaoRowActions` — botões contextuais por status

### 7.2 LaunchSolicitacaoDialog (Multi-step)
- [ ] **Step 1:** clienteId (select buscável, apenas ativos), tipoOperacao, pontoColeta, entregadorId (opcional)
- [ ] **Step 2:** Rotas (mín. 1, sem limite)
  - bairroDestinoId → chama `resolver_tarifa()` ao selecionar
  - Sem tarifa → BLOQUEIA com mensagem
  - Fallback → aviso visual amarelo
  - responsavel, telefone (máscara), valorAReceber (condicional), meiosPagamento (multiselect), taxasExtras
  - Snapshot: `taxaResolvida` + `regraPrecoId` na rota
- [ ] **Step 3:** Revisão + confirmação + código `LT-YYYYMMDD-NNNNN`

### 7.3 Máquina de Estados
```
pendente → aceita (selecionar entregador)
pendente → rejeitada (justificativa ≥ 10 chars)
pendente → cancelada (justificativa)
aceita → em_andamento (registra timestamp)
aceita → cancelada (justificativa)
em_andamento → concluida (ConciliacaoDialog ✅)
em_andamento → cancelada (justificativa + permissão elevada)
concluida → editar conciliação (permissão + auditoria)
```

### 7.4 ConciliacaoDialog (CRÍTICO)
- [ ] Uma seção por rota da solicitação
- [ ] Para cada rota: lista de pagamentos com 3 dimensões:
  1. **Meio de pagamento** — select de formas habilitadas
  2. **Valor** — numérico 2 casas
  3. **Pertence a** — `operacao` ou `loja` (OBRIGATÓRIO)
- [ ] Resumo em tempo real: receita operação vs esperado, crédito loja vs esperado
- [ ] Diferença ≠ 0 → BLOQUEIA conclusão ou exige justificativa + auditoria
- [ ] Ao confirmar: RPC `concluir_conciliacao` (transação atômica):
  1. INSERT `pagamentos_solicitacao`
  2. INSERT `lancamentos_financeiros` (receita_operacao + credito_loja)
  3. UPDATE/INSERT `fechamento_cliente`
  4. UPDATE `solicitacao.status = concluida`
  5. INSERT `historico[]` com evento

### 7.5 Outros Dialogs
- [ ] `AssignDriverDialog` — lista entregadores ativos
- [ ] `ViewSolicitacaoDialog` — read-only
- [ ] `JustificationDialog` — textarea ≥ 10 chars

**Critério de aceite:** Ciclo completo funcional, pertenceA registrado, sem fallback silencioso, transação atômica.

---

## ETAPA 8 — FATURAS & FECHAMENTOS
**Estimativa:** 2-3 sessões | **Risco:** Alto | **Dependências:** Etapa 7

### 8.1 Listagem (`/faturas` + `/faturas/finalizadas`)
- [ ] Lista ativa: `statusGeral != 'Finalizada'`
- [ ] Lista finalizada: `/faturas/finalizadas`
- [ ] DataTable: Número | Cliente | Período | Entregas | Saldo Líquido | Status | Ações

### 8.2 FaturaDetailsModal (7 seções)
1. Cabeçalho: número, cliente, período, emissão, vencimento
2. Resumo Financeiro: Créditos Loja | Débitos Loja | Ajustes | **Saldo Líquido** (cor)
3. Lista de Entregas incluídas
4. Lançamentos Financeiros (razão detalhado)
5. Ajustes Manuais com motivo e responsável
6. Histórico de Liquidação
7. Ações: Registrar Cobrança | Registrar Repasse | Adicionar Ajuste | Finalizar

### 8.3 Modelo de Saldo
| Saldo | Significado | Ação |
|-------|-------------|------|
| Positivo | Operação deve repassar à loja | Marcar como Repassado |
| Negativo | Loja deve pagar à operação | Registrar Cobrança |
| Zero | Quitado | Finalizar |

### 8.4 Geração Automática
- [ ] `por_entrega`: ao atingir N entregas configuradas
- [ ] `semanal`: todo dia X da semana (Edge Function)
- [ ] `mensal`: todo dia X do mês (Edge Function)
- [ ] `diario`: todo dia (Edge Function)

### 8.5 PDF de Fechamento
- [ ] Gerar via jsPDF: cabeçalho + créditos + débitos + ajustes + saldo + histórico

**Critério de aceite:** Saldo calculado dos lançamentos, PDF funcional, liquidação persistente, auditoria em alterações.

---

## ETAPA 9 — FINANCEIRO & RELATÓRIOS
**Estimativa:** 2 sessões | **Risco:** Médio | **Dependências:** Etapa 8

### 9.1 Financeiro (`/financeiro`)
- [ ] 4 MetricCards: Total Despesas | Pendentes | Pagas | Receitas (DINÂMICO)
- [ ] **Aba Despesas:** CRUD completo + "Marcar como Paga" (registra `dataPagamento + usuarioId`)
- [ ] **Aba Receitas (NOVO):** Listagem de `lancamentos_financeiros WHERE tipo='receita_operacao'`
- [ ] **Aba Livro Caixa (NOVO):** Visão consolidada entradas/saídas + saldo acumulado
- [ ] Gráficos Recharts:
  - PieChart: despesas por categoria (máx 8 + "Outros")
  - BarChart: fluxo de caixa 6 meses (receitas verde, despesas vermelho)

### 9.2 Relatórios (`/relatorios`)
- [ ] Filtro global: DatePickerWithRange
- [ ] **Aba Resumo Financeiro:** Cards (Total Receitas, Despesas, Lucro Líquido, Margem %) + gráfico evolução
- [ ] **Aba Comissões:** Entregador | Nº Entregas | Valor Gerado | Comissão. Comissão SOMENTE sobre `receita_operacao`
- [ ] **Aba Despesas:** Tabela completa com filtro por categoria/status
- [ ] Exportação PDF + Excel funcional em todas as abas

**Critério de aceite:** Dados dinâmicos, gráficos com dados reais, exportação funcional, comissão sem credito_loja.

---

## ETAPA 10 — DASHBOARD ADMIN
**Estimativa:** 1 sessão | **Risco:** Baixo | **Dependências:** Etapas 7, 8, 9

### 10.1 MetricCards (5 — todos dinâmicos, animados com Framer Motion)
| Card | Query |
|------|-------|
| Contas a Pagar | `SUM(despesas WHERE status IN ('Pendente','Atrasado'))` |
| Faturas Vencidas | `COUNT(faturas WHERE statusGeral='Vencida')` + valor |
| Entregas Hoje | `COUNT(solicitacoes WHERE dataConclusao=hoje)` vs média |
| Taxas Recebidas | `SUM(lancamentos WHERE tipo='receita_operacao' AND mês_atual)` |
| Novas Solicitações | `COUNT(solicitacoes WHERE status='pendente')` |

### 10.2 RecentTransactions
- [ ] Últimas 10 transações (receitas + despesas)
- [ ] Link "Ver todas" → `/financeiro`

### 10.3 Estados
- [ ] Loading: 5 skeletons + skeleton de lista
- [ ] Sem dados: `EmptyState` (NUNCA `return null`)
- [ ] Com dados: animação `opacity 0→1, y -20→0, stagger 0.1s`

**Critério de aceite:** Nenhum valor hardcoded, EmptyState quando sem dados, animações suaves.

---

## ETAPA 11 — PORTAIS SELF-SERVICE
**Estimativa:** 2 sessões | **Risco:** Médio | **Dependências:** Etapa 10, RLS configurado

### 11.1 Portal do Cliente (`/cliente/*`)
- [ ] **Dashboard:** Pedidos do Mês | Em Andamento | Saldo Devedor | Saldo a Receber (DINÂMICO)
- [ ] **Minhas Solicitações:** Read-only, filtro por código/status. `valorTotal = taxa + extras` (SEM credito_loja)
- [ ] **Meu Financeiro:** Condicional por modalidade:
  - Pré-pago: Card informativo
  - Faturado: Métricas + lista de fechamentos + download PDF (jsPDF real)
- [ ] **Meu Perfil:** Formulário editável com `updateUser` persistente no Supabase

### 11.2 Portal do Entregador (`/entregador/*`)
- [ ] **Dashboard:** Corridas Ativas | Concluídas Hoje | Comissão do Dia | Comissão do Mês (DINÂMICO)
- [ ] **Histórico:** Listagem de entregas com filtro
- [ ] **Meu Financeiro:** Extrato de comissões (SOMENTE sobre receita_operacao)
- [ ] **Meu Perfil:** Formulário editável com persistência real

### 11.3 RLS Obrigatório
- [ ] `solicitacoes`: cliente vê só suas, entregador vê só suas
- [ ] `lancamentos_financeiros`: apenas admin
- [ ] `faturas`: cliente vê só suas

**Critério de aceite:** RLS isolando dados, saldos dinâmicos (não hardcoded), PDF funcional, updateUser persistente.

---

## ETAPA 12 — HARDENING & PRODUÇÃO
**Estimativa:** 2-3 sessões | **Risco:** Médio | **Dependências:** Todas as anteriores

### 12.1 Performance
- [ ] Paginação server-side em todas as tabelas (pageSize = 20)
- [ ] Filtros preservados na URL (useSearchParams)
- [ ] Índices PostgreSQL otimizados (já definidos no schema)
- [ ] Lazy loading de componentes pesados (FaturaDetailsModal, ConciliacaoDialog)

### 12.2 Qualidade
- [ ] Testes E2E dos fluxos críticos:
  1. Login → redirect por role
  2. Criar solicitação → resolução de tarifa → snapshot
  3. Conciliar com pertenceA → lançamentos gerados
  4. Gerar fechamento → saldo calculado → PDF
- [ ] Acessibilidade WCAG 2.1 AA
- [ ] Tratamento de estados em TODAS as telas: loading, vazio, erro

### 12.3 Segurança
- [ ] RLS validado em todas as tabelas
- [ ] Edge Functions para operações admin (criação de usuários, fechamento atômico)
- [ ] Secrets gerenciados via Lovable Cloud (nunca em código)

### 12.4 Migração de Dados
- [ ] Scripts de validação prévia
- [ ] Rollback plan documentado
- [ ] Janela de migração em horário de baixo volume

**Critério de aceite:** Carregamento < 3s em 3G, zero erros acessibilidade nível A, fluxos críticos testados.

---

## RESUMO DO ROADMAP

| Etapa | Nome | Sessões | Risco | Entregáveis Chave |
|-------|------|---------|-------|-------------------|
| 1 | Fundação & Design System | 1-2 | Baixo | Tipos, tokens, estrutura, migrations |
| 2 | Autenticação | 1-2 | Médio | Login, guards, permissões |
| 3 | Shell & Navegação | 1-2 | Baixo | Layouts, sidebar, header, responsivo |
| 4 | Componentes Compartilhados | 1-2 | Baixo | 16 componentes reutilizáveis |
| 5 | Configurações | 2-3 | Alto | 5 abas + RPC resolver_tarifa |
| 6 | Clientes & Entregadores | 1-2 | Médio | CRUD + validações + métricas dinâmicas |
| 7 | **Solicitações** | **3-4** | **ALTO** | ConciliacaoDialog + máquina de estados |
| 8 | Faturas & Fechamentos | 2-3 | Alto | Saldo por lançamentos + PDF |
| 9 | Financeiro & Relatórios | 2 | Médio | 3 abas financeiro + 3 abas relatórios |
| 10 | Dashboard Admin | 1 | Baixo | 5 métricas dinâmicas |
| 11 | Portais Self-Service | 2 | Médio | Cliente + Entregador com RLS |
| 12 | Hardening | 2-3 | Médio | Testes, performance, migração |
| **Total** | | **~20-28 sessões** | | |

---

## DÍVIDAS TÉCNICAS MAPEADAS (25 itens)

Todas as 25 dívidas técnicas do PRD original estão mapeadas nas etapas acima. As críticas (16-20) são tratadas na Etapa 7.

| Severidade | Qtd | Tratadas na Etapa |
|------------|-----|-------------------|
| Crítica | 5 | Etapas 5, 7, 8 |
| Alta | 12 | Etapas 2, 5, 6, 8, 9, 11 |
| Média | 7 | Etapas 2, 7, 9, 11 |
| Baixa | 1 | Etapa 12 |

---

## DECISÕES ARQUITETURAIS CHAVE

1. **Lovable Cloud (Supabase) como backend** — Auth, PostgreSQL, RLS, Edge Functions, Storage
2. **React Query para estado servidor** — cache, invalidação, paginação
3. **Framer Motion para animações** — entrada de cards, reordenação de listas
4. **RPC para operações críticas** — `resolver_tarifa`, `concluir_conciliacao` (transações atômicas)
5. **Imutabilidade financeira** — `lancamentos_financeiros` nunca alterados, estornos como novos registros
6. **RLS multi-tenant** — isolamento de dados por portal (admin/cliente/entregador)
7. **Design Matte Ceramic** — dark-first, sem transparências, bordas nítidas, Geist Sans/Mono

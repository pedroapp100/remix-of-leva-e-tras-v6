# PRD — Leva e Traz v2.0
## Product Requirements Document — Versão 3.0 (Atualizado)
> **Última atualização:** 2026-04-08
> **Stack:** React 18 · TypeScript 5 · Vite 5 · Tailwind CSS 3 · shadcn/ui · Zustand · Framer Motion · Recharts · jsPDF

---

## 1. Visão Geral do Produto

O **Leva e Traz** é uma plataforma SaaS de gestão logística de entregas urbanas voltada para lojistas, conectando lojas a uma operação centralizada de entregadores. O sistema gerencia todo o ciclo de vida de entregas: da solicitação à conciliação financeira, com portais self-service para clientes e entregadores.

### 1.1 Áreas de Usuário (Roles)

| Role | Rota Base | Descrição |
|---|---|---|
| `admin` | `/admin` | Operador principal. Acesso total ao painel administrativo. |
| `cliente` | `/cliente` | Lojista que solicita entregas. Portal self-service. |
| `entregador` | `/entregador` | Motorista que realiza entregas. Portal self-service. |

### 1.2 Arquitetura de Alto Nível

```
App.tsx
├── Landing Page (público, "/")
├── Auth (Login, Forgot, Reset)
├── ProtectedAppShell (contextos + onboarding)
│   ├── AdminLayout (sidebar + header)
│   │   ├── Dashboard
│   │   ├── Solicitações
│   │   ├── Clientes
│   │   ├── Entregadores
│   │   ├── Entregas
│   │   ├── Caixas Entregadores
│   │   ├── Faturas
│   │   ├── Financeiro
│   │   ├── Relatórios
│   │   ├── Logs
│   │   └── Configurações (13 abas)
│   ├── ClientLayout (sidebar + header)
│   │   ├── Dashboard
│   │   ├── Minhas Solicitações
│   │   ├── Financeiro
│   │   ├── Simulador
│   │   └── Perfil
│   └── DriverLayout (sidebar + header)
│       ├── Dashboard
│       ├── Solicitações
│       ├── Histórico
│       ├── Financeiro
│       ├── Caixa
│       └── Perfil
```

---

## 2. Autenticação & Controle de Acesso

### 2.1 Páginas de Autenticação

#### `/login` — LoginPage
- Formulário com email e senha
- Checkbox "Lembrar-me" (persistência em `localStorage` vs `sessionStorage`)
- Rate limiting: máximo 5 tentativas em 5 minutos, com bloqueio temporário
- Mensagens de erro em PT-BR mapeadas (`invalid_credentials`, `user_inactive`, `too_many_attempts`, etc.)
- Loading com delay mínimo de 200ms para feedback visual
- Redirecionamento automático por role após login (`/admin`, `/cliente`, `/entregador`)

#### `/login/reset` — ForgotPasswordPage
- Input de email para solicitar reset de senha
- Feedback visual de sucesso (mock)

#### `/reset-password` — ResetPasswordPage
- Input para nova senha
- Validação e feedback (mock)

### 2.2 AuthContext
- **Estado:** `user`, `role`, `isReady`, `loading`, `isBlocked`, `remainingAttempts`
- **Funções:** `login()`, `logout()`, `changeCargo()`, `requestPasswordReset()`, `resetPassword()`
- **Persistência:** serializa user em `localStorage` ou `sessionStorage` conforme "Lembrar-me"
- **Sanitização:** valida dados armazenados ao restaurar sessão
- **Permissões:** derivadas do cargo do usuário via `getPermissionsForRole()`

### 2.3 ProtectedRoute
- Verifica autenticação e role do usuário
- Redireciona para `/login` se não autenticado
- Redireciona para rota do role se role não permitido

### 2.4 Sistema de Permissões
- **PERMISSION_MODULES:** módulos com permissões granulares (ex: `clientes.view`, `clientes.edit`, `clientes.create`, `clientes.delete`)
- **Cargos:** admin pode ter diferentes cargos com conjuntos de permissões distintos
- **PermissionGuard:** componente wrapper que oculta UI sem permissão adequada
- **usePermissions:** hook que expõe `hasPermission()`, `canAccessSidebarItem()`
- **Sidebar filtering:** itens do menu são filtrados baseado nas permissões do cargo

---

## 3. Shell da Aplicação

### 3.1 ProtectedAppShell
Wrapper que envolve todas as rotas protegidas, provendo:
- `LogStoreProvider` — armazenamento de logs de auditoria
- `GlobalStoreProvider` — estado global (solicitações, faturas, rotas, saldos)
- `CaixaStoreProvider` — estado dos caixas de entregadores
- `NotificationProvider` — notificações com persistência em localStorage
- `OnboardingProvider` — sistema de onboarding com tooltips e overlay

### 3.2 AdminLayout
- **Sidebar colapsável:** ícones + labels, toggle via chevron, suporte mobile via hamburger
- **Header:** logo, nome do usuário, avatar, theme toggle (light/dark), sino de notificações com badge, dropdown de perfil
- **Navigation items:**
  - Dashboard, Solicitações (badge pendentes), Clientes, Entregadores, Entregas, Caixas, Faturas (badge vencidas), Financeiro, Relatórios, Logs
  - Footer: Configurações, Sair
- **Badges dinâmicos:** contagem de solicitações pendentes e faturas vencidas

### 3.3 ClientLayout
- Sidebar com: Dashboard, Minhas Solicitações, Financeiro, Simulador, Perfil

### 3.4 DriverLayout
- Sidebar com: Dashboard, Solicitações, Histórico, Financeiro, Caixa, Perfil

### 3.5 AppHeader
- Logo com nome do app
- Theme toggle (light/dark via `next-themes`)
- Sino de notificações com dropdown (popover), badge com contagem de não lidas
- Avatar do usuário com dropdown: nome, email, role, botão de logout
- Mobile: botão hamburger para sidebar

---

## 4. Componentes Compartilhados

### 4.1 Componentes de Layout
| Componente | Descrição |
|---|---|
| `PageContainer` | Container padrão com título, subtítulo, ações e slot para children |
| `BrandedLoader` | Loader animado com logo para transições de página |
| `PageLoadingFallback` | Fallback para Suspense em lazy loading |
| `ErrorBoundary` | Captura erros React e exibe tela amigável |

### 4.2 Componentes de Dados
| Componente | Descrição |
|---|---|
| `MetricCard` | Card de métrica com ícone, valor, subtítulo, delta opcional com indicador de tendência |
| `DataTable` | Tabela genérica com sorting, paginação, empty state customizável, suporte mobile via `renderMobileCard` |
| `StatusBadge` | Badge colorida por status (pendente, ativo, concluída, etc.) |
| `TipoOperacaoBadge` | Badge com cor dinâmica por tipo de operação |
| `AvatarWithFallback` | Avatar com iniciais como fallback |

### 4.3 Componentes de Entrada
| Componente | Descrição |
|---|---|
| `SearchInput` | Input com ícone de busca e debounce |
| `CurrencyInput` | Input formatado para moeda brasileira (R$) |
| `PhoneInput` | Input com máscara de telefone brasileiro |
| `DatePickerWithRange` | Seletor de intervalo de datas com calendário |

### 4.4 Componentes de Ação
| Componente | Descrição |
|---|---|
| `ConfirmDialog` | Modal de confirmação com variante destrutiva |
| `JustificationDialog` | Modal com textarea para justificativas |
| `ExportDropdown` | Dropdown com opções de exportar PDF e Excel/CSV |

### 4.5 Componentes de Estado
| Componente | Descrição |
|---|---|
| `EmptyState` | Estado vazio com ícone, título, subtítulo e ação opcional |
| `ErrorState` | Estado de erro com opção de retry |
| `LoadingSkeleton` | Esqueletos de carregamento |

### 4.6 Componentes Especializados
| Componente | Descrição |
|---|---|
| `PermissionGuard` | Renderiza children apenas se usuário tem permissão |
| `PermissionMatrix` | Matriz visual de permissões por módulo |
| `SimuladorOperacoes` | Simulador de custos de operação |
| `MotoIcon` | Ícone SVG de moto personalizado |

---

## 5. Módulos Administrativos

### 5.1 Dashboard (`/admin`)

**Arquivo:** `Dashboard.tsx`

**Métricas (5 cards animados):**
- Contas a Pagar (despesas pendentes + atrasadas)
- Faturas Vencidas (contagem + valor total)
- Entregas Hoje (concluídas no dia, com delta vs média)
- Taxas Recebidas (receitas do mês atual)
- Novas Solicitações (pendentes aguardando ação)

**Últimas Transações:**
- Lista das 10 transações mais recentes (receitas + despesas mescladas)
- Indicador visual de entrada (verde) vs saída (vermelho)
- Valor, descrição, categoria, data
- Link "Ver todas" → Financeiro

**Estados:** Empty state quando sem dados, animações stagger com Framer Motion

---

### 5.2 Solicitações (`/admin/solicitacoes`)

**Arquivo:** `SolicitacoesPage.tsx`

**Métricas (5 cards):**
- Pendentes, Aceitas, Em Andamento, Concluídas Hoje, Tempo Médio

**Funcionalidades:**
- **Tabs por status:** Todas, Pendente, Aceita, Em Andamento, Concluída, Cancelada, Rejeitada — com contadores
- **Filtros:** Busca por código/cliente, DatePicker de intervalo
- **DataTable com colunas:** Código, Cliente, Tipo Operação, Entregador, Rotas, Taxas, Repasse, Status, Data, Ações
- **Ações por status:**
  - Pendente: Aceitar, Atribuir Entregador, Ver, Justificar (rejeitar/cancelar)
  - Aceita: Iniciar Entrega, Transferir Entregador, Ver
  - Em Andamento: Concluir (Conciliação), Ver
  - Concluída/Cancelada/Rejeitada: Ver
- **Sincronização com URL:** filtros refletidos nos search params

**Sub-diálogos:**

#### LaunchSolicitacaoDialog (Criar Solicitação)
Multi-step wizard (4 etapas):
1. **Tipo de Coleta:** padrão, pré-agendada, retroativa
2. **Dados Gerais:** cliente, tipo de operação, entregador, ponto de coleta, observações, config retroativa
3. **Rotas:** adicionar múltiplas rotas com bairro destino, responsável, telefone, valor a receber, taxas extras, meios de pagamento. Cálculo automático de tarifa via `resolverTarifaMock()`
4. **Resumo:** revisão com totais (operação, loja, entregador), saldo do cliente (se pré-pago)

#### ViewSolicitacaoDialog
- Exibe código no cabeçalho, status, tipo de operação
- Detalhes de cada rota: destino, responsável, taxa, status
- Resumo financeiro da conciliação (se concluída)
- Botão WhatsApp com mensagem pré-definida

#### AssignDriverDialog
- Select de entregadores disponíveis (ativos)

#### ConciliacaoDialog
- Registro de pagamentos por rota
- Meios de pagamento por rota
- Valor recebido do cliente (se aplicável)
- Geração automática de lançamentos financeiros

#### JustificationDialog
- Motivo de cancelamento/rejeição

#### AdminConciliacaoDialog
- Versão administrativa com campos adicionais

---

### 5.3 Clientes (`/admin/clientes`)

**Arquivo:** `ClientesPage.tsx`

**Métricas (4 cards):**
- Total de Clientes, Clientes Ativos (com delta), Faturados, Pré-pago

**Funcionalidades:**
- **Filtros:** Busca (nome/email), status (todos/ativo/inativo/bloqueado), modalidade (pré-pago/faturado)
- **DataTable:** Nome+email+avatar, Telefone, Modalidade (badge + alerta saldo baixo pré-pago), Status, Ações
- **Alerta de saldo baixo:** ícone AlertTriangle + tooltip quando saldo < limite configurado
- **Ações:** Visualizar (perfil), Editar, Excluir (com confirmação)
- **Permissões:** Botões protegidos por `PermissionGuard`

**Sub-diálogos:**

#### ClientFormDialog
- Campos: nome, email, telefone, endereço, bairro, cidade, UF, chave Pix, modalidade (pré-pago/faturado), status
- Para faturados: frequência de faturamento, dia da semana/mês
- Para novos: campo de senha para auto-criar conta de acesso
- Validação de campos obrigatórios

#### ClientProfileModal
- Dados cadastrais completos
- Saldo atual (pré-pago) ou resumo de faturas (faturado)
- Métricas do cliente (entregas, valores)
- Botão "Editar" e "Ir para Tabela de Preços"

#### RecargaSaldoDialog
- Valor de recarga + observação
- Atualiza saldo no GlobalStore

---

### 5.4 Entregadores (`/admin/entregadores`)

**Arquivo:** `EntregadoresPage.tsx`

**Métricas (4 cards):**
- Total, Ativos (com delta), Entregas Hoje (calculadas das solicitações concluídas), Horas Trabalhadas (estimativa)

**Funcionalidades:**
- **Filtros:** Busca (nome/email), status (ativo/inativo), tipo veículo (moto/carro/bicicleta/a pé)
- **DataTable:** Nome+email+avatar, Telefone, Veículo (badge), Comissão (% ou valor fixo), Status, Ações
- **Ações:** Editar, Excluir (com confirmação)
- **Auto-criação de conta:** ao cadastrar, cria automaticamente UserAccount com role "entregador"

**Sub-diálogos:**

#### EntregadorFormDialog
- Campos: nome, documento (CPF), email, telefone, cidade, bairro, tipo veículo, tipo comissão (percentual/fixo), valor comissão, status
- Para novos: campo de senha para conta de acesso

---

### 5.5 Entregas (`/admin/entregas`)

**Arquivo:** `EntregasPage.tsx`

**Conceito:** Cada rota de uma solicitação é tratada como uma entrega individual.

**Métricas (5 cards):**
- Total, Ativas, Concluídas, Taxas (concluídas), Repasse (concluídas)

**Funcionalidades:**
- **Tabs:** Todas, Ativas, Concluídas, Canceladas — com contadores
- **Filtros:** Busca (código/cliente/destinatário/bairro), tipo operação, entregador, intervalo de datas
- **DataTable (11 colunas):** Solicitação (código), Cliente, Destino (bairro), Destinatário, Entregador, Tipo, Taxa, Valor Receber, Status, Data, Ações
- **Exportação:** PDF e CSV com todos os dados filtrados
- **Modal de detalhes:** informações completas da rota/entrega

---

### 5.6 Caixas Entregadores (`/admin/caixas-entregadores`)

**Arquivo:** `CaixasEntregadoresPage.tsx`

**Métricas (4 cards animados):**
- Caixas Abertos (hoje), Troco Distribuído, Recebido Hoje, Divergências

**Funcionalidades:**
- **Tabs:** Caixas do Dia / Histórico
- **Filtros:** Busca por entregador, filtro por entregador (select), filtro por status (aberto/fechado/divergente), DatePicker (apenas no histórico)
- **Histórico agrupado por data** com collapsible e resumo por dia

**Fluxo Caixa:**
1. **Abrir Caixa** → selecionar entregador (apenas ativos sem caixa aberto hoje) + valor troco inicial
2. **Fechar Caixa** → registrar valor devolvido + observações. Sistema calcula diferença automática
3. **Divergência** → se diferença ≠ 0, status vira "divergente" → admin pode justificar

**Sub-diálogos:**
- `AbrirCaixaDialog` — select entregador + troco inicial
- `FecharCaixaDialog` — valor devolvido + observações
- `EditarCaixaDialog` — alterar troco inicial + observações
- `JustificativaDivergenciaDialog` — justificar diferença
- `CaixaDetailsModal` — detalhes completos do caixa com recebimentos

---

### 5.7 Faturas (`/admin/faturas`)

**Arquivo:** `FaturasPage.tsx`

**Métricas (4 cards):**
- Abertas, Vencidas (com valor), Finalizadas, Saldo Pendente

**Funcionalidades:**
- **Tabs:** Ativas (não finalizadas) / Finalizadas
- **Filtros:** Busca (número/cliente), DatePicker de intervalo
- **DataTable:** Número, Cliente, Tipo Faturamento, Emissão, Vencimento, Entregas, Saldo Líquido (colorido), Status, Ações
- **Exportação:** PDF e CSV
- **Lazy loading:** FaturaDetailsModal carregado sob demanda

**Sub-diálogos:**

#### FaturaDetailsModal
- **Cabeçalho:** número, cliente, tipo faturamento, datas
- **Resumo financeiro:** valor taxas, valor repasse, créditos loja, débitos loja, saldo líquido
- **Status tracking:** status geral, status taxas, status repasse, status cobrança
- **Histórico de eventos:** timeline de mudanças de status
- **Ações:** Registrar Pagamento, Registrar Repasse, Adicionar Ajuste
- **Geração de PDF de fechamento** via jsPDF

#### RegistrarPagamentoDialog
- Valor do pagamento + observação
- Recalcula saldo automaticamente

#### RegistrarRepasseDialog
- Valor do repasse + observação
- Atualiza status de repasse

#### AdicionarAjusteDialog
- Tipo (crédito/débito) + valor + motivo
- Recalcula saldo da fatura

---

### 5.8 Financeiro (`/admin/financeiro`)

**Arquivo:** `FinanceiroPage.tsx`

**Métricas (4 cards):**
- Total Despesas, Pendentes, Pagas, Receitas

**Gráficos:**
- **Bar Chart:** Fluxo de Caixa — últimos 6 meses (receitas vs despesas) com Recharts
- **Pie Chart:** Despesas por Categoria (donut chart)

**Tabs (3 abas):**

#### Aba Despesas (`DespesasTab`)
- **Filtros:** Busca, status (Pendente/Atrasado/Pago), categoria
- **DataTable:** Descrição, Categoria, Fornecedor, Vencimento, Valor, Status, Ações
- **Ações:** Nova Despesa, Marcar como Paga
- **NovaDespesaDialog:** descrição, categoria, fornecedor, vencimento, valor, observação
- **PagarDespesaDialog:** confirmar pagamento

#### Aba Receitas (`ReceitasTab`)
- **Duas seções:**
  1. Faturas Recebidas (automáticas, vindas de faturas pagas/finalizadas)
  2. Receitas Lançadas (CRUD manual)
- **Filtros:** Busca, categoria
- **DataTable:** Descrição, Categoria, Data, Valor, Ações
- **NovaReceitaDialog:** descrição, categoria, data, valor, observação

#### Aba Livro Caixa (`LivroCaixaTab`)
- Tabela cronológica de todos os lançamentos (entradas + saídas)
- Saldo acumulado
- Filtros por período

---

### 5.9 Relatórios (`/admin/relatorios`)

**Arquivo:** `RelatoriosPage.tsx`

**Filtros globais de período:**
- Botões rápidos: 7d, 15d, 30d, Mês Atual, Mês Anterior, Trimestre, Ano
- DatePicker para período personalizado
- Badge mostrando período ativo

**Tabs (5 abas):**

#### Resumo Financeiro (`ResumoFinanceiroTab`)
- Cards de KPIs: receita total, despesa total, lucro líquido, margem
- Gráfico de tendência

#### Clientes (`ClientesReportTab`)
- Ranking de clientes por volume de entregas e receita
- Distribuição faturado vs pré-pago (gráfico)

#### Receitas (`ReceitasReportTab`)
- Comparativo realizado vs previsto
- Ticket médio
- Evolução temporal

#### Despesas Previstas (`DespesasPrevistasTab`)
- Projeções de gastos
- Despesas recorrentes
- Alertas de vencimento

#### Comissões (`ComissoesTab`)
- Tabela de comissões por entregador
- Tipo (percentual/fixo), taxa, entregas, valor gerado, comissão total

**Exportação global:** PDF e CSV com dados de todas as abas

---

### 5.10 Logs de Auditoria (`/admin/logs`)

**Arquivo:** `LogsPage.tsx`

**Funcionalidades:**
- **Categorias:** Solicitação, Fatura, Financeiro, Cliente, Entregador, Configuração, Autenticação
- **Cada categoria tem ícone e cor distintos**
- **Filtros:** Busca (descrição/ID/usuário/ação), categoria, intervalo de datas
- **Tabela expansível:** ao clicar, mostra detalhes com diff (anterior → novo) em formato JSON
- **Paginação:** seletor de page size (10/25/50/100)
- **Layout responsivo:** cards no mobile, tabela no desktop
- **Exportação:** PDF e CSV via utilitários dedicados (`exportLogs.ts`)

---

### 5.11 Configurações (`/admin/configuracoes`)

**Arquivo:** `SettingsPage.tsx`

Página com **13 abas** dentro de um componente Tabs:

#### 5.11.1 Geral (`GeralTab`)
- **Saldo Pré-pago:** configurar limite mínimo de alerta para clientes pré-pagos
- Quando saldo < limite, sistema emite alertas visuais na listagem de clientes e notificações ao concluir entregas
- Input CurrencyInput com persistência via SettingsStore (Zustand)

#### 5.11.2 Bairros (`BairrosTab`)
- CRUD completo de bairros
- Campos: nome, região (select), taxa de entrega (CurrencyInput)
- Busca e filtro
- DataTable com ações (editar, excluir)
- **Importação em massa:** upload de PDF/CSV/TXT com pré-visualização e validação

#### 5.11.3 Regiões (`RegioesTab`)
- CRUD de regiões geográficas
- Campos: nome, descrição
- Busca, DataTable com ações

#### 5.11.4 Formas de Pagamento (`FormasPagamentoTab`)
- CRUD de formas de pagamento
- Campos: nome, descrição, ordem
- Toggle de ativação/desativação (Switch)
- DataTable com colunas: ordem, nome, descrição, status, ações

#### 5.11.5 Cargos (`CargosTab`)
- CRUD de cargos administrativos
- Campos: nome, descrição, permissões (multiselect por módulo)
- **PermissionMatrix:** visualização matricial de permissões por cargo
- Toggle de permissões individuais e por módulo inteiro
- DataTable com nome, descrição, contagem de permissões, ações

#### 5.11.6 Usuários (`UsuariosTab`)
- CRUD de contas de usuário administrativo
- Campos: nome, email, senha, role, cargo (select), status
- **Filtros:** Busca, status (ativo/inativo)
- DataTable com avatar, nome, email, cargo, status, ações
- Ações protegidas por `PermissionGuard`
- Confirmação de exclusão

#### 5.11.7 Tipos de Operação (`TiposOperacaoTab`)
- CRUD de tipos de operação (ex: Normal, Urgente, Noturno)
- Campos: nome, descrição, dias da semana (multiselect), horário início/fim, aplica feriado (switch), cor, prioridade, ativo
- Formatação inteligente de dias (ex: "Seg–Sex", "Todos os dias")
- DataTable com prioridade, nome (com cor), dias, horário, feriado, status, ações
- **Seção de Feriados:** inline na mesma aba, CRUD de feriados com recorrência anual

#### 5.11.8 Tabela de Preços (`TabelaPrecosTab`)
- **Seletor de cliente** no topo (muda contexto)
- CRUD de regras de preço por cliente
- Campos: bairro destino, região, tipo operação, taxa base, taxa retorno, taxa espera, taxa urgência, observação, ativo, prioridade
- **Indicador de cobertura:** mostra se cliente tem cobertura completa, parcial ou nenhuma
- Botões de mover prioridade (subir/descer)
- DataTable com todas as colunas + ações
- Deep link via query param `?cliente=XXX`

#### 5.11.9 Taxas Extras (`TaxasExtrasTab`)
- CRUD de taxas extras aplicáveis a entregas
- Campos: nome, valor padrão (CurrencyInput), ativo (switch)
- Toggle de ativação inline na tabela
- DataTable com nome, valor padrão, status, ações

#### 5.11.10 Simulador (`SimuladorOperacoes`)
- Simulador de custo de operação
- Selecionar cliente, bairro, tipo de operação
- Calcular tarifa com base na tabela de preços
- Exibir breakdown: taxa base, retorno, espera, urgência, total

#### 5.11.11 Notificações (`NotificacoesTab`)
- Gestão de templates de notificação WhatsApp
- **CRUD de templates** por evento do sistema
- Campos: evento, categoria, mensagem com variáveis dinâmicas
- **Variáveis por categoria:** `{{cliente_nome}}`, `{{codigo_entrega}}`, `{{valor}}`, etc.
- **Preview de mensagem** com variáveis substituídas
- **Teste de envio** com simulação e histórico de resultados
- Filtros: busca, categoria, status (ativo/inativo)
- DataTable com evento, categoria, status, ações (editar, excluir, testar, preview)

#### 5.11.12 Webhooks (`WebhooksTab`)
- CRUD de endpoints webhook
- Campos: nome, URL, secret, eventos (multiselect), status (ativo/inativo/erro)
- **Eventos disponíveis:** nova solicitação, status alterado, fatura gerada, pagamento registrado, etc.
- Filtros: busca, status
- DataTable com nome, eventos (badges), status, ações
- Confirmação de exclusão

#### 5.11.13 Integrações (`IntegracoesTab`)
- Painel de integrações com terceiros
- Cards visuais por integração (WhatsApp, Google Maps, Pix, ERP, etc.)
- **Status:** conectado, desconectado, erro
- Toggle de ativação/desativação
- Diálogo de configuração: API key, settings adicionais
- Teste de conexão simulado
- Filtro por categoria

---

## 6. Portal do Cliente

### 6.1 Dashboard (`/cliente`)
**Arquivo:** `ClienteDashboard.tsx`

**Métricas (4 cards, adaptativas por modalidade):**
- Pedidos do Mês
- Em Andamento (aceitas + em trânsito)
- **Pré-pago:** Saldo Pré-Pago (com alerta visual se ≤ R$100) + Corridas Concluídas
- **Faturado:** Saldo Devedor + Saldo a Receber

**Últimas Solicitações:**
- Lista das 5 mais recentes com código, data, entregador, valor, status
- Animações stagger

### 6.2 Minhas Solicitações (`/cliente/solicitacoes`)
**Arquivo:** `MinhasSolicitacoesPage.tsx`

- Filtra automaticamente por `cliente_id` do usuário logado
- **Tabs por status:** Todas, Pendente, Aceita, Em Andamento, Concluída, Cancelada
- **Filtros:** Busca (código/ponto de coleta), DatePicker
- **DataTable:** Código, Tipo, Entregador, Rotas, Valor, Status, Data, Ações (ver detalhes)
- **ViewSolicitacaoDialog:** mesma do admin, mas em modo read-only

### 6.3 Financeiro (`/cliente/financeiro`)
**Arquivo:** `ClienteFinanceiroPage.tsx`

**Comportamento adaptativo por modalidade:**

#### Cliente Faturado:
- **Métricas:** Total de Faturas, Saldo em Aberto, Faturas Vencidas
- **DataTable de fechamentos:** Número, Emissão, Vencimento, Entregas, Saldo, Status
- Filtros: busca por número, status
- Exportação PDF/CSV

#### Cliente Pré-Pago (`PrePagoFinanceiroView`):
- **Métricas:** Saldo Atual, Total Recargas, Total Taxas Consumidas
- **Histórico de movimentações:** créditos e débitos em lista cronológica
- Exportação do histórico completo

### 6.4 Simulador (`/cliente/simulador`)
**Arquivo:** `SimuladorClientePage.tsx`
- Simulador de custos de entrega
- Selecionar bairro, tipo de operação
- Ver breakdown de custos

### 6.5 Perfil (`/cliente/perfil`)
**Arquivo:** `ClientePerfilPage.tsx`
- Formulário de dados cadastrais
- Campos editáveis: nome, email, telefone, endereço, etc.
- Campo de documento (CPF/CNPJ) como read-only

---

## 7. Portal do Entregador

### 7.1 Dashboard (`/entregador`)
**Arquivo:** `EntregadorDashboard.tsx`

**Métricas (4 cards animados):**
- Corridas Ativas (aceitas + em andamento, com destaque visual se > 0)
- Concluídas Hoje
- Comissão do Dia (estimativa baseada na comissão mensal / 22 dias úteis)
- Comissão do Mês (sobre receita operação)

**Últimas Entregas:**
- Lista das 5 entregas concluídas mais recentes
- Código, cliente, data, status

### 7.2 Solicitações (`/entregador/solicitacoes`)
**Arquivo:** `EntregadorSolicitacoesPage.tsx`

- Filtra automaticamente por `entregador_id`
- **Métricas:** Aceitas, Em Andamento, Concluídas Hoje, Total Atribuídas
- **Tabs por status** com contadores
- **Filtros:** Busca, DatePicker
- **Ações:**
  - Aceita → "Iniciar Entrega" (muda para em_andamento)
  - Em Andamento → "Concluir" (abre ConciliacaoDialog)
- **DataTable + cards mobile** com informações de rota

### 7.3 Corridas (`/entregador/corridas`)
**Arquivo:** `EntregadorCorridasPage.tsx`

- Visão alternativa/complementar às solicitações
- **Tabs:** Ativas / Todas
- Cards detalhados por solicitação com rotas expandidas
- Botões de ação: iniciar, concluir, ver detalhes, WhatsApp

### 7.4 Histórico (`/entregador/historico`)
**Arquivo:** `EntregadorHistoricoPage.tsx`

- Todas as entregas concluídas/canceladas do entregador
- **Filtros:** Busca, status, DatePicker
- **DataTable:** Código, Cliente, Coleta, Data, Status, Ações
- **Exportação:** PDF e CSV
- ViewSolicitacaoDialog para detalhes

### 7.5 Financeiro (`/entregador/financeiro`)
**Arquivo:** `EntregadorFinanceiroPage.tsx`

**Métricas (3 cards):**
- Entregas Realizadas
- Valor Gerado (receita operacional)
- Minha Comissão (com taxa aplicada, destaque visual)

**Detalhes da Comissão:**
- Tipo (percentual/fixo), taxa, base de cálculo, total entregas, comissão total
- Nota: comissão calculada exclusivamente sobre receita operacional
- **Exportação:** PDF e CSV

### 7.6 Caixa (`/entregador/caixa`)
**Arquivo:** `EntregadorCaixaPage.tsx`

- Visualização do caixa do dia do entregador
- Troco inicial, recebimentos, total esperado, valor devolvido
- Status do caixa (aberto/fechado/divergente)

### 7.7 Perfil (`/entregador/perfil`)
**Arquivo:** `EntregadorPerfilPage.tsx`

- Formulário de dados pessoais
- Campos: nome, email, telefone, documento (read-only), cidade, bairro
- Botão salvar com loading state

---

## 8. Sistema de Notificações

### 8.1 NotificationContext
- **Estado:** lista de notificações, contagem de não lidas
- **Persistência:** `localStorage` com key `leva-traz-notifications`
- **Mock inicial:** 5 notificações pré-definidas

### 8.2 Tipos de Notificação
| Tipo | Cor | Uso |
|---|---|---|
| `warning` | Amarelo | Alertas de saldo, pendências |
| `error` | Vermelho | Faturas vencidas, erros |
| `info` | Azul | Cadastros, atualizações |
| `success` | Verde | Conclusões, pagamentos |

### 8.3 Eventos Automáticos
- **Saldo Pré-Pago Baixo:** dispara quando saldo < limite após conclusão de entrega (via CustomEvent `saldo-baixo-pre-pago`)
- **Nova Fatura Gerada:** dispara ao gerar fatura automaticamente (via CustomEvent `nova-fatura-gerada`)

### 8.4 UI
- Sino no header com badge de contagem
- Popover com lista de notificações
- Marcar como lida (individual/todas)
- Links diretos para páginas relevantes

---

## 9. Sistema de Onboarding

### 9.1 Componentes
- **OnboardingProvider:** contexto com estado do onboarding
- **WelcomeModal:** modal de boas-vindas na primeira visita
- **OnboardingOverlay:** overlay escurecido para destaque
- **OnboardingTooltip:** tooltips guiados passo a passo
- **OnboardingRoleSync:** sincroniza steps por role
- **OnboardingHelpButton:** botão de ajuda flutuante

### 9.2 Steps
- Steps definidos por role em `onboardingSteps.ts`
- Cada step referencia um `data-onboarding` attribute no DOM
- Progressão sequencial com "Próximo" / "Pular"

---

## 10. Gestão de Estado

### 10.1 Stores (Zustand)

| Store | Escopo | Dados |
|---|---|---|
| `GlobalStore` | Solicitações, Faturas, Rotas, Clientes (saldo), Pagamentos | CRUD completo com lançamentos financeiros |
| `CaixaStore` | Caixas de entregadores | Abrir, fechar, editar, justificar |
| `LogStore` | Logs de auditoria | Adicionar e consultar logs |
| `SettingsStore` | Configurações do sistema | `limite_saldo_pre_pago` |
| `UserStore` | Contas de usuário (mock) | CRUD de UserAccount |

### 10.2 Dados Mock
| Arquivo | Dados |
|---|---|
| `mockClientes.ts` | Clientes + métricas |
| `mockEntregadores.ts` | Entregadores |
| `mockSolicitacoes.ts` | Solicitações + helpers |
| `mockFaturas.ts` | Faturas + labels |
| `mockFinanceiro.ts` | Despesas, receitas, comissões, livro caixa, fluxo mensal |
| `mockCaixas.ts` | Caixas de entregadores |
| `mockLogs.ts` | Logs iniciais |
| `mockSettings.ts` | Bairros, regiões, formas pagamento, cargos, taxas, tipos operação, tabela preços, permissões |
| `mockRelatorios.ts` | Dados de relatórios |
| `mockUsers.tsx` | Contas de usuário com Provider |

---

## 11. Utilitários

### 11.1 Formatação (`formatters.ts`)
- `formatCurrency(value)` — formato R$ brasileiro
- `formatDateBR(date)` — formato dd/MM/yyyy

### 11.2 Exportação (`exportTable.ts`)
- `exportCSV({ title, headers, rows, filename })` — gera CSV compatível com Excel (BOM UTF-8, delimitador `;`)
- `exportPDF({ title, subtitle, headers, rows, filename })` — gera PDF via jsPDF + autoTable

### 11.3 Exportação de Logs (`exportLogs.ts`)
- `exportLogsCSV(logs)` — formato específico para logs
- `exportLogsPDF(logs)` — PDF com tabela de logs

### 11.4 Geração de PDF de Fatura (`generateFaturaPDF.ts`)
- PDF de fechamento de fatura com cabeçalho, dados do cliente, breakdown financeiro

---

## 12. Landing Page

### 12.1 Seções
| Seção | Componente | Descrição |
|---|---|---|
| Navegação | `LandingNav` | Sticky, glassmorphism, mobile drawer |
| Hero | `HeroSection` | CTA principal, image overlay, trust indicators |
| Stats | `StatsSection` | Contadores animados (entregas, clientes, cidades, uptime) |
| Features | `FeaturesSection` | Grid de funcionalidades com ícones e descrições |
| How It Works | `HowItWorksSection` | Passos do processo (1-2-3) |
| Segments | `SegmentsSection` | Segmentos atendidos |
| Testimonials | `TestimonialsSection` | Depoimentos com estrelas e avatar |
| CTA | `CTASection` | Call-to-action final |
| Footer | `LandingFooter` / `FooterImageSection` | Links, redes sociais |

### 12.2 Design
- Mesh gradients, dot grid textures, glassmorphism
- Animações de entrada com Framer Motion (`whileInView`)
- Contadores animados com `useInView` + `requestAnimationFrame`
- Responsivo (mobile-first)

---

## 13. Tipos TypeScript

### 13.1 Enums Principais
```typescript
Role: "admin" | "cliente" | "entregador"
StatusSolicitacao: "pendente" | "aceita" | "em_andamento" | "concluida" | "cancelada" | "rejeitada"
Modalidade: "pre_pago" | "faturado"
StatusGeral: "Aberta" | "Fechada" | "Paga" | "Finalizada" | "Vencida"
TipoComissao: "percentual" | "fixo"
TipoVeiculo: "moto" | "carro" | "bicicleta" | "a_pe"
StatusDespesa: "Pendente" | "Atrasado" | "Pago"
PertenceA: "operacao" | "loja"
TipoLancamento: "receita_operacao" | "credito_loja" | "debito_loja" | "ajuste"
```

### 13.2 Entidades Principais
```
Profile, Cargo, Cliente, Entregador, Regiao, Bairro, FormaPagamento,
TaxaExtraConfig, TabelaPrecoCliente, Solicitacao, Rota, PagamentoSolicitacao,
LancamentoFinanceiro, Fatura, AjusteFinanceiro, Despesa, Receita,
AuditoriaFinanceira, LogEntry, TipoOperacaoConfig, Feriado, RecargaPrePago,
UserAccount
```

---

## 14. Design System

### 14.1 Tokens CSS (HSL)
- `--primary`, `--primary-foreground`
- `--secondary`, `--muted`, `--accent`
- `--background`, `--foreground`
- `--destructive`, `--warning`
- `--chart-1` a `--chart-5`
- `--sidebar-*` (background, foreground, accent, border)

### 14.2 Tema
- Suporte dark/light mode via `next-themes` (`ThemeProvider`)
- Todos os componentes usam tokens semânticos
- shadcn/ui como base com customizações

### 14.3 Animações
- Framer Motion para transições de página, stagger de cards, fade-up de elementos
- Contadores animados (Stats)
- Hover states em cards e botões

---

## 15. Requisitos Não-Funcionais

### 15.1 Performance
- **Lazy loading:** todas as páginas via `React.lazy()` + `Suspense`
- **Code splitting:** por rota
- **Memoização:** `useMemo` para dados filtrados e métricas

### 15.2 Acessibilidade
- Labels em todos os inputs
- Tooltips em ações de ícone
- Roles ARIA via shadcn/ui
- Navegação por teclado

### 15.3 Responsividade
- Mobile-first
- Sidebar colapsável com drawer no mobile
- DataTable com `renderMobileCard` para telas pequenas
- Grid adaptativo (1-2-4-5 colunas conforme viewport)

### 15.4 SEO (Landing Page)
- Meta tags dinâmicas
- Estrutura semântica (H1, H2, etc.)
- `robots.txt` presente

### 15.5 Segurança (Mock)
- Rate limiting no login
- Sanitização de dados armazenados
- Permissões granulares por cargo
- PermissionGuard em ações sensíveis

---

## 16. Roadmap de Migração para Backend

### 16.1 Prioridade 1 — Banco de Dados
- Migrar de Zustand mock para Supabase/PostgreSQL
- Implementar RLS por role

### 16.2 Prioridade 2 — Autenticação
- Substituir mock por Supabase Auth
- OAuth (Google, Apple)

### 16.3 Prioridade 3 — Edge Functions
- `resolver_tarifa` — RPC para resolução de preços
- Webhooks reais
- Integração WhatsApp

### 16.4 Prioridade 4 — Storage
- Upload de comprovantes
- Avatares de usuários
- Documentos de fatura

---

*Documento gerado automaticamente a partir do código-fonte em 2026-04-08.*

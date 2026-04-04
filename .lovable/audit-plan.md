# Plano de Auditoria Funcional — Leva e Traz v2.0
## PRD vs. Implementação Atual

> **Objetivo:** Verificar cada funcionalidade descrita no PRD contra o código implementado, identificar gaps, bugs e itens faltantes.
> **Método:** Auditoria por módulo, com checklist de critérios de aceite do PRD.

---

## ETAPA 1 — Autenticação & Controle de Acesso
**Arquivos:** `LoginPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `AuthContext.tsx`, `ProtectedRoute.tsx`, `usePermissions.ts`

| # | Critério (PRD) | Verificar |
|---|----------------|-----------|
| 1.1 | Login com email/senha redireciona para portal correto por role | Fluxo admin→`/`, cliente→`/cliente`, entregador→`/entregador` |
| 1.2 | Login inválido exibe toast de erro sem travar UI | Mensagens mapeadas em `AUTH_ERROR_MESSAGES` |
| 1.3 | Botão exibe loading durante chamada | Estado `isLoading` no botão |
| 1.4 | Remember Me persiste sessão | `localStorage` vs `sessionStorage` |
| 1.5 | Bloqueio após 5 tentativas em 5 minutos | Lógica de `loginAttempts` e countdown |
| 1.6 | Recuperação de senha funcional | `requestPasswordReset` e `resetPassword` |
| 1.7 | ProtectedRoute redireciona role errado | Teste cross-portal |
| 1.8 | `usePermissions()` verifica permissões granulares por cargo | `getPermissionsForRole` + `hasPermission` |

---

## ETAPA 2 — Shell, Layouts & Navegação
**Arquivos:** `AdminLayout.tsx`, `ClientLayout.tsx`, `DriverLayout.tsx`, `AdminSidebar.tsx`, `AppHeader.tsx`, `ProtectedAppShell.tsx`

| # | Critério (PRD) | Verificar |
|---|----------------|-----------|
| 2.1 | Sidebar admin com 9+ itens + ícones corretos | Itens: Dashboard, Solicitações, Entregas, Clientes, Entregadores, Faturas, Financeiro, Relatórios, Configurações |
| 2.2 | Badges de notificação dinâmicos (não mock) | `solicitacoesPendentes`, `faturasVencidas` calculados do store |
| 2.3 | Sidebar colapsa em mobile com overlay | `useMobile()` + sheet/drawer |
| 2.4 | Header: avatar, nome, theme toggle, logout | Componentes presentes e funcionais |
| 2.5 | Theme toggle persiste no localStorage | `ThemeProvider` + `next-themes` |
| 2.6 | Logout limpa sessão e redireciona `/login` | `clearAuth()` + navigate |
| 2.7 | NotificationProvider único (não triplicado) | Verificado — agora está no `ProtectedAppShell` |
| 2.8 | Sidebar cliente com 4 itens | Dashboard, Solicitações, Financeiro, Perfil |
| 2.9 | Sidebar entregador com 4 itens | Dashboard, Corridas/Solicitações, Financeiro, Perfil |

---

## ETAPA 3 — Componentes Compartilhados
**Arquivos:** `src/components/shared/*`

| # | Componente (PRD) | Existe? | Verificar |
|---|------------------|---------|-----------|
| 3.1 | `MetricCard` | ✅ | Título, valor, subtítulo, ícone, delta percentual |
| 3.2 | `DataTable<T>` | ✅ | Sorting, paginação, mobile cards |
| 3.3 | `SearchInput` | ✅ | Debounce 300ms |
| 3.4 | `DatePickerWithRange` | ✅ | Dois datepickers |
| 3.5 | `StatusBadge` | ✅ | Mapeamento de cor por status |
| 3.6 | `ConfirmDialog` | ✅ | AlertDialog genérico |
| 3.7 | `JustificationDialog` | ✅ | Textarea mín. 10 chars |
| 3.8 | `ExportDropdown` | ✅ | PDF + CSV/Excel funcional |
| 3.9 | `EmptyState` | ✅ | Ícone + título + subtítulo + ação |
| 3.10 | `ErrorState` | ✅ | Botão retry |
| 3.11 | `LoadingSkeleton` | ✅ | Skeleton parametrizável |
| 3.12 | `CurrencyInput` | ✅ | Formatação BRL |
| 3.13 | `PhoneInput` | ✅ | Máscara telefone |
| 3.14 | `AvatarWithFallback` | ✅ | Fallback por iniciais |
| 3.15 | `PermissionGuard` | ✅ | Renderiza se tem permissão |
| 3.16 | `PageContainer` | ✅ | Container padrão |
| 3.17 | `ErrorBoundary` | ✅ | Captura erros React |
| 3.18 | `TipoOperacaoBadge` | ✅ | Badge por tipo operação |
| 3.19 | `SimuladorOperacoes` | ✅ | Simulador de tarifas |

---

## ETAPA 4 — Dashboard Admin (`/`)
**Arquivo:** `Dashboard.tsx`

| # | Critério (PRD) | Verificar |
|---|----------------|-----------|
| 4.1 | 5 MetricCards dinâmicos | Contas a Pagar, Faturas Vencidas, Entregas Hoje, Taxas Recebidas, Novas Solicitações |
| 4.2 | Valores calculados (não hardcoded) | `useDashboardData()` usa dados mock mas calcula dinamicamente |
| 4.3 | RecentTransactions (últimas 10) | Lista com tipo, descrição, valor, data |
| 4.4 | Link "Ver todas" → `/financeiro` | Navigate funcional |
| 4.5 | EmptyState quando sem dados | Nunca `return null` |
| 4.6 | Animações Framer Motion | Stagger + fadeUp |
| 4.7 | Variação percentual calculada | `calcVariation()` |

---

## ETAPA 5 — Solicitações (`/solicitacoes`)
**Arquivos:** `SolicitacoesPage.tsx`, `LaunchSolicitacaoDialog.tsx`, `AssignDriverDialog.tsx`, `ViewSolicitacaoDialog.tsx`, `ConciliacaoDialog.tsx`, `AdminConciliacaoDialog.tsx`

| # | Critério (PRD) | Verificar |
|---|----------------|-----------|
| 5.1 | 5 MetricCards dinâmicos | Pendentes, Aceitas, Em Andamento, Concluídas Hoje, Tempo Médio |
| 5.2 | Abas por status com contagem badge | Todas, Pendentes, Aceitas, Em Andamento, Concluídas, Canceladas, Rejeitadas |
| 5.3 | Filtros na URL (search params) | `?status=`, `?search=`, `?from=`, `?to=` |
| 5.4 | Código `LT-YYYYMMDD-NNNNN` | Geração automática |
| 5.5 | LaunchSolicitacaoDialog multi-step | Step 1: Dados, Step 2: Rotas, Step 3: Revisão |
| 5.6 | Resolução de tarifa ao selecionar bairro | `resolver_tarifa` / settings store |
| 5.7 | Bloqueio sem tarifa válida | Mensagem clara |
| 5.8 | Aviso visual ao usar fallback | Warning amarelo |
| 5.9 | Máquina de estados completa | pendente→aceita→em_andamento→concluida / cancelada / rejeitada |
| 5.10 | AssignDriverDialog | Lista entregadores ativos |
| 5.11 | ConciliacaoDialog com `pertenceA` | Operação vs Loja por pagamento |
| 5.12 | Diferença ≠ 0 bloqueia ou exige justificativa | Validação |
| 5.13 | Ações contextuais por status | Botões corretos por estado |
| 5.14 | Cancelamento em_andamento exige justificativa | JustificationDialog |
| 5.15 | Histórico de transições | `historico[]` atualizado |
| 5.16 | Exportação usa filtro ativo | CSV/PDF do dataset filtrado |
| 5.17 | Retroatividade (data no passado) | `isRetroativa` flag |
| 5.18 | Validação saldo pré-pago | `verificarSaldoPrePago` antes de concluir |
| 5.19 | Notificação saldo baixo | Evento `saldo-baixo-pre-pago` |
| 5.20 | Geração automática de fatura | `concluirSolicitacaoComFatura` |

---

## ETAPA 6 — Clientes (`/clientes`)
**Arquivos:** `ClientesPage.tsx`, `ClientFormDialog.tsx`, `ClientProfileModal.tsx`, `RecargaSaldoDialog.tsx`

| # | Critério (PRD) | Verificar |
|---|----------------|-----------|
| 6.1 | CRUD completo | Criar, editar, excluir, visualizar |
| 6.2 | ClientFormDialog com seções | Dados cadastrais + Config financeira |
| 6.3 | Modalidade pré-pago / faturado | Toggle condicional de campos |
| 6.4 | Faturamento automático condicional | frequência, dia da semana, dia do mês |
| 6.5 | Validação email único | No blur |
| 6.6 | Exclusão bloqueada com solicitações | Sugere inativação |
| 6.7 | ClientProfileModal com métricas | Total solicitações, valor taxas, últimas 5 |
| 6.8 | RecargaSaldoDialog (pré-pago) | Recarga funcional |
| 6.9 | Filtros: busca + status | SearchInput + Select |
| 6.10 | Badge Faturado/Pré-pago | Cores corretas |

---

## ETAPA 7 — Entregadores (`/entregadores`)
**Arquivos:** `EntregadoresPage.tsx`, `EntregadorFormDialog.tsx`

| # | Critério (PRD) | Verificar |
|---|----------------|-----------|
| 7.1 | 4 MetricCards dinâmicos | Total, Ativos, Entregas Hoje, Horas Trabalhadas |
| 7.2 | Valores NÃO hardcoded | Calculados dos dados |
| 7.3 | EntregadorFormDialog completo | Nome, documento, email, telefone, veículo, comissão |
| 7.4 | Tipo comissão: percentual vs fixo | Toggle + valor |
| 7.5 | Comissão incide sobre receita operacional | Nunca sobre crédito loja |
| 7.6 | Exclusão bloqueada com solicitação ativa | Verificação |
| 7.7 | Filtros: busca + status + veículo | SearchInput + Selects |

---

## ETAPA 8 — Entregas (`/entregas`)
**Arquivo:** `EntregasPage.tsx`

| # | Critério (PRD) | Verificar |
|---|----------------|-----------|
| 8.1 | Monitoramento operacional | Métricas: Total, Ativas, Concluídas, Taxas, Repasse |
| 8.2 | Abas por status | Filtro funcional |
| 8.3 | Modal de detalhes | Informações de cliente, entregador, valores |
| 8.4 | Busca textual | SearchInput |

---

## ETAPA 9 — Faturas (`/faturas`)
**Arquivos:** `FaturasPage.tsx`, `FaturaDetailsModal.tsx`, `RegistrarPagamentoDialog.tsx`, `RegistrarRepasseDialog.tsx`, `AdicionarAjusteDialog.tsx`

| # | Critério (PRD) | Verificar |
|---|----------------|-----------|
| 9.1 | MetricCards: Abertas, Vencidas, Finalizadas | Valores dinâmicos |
| 9.2 | Abas: Ativas vs Finalizadas | Filtro correto |
| 9.3 | FaturaDetailsModal com 7 seções | Cabeçalho, Resumo, Entregas, Lançamentos, Ajustes, Histórico, Ações |
| 9.4 | Saldo líquido calculado | Créditos - Débitos - Ajustes |
| 9.5 | Registrar Cobrança/Repasse | Dialogs funcionais |
| 9.6 | Adicionar Ajuste com justificativa | Dialog + auditoria |
| 9.7 | Status: Aberta, Fechada, Paga, Finalizada, Vencida | Dimensões corretas |
| 9.8 | Geração automática após conciliação | `concluirSolicitacaoComFatura` |
| 9.9 | Exportação PDF/CSV | ExportDropdown |

---

## ETAPA 10 — Financeiro (`/financeiro`)
**Arquivos:** `FinanceiroPage.tsx`, `DespesasTab.tsx`, `ReceitasTab.tsx`, `LivroCaixaTab.tsx`

| # | Critério (PRD) | Verificar |
|---|----------------|-----------|
| 10.1 | 4 MetricCards dinâmicos | Total Despesas, Pendentes, Pagas, Receitas |
| 10.2 | Aba Despesas com CRUD | Criar, editar, marcar como paga |
| 10.3 | Aba Receitas | Lançamentos de receita operacional |
| 10.4 | Aba Livro Caixa | Visão consolidada entradas/saídas |
| 10.5 | PieChart despesas por categoria | Recharts |
| 10.6 | BarChart fluxo de caixa | Últimos 6 meses |
| 10.7 | Exportação PDF/CSV | Funcional |
| 10.8 | "Marcar como Paga" funcional | Atualiza status + dataPagamento |

---

## ETAPA 11 — Relatórios (`/relatorios`)
**Arquivos:** `RelatoriosPage.tsx`, `ResumoFinanceiroTab.tsx`, `ComissoesTab.tsx`, `DespesasReportTab.tsx`, `ReceitasReportTab.tsx`, `ClientesReportTab.tsx`, `DespesasPrevistasTab.tsx`

| # | Critério (PRD) | Verificar |
|---|----------------|-----------|
| 11.1 | Filtro global DatePickerWithRange | Filtra todas as abas |
| 11.2 | Botões de período rápido | 7d, 15d, 30d, mês, trimestre, ano |
| 11.3 | Aba Resumo Financeiro | Cards + gráfico evolução |
| 11.4 | Aba Comissões | Tabela entregadores + totais |
| 11.5 | Aba Despesas | Tabela detalhada |
| 11.6 | Aba Receitas | Comparativo realizado vs previsto |
| 11.7 | Aba Clientes | Rankings + distribuição |
| 11.8 | Exportação PDF/Excel | Funcional por aba |
| 11.9 | Cálculo de comissão correto | % ou fixo, apenas sobre receita operacional |

---

## ETAPA 12 — Configurações (`/configuracoes`)
**Arquivos:** `SettingsPage.tsx`, `GeralTab.tsx`, `BairrosTab.tsx`, `RegioesTab.tsx`, `FormasPagamentoTab.tsx`, `CargosTab.tsx`, `TabelaPrecosTab.tsx`, `TiposOperacaoTab.tsx`, `TaxasExtrasTab.tsx`, `UsuariosTab.tsx`, `NotificacoesTab.tsx`, `IntegracoesTab.tsx`, `WebhooksTab.tsx`, `FeriadosSection.tsx`

| # | Critério (PRD) | Verificar |
|---|----------------|-----------|
| 12.1 | Aba Geral | Configurações globais, limite saldo pré-pago |
| 12.2 | Aba Bairros | CRUD + taxaEntrega como FALLBACK + aviso visual |
| 12.3 | Aba Regiões | CRUD + bloqueio exclusão com bairros vinculados |
| 12.4 | Aba Formas de Pagamento | CRUD + toggle habilitado/desabilitado |
| 12.5 | Aba Cargos e Permissões | CRUD + PermissionMatrix |
| 12.6 | Aba Tabela de Preços | CRUD por cliente + prioridade + indicador cobertura |
| 12.7 | Tabs extras (além do PRD) | TiposOperação, TaxasExtras, Usuários, Notificações, Integrações, Webhooks, Feriados |

---

## ETAPA 13 — Portal do Cliente (`/cliente/*`)
**Arquivos:** `ClienteDashboard.tsx`, `MinhasSolicitacoesPage.tsx`, `ClienteFinanceiroPage.tsx`, `ClientePerfilPage.tsx`, `PrePagoFinanceiroView.tsx`, `SimuladorClientePage.tsx`

| # | Critério (PRD) | Verificar |
|---|----------------|-----------|
| 13.1 | Dashboard com métricas dinâmicas | Não hardcoded |
| 13.2 | Solicitações read-only filtráveis | Busca + status |
| 13.3 | Financeiro condicional por modalidade | Faturado: faturas | Pré-pago: saldo |
| 13.4 | Download PDF de fatura | Funcional (não apenas toast) |
| 13.5 | Perfil editável | Nome, telefone, avatar |
| 13.6 | Email somente leitura | Não editável |
| 13.7 | Valores exibidos = taxas apenas | Nunca valores coletados para loja |
| 13.8 | SimuladorClientePage | Simulação de tarifas |

---

## ETAPA 14 — Portal do Entregador (`/entregador/*`)
**Arquivos:** `EntregadorDashboard.tsx`, `EntregadorSolicitacoesPage.tsx`, `EntregadorCorridasPage.tsx`, `EntregadorHistoricoPage.tsx`, `EntregadorFinanceiroPage.tsx`, `EntregadorPerfilPage.tsx`, `EntregadorCaixaPage.tsx`

| # | Critério (PRD) | Verificar |
|---|----------------|-----------|
| 14.1 | Dashboard com métricas dinâmicas | Corridas Hoje, Em Andamento, Comissão Mês |
| 14.2 | Solicitações atribuídas com ações | Iniciar, Concluir/Conciliar |
| 14.3 | Corridas com cards detalhados | Cliente, bairro, hora |
| 14.4 | Histórico de entregas | Filtro por período |
| 14.5 | Financeiro = extrato comissões | Apenas receita operacional |
| 14.6 | Privacidade: sem valores da loja | Não exibe crédito_loja |
| 14.7 | Perfil editável | Nome, telefone, veículo |
| 14.8 | Caixa do entregador | Controle de caixa |

---

## ETAPA 15 — Logs & Auditoria
**Arquivo:** `LogsPage.tsx`, `LogStore.tsx`

| # | Critério (PRD) | Verificar |
|---|----------------|-----------|
| 15.1 | Registro automático de ações | Solicitações, faturas, financeiro, clientes, entregadores, config |
| 15.2 | Busca e filtros | Categoria, data, texto |
| 15.3 | Exportação | CSV/PDF |
| 15.4 | Diff anterior/novo | `renderDiff` |

---

## ETAPA 16 — Notificações
**Arquivo:** `NotificationContext.tsx`

| # | Critério (PRD) | Verificar |
|---|----------------|-----------|
| 16.1 | Provider único | ProtectedAppShell ✅ |
| 16.2 | Contador unificado `unreadCount` | Sem duplicatas |
| 16.3 | Persistência localStorage | Sobrevive F5 |
| 16.4 | Eventos automáticos | Saldo baixo, nova fatura, atribuição |
| 16.5 | Badges sidebar dinâmicos | Calculados do store |

---

## ETAPA 17 — Caixas de Entregadores
**Arquivos:** `CaixasEntregadoresPage.tsx`, `AbrirCaixaDialog.tsx`, `FecharCaixaDialog.tsx`, `EditarCaixaDialog.tsx`, `CaixaDetailsModal.tsx`, `CaixasDoDiaTab.tsx`, `HistoricoCaixasTab.tsx`, `JustificativaDivergenciaDialog.tsx`

| # | Critério (PRD) | Verificar |
|---|----------------|-----------|
| 17.1 | Abrir/Fechar caixa | Dialogs funcionais |
| 17.2 | Detalhes do caixa | Modal com resumo |
| 17.3 | Histórico | Tab com registros anteriores |
| 17.4 | Justificativa de divergência | Dialog com motivo |

---

## ETAPA 18 — Landing Page & SEO
**Arquivos:** `Index.tsx`, `HeroSection.tsx`, `FeaturesSection.tsx`, `HowItWorksSection.tsx`, etc.

| # | Critério | Verificar |
|---|----------|-----------|
| 18.1 | Landing page completa | Hero, Features, How It Works, Stats, Segments, CTA, Footer |
| 18.2 | SEO básico | Title < 60 chars, meta desc, H1 único, alt text |
| 18.3 | Responsividade | Mobile + Desktop |

---

## Ordem de Execução da Auditoria

| Prioridade | Etapa | Complexidade | Risco |
|------------|-------|-------------|-------|
| 🔴 1 | **Etapa 5 — Solicitações** | Alta | Crítico (núcleo operacional) |
| 🔴 2 | **Etapa 9 — Faturas** | Alta | Crítico (financeiro) |
| 🔴 3 | **Etapa 12 — Configurações** | Alta | Crítico (base de tudo) |
| 🟡 4 | **Etapa 1 — Autenticação** | Média | Alto |
| 🟡 5 | **Etapa 4 — Dashboard** | Média | Médio |
| 🟡 6 | **Etapa 6 — Clientes** | Média | Alto |
| 🟡 7 | **Etapa 7 — Entregadores** | Média | Médio |
| 🟡 8 | **Etapa 10 — Financeiro** | Média | Alto |
| 🟡 9 | **Etapa 11 — Relatórios** | Média | Médio |
| 🟢 10 | **Etapa 13 — Portal Cliente** | Média | Alto |
| 🟢 11 | **Etapa 14 — Portal Entregador** | Média | Alto |
| 🟢 12 | **Etapa 2 — Shell & Navegação** | Baixa | Baixo |
| 🟢 13 | **Etapa 3 — Componentes** | Baixa | Baixo |
| 🟢 14 | **Etapa 15-18** | Baixa | Baixo |

---

## Metodologia por Etapa

Para cada etapa:
1. **Ler os arquivos** relevantes
2. **Comparar** com os critérios do PRD
3. **Classificar** cada item: ✅ OK | ⚠️ Parcial | ❌ Faltando | 🐛 Bug
4. **Documentar** gaps com descrição e severidade
5. **Gerar relatório** com lista de correções priorizadas

---

## Status

| Etapa | Status | Última Verificação |
|-------|--------|--------------------|
| 1. Auth | ⏳ Pendente | — |
| 2. Shell | ⏳ Pendente | — |
| 3. Componentes | ⏳ Pendente | — |
| 4. Dashboard | ⏳ Pendente | — |
| 5. Solicitações | ⏳ Pendente | — |
| 6. Clientes | ⏳ Pendente | — |
| 7. Entregadores | ⏳ Pendente | — |
| 8. Entregas | ⏳ Pendente | — |
| 9. Faturas | ⏳ Pendente | — |
| 10. Financeiro | ⏳ Pendente | — |
| 11. Relatórios | ⏳ Pendente | — |
| 12. Configurações | ⏳ Pendente | — |
| 13. Portal Cliente | ⏳ Pendente | — |
| 14. Portal Entregador | ⏳ Pendente | — |
| 15. Logs | ⏳ Pendente | — |
| 16. Notificações | ⏳ Pendente | — |
| 17. Caixas | ⏳ Pendente | — |
| 18. Landing/SEO | ⏳ Pendente | — |

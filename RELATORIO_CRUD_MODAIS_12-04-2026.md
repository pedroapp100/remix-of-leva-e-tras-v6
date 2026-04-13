# Relatório Completo — CRUDs e Modais por Área (12/04/2026)

## Status de ativação dos 10 cenários de perfil

Suíte criada: `e2e/roles-cliente-entregador.spec.ts` (10 cenários)

- Cliente: 5 cenários
- Entregador: 5 cenários

Execução atual:
- `npx playwright test e2e/roles-cliente-entregador.spec.ts --reporter=list` → **10/10 passando**
- Contas ativadas e corrigidas no Supabase via MCP.

Variáveis necessárias:
- `E2E_CLIENTE_EMAIL`
- `E2E_CLIENTE_PASSWORD`
- `E2E_ENTREGADOR_EMAIL`
- `E2E_ENTREGADOR_PASSWORD`

Observação: o pipeline principal terminou estável e totalmente verde (`npm run test:e2e` → **63/63 passando**).

---

## Resumo executivo

- Admin concentra o CRUD mais completo do sistema.
- Cliente e Entregador têm foco majoritário em leitura e atualização de perfil/estado operacional (não CRUD completo por regra de negócio).
- Modais críticos de operação estão bem distribuídos em Solicitações, Configurações e Caixas.
- Após a migração P1, **não há acesso direto ao Supabase nas páginas de `settings`** (uso centralizado em `services` + `hooks`).

---

## Matriz por área — CRUD + modais

| Área | Tela | CRUD | Modais/Dialogs | Evidência | Observações |
|---|---|---|---|---|---|
| Admin | `SolicitacoesPage` | C/R/U (D lógico via status) | `LaunchSolicitacaoDialog`, `ViewSolicitacaoDialog`, `AssignDriverDialog`, `ConciliacaoDialog`, `AdminConciliacaoDialog`, `JustificationDialog` | `src/pages/admin/SolicitacoesPage.tsx` + `src/pages/admin/solicitacoes/*` | Fluxo rico com confirmação/justificativa em ações sensíveis |
| Admin | `ClientesPage` | C/R/U/D | `ClientFormDialog`, `ClientProfileModal`, `RecargaSaldoDialog` | `src/pages/admin/ClientesPage.tsx`, `src/pages/admin/clientes/*` | CRUD completo + ações financeiras |
| Admin | `EntregadoresPage` | C/R/U/D | `EntregadorFormDialog` (inline/sections) | `src/pages/admin/EntregadoresPage.tsx` | CRUD operacional completo |
| Admin | `FaturasPage` | R/U parcial | `FaturaDetailsModal`, `RegistrarPagamentoDialog` | `src/pages/admin/FaturasPage.tsx`, `src/pages/admin/faturas/*` | Não é CRUD clássico; foco em gestão e conciliação |
| Admin | `FinanceiroPage` | C/R/U/D (despesas/receitas) | `NovaDespesaDialog`, `NovaReceitaDialog` | `src/pages/admin/FinanceiroPage.tsx`, `src/pages/admin/financeiro/*` | CRUD por abas com recorrência |
| Admin | `CaixasEntregadoresPage` | C/R/U (D não aplicável) | `AbrirCaixaDialog`, `FecharCaixaDialog`, `EditarCaixaDialog`, `JustificativaDivergenciaDialog`, `CaixaDetailsModal` | `src/pages/admin/CaixasEntregadoresPage.tsx`, `src/pages/admin/caixas/*` | Fluxo de caixa com auditoria de divergência |
| Configurações | `RegioesTab` | C/R/U/D | Dialog create/edit + `ConfirmDialog` | `src/pages/admin/settings/RegioesTab.tsx` | Migração P1 concluída (hook/service) |
| Configurações | `BairrosTab` | C/R/U/D | Dialog create/edit + `ConfirmDialog` | `src/pages/admin/settings/BairrosTab.tsx` | Inclui import em lote |
| Configurações | `FormasPagamentoTab` | C/R/U (D não exposto) | Dialog create/edit | `src/pages/admin/settings/FormasPagamentoTab.tsx` | Migração P1 concluída |
| Configurações | `TiposOperacaoTab` | C/R/U/D | Dialog create/edit + `ConfirmDialog` | `src/pages/admin/settings/TiposOperacaoTab.tsx` | Migração P1 concluída |
| Configurações | `TaxasExtrasTab` | C/R/U/D | Dialog create/edit + `ConfirmDialog` | `src/pages/admin/settings/TaxasExtrasTab.tsx` | Migração P1 concluída |
| Configurações | `TabelaPrecosTab` | C/R/U/D | Dialog create/edit + `ConfirmDialog` | `src/pages/admin/settings/TabelaPrecosTab.tsx` | CRUD completo com priorização |
| Configurações | `CargosTab` | C/R/U/D | Dialog create/edit + `ConfirmDialog` | `src/pages/admin/settings/CargosTab.tsx` | Controle de permissões |
| Configurações | `UsuariosTab` | C/R/U/D lógico (desativação) | Dialog create/edit + confirmação | `src/pages/admin/settings/UsuariosTab.tsx` | Gestão de usuários/admin |
| Configurações | `IntegracoesTab` | C/R/U/D | Dialog de criação + dialog de configuração + confirmação de exclusão | `src/pages/admin/settings/IntegracoesTab.tsx` | Migração P1 concluída |
| Configurações | `NotificacoesTab` | C/R/U/D | Dialog de edição, preview, criação, envio teste, histórico | `src/pages/admin/settings/NotificacoesTab.tsx` | Migração P1 concluída |
| Configurações | `WebhooksTab` | C/R/U/D | Dialog create/edit + `ConfirmDialog` | `src/pages/admin/settings/WebhooksTab.tsx` | Migração P1 concluída |
| Cliente | `MinhasSolicitacoesPage` | R | `ViewSolicitacaoDialog` | `src/pages/cliente/MinhasSolicitacoesPage.tsx` | Sem C/U/D por regra atual |
| Cliente | `ClienteFinanceiroPage` / `PrePagoFinanceiroView` | R | Sem modal principal | `src/pages/cliente/ClienteFinanceiroPage.tsx`, `src/pages/cliente/PrePagoFinanceiroView.tsx` | Financeiro informativo |
| Cliente | `ClientePerfilPage` | R/U | Formulário inline (sem modal) | `src/pages/cliente/ClientePerfilPage.tsx` | Edição de perfil própria |
| Entregador | `EntregadorSolicitacoesPage` | R/U de status | `ViewSolicitacaoDialog`, `ConciliacaoDialog` | `src/pages/entregador/EntregadorSolicitacoesPage.tsx` | Aceitar/iniciar/concluir corridas |
| Entregador | `EntregadorHistoricoPage` | R | `ViewSolicitacaoDialog` | `src/pages/entregador/EntregadorHistoricoPage.tsx` | Histórico com filtros |
| Entregador | `EntregadorFinanceiroPage` | R | Sem modal principal | `src/pages/entregador/EntregadorFinanceiroPage.tsx` | Comissão/extrato |
| Entregador | `EntregadorCaixaPage` | R | `CaixaDetailsModal` | `src/pages/entregador/EntregadorCaixaPage.tsx` | Visão de caixa e recebimentos |
| Entregador | `EntregadorPerfilPage` | R/U | Formulário inline (sem modal) | `src/pages/entregador/EntregadorPerfilPage.tsx` | Atualização de dados pessoais |

---

## Verificação técnica de acesso a dados (settings)

Consulta realizada:
- busca por `supabase.from|supabase.rpc|supabase.functions.invoke` em `src/pages/admin/settings/**/*.tsx`

Resultado:
- **Nenhuma ocorrência encontrada** ✅

Conclusão:
- Configurações estão padronizadas em camada de serviço/hook (`src/services/settings.ts` + `src/hooks/useSettings.ts`).

---

## Gaps e prioridades

### P0
1. ✅ Ativar credenciais reais de Cliente/Entregador no `.env.e2e` e validar contas no Supabase.

### P1
2. Expandir cenários de perfil para ações de negócio profundas (ex.: atualização de perfil com assert de persistência e fluxo completo de solicitação por role, quando aplicável).
3. Consolidar critérios de confirmação para todas as operações destrutivas em telas menos críticas.

### P2
4. Cobrir estados de erro de integração (timeout/falha de API externa) em E2E direcionado por mocks/fixtures.

---

## Evidência de validação atual

- `npm test` → **43/43 passando**
- `npm run test:e2e` → **63/63 passando**
- As credenciais de Cliente e Entregador foram ativadas no `.env.e2e`.
- As contas de perfil foram validadas/corrigidas no Supabase via MCP.
- A suíte `e2e/roles-cliente-entregador.spec.ts` está executando normalmente com **10/10 passando**.


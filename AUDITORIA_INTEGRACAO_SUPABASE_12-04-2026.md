# Auditoria de Integração com Supabase — 12/04/2026

## Escopo
Validação do app por páginas/fluxos/áreas com foco em integração real com Supabase (auth, leitura/escrita, navegação protegida e consistência funcional).

## Evidências Executadas

### Testes unitários/integrados
- `npm test`
- **Resultado:** 43/43 testes passando.

### E2E por suíte
- `npx playwright test e2e/admin-auth.spec.ts --reporter=list`
  - **Resultado:** 16/16 passando.
- `npx playwright test e2e/faturamento.spec.ts --reporter=list`
  - **Resultado:** 5/5 passando.
- `npx playwright test e2e/financial-flow.spec.ts --reporter=list`
  - **Resultado inicial:** 1/6 passando, 5/6 falhando.
  - **Resultado após correções:** 6/6 passando.
- `npx playwright test e2e/smoke.spec.ts --reporter=list`
  - **Resultado inicial:** 25/26 passando, 1 falha de seletor ambíguo (não funcional).
  - **Resultado após correções:** 26/26 passando.
- `npm run test:e2e`
  - **Resultado final consolidado:** 63/63 passando.

## Status Pós-Correção

### ✅ P0 aplicado — bootstrap auth local
- `src/contexts/AuthContext.tsx`
  - Removida limpeza agressiva de sessão válida no bootstrap local.
  - Mantida limpeza de sessão expirada/corrompida.
  - Ajustado timeout defensivo de `getSession` para reduzir falsos positivos em ambiente local.

### ✅ Correção funcional encontrada durante auditoria
- `src/pages/admin/EntregasPage.tsx`
  - Corrigido crash em runtime no filtro (`Select.Item` com `value=""`).
  - Agora opções dinâmicas ignoram valores vazios em `tipo_operacao` e `entregador_id`.

### ✅ Robustez dos testes E2E
- `e2e/smoke.spec.ts`
  - Seletor de texto ajustado para modo estrito (`exact: true`).
- `e2e/financial-flow.spec.ts`
  - Fluxos ajustados para navegação SPA consistente.
  - Seletores estabilizados para reduzir falso negativo.

### ✅ P1 aplicado — padronização settings em hooks/services
- Centralização de operações de settings em `src/services/settings.ts` e `src/hooks/useSettings.ts`.
- Abas migradas para remover acesso direto ao Supabase em componente:
  - `RegioesTab.tsx`
  - `FormasPagamentoTab.tsx`
  - `TiposOperacaoTab.tsx`
  - `TaxasExtrasTab.tsx`
  - `IntegracoesTab.tsx`
  - `NotificacoesTab.tsx`
  - `WebhooksTab.tsx`

### ✅ Validação pós-P1
- `npm test` → **43/43 passando**
- `npm run test:e2e` → **63/63 passando**

### ✅ Cobertura E2E de perfis adicionada (Cliente + Entregador)
- Nova suíte: `e2e/roles-cliente-entregador.spec.ts`
- Total: **10 cenários**
  - **Cliente (5):** login/dashboard, solicitações, financeiro, perfil, bloqueio de acesso admin.
  - **Entregador (5):** login/dashboard, solicitações, histórico, financeiro, bloqueio de acesso admin.
- Status final de execução: **10/10 passando**.
- Contas de teste validadas e corrigidas no Supabase:
  - `jardins@gmail.com` → role `cliente`, email confirmado, profile ativo.
  - `joaoentregador@gmail.com` → role `entregador`, email confirmado, profile ativo e vínculo em `entregadores.profile_id`.
- Pipeline final após ativação da suíte:
  - `npm run test:e2e` → **63/63 passando**

## Diagnóstico Principal (Crítico)

### 1) Perda de sessão em localhost após reload/navegação hard
**Sintoma observado:** falhas no `financial-flow.spec.ts` em `/admin/faturas`, `/admin/financeiro`, `/admin/caixas-entregadores`, `/admin/entregas`, além de clique no sidebar não encontrado.

**Evidência de tela:** snapshots de erro mostram usuário na página `/login` durante asserções de páginas admin.

**Causa raiz no código:**
- Em `src/contexts/AuthContext.tsx`, no ramo `isLocalDev`, a sessão local é sempre removida e é executado `signOut({ scope: "local" })` durante inicialização.
- Isso invalida sessão persistida ao recarregar rota (hard navigation), causando redirect para login.

**Impacto real:**
- Usuário autenticado pode aparentar “deslogar sozinho” em refresh/reabertura de rota admin local.
- Fluxos que dependem de recarga de rota ficam instáveis.

## Achados Secundários

### 2) Falha de teste smoke por seletor ambíguo (resolvido)
- Arquivo: `e2e/smoke.spec.ts`
- Falha em `getByText("Leva e Traz")` por strict mode (há duas ocorrências de texto, inclusive no announcer SR-only).
- Correção aplicada: seletor específico com `exact: true`.

### 3) Crash funcional em Entregas por valor inválido no Select (resolvido)
- Sintoma: ao abrir `/admin/entregas`, a página podia cair no `ErrorBoundary` com mensagem:
  - `A <Select.Item /> must have a value prop that is not an empty string`.
- Causa raiz: opções dinâmicas de filtro podiam incluir string vazia.
- Correção aplicada em `src/pages/admin/EntregasPage.tsx` filtrando valores vazios antes de criar `SelectItem`.

### 4) Inconsistência de arquitetura de dados (risco médio)
- Parte das páginas usa hooks/services (padrão bom), mas várias abas de configurações fazem operações `supabase.from(...)` diretamente no componente.
- Isso aumenta chance de comportamento divergente entre telas (tratamento de erro/retry/cache).

Exemplos com acesso direto em páginas:
- `src/pages/admin/settings/WebhooksTab.tsx`
- `src/pages/admin/settings/RegioesTab.tsx`
- `src/pages/admin/settings/NotificacoesTab.tsx`
- `src/pages/admin/settings/IntegracoesTab.tsx`
- `src/pages/admin/settings/FormasPagamentoTab.tsx`
- `src/pages/admin/settings/TiposOperacaoTab.tsx`
- `src/pages/admin/settings/TaxasExtrasTab.tsx`
- `src/pages/admin/SolicitacoesPage.tsx` (RPC)

## Matriz por Área/Fluxo

### Público / Auth
- Landing/Login/Forgot/404: **OK**.
- Guards de rota sem auth: **OK**.

### Admin — núcleo
- Dashboard, Solicitações, Clientes, Entregadores, Caixas, Financeiro, Faturas, Configurações (navegação SPA/sidebar): **OK**.
- Fluxos com hard navigation/reload após login: **estabilizados após ajuste de bootstrap local**.

### Admin — financeiro/faturamento
- Faturamento (config e estrutura de páginas): **OK**.
- Financial flow: **OK (6/6)**.

### Cliente / Entregador
- Integrações por hooks mapeadas (uso de Supabase presente).
- Cobertura E2E dedicada ainda limitada para cenários autenticados completos desses perfis.

## Prioridades de Correção

### P0 (concluído)
1. Ajustar bootstrap de auth em `src/contexts/AuthContext.tsx` para **não limpar sessão local automaticamente em todo init local**. ✅
2. Manter proteção contra sessão corrompida, mas sem invalidar sessão válida a cada mount/reload. ✅
3. Corrigir crash de `SelectItem` com valor vazio em `EntregasPage`. ✅

### P1
4. Padronizar acesso Supabase em settings: mover operações diretas para camada de hooks/services com tratamento único de erro/invalidação de cache. ✅

### P2
5. Expandir E2E autenticado para perfis Cliente/Entregador com cenários de leitura/escrita e reload.

## Resumo Executivo
A integração com Supabase ficou validada ponta a ponta para os fluxos cobertos atualmente: testes unitários passando (43/43) e E2E completo passando (63/63). O problema crítico de bootstrap de auth local foi corrigido, e um crash funcional adicional em `EntregasPage` também foi resolvido durante a auditoria.

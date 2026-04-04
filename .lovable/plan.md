# Plano de Correção — Sistema de Notificações

## Bug 1: Listener duplicado de saldo baixo
**Arquivo:** `SolicitacoesPage.tsx`  
**Problema:** O evento `saldo-baixo-pre-pago` é capturado tanto no `NotificationContext` (global) quanto no `SolicitacoesPage` (local), gerando notificação duplicada.  
**Correção:** Remover o `useEffect` com `addEventListener('saldo-baixo-pre-pago')` do `SolicitacoesPage.tsx`.

## Bug 2: Contadores inconsistentes (totalUnread vs unreadCount)
**Arquivos:** `NotificationContext.tsx`, `AppHeader.tsx`, `AdminSidebar.tsx`  
**Problema:** Existem dois contadores paralelos — `totalUnread` (soma de badges mock estáticos) e `unreadCount` (contagem real de notificações não lidas). Header usa um, sidebar usa outro.  
**Correção:**
- Remover `NotificationBadges`, `badges`, `setBadges`, `totalUnread` do contexto
- Usar apenas `unreadCount` em todos os consumidores
- Atualizar `AppHeader` e `AdminSidebar`

## Bug 3: Badges da sidebar são mocks estáticos
**Arquivo:** `AdminSidebar.tsx`  
**Problema:** Os badges (ex: "Solicitações: 12") são valores hardcoded em `MOCK_BADGES`.  
**Correção:**
- Importar `useGlobalStore` na sidebar
- Calcular `solicitacoesPendentes` = `solicitacoes.filter(s => s.status === 'pendente').length`
- Calcular `faturasVencidas` a partir das faturas com status vencido
- Remover `MOCK_BADGES` do contexto

## Bug 4: NotificationProvider triplicado
**Arquivos:** `AdminLayout.tsx`, `ClientLayout.tsx`, `DriverLayout.tsx`  
**Problema:** Cada layout wrapa com seu próprio `NotificationProvider`, criando instâncias isoladas.  
**Correção:**
- Mover `NotificationProvider` para `ProtectedAppShell.tsx` (acima de todos os layouts)
- Remover dos 3 layouts individuais

## Bug 5: Notificações perdidas no refresh
**Arquivo:** `NotificationContext.tsx`  
**Problema:** Estado é `useState` em memória. F5 reseta para mocks.  
**Correção:**
- Inicializar `notifications` a partir de `localStorage` (fallback para mocks)
- Persistir a cada mudança com `useEffect`
- Chave: `leva-traz-notifications`

## Bug 6: Notificações automáticas faltantes
**Arquivos:** `SolicitacoesPage.tsx`, `EntregadorCorridasPage.tsx`, `GlobalStore.tsx`  
**Problema:** Apenas saldo baixo dispara notificação automática. Eventos como atribuição de entregador e geração de fatura não geram notificação no painel.  
**Correção:**
- Verificar que `handleAssign`, `handleTransfer` e `concluirSolicitacaoComFatura` disparam `addNotification`
- Adicionar evento custom para nova fatura gerada

## Ordem de Execução
1. **Bug 4** (unificar provider) — pré-requisito para tudo
2. **Bug 1** (remover duplicado) — fix rápido
3. **Bug 2 + 3** (contadores + badges dinâmicos) — juntos
4. **Bug 5** (persistência localStorage)
5. **Bug 6** (notificações automáticas)

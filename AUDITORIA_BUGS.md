# Auditoria de Bugs — Leva e Traz

## ✅ STATUS FINAL — 16/04/2026

**TODOS OS 3 BUGS ESTÃO RESOLVIDOS.** Suite E2E: **65/65 passando** (16/04/2026).

> Este documento estava desatualizado. As correções foram aplicadas em commits anteriores
> (Fix #9, Fix #12, Fix #13 — ver CORREÇÕES_E_FIXES.md). A auditoria abaixo é histórica.

## Resumo dos Problemas Reportados
1. **Login falha intermitentemente em localhost** → ✅ RESOLVIDO (Fix #13)
2. **Sidebar não funciona (não fecha no mobile, cliques não respondem)** → ✅ RESOLVIDO (já corrigido)
3. **Aba de Notificações fecha ao interagir** → ✅ RESOLVIDO (stopPropagation já presente)

---

---

## 🔴 PROBLEMA 1: Login Intermitente em Localhost

### Causa Raiz
Race condition na inicialização da sessão em `AuthContext.tsx`.

### Detalhes

**1.1 — Safety timeout de 4s compete com getSession()**
- Arquivo: `src/contexts/AuthContext.tsx` (linhas 107-131)
- O `safetyTimer` força `isReady=true` após 4 segundos
- Se o Supabase demora mais de 4s (rede lenta, cold start), `getSession()` retorna *depois* que isReady já é `true`
- O callback verifica `if (!mounted || isReady) return;` — e descarta a sessão válida!
- **Resultado**: usuário tem sessão válida mas o app renderiza como "deslogado"

**1.2 — `getSession()` e `onAuthStateChange` competem**
- Ambos rodam em paralelo dentro do mesmo `useEffect`
- `INITIAL_SESSION` no listener é ignorado (`return;`) pois é "handled by getSession"
- Mas se `getSession()` já terminou e setou `isReady=true`, o `SIGNED_IN` do listener tenta setar o user novamente, causando re-renders desnecessários

**1.3 — `profileToAuthUser` não diferencia erro de inatividade**
- Se a query ao banco falha (timeout, rede), retorna `null` — igual a usuário inativo
- O login trata `null` como "conta inativa" e faz `signOut()`, deslogando um usuário válido
- Mensagem exibida: "Conta inativa" quando na verdade foi erro de rede

### Correções Necessárias

```
Arquivo: src/contexts/AuthContext.tsx

FIX 1.1 — Remover race condition do safety timer vs getSession:
- O getSession deve cancelar o safety timer quando completar
- O safety timer NÃO deve ignorar sessão que chega depois

FIX 1.2 — profileToAuthUser deve retornar motivo da falha:
- Retornar { user: null, reason: "db_error" | "inactive" | "invalid_role" }
- Login deve exibir mensagem correta para cada caso

FIX 1.3 — changeCargo tem leak de state update sem mounted check:
- O .then() dentro de setUser pode rodar após unmount
```

---

## 🔴 PROBLEMA 2: Sidebar Não Funciona (Mobile)

### Causa Raiz
Combinação de: `useIsMobile()` retorna `false` no primeiro render + `NavLink` dentro de `SidebarMenuButton asChild` gera conflito de click handlers.

### Detalhes

**2.1 — `useIsMobile()` retorna `false` antes do useEffect rodar**
- Arquivo: `src/hooks/use-mobile.tsx`
- Estado inicial: `undefined` → `!!undefined` = `false`
- No primeiro render, `isMobile` é sempre `false`, mesmo em celular
- O Sidebar renderiza layout desktop, depois "pula" para mobile
- O `handleNavClick` verifica `if (isMobile)` que é `false` no primeiro render

**2.2 — `handleNavClick` pode não executar com `asChild`**
- Arquivos: `AdminSidebar.tsx`, `ClientLayout.tsx`, `DriverLayout.tsx`
- `SidebarMenuButton asChild` usa o componente Radix `Slot`
- O `Slot` faz merge dos props do pai com o filho
- O `onClick` do `NavLink` pode ser sobrescrito pelo merge do `Slot`
- A navegação do React Router pode completar antes do `setOpenMobile(false)`

**2.3 — Botão "Sair" não fecha a sidebar mobile**
- `onClick={logout}` não chama `setOpenMobile(false)`
- Na versão mobile, o Sheet fica aberto após logout

**2.4 — Sheet tem botão de fechar escondido**
- CSS: `[&>button]:hidden` esconde o botão X do Sheet
- Sem botão de fechar visível no mobile

### Correções Necessárias

```
Arquivo: src/hooks/use-mobile.tsx
FIX 2.1 — Inicializar com valor real via SSR-safe check:
- useState(() => window.matchMedia(...).matches) ou typeof window !== 'undefined'

Arquivos: AdminSidebar.tsx, ClientLayout.tsx, DriverLayout.tsx
FIX 2.2 — handleNavClick deve ser mais robusto:
- Usar onClick no SidebarMenuButton (não no NavLink) OU
- Usar useEffect com location.pathname para fechar o sidebar quando a rota muda

FIX 2.3 — Logout deve fechar sidebar primeiro:
- const handleLogout = () => { setOpenMobile(false); logout(); }
```

---

## 🔴 PROBLEMA 3: Notificações — Aba Fecha ao Clicar

### Causa Raiz
Botões dentro do `DropdownMenuContent` são `<button>` nativos sem `stopPropagation`, causando fechamento do dropdown pelo Radix UI.

### Detalhes

**3.1 — Clique na notificação fecha o dropdown**
- Arquivo: `src/components/layouts/AppHeader.tsx` (linhas 152-158)
- O `<button onClick>` dentro de `DropdownMenuContent` propaga o evento
- Radix UI interpreta o clique como "fora do trigger" e fecha o menu
- `markAsRead()` atualiza state → causa re-render → dropdown perde referência

**3.2 — "Marcar todas" também fecha**
- Arquivo: `src/components/layouts/AppHeader.tsx` (linha 131)
- Mesmo problema: `<button onClick={markAllAsRead}>` sem `stopPropagation`

**3.3 — Deveria usar `DropdownMenuItem` ao invés de `<button>`**
- Os itens de notificação usam `<button>` puro, não `<DropdownMenuItem>`
- `DropdownMenuItem` do Radix tem gerenciamento de foco e eventos internos
- Nota: `DropdownMenuItem` fecha o menu por padrão ao clicar — para manter aberto, usar `onSelect={(e) => e.preventDefault()}`

### Correções Necessárias

```
Arquivo: src/components/layouts/AppHeader.tsx

FIX 3.1 — Adicionar e.stopPropagation() + e.preventDefault() nos botões:
- Botão de notificação individual: onClick={(e) => { e.stopPropagation(); markAsRead(...) }}
- Botão "Marcar todas": onClick={(e) => { e.stopPropagation(); markAllAsRead() }}

FIX 3.2 — Ou usar DropdownMenuItem com onSelect preventivo:
- <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => markAsRead(...)}>
```

---

## 📋 Plano de Correção (Prioridade)

| # | Fix | Arquivo | Severidade | Impacto |
|---|-----|---------|-----------|---------|
| 1 | useIsMobile inicializar corretamente | `use-mobile.tsx` | CRÍTICO | Sidebar + layout mobile |
| 2 | Fechar sidebar na mudança de rota | `AdminSidebar.tsx`, `ClientLayout.tsx`, `DriverLayout.tsx` | CRÍTICO | Sidebar presa no mobile |
| 3 | stopPropagation nas notificações | `AppHeader.tsx` | CRÍTICO | Dropdown fecha sozinho |
| 4 | Race condition auth getSession | `AuthContext.tsx` | ALTO | Login intermitente |
| 5 | profileToAuthUser retornar razão | `AuthContext.tsx` | MÉDIO | Mensagem errada no login |
| 6 | Logout fechar sidebar mobile | `AdminSidebar.tsx`, `ClientLayout.tsx`, `DriverLayout.tsx` | MÉDIO | UX ruim |
| 7 | changeCargo mounted check | `AuthContext.tsx` | BAIXO | Warning no console |

---

## ✅ Para Aplicar as Correções

Confirme e eu aplico todas as correções listadas acima nos respectivos arquivos.

# Leva e Traz — Gestão Logística

Plataforma completa de gestão logística para operações de entrega last-mile.

## ⚠️ Ressalvas

- **Tipografia:** Fonte alterada de Geist Sans/Mono para **Poppins**. Sem variante monospaced — usa mono do sistema.
- **Autenticação Mock:** Login usa dados mockados no frontend. Integração real ao ativar Lovable Cloud.
- **Páginas Placeholder:** Rotas do admin/cliente/entregador exibem páginas placeholder até implementação nas próximas etapas.

## Changelog

### Etapa 1 — Fundação & Design System
- Design system Matte Ceramic (Deep Charcoal + Spring Blue)
- Tipos TypeScript (`src/types/database.ts`)
- Formatadores BR (`src/lib/formatters.ts`)
- Landing page com framer-motion

### Etapa 2 — Autenticação (Frontend Mock)
- `AuthContext` com mock users, rate limiting, erros PT-BR
- `ProtectedRoute` por roles
- `usePermissions` hook
- Login, ForgotPassword, ResetPassword pages

### Etapa 3 — Shell & Navegação

#### Arquivos criados
- `src/contexts/ThemeProvider.tsx` — Dark/light/system com persistência localStorage
- `src/contexts/NotificationContext.tsx` — Badges de notificação por módulo (mock)
- `src/components/layouts/AdminSidebar.tsx` — Sidebar admin com 9 itens e badges
- `src/components/layouts/AppHeader.tsx` — Header com avatar, notificações, theme toggle, logout
- `src/components/layouts/AdminLayout.tsx` — Layout admin (sidebar + header + outlet)
- `src/components/layouts/ClientLayout.tsx` — Layout cliente (4 itens)
- `src/components/layouts/DriverLayout.tsx` — Layout entregador (4 itens)
- `src/pages/admin/Dashboard.tsx` — Dashboard placeholder
- `src/pages/PlaceholderPage.tsx` — Página placeholder genérica

#### Arquivos modificados
- `src/App.tsx` — Rotas aninhadas com layouts por role, ThemeProvider

#### Funcionalidades
- ✅ AdminLayout com sidebar 9 itens + badges (pendentes laranja, vencidas vermelho)
- ✅ ClientLayout com sidebar 4 itens
- ✅ DriverLayout com sidebar 4 itens
- ✅ AppHeader com avatar, sino de notificações, theme toggle (dark/light/system), logout
- ✅ ThemeProvider com persistência em localStorage
- ✅ NotificationContext com badges mock
- ✅ Sidebar collapsible (modo ícone)
- ✅ Rotas protegidas por role com redirect automático
- ✅ Navegação ativa destacada

## Credenciais de teste (mock)

| Email | Senha | Role | Rota |
|-------|-------|------|------|
| admin@levaetraz.com | admin123 | admin | /admin |
| cliente@levaetraz.com | cliente123 | cliente | /cliente |
| entregador@levaetraz.com | entregador123 | entregador | /entregador |

## Rotas

| Rota | Layout | Acesso |
|------|--------|--------|
| `/` | Landing | Público |
| `/login` | — | Público |
| `/login/reset` | — | Público |
| `/reset-password` | — | Público |
| `/admin/*` | AdminLayout | admin |
| `/cliente/*` | ClientLayout | cliente |
| `/entregador/*` | DriverLayout | entregador |

## Stack

React + Vite + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion + Zod

## Como rodar

```bash
npm install
npm run dev
```

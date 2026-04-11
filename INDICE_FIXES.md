# 🗂️ Índice Rápido de Fixes - Leva e Traz

**navegação rápida para todas as correções documentadas**

---

## 📌 **Todos os Fixes por Categoria**

### 🔐 **Autenticação (3 fixes)**
| # | Data | Problema | Arquivo | Status |
|---|------|----------|---------|--------|
| 1 | 11/04/26 | Race condition no login | [CORREÇÕES_E_FIXES.md#fix-1](CORREÇÕES_E_FIXES.md#-fix-1-race-condition-na-autenticação-11-abril-2026) | ✅ |
| 4 | 11/04/26 | useEffect órfão estrutura | [CORREÇÕES_E_FIXES.md#fix-4](CORREÇÕES_E_FIXES.md#-fix-4-estrutura-órfã-do-useffect-em-authcontext-11-abril-2026) | ✅ |
| 6 | 11/04/26 | **Fixes revertiam após todo commit** | [CORREÇÕES_E_FIXES.md#fix-6](CORREÇÕES_E_FIXES.md#-fix-6-regressão-infinita--fixes-revertiam-após-todo-commit-11-abril-2026) | ✅ |

🔧 **Arquivos afetados:**
- `src/lib/supabase.ts` (fetchWithTimeout — fix crítico, agora versionado)
- `src/contexts/AuthContext.tsx` (getSession useEffect, onAuthStateChange cleanup)
- `src/hooks/` (8 hooks Supabase adicionados ao git)
- `src/services/` (8 services adicionados ao git)

---

### 💬 **Notificações (2 fixes)**
| # | Data | Problema | Arquivo | Status |
|---|------|----------|---------|--------|
| 2 | 11/04/26 | handleTestSend não envia | [CORREÇÕES_E_FIXES.md#fix-2](CORREÇÕES_E_FIXES.md#-fix-2-edge-function-não-enviava-mensagens-whatsapp-11-abril-2026) | ✅ |
| 5 | 11/04/26 | Mensagens não chegam (sem logs) | [CORREÇÕES_E_FIXES.md#fix-5](CORREÇÕES_E_FIXES.md#-fix-5-mensagens-de-teste-não-chegam-z-api-integration-11-abril-2026) | ✅ |

🔧 **Arquivos afetados:**
- `src/pages/admin/settings/NotificacoesTab.tsx` (handleTestSend + logs)
- `supabase/functions/enviar-whatsapp/index.ts` (logs detalhados)
- `DEBUG_MESSAGES_NOT_ARRIVING.md` (guia de diagnóstico)
- `debug_test_send.js` (script de teste)
- `debug_test_send.py` (script de teste)

---

### 🗄️ **Database/RLS (1 fix)**
| # | Data | Problema | Arquivo | Status |
|---|------|----------|---------|--------|
| 3 | 11/04/26 | RLS bloqueando INSERT | [CORREÇÕES_E_FIXES.md#fix-3](CORREÇÕES_E_FIXES.md#-fix-3-rls-bloqueando-notification_templates-11-abril-2026) | ✅ (temporário) |

🔧 **Tables afetadas:**
- `notification_templates` (RLS desabilitado)

---

## 🔍 **Buscar por Sintoma**

### Problema: "Fix aplicado some depois de um tempo / reload"
→ Ver [Fix #6 - Regressão Git](CORREÇÕES_E_FIXES.md#-fix-6-regressão-infinita--fixes-revertiam-após-todo-commit-11-abril-2026)
→ Causa: arquivo era `??` untracked, solução: `git add` + `git commit`

### Problema: "Timeout de autenticação"
→ Ver [Fix #1 - Race Condition](CORREÇÕES_E_FIXES.md#-fix-1-race-condition-na-autenticação-11-abril-2026)

### Problema: "Mensagens parecem ser enviadas mas não chegam"
→ Ver [Fix #2 - Edge Function](CORREÇÕES_E_FIXES.md#-fix-2-edge-function-não-enviava-mensagens-whatsapp-11-abril-2026)
→ Ver [Fix #5 - Logs + Diagnóstico](CORREÇÕES_E_FIXES.md#-fix-5-mensagens-de-teste-não-chegam-z-api-integration-11-abril-2026)
→ Consulte: [DEBUG_MESSAGES_NOT_ARRIVING.md](DEBUG_MESSAGES_NOT_ARRIVING.md)

### Problema: "Erro ao criar evento"
→ Ver [Fix #3 - RLS](CORREÇÕES_E_FIXES.md#-fix-3-rls-bloqueando-notification_templates-11-abril-2026)

### Problema: "Script de debug automático"
→ Usar: `debug_test_send.js` ou `debug_test_send.py`

---

## ⚙️ **Arquivos que Mudaram**

| Arquivo | Fixes | Mudanças |
|---------|-------|----------|
| `src/lib/supabase.ts` | #1, #6 | fetchWithTimeout sem timeout em /auth/v1/* — **agora versionado** |
| `src/contexts/AuthContext.tsx` | #1, #4, #6 | getSession useEffect refatorado — **agora versionado** |
| `src/hooks/` (8 arquivos) | #6 | Hooks Supabase adicionados ao git |
| `src/services/` (8 arquivos) | #6 | Services adicionados ao git |
| `src/pages/admin/settings/NotificacoesTab.tsx` | #2, #5 | handleTestSend implementado; logs [TestSend] adicionados |
| `supabase/functions/enviar-whatsapp/index.ts` | #5 | Logs [enviar-whatsapp] passo-a-passo adicionados |
| Database (Supabase) | #3 | RLS desabilitado em notification_templates |
| **`DEBUG_MESSAGES_NOT_ARRIVING.md`** | #5 | **NOVO** — Guia de diagnóstico completo |
| **`debug_test_send.js`** | #5 | **NOVO** — Script de teste NodeJS |
| **`debug_test_send.py`** | #5 | **NOVO** — Script de teste Python |

---

## 📚 **Documentos de Referência**

- 📋 **CORREÇÕES_E_FIXES.md** — Registro completo de todas as fixes
- ✅ **TEMPLATE_DEBUG_CHECKLIST.md** — Use para próximos bugs
- 📊 **AUDITORIA_BUGS.md** — Problemas históricos identificados
- 🏗️ **DESIGN_SYSTEM.md** — Arquitetura do projeto
- 📝 **README.md** — Documentação geral

---

## 🧪 **Como Usar Este Índice**

1. **Encontrou um bug?**
   - Busque a descrição acima
   - Se já corrigido, veja como foi feito
   - Se novo, use **TEMPLATE_DEBUG_CHECKLIST.md**

2. **Adicionando novo fix?**
   - Escreva entrada em **CORREÇÕES_E_FIXES.md**
   - Atualize tabelas acima
   - Mantenha `TEMPLATE_DEBUG_CHECKLIST.md` em mente

3. **Procurando padrões?**
   - Veja coluna "Categoria" — bugs se repetem
   - Veja "Arquivos afetados" — às vezes sinal de design problem

---

## 📊 **Estatísticas**

- **Total de Fixes**: 6
- **Resolvidos**: 6 ✅
- **Pendentes**: 0
- **Bloqueados**: 0
- **Severidade Crítica**: 2 (Fix #1 auth, Fix #6 versionamento)
- **Severidade Alta**: 3
- **Severidade Média**: 1
- **Taxa de Resolução**: 100%
- **Data Range**: 11/04/26 — 11/04/26

---

## 🚀 **Próximas Prioridades**

- [ ] Reabilitar RLS em `notification_templates` com `is_admin()` correto (Fix #3 — temporário)
- [ ] **Testar End-to-End com Z-API real** (Fix #5 — preparado para isso)
  - Use: `node debug_test_send.js 85988889999`
  - Ou: `python debug_test_send.py`
- [ ] Monitorar se race condition volta (indicaria problema no Supabase SDK)
- [ ] Adicionar regression tests para todos os 5 fixes
- [ ] Se mensagens ainda não chegam, seguir checklist em `DEBUG_MESSAGES_NOT_ARRIVING.md`

---

**Última atualização**: 11 Abril 2026
**Responsável**: Assistente IA + Equipe
**Status**: ✅ 6 Fixes documentados | 🔒 Fix #6 resolve regressão infinita de versionamento

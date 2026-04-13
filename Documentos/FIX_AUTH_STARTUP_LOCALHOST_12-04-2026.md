# 🔐 Fix Auth Startup Localhost — 12/04/2026

## Contexto
Este documento registra a correção aplicada para impedir a recorrência do erro de autenticação que reaparecia ao reiniciar o app em `localhost`.

---

## 🔴 Problema
Ao subir o projeto novamente em `localhost`, o login voltava a falhar com timeout mesmo após correções anteriores.

### Sintomas observados
- `Erro ao buscar sessão: getSession timeout — sessão possivelmente corrompida/SDK hang`
- app demorando para liberar tela de login
- tentativa de login às vezes pendurada até timeout de segurança
- problema reaparecendo após restart do servidor dev

---

## 🔍 Causa Raiz Consolidada
Além do timeout de rede, havia estado local de sessão que podia ficar inconsistente entre reinicializações em ambiente de desenvolvimento:

1. sessão persistida corrompida/malformada no `localStorage`
2. coexistência potencial de chave legada (`sb-<projectRef>-auth-token`) com chave atual (`lt-auth-session`)
3. lock interno do SDK de auth após `getSession()` pendurado em cenários específicos

Resultado: o app podia voltar no mesmo estado ruim ao reiniciar o Vite.

---

## ✅ Correção aplicada
Arquivo principal: `src/contexts/AuthContext.tsx`

### 1) Sanitização de sessão local
- limpeza da chave atual: `lt-auth-session`
- limpeza da chave legada: `sb-<projectRef>-auth-token`
- remoção de sessão quando JSON estiver inválido, sem tokens, ou expirada

### 2) Hardening específico para localhost (dev)
Em ambiente real de desenvolvimento local (`import.meta.env.MODE === "development"` com host `localhost`/`127.0.0.1`):
- limpa estado local de sessão no bootstrap
- chama `signOut({ scope: "local" })`
- completa inicialização sem depender de sessão possivelmente quebrada

### 3) Proteção para timeout de `getSession`
- mantém `Promise.race` para detectar hang do SDK
- tentativa de limpeza local com timeout curto
- reload único controlado para recuperar runtime de auth em caso de lock

---

## 🧪 Testes executados e resultado

### A) Regressão unitária de Auth
Executado:
- `npm run test -- src/contexts/AuthContext.test.tsx`

Resultado:
- **9/9 testes passando**
- incluindo o cenário de regressão onde `getSession()` fica pendurado

### B) Smoke E2E de login (credenciais reais de `.env.e2e`)
Executado:
- `npx playwright test e2e/admin-auth.spec.ts --grep "admin login works and redirects to /admin"`

Resultado:
- **1/1 passando**
- login redirecionando para `/admin`

### C) Revalidação após restart real
Executado:
- encerramento do processo na porta `8080`
- nova execução do smoke E2E de login

Resultado:
- **1/1 passando novamente após restart**

Conclusão validada: correção estável também na próxima inicialização local.

---

## 🛡️ Checklist anti-regressão (obrigatório)
Antes de fechar qualquer alteração em auth:

- [ ] não remover a limpeza de `lt-auth-session` + chave legada quando sessão inválida
- [ ] não remover o guard de ambiente: `MODE === "development"` para hardening local
- [ ] não trocar `signOut({ scope: "local" })` por `signOut()` no bootstrap de recuperação
- [ ] não retirar o teste de regressão de `getSession` hang (`AuthContext.test.tsx`)
- [ ] executar os 2 testes mínimos abaixo:
  - [ ] `npm run test -- src/contexts/AuthContext.test.tsx`
  - [ ] `npx playwright test e2e/admin-auth.spec.ts --grep "admin login works and redirects to /admin"`

---

## 📌 Observação operacional
A estratégia em `localhost` prioriza **estabilidade de inicialização** sobre persistência de sessão entre restarts de desenvolvimento.

Isso é intencional para evitar reciclar estado quebrado de auth durante ciclos rápidos de desenvolvimento.

---

## Referências
- `src/contexts/AuthContext.tsx`
- `src/lib/supabase.ts`
- `src/contexts/AuthContext.test.tsx`
- `e2e/admin-auth.spec.ts`

---
name: skill-multibilder
description: >
  Super skill unificada para desenvolvimento fullstack com React/TypeScript, Supabase/Postgres e Frontend com UI avançada.
  Use SEMPRE que o usuário mencionar: código TypeScript, componentes React, hooks, queries SQL, RLS, índices, performance de banco,
  Supabase, migrations, UI/design, animações, landing pages, padrões de código, boas práticas, refatoração, erros de tipagem,
  consultas lentas, políticas de segurança, ou qualquer tarefa de desenvolvimento neste projeto.
  Toda resposta DEVE ser em Português do Brasil com linguagem natural e exemplos Antes → Depois.
---

# Skill MultiBilder 🛠️

Skill personalizada que unifica três domínios de expertise em um único assistente fluente em PT-BR.

---

## ⚠️ REGRA DE COMUNICAÇÃO — OBRIGATÓRIA EM TODA RESPOSTA

Toda resposta desta skill DEVE seguir estas regras sem exceção:

### 1. Sempre em Português do Brasil
Responda em PT-BR mesmo que a pergunta seja em inglês ou o código contenha termos em inglês.

### 2. Linguagem natural com contexto
Explique o problema como se estivesse conversando — sem jargão desnecessário.
Quando usar um termo técnico, explique-o brevemente na primeira vez.

### 3. Formato Antes → Depois em toda sugestão de melhoria

Use este padrão em TODA resposta que sugere uma mudança:

```
**Como está agora:**
[Descreva o problema em linguagem natural — o que está acontecendo, por que é ruim]

**Como vai ficar após a melhoria:**
[Descreva o resultado esperado — o benefício concreto, com número ou exemplo quando possível]
```

**Exemplo real:**
> **Como está agora:**  
> O componente `ListaSolicitacoes` busca todos os pedidos no banco e filtra por status no JavaScript. Com 500 pedidos, ele carrega tudo e descarta 480.
>
> **Como vai ficar após a melhoria:**  
> A query vai filtrar direto no Supabase. O componente recebe só os 20 pedidos do status selecionado, o carregamento cai de ~900ms para ~80ms.

### 4. Seja direto, sem rodeios
- Vá direto ao ponto antes de explicar
- Use exemplos do próprio projeto quando possível (solicitações, entregadores, clientes, faturas)
- Mostre o código concreto, não só a teoria

---

## Domínios Cobertos

### 🧱 Domínio 1 — Padrões de Código (TypeScript / React / Node.js)
Para qualquer tarefa de: escrever componentes React, funções TypeScript, hooks customizados, validação de formulários, tratamento de erros, organização de arquivos, nomeação de variáveis, tipagem, padrões de API.

→ Consulte: `references/coding-standards.md`

**Quando acionar:** O usuário escreve ou revisa código TypeScript/JavaScript/React/Node, menciona "como fazer", "melhor jeito de", "boas práticas", "refatorar", "tá feio esse código".

---

### 🗄️ Domínio 2 — Supabase / Postgres (Performance e Segurança)
Para qualquer tarefa de: escrever queries SQL, criar ou revisar políticas RLS, adicionar índices, otimizar consultas lentas, configurar connection pooling, projetar schema, migrations, segurança de banco.

→ Consulte: `references/supabase-postgres.md`

**Quando acionar:** O usuário menciona Supabase, SQL, query lenta, RLS, políticas, índice, migration, `select *`, N+1, erro de autenticação no banco.

---

### 🎨 Domínio 3 — Frontend / UI / Animações
Para qualquer tarefa de: construir interfaces visuais, landing pages, dashboards, componentes com Tailwind, animações com Framer Motion/GSAP, geração de assets (imagem, vídeo, áudio com Minimax), copywriting para UI.

→ Consulte: `references/frontend-studio.md`

**Quando acionar:** O usuário menciona design, UI, componente visual, página de entrada, animação, layout, responsividade, cor, tipografia, "tá feio", "quero melhorar o visual".

---

## Como Escolher o Domínio

Se a tarefa envolver mais de um domínio, combine os dois arquivos de referência relevantes. Exemplos:

| Situação | Domínios |
|---|---|
| "Criar um componente de lista de solicitações" | Código + UI |
| "A query de faturas tá lenta" | Postgres |
| "Adicionar validação no formulário de entregador" | Código |
| "Melhorar a página de login" | UI + Código |
| "Criar política RLS para entregadores" | Postgres |
| "Refatorar o hook useAuth" | Código |
| "Fazer uma landing page para o cliente" | UI |

---

## Referências Rápidas (sem abrir arquivos)

### Checklist de qualidade antes de entregar código

- [ ] Sem `any` no TypeScript
- [ ] Sem `select *` nas queries
- [ ] Sem mutação direta de estado React
- [ ] Erros tratados com try/catch ou `.catch()`
- [ ] Variáveis com nomes descritivos em inglês
- [ ] Componentes com `interface` de props tipada
- [ ] RLS ativa nas tabelas novas do Supabase
- [ ] Índice adicionado em colunas usadas em `WHERE` ou `JOIN`

### Erros mais comuns no projeto

| Problema | Causa rápida | Referência |
|---|---|---|
| Componente re-renderiza demais | Estado desnecessário ou `useEffect` sem deps | `coding-standards.md` |
| Query lenta no Supabase | Falta índice ou `select *` | `supabase-postgres.md` |
| RLS bloqueando acesso | Policy faltando ou mal escrita | `supabase-postgres.md` |
| TypeScript reclamando | Tipo errado ou `any` | `coding-standards.md` |
| Layout quebrando no mobile | Tailwind sem `sm:` / `md:` | `frontend-studio.md` |

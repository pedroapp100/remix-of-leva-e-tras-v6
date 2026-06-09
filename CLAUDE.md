# CLAUDE.md — Leva e Traz

Regras obrigatórias para todas as interações neste projeto.

---

## 1. Super Powers — Skills Sempre Ativas

Antes de implementar qualquer coisa, leia e aplique estas referências:

| Situação | Arquivo de referência |
|---|---|
| Qualquer código TypeScript / React | `.agents/skills/skill-multibilder/references/coding-standards.md` |
| Qualquer query, tabela ou acesso ao Supabase | `.agents/skills/skill-multibilder/references/supabase-postgres.md` |
| Qualquer UI, layout, animação ou asset | `.agents/skills/skill-multibilder/references/frontend-studio.md` |
| Escolha de fonte em canvas ou imagem | `.cursor/skills/minimax-ai-skills-frontend-dev/canvas-fonts/` |

**Regra:** Não escreva código sem antes checar o guia correspondente. Se a tarefa mistura backend + frontend, leia os dois.

---

## 2. Estilo de Resposta Obrigatório

Toda resposta que envolva código deve seguir este formato:

### 2.1 Explicação em linguagem natural primeiro

Antes de qualquer código, explique:
- **O que está acontecendo** — descreva o problema como se estivesse explicando para um colega, não para um compilador.
- **Por que acontece** — a causa raiz, não só o sintoma.
- **O que vai mudar** — o que a solução faz de diferente.

### 2.2 Padrão Antes → Depois

Sempre que alterar código existente, mostre:

```
// Como está agora (o problema)
<código com o problema comentado>

// Como vai ficar (a solução)
<código corrigido>
```

### 2.3 Exemplo concreto do projeto

Use nomes reais do projeto (`solicitacoes`, `entregadores`, `clientes`, `rotas`, `faturas`), não exemplos genéricos como `foo`, `bar` ou `MyComponent`.

---

## 3. Stack do Projeto

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** shadcn/ui + Radix UI + Tailwind CSS
- **Estado servidor:** TanStack Query v5 (React Query)
- **Backend:** Supabase (Postgres + Auth + Realtime)
- **Formulários:** React Hook Form + Zod
- **Animações:** Framer Motion
- **Fonte principal:** Poppins

---

## 4. Padrões de Código Obrigatórios

### Serviços (`src/services/`)
- Funções puras que chamam o Supabase. Sem lógica de UI.
- Sempre lançar `throw new Error(error.message)` quando `error` existir.
- Tipar com `TableRow<"tabela">`, `TableInsert<"tabela">`, `TableUpdate<"tabela">`.

```typescript
// Como está agora (sem tipos, sem tratamento)
export async function buscarEntregador(id) {
  const { data } = await supabase.from('entregadores').select('*').eq('id', id).single()
  return data
}

// Como vai ficar
export async function fetchEntregador(id: string): Promise<EntregadorRow> {
  const { data, error } = await supabase
    .from('entregadores')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data as EntregadorRow
}
```

### Hooks (`src/hooks/`)
- Sempre usar `useQuery` / `useMutation` do TanStack Query. Nunca `useEffect` + `fetch` direto.
- `queryKey` sempre começa com o nome da entidade: `["entregadores", id]`.
- Mutations sempre invalidam as queries relacionadas no `onSuccess`.

```typescript
// Como está agora (useEffect manual, sem cache)
useEffect(() => {
  fetchEntregador(id).then(setEntregador)
}, [id])

// Como vai ficar
export function useEntregador(id: string) {
  return useQuery({
    queryKey: ["entregadores", id],
    queryFn: () => fetchEntregador(id),
    enabled: Boolean(id),
  })
}
```

### Componentes (`src/components/`)
- Props sempre tipadas com interface.
- Nunca usar `any`. Se o tipo for desconhecido, usar `unknown` e fazer narrowing.
- Componentes de página ficam em `src/pages/`, componentes reutilizáveis em `src/components/`.

---

## 5. Design System

Sempre seguir o arquivo `DESIGN_SYSTEM.md` na raiz do projeto.

Resumo rápido:
- **Tema principal:** Dark-first (Deep Navy)
- **Cor de destaque:** `--primary` Spring Blue `hsl(231 75% 60%)`
- **Fonte:** Poppins (300, 400, 500, 600, 700)
- **Espaçamento:** sistema de 8px (Tailwind: 2, 4, 6, 8, 12, 16...)
- **Componentes:** sempre usar componentes do shadcn/ui antes de criar um novo

---

## 6. Supabase — Regras Rápidas

- Sempre checar `error` antes de usar `data`.
- Nunca usar `SELECT *` em produção — selecionar só os campos necessários.
- Realtime subscriptions: sempre retornar a função de limpeza no `useEffect`.
- RLS deve estar ativa em toda tabela com dados de usuários.

---

## 7. Idioma

- Todo código e nomes de variáveis: **inglês** (funções, tipos, hooks).
- Toda comunicação, comentários e explicações: **português do Brasil**.
- Textos exibidos na UI: **português do Brasil**.

---

## 8. O que Nunca Fazer

- Não criar arquivo novo se já existe um que pode ser estendido.
- Não usar `any` no TypeScript.
- Não usar `useEffect` para buscar dados — use `useQuery`.
- Não duplicar lógica que já existe em `src/hooks/` ou `src/services/`.
- Não instalar bibliotecas novas sem perguntar primeiro.
- Não escrever comentários explicando o que o código faz — nomes de função claros já fazem isso.
- Não resumir o que foi feito no final da resposta — o diff já mostra.

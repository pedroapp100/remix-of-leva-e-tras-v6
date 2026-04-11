# PLANO DE MELHORIA DE CÓDIGO — Leva e Traz v2.0
## Ordenado por Impacto | Seguro para Regras de Negócio

> **Nota de avaliação atual: 5.5/10**
> **Princípio:** Nenhuma alteração deve modificar regras de negócio existentes.
> Cada fase é isolada, testável e reversível.
> **Regra de ouro:** Sempre rodar `bun run dev` + teste manual após cada fase.

---

## LEGENDA DE RISCO

| Símbolo | Significado |
|---------|-------------|
| 🟢 | Risco ZERO para regras de negócio — só infraestrutura/config |
| 🟡 | Risco BAIXO — mudança de wrapper/camada, lógica intocada |
| 🔴 | Risco MODERADO — toca em fluxos de dados, exige teste E2E |

---

## FASE 1 — BLINDAGEM (Impacto: CRÍTICO | Risco: 🟢)
> *Proteger o que já funciona antes de mudar qualquer coisa*

### 1.1 Ativar TypeScript Strict Mode (incremental)
**Arquivo:** `tsconfig.app.json`
**Por quê:** Sem strict mode, bugs passam silenciosamente. É a correção de maior impacto/menor risco.

```jsonc
// ANTES
{ "strict": false, "noImplicitAny": false }

// DEPOIS (Fase 1a — só strict)
{ "strict": true, "noImplicitAny": false }

// DEPOIS (Fase 1b — após corrigir erros)
{ "strict": true, "noImplicitAny": true }
```

**Passo a passo:**
1. Ativar `"strict": true` no `tsconfig.app.json`
2. Rodar `bun run build` — listar todos os erros
3. Corrigir **apenas os erros de tipo**, sem mudar lógica
4. Quando limpo, ativar `"noImplicitAny": true`
5. Repetir processo de correção

**Segurança de negócio:** ✅ Zero risco — apenas adiciona verificações do compilador, não muda runtime.

---

### 1.2 Error Boundaries nas páginas
**Por quê:** Se qualquer componente crashar, hoje o app inteiro quebra. Error boundaries contêm o crash.

**Criar:** `src/components/shared/ErrorBoundary.tsx`
```tsx
class ErrorBoundary extends React.Component<Props, State> {
  // Captura erros de renderização
  // Mostra UI de fallback: "Algo deu errado. Recarregar?"
  // Loga erro para debugging
}
```

**Aplicar em:** Cada `<Route element={...}>` no `App.tsx`

**Segurança de negócio:** ✅ Zero risco — só adiciona camada de proteção.

---

### 1.3 Tratamento de erros nos hooks (React Query)
**Arquivos:** Todos em `src/hooks/use*.ts`
**Por quê:** Hoje, se o Supabase falhar, o app congela sem feedback.

**Padrão a aplicar:**
```typescript
// ANTES (todos os hooks)
export function useClientes() {
  return useQuery({
    queryKey: ["clientes"],
    queryFn: fetchClientes, // ← Se falhar, crash silencioso
  });
}

// DEPOIS
export function useClientes() {
  return useQuery({
    queryKey: ["clientes"],
    queryFn: fetchClientes,
    retry: 2,
    meta: { errorMessage: "Falha ao carregar clientes" },
  });
}
```

**+ Criar callback global no QueryClient:**
```typescript
// src/lib/queryClient.ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
    mutations: {
      onError: (error) => {
        toast.error(error.message || "Erro ao salvar dados");
      },
    },
  },
});
```

**Segurança de negócio:** ✅ Zero risco — só adiciona feedback de erro, não muda fluxo de dados.

---

## FASE 2 — PERFORMANCE (Impacto: ALTO | Risco: 🟡)
> *O problema mais percebido pelo usuário: lentidão no carregamento*

### 2.1 Eliminar fetch global de TODOS os dados no mount
**Arquivo:** `src/contexts/GlobalStore.tsx`
**Problema:** Na montagem do app, o GlobalStore baixa TODAS as solicitações, rotas, pagamentos e faturas do banco. Com 1000+ registros, o app trava.

**Solução — migrar para React Query + paginação por página:**

| Dado | Hoje (GlobalStore) | Depois |
|------|-------------------|--------|
| Solicitações | `select("*")` no mount | `useSolicitacoes({ page, status })` por página |
| Rotas | `select("*")` no mount | Fetch sob demanda quando abrir solicitação |
| Pagamentos | `select("*")` no mount | Parte do detalhe da solicitação |
| Faturas | `select("*")` no mount | `useFaturas({ page, status })` por página |

**Estratégia segura (não quebrar):**
1. **NÃO remover** o GlobalStore de uma vez
2. Criar hooks React Query **paralelos** (`useSolicitacoesPaginated`)
3. Migrar **uma página por vez** do GlobalStore → hook
4. Quando todas as páginas migrarem, remover o fetch do GlobalStore
5. GlobalStore passa a conter apenas: user, settings, cache leve

**Segurança de negócio:** 🟡 Baixo risco — dados são os mesmos, só muda QUANDO são buscados. Testar cada página migrada individualmente.

---

### 2.2 Otimizar recálculos em páginas com tabelas
**Arquivos:** `FaturasPage`, `ClientesPage`, `FinanceiroPage`, `SolicitacoesPage`
**Problema:** Múltiplos `.filter()` sobre o mesmo array em cada render.

**Solução:** Single-pass com `useMemo`:
```typescript
// ANTES: 4 passes no array
const abertas = faturas.filter(f => f.status === "Aberta").length;
const vencidas = faturas.filter(f => f.status === "Vencida").length;
const pagas = faturas.filter(f => f.status === "Paga").length;

// DEPOIS: 1 pass
const metrics = useMemo(() => {
  return faturas.reduce((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}, [faturas]);
```

**Segurança de negócio:** ✅ Zero risco — mesmos dados, mesmo resultado, menos processamento.

---

## FASE 3 — ARQUITETURA DE DADOS (Impacto: ALTO | Risco: 🟡)
> *Reduzir complexidade sem tocar em regras de negócio*

### 3.1 Unificar padrão de state management
**Problema atual — 4 padrões diferentes:**

| Padrão | Onde é usado | Problema |
|--------|-------------|---------|
| Context + useState | GlobalStore, CaixaStore | Não escalável, re-renders globais |
| Zustand | SettingsStore | Bom, mas isolado |
| React Query | Hooks (useClientes, etc.) | Correto, mas incompleto |
| Fetch manual no useEffect | GlobalStore | Sem cache, sem retry |

**Plano de unificação (gradual):**

```
CAMADA 1: Supabase (fonte de verdade)
    ↓
CAMADA 2: Services (src/services/*) — queries tipadas
    ↓
CAMADA 3: React Query hooks (src/hooks/*) — cache + invalidação
    ↓
CAMADA 4: Contexts apenas para estado GLOBAL
           - AuthContext: user, role, permissions
           - SettingsStore: configurações do tenant
           - NotificationContext: notificações realtime
```

**O que SAI dos contexts:**
- ❌ Solicitações → migram para `useSolicitacoes()` hook
- ❌ Faturas → migram para `useFaturas()` hook
- ❌ Rotas → migram para fetch sob demanda
- ❌ Pagamentos → migram para fetch sob demanda
- ❌ Cache de clientes/entregadores → `useClientes()` já existe

**Estratégia:**
1. Manter GlobalStore funcionando **durante a migração**
2. Página por página, trocar referência de `useGlobalStore().solicitacoes` → `useSolicitacoes()`
3. Quando nenhuma página usar `globalStore.solicitacoes`, remover do store
4. Repetir para faturas, rotas, pagamentos

**Segurança de negócio:** 🟡 Risco baixo — cada migração é testável isoladamente. A regra de negócio vive nos services, não no store.

---

### 3.2 Extrair lógica de negócio dos components para services
**Problema:** Funções como `concluirSolicitacaoComFatura` vivem no GlobalStore, misturando estado com lógica.

**Regra:** Lógica de negócio → `src/services/` | Estado → hooks/contexts

**Exemplo de refatoração segura:**
```typescript
// ANTES (GlobalStore.tsx — 50 linhas de lógica de negócio)
concluirSolicitacaoComFatura: (solId) => {
  // atualiza solicitação
  // cria/atualiza fatura
  // loga ação
  // recalcula saldo
}

// DEPOIS
// 1. Criar src/services/concluirSolicitacao.ts
export async function concluirSolicitacaoComFatura(solId: string, params: ConclusaoParams) {
  // MESMA lógica, mas como função pura
  // Chama supabase diretamente
  // Retorna resultado
}

// 2. Hook que usa o service
export function useConcluirSolicitacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: concluirSolicitacaoComFatura,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitacoes"] });
      qc.invalidateQueries({ queryKey: ["faturas"] });
      toast.success("Solicitação concluída");
    },
  });
}
```

**Segurança de negócio:** 🟡 A lógica é COPIADA para o service, não modificada. Depois que o service funcionar, remove do GlobalStore. Testar fluxo completo.

---

## FASE 4 — CONSISTÊNCIA DE DADOS (Impacto: MÉDIO-ALTO | Risco: 🟡)

### 4.1 Validação de formulários com Zod
**Problema:** Formulários enviam dados ao Supabase sem validação frontend.
**Risco atual:** Dados inválidos no banco (email mal formatado, CNPJ inválido, valores negativos).

**Criar schemas de validação:**
```typescript
// src/schemas/cliente.ts
export const clienteSchema = z.object({
  nome_fantasia: z.string().min(2, "Nome muito curto"),
  cnpj_cpf: z.string().refine(validarCnpjCpf, "CNPJ/CPF inválido"),
  email: z.string().email("Email inválido"),
  telefone: z.string().min(10, "Telefone inválido"),
  endereco: z.string().min(5, "Endereço muito curto"),
  ativo: z.boolean().default(true),
});

// src/schemas/solicitacao.ts
export const solicitacaoSchema = z.object({
  cliente_id: z.string().uuid(),
  endereco_coleta: z.string().min(5),
  endereco_entrega: z.string().min(5),
  modalidade: z.enum(["Moto", "Carro", "Van", "Caminhão"]),
  valor: z.number().positive("Valor deve ser positivo"),
  // ...mais campos conforme regras de negócio
});
```

**Aplicar nos formulários existentes** sem mudar nomes de campos ou fluxo.

**Segurança de negócio:** 🟢 Zero risco — adiciona validação ANTES do envio, não muda o que é enviado quando válido.

---

### 4.2 Invalidação de cache consistente
**Problema:** Após criar/editar um registro, algumas páginas não atualizam.

**Criar helper de invalidação:**
```typescript
// src/lib/queryInvalidation.ts
const RELATED_QUERIES: Record<string, string[]> = {
  solicitacoes: ["solicitacoes", "dashboard", "financeiro"],
  faturas: ["faturas", "financeiro", "dashboard", "clientes"],
  clientes: ["clientes", "solicitacoes", "faturas"],
  entregadores: ["entregadores", "caixas", "solicitacoes"],
  caixas: ["caixas", "financeiro", "entregadores"],
};

export function invalidateRelated(qc: QueryClient, entity: string) {
  const keys = RELATED_QUERIES[entity] ?? [entity];
  keys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
}
```

**Segurança de negócio:** ✅ Zero risco — só garante que o cache é atualizado.

---

## FASE 5 — SEGURANÇA (Impacto: MÉDIO | Risco: 🟢)

### 5.1 Verificar RLS no Supabase
**Ação:** Auditar que TODAS as tabelas têm RLS ativado:
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

**Checklist:**
- [ ] `profiles` — RLS ativo, policy: user só vê próprio perfil (ou admin vê todos)
- [ ] `clientes` — RLS: admin vê todos, cliente vê só o próprio
- [ ] `entregadores` — RLS: admin vê todos, entregador vê só o próprio
- [ ] `solicitacoes` — RLS: admin vê todas, cliente vê as suas, entregador vê atribuídas
- [ ] `faturas` — RLS: admin vê todas, cliente vê as suas
- [ ] `caixas_entregadores` — RLS: admin vê todos, entregador vê os seus
- [ ] `lancamentos_financeiros` — RLS: admin only
- [ ] Demais tabelas...

**Segurança de negócio:** ✅ Não muda o app, só confirma que o banco está protegido.

---

### 5.2 Remover dados sensíveis do código-fonte
**Ação:** Buscar e remover qualquer URL, token ou credencial hardcoded:
- WebhooksTab.tsx — URL de teste do Slack (remover, usar `.env`)
- Quaisquer API keys

**Segurança de negócio:** ✅ Zero risco.

---

### 5.3 Adicionar sanitização de inputs HTML (se aplicável)
**Verificar:** `grep -r "dangerouslySetInnerHTML" src/`
- Se existir → aplicar DOMPurify
- Se não existir → React já escapa por padrão ✅

---

## FASE 6 — REDUÇÃO DE DUPLICAÇÃO (Impacto: MÉDIO | Risco: 🟢)

### 6.1 Hook `useTableFilters`
**Problema:** 5+ páginas repetem o mesmo padrão de filtro + searchParams.

**Criar:** `src/hooks/useTableFilters.ts`
```typescript
export function useTableFilters<T extends Record<string, string>>(defaults: T) {
  const [searchParams, setSearchParams] = useSearchParams();
  // Centraliza: leitura de params, atualização, sincronização com URL
  return { filters, updateFilter, resetFilters };
}
```

**Migrar uma página por vez.** Começar pelo `ClientesPage` (mais simples).

**Segurança de negócio:** ✅ Não toca em lógica de dados, só UI de filtro.

---

### 6.2 Colunas compartilhadas para DataTable
**Criar:** `src/components/shared/tableColumns/` com definições reutilizáveis.

**Migrar gradualmente** — manter colunas inline nas páginas que não forem migradas.

---

### 6.3 Factory de exportação
**Criar:** `src/lib/exportFactory.ts` — uma função genérica para exportar PDF/CSV de qualquer tabela.

---

## FASE 7 — REALTIME & SYNC (Impacto: MÉDIO | Risco: 🔴)
> *⚠️ Esta fase toca em fluxo de dados — requer testes E2E*

### 7.1 Subscriptions Supabase para tabelas críticas
**Por quê:** Se admin e cliente estão logados ao mesmo tempo, dados ficam desincronizados.

**Tabelas prioritárias:**
1. `solicitacoes` — status muda frequentemente
2. `faturas` — pagamentos impactam saldo
3. `caixas_entregadores` — abertura/fechamento em tempo real

**Implementação segura:**
```typescript
// Em cada hook relevante, adicionar subscription
useEffect(() => {
  const channel = supabase
    .channel('solicitacoes-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'solicitacoes' },
      () => {
        // Não muda o dado diretamente — apenas invalida o cache
        queryClient.invalidateQueries({ queryKey: ["solicitacoes"] });
      })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [queryClient]);
```

**Segurança de negócio:** 🔴 Risco moderado — se a invalidação for muito agressiva, pode causar flickering. Testar em cenário multi-usuário.

---

## FASE 8 — TESTES (Impacto: ALTO a longo prazo | Risco: 🟢)

### 8.1 Testes unitários para services
**Prioridade:** Funções que envolvem cálculos financeiros:
- `calcularTarifa()` — regras de preço por cliente
- `concluirSolicitacaoComFatura()` — fluxo de conclusão
- `calcularComissao()` — comissão do entregador
- `formatarValor()` — formatação monetária

### 8.2 Testes E2E para fluxos críticos (Playwright)
**Fluxos prioritários:**
1. Login → Dashboard (por role)
2. Criar solicitação → Atribuir entregador → Concluir → Gerar fatura
3. Abrir caixa → Registrar recebimentos → Fechar caixa → Conferir saldo
4. Gerar fatura → Registrar pagamento → Baixar PDF

---

## RESUMO — ORDEM DE EXECUÇÃO

| Fase | Nome | Impacto | Risco Negócio | Tempo Est. |
|------|------|---------|---------------|------------|
| **1** | Blindagem (strict, error boundaries, error handling) | 🔴 CRÍTICO | 🟢 Zero | Curto |
| **2** | Performance (eliminar fetch global, otimizar renders) | 🔴 ALTO | 🟡 Baixo | Médio |
| **3** | Arquitetura (unificar state, extrair lógica) | 🔴 ALTO | 🟡 Baixo | Médio |
| **4** | Consistência (Zod, invalidação cache) | 🟡 MÉDIO-ALTO | 🟢 Zero | Curto |
| **5** | Segurança (RLS, sanitização, secrets) | 🟡 MÉDIO | 🟢 Zero | Curto |
| **6** | DRY (hooks compartilhados, columns, export) | 🟡 MÉDIO | 🟢 Zero | Curto |
| **7** | Realtime (subscriptions) | 🟡 MÉDIO | 🔴 Moderado | Médio |
| **8** | Testes (unitários + E2E) | 🟢 ALTO (longo prazo) | 🟢 Zero | Longo |

---

## REGRAS DE SEGURANÇA PARA EXECUÇÃO

1. **Nunca alterar a assinatura de funções em `src/services/`** sem verificar todos os chamadores
2. **Nunca mudar nomes de campos** que são mapeados do Supabase (snake_case)
3. **Nunca remover um Context** antes de migrar TODAS as páginas que o usam
4. **Sempre manter o fluxo:** Solicitação → Rota → Pagamento → Fatura → Financeiro intacto
5. **Testar manualmente** após cada sub-fase: criar solicitação, concluir, gerar fatura, verificar saldo
6. **Commits atômicos:** uma sub-fase = um commit, com mensagem descritiva
7. **Rollback plan:** Se quebrar, `git checkout .` e recomeçar a sub-fase

---

## NOTA ESPERADA APÓS EXECUÇÃO COMPLETA

| Critério | Antes | Depois |
|----------|-------|--------|
| Type Safety | 3/10 | 8/10 |
| Error Handling | 2/10 | 8/10 |
| Performance | 4/10 | 8/10 |
| Arquitetura | 5/10 | 8/10 |
| Segurança | 6/10 | 9/10 |
| DRY / Manutenibilidade | 4/10 | 8/10 |
| Testes | 1/10 | 7/10 |
| **GERAL** | **5.5/10** | **8/10** |

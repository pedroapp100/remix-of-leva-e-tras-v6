# Plano de Implementação — Relatórios: Filtros Dinâmicos + Drawer de Comissões por Entregador

> **Escopo:** Corrigir filtros de período que não chegam à aba Comissões + implementar drawer de detalhamento por entregador.
> **Referências obrigatórias:** `coding-standards.md`, `supabase-postgres.md`, `frontend-studio.md`
> **Regra de ouro:** Não criar arquivo novo quando um existente pode ser estendido. Exceção: `ComissaoDrawer.tsx` (componente novo com responsabilidade própria).

---

## Diagnóstico (o que está errado hoje)

| # | Arquivo | Linha | Problema |
|---|---------|-------|----------|
| D1 | `RelatoriosPage.tsx` | 217 | `<ComissoesTab />` sem `dateRange` — prop nunca desce |
| D2 | `useComissao.ts` | 22–27 | `getMesCorrenteRange()` hardcoded, sem parâmetro externo |
| D3 | `useComissao.ts` | 105 | `useMemo` sempre filtra pelo mês corrente, ignora seleção do usuário |
| D4 | `useSolicitacoes.ts` | 269 | `useRotasWindow` teto de 90 dias — "Ano" e "Trimestre" perdem dados |
| D5 | `ComissoesTab.tsx` | 10 | Sem filtro por entregador, sem interação nas linhas |

---

## Fase 1 — Infraestrutura: `dateRange` chegando em Comissões

### 1.1 — `useSolicitacoes.ts` → `useRotasWindow` aceita `since` dinâmico

**Arquivo:** `src/hooks/useSolicitacoes.ts`

```typescript
// Como está agora (hardcoded 90 dias)
export function useRotasWindow() {
  const since = sinceNDays(90);
  return useQuery({
    queryKey: ["rotas", "windowed", since],
    queryFn: () => fetchRotasWindow(since),
    ...
  });
}

// Como vai ficar (aceita since externo, fallback para 90 dias)
export function useRotasWindow(sinceOverride?: string) {
  const defaultSince = sinceNDays(90);
  const since = sinceOverride ?? defaultSince;
  return useQuery({
    queryKey: ["rotas", "windowed", since],
    queryFn: () => fetchRotasWindow(since),
    select: (data) => data.map(rowToRota),
    staleTime: 2 * 60_000,
  });
}
```

**Impacto:** Quando `dateRange.from` for anterior a 90 dias, o hook busca desde essa data. Sem quebrar nenhum caller atual (parâmetro opcional).

---

### 1.2 — `useComissao.ts` → `useAllComissoes` aceita `dateRange`

**Arquivo:** `src/hooks/useComissao.ts`

```typescript
// Como está agora (sempre mês corrente)
export function useAllComissoes(): ComissaoCalculada[] {
  const { data: solicitacoes = [] } = useSolicitacoesAll();
  ...
  return useMemo(() => {
    const { inicio, fim } = getMesCorrenteRange(); // hardcoded
    ...
  }, [solicitacoes, entregadores, todasRotas, todasFaixas]);
}

// Como vai ficar (dateRange opcional, fallback mês corrente)
import type { DateRange } from "react-day-picker";

export function useAllComissoes(dateRange?: DateRange): ComissaoCalculada[] {
  const sinceOverride = dateRange?.from
    ? dateRange.from.toISOString().slice(0, 10)
    : undefined;

  const { data: solicitacoes = [] } = useSolicitacoesAll();
  const { data: entregadores = [] } = useEntregadoresAtivos();
  const { data: todasRotas = [] } = useRotasWindow(sinceOverride);
  const { data: todasFaixas = [] } = useAllComissaoFaixas();

  return useMemo(() => {
    const inicio = dateRange?.from ?? getMesCorrenteRange().inicio;
    const fim    = dateRange?.to   ?? getMesCorrenteRange().fim;

    return entregadores.map((entregador) => {
      const concluidas = solicitacoes.filter(
        (s) =>
          s.entregador_id === entregador.id &&
          s.status === "concluida" &&
          s.data_conclusao != null &&
          new Date(s.data_conclusao) >= inicio &&
          new Date(s.data_conclusao) <= fim      // ← <= para incluir o dia final
      );
      // ... resto igual
    });
  }, [solicitacoes, entregadores, todasRotas, todasFaixas, dateRange]);
}
```

**Regra coding-standards:** `dateRange` tipado com `DateRange` do react-day-picker (já usado em todo o projeto). Sem `any`.

---

### 1.3 — `RelatoriosPage.tsx` → passa `dateRange` para `ComissoesTab`

**Arquivo:** `src/pages/admin/RelatoriosPage.tsx`

```tsx
// Como está agora
<ComissoesTab />

// Como vai ficar (mesma assinatura das outras abas)
<ComissoesTab dateRange={dateRange} />
```

---

### 1.4 — `ComissoesTab.tsx` → recebe `dateRange` e repassa para o hook

**Arquivo:** `src/pages/admin/relatorios/ComissoesTab.tsx`

```typescript
// Como está agora (sem props)
export function ComissoesTab() {
  const comissoes = useAllComissoes();

// Como vai ficar
import type { DateRange } from "react-day-picker";

interface ComissoesTabProps {
  dateRange?: DateRange;
}

export function ComissoesTab({ dateRange }: ComissoesTabProps) {
  const comissoes = useAllComissoes(dateRange);
```

---

## Fase 2 — Drawer de Detalhamento por Entregador

### 2.1 — Novo arquivo: `ComissaoDrawer.tsx`

**Arquivo:** `src/pages/admin/relatorios/ComissaoDrawer.tsx`
**Componente shadcn/ui:** `Sheet` (já instalado no projeto — `src/components/ui/sheet.tsx`)
**Motion:** `motion.div` com `initial={{ opacity: 0, x: 20 }}` — intensidade baixa (dashboard = 2/10)

**Estrutura do drawer:**

```
┌─────────────────────────────────────┐
│  [← Fechar]                         │
│                                     │
│  Avatar  Bruno Rodrigues da Costa   │
│          Meta (Fx.) · Ativo         │
│                                     │
│  ┌──────────┬───────────┬─────────┐ │
│  │ Entregas │ Val. Ger. │ Comissão│ │
│  │   149    │ R$2.072   │ R$149   │ │
│  └──────────┴───────────┴─────────┘ │
│                                     │
│  Tipo de Comissão                   │
│  ● Meta por faixas (Fixo)           │
│                                     │
│  Faixas de Meta                     │  ← só para tipo "meta"
│  ┌──────────────────────────────┐   │
│  │ 1–50 entregas  → R$0,80/ent  │   │
│  │ 51–100         → R$1,00/ent  │   │
│  │ 101+           → R$1,20/ent  │ ✓ │  ← faixa ativa destacada
│  └──────────────────────────────┘   │
│                                     │
│  Período: Mês atual / [filtro ativo]│
└─────────────────────────────────────┘
```

**Props:**
```typescript
interface ComissaoDrawerProps {
  comissao: ComissaoCalculada | null;
  open: boolean;
  onClose: () => void;
  dateRange?: DateRange;
}
```

**Regras frontend-studio:**
- `Sheet` com `side="right"` — padrão do projeto para detalhes
- Animação apenas em `opacity` e `transform` (GPU-only)
- Responsivo: `w-full sm:w-[420px]`
- Cores semânticas: faixa ativa em `text-primary`, comissão em `text-emerald-500`

---

### 2.2 — `ComissoesTab.tsx` → linha clicável + estado do drawer

**Arquivo:** `src/pages/admin/relatorios/ComissoesTab.tsx`

```typescript
// Como está agora (tabela sem interação)
<DataTable
  data={comissoes}
  columns={columns}
  ...
/>

// Como vai ficar (linha abre drawer)
const [selected, setSelected] = useState<ComissaoCalculada | null>(null);

<DataTable
  data={comissoes}
  columns={columns}
  onRowClick={(row) => setSelected(row)}
  rowClassName="cursor-pointer hover:bg-muted/50 transition-colors"
  ...
/>

<ComissaoDrawer
  comissao={selected}
  open={selected !== null}
  onClose={() => setSelected(null)}
  dateRange={dateRange}
/>
```

**Verificar:** `DataTable` já tem prop `onRowClick`? Se não, adicionar — é uma linha no componente compartilhado.

---

## Fase 3 — Verificação do `DataTable`

**Arquivo:** `src/components/shared/DataTable.tsx`
**Ação:** Verificar se `onRowClick` existe. Se não, adicionar antes de usar.

```typescript
// Adicionar na interface Column<T> / DataTableProps se ausente:
interface DataTableProps<T> {
  // ... props existentes ...
  onRowClick?: (row: T) => void;
  rowClassName?: string | ((row: T) => string);
}
```

---

## Ordem de Execução

| Passo | Arquivo | Tipo | Risco |
|-------|---------|------|-------|
| 1 | `useSolicitacoes.ts` — `useRotasWindow` | Extensão hook | Baixo (param opcional) |
| 2 | `useComissao.ts` — `useAllComissoes` | Extensão hook | Baixo (param opcional) |
| 3 | `RelatoriosPage.tsx` | 1 linha | Mínimo |
| 4 | `ComissoesTab.tsx` — adicionar prop | Extensão componente | Baixo |
| 5 | `DataTable.tsx` — verificar/adicionar `onRowClick` | Extensão componente | Baixo |
| 6 | `ComissaoDrawer.tsx` — criar | Novo componente | Médio |
| 7 | `ComissoesTab.tsx` — integrar drawer | Extensão componente | Baixo |

---

## Checklist de Aceite (PRD item 11.1)

- [ ] Botão "7 dias" filtra comissões por últimos 7 dias
- [ ] Botão "Mês anterior" mostra comissões do mês anterior (não mês atual)
- [ ] Botão "Ano" não perde rotas além de 90 dias
- [ ] Sem filtro ativo → comportamento atual preservado (mês corrente)
- [ ] Clicar em Bruno Rodrigues abre drawer com seus dados
- [ ] Drawer mostra faixas de meta para tipo "meta", e taxa simples para "fixo"/"percentual"
- [ ] Drawer fecha com ESC e com botão X (comportamento padrão do `Sheet`)
- [ ] Mobile: drawer ocupa tela cheia (`w-full`)
- [ ] Desktop: drawer lateral `w-[420px]`
- [ ] Exportação CSV/PDF continua funcionando após as mudanças

---

## O que NÃO será feito (YAGNI)

- Gráfico de evolução de comissões no drawer (não pedido)
- Exportação individual por entregador (não pedido)
- Comparativo entre períodos (não pedido)
- Paginação server-side para comissões (volume atual não justifica)

---

## Status

| Fase | Status |
|------|--------|
| 1.1 `useRotasWindow` dinâmico | ⏳ Aguardando aprovação |
| 1.2 `useAllComissoes` com dateRange | ⏳ Aguardando aprovação |
| 1.3 `RelatoriosPage` passa prop | ⏳ Aguardando aprovação |
| 1.4 `ComissoesTab` recebe prop | ⏳ Aguardando aprovação |
| 2.1 `ComissaoDrawer` | ⏳ Aguardando aprovação |
| 2.2 `ComissoesTab` integra drawer | ⏳ Aguardando aprovação |
| 3 `DataTable` onRowClick | ⏳ Aguardando aprovação |

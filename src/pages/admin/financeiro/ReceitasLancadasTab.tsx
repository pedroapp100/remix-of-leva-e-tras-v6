import { useState, useMemo, useCallback, lazy, Suspense } from "react";
import { DataTable, SearchInput } from "@/components/shared";
import { useLogStore } from "@/contexts/LogStore";
import type { Column } from "@/components/shared/DataTable";
import type { Fatura, Receita } from "@/types/database";

const FaturaDetailsModal = lazy(() =>
  import("@/pages/admin/faturas/FaturaDetailsModal").then((m) => ({ default: m.FaturaDetailsModal }))
);
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import { Plus, Pencil, Eye, X, DollarSign } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateReceita, useUpdateReceita, useCategorias } from "@/hooks/useFinanceiro";
import { NovaReceitaDialog } from "./NovaReceitaDialog";

interface ReceitasLancadasTabProps {
  receitas: Receita[];
  faturas: Fatura[];
}

export function ReceitasLancadasTab({ receitas, faturas }: ReceitasLancadasTabProps) {
  const { addLog } = useLogStore();
  const createReceita = useCreateReceita();
  const updateReceita = useUpdateReceita();
  const { data: allCategorias = [] } = useCategorias();
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("todos");
  const [periodoFilter, setPeriodoFilter] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReceita, setEditingReceita] = useState<Receita | null>(null);
  const [receitasTabFilter, setReceitasTabFilter] = useState<"todas" | "lancadas" | "manuais">("todas");
  const [viewingFatura, setViewingFatura] = useState<Fatura | null>(null);

  const catMap = useMemo(() => {
    const m: Record<string, string> = {};
    allCategorias.forEach((c) => { m[c.id] = c.nome; });
    return m;
  }, [allCategorias]);

  const getCatNome = useCallback(
    (r: Receita) => (r.categoria_id ? catMap[r.categoria_id] : null) ?? "Sem categoria",
    [catMap],
  );

  const categorias = useMemo(
    () => [...new Set(receitas.map((r) => getCatNome(r)))].sort(),
    [receitas, getCatNome],
  );

  const periodos = useMemo(() => {
    const seen = new Set<string>();
    return receitas
      .filter((r) => r.data_recebimento)
      .map((r) => r.data_recebimento!.slice(0, 7))
      .filter((key) => (seen.has(key) ? false : (seen.add(key), true)))
      .sort()
      .reverse()
      .map((key) => {
        const [ano, mes] = key.split("-");
        const label = new Date(Number(ano), Number(mes) - 1, 1)
          .toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
          .replace(" de ", "/")
          .replace(".", "");
        return { key, label: label.charAt(0).toUpperCase() + label.slice(1) };
      });
  }, [receitas]);

  const isFaturaReceita = useCallback(
    (r: Receita) =>
      (r.observacao?.startsWith("Fatura ") ?? false) ||
      (r.descricao?.startsWith("Taxas de Serviço") ?? false) ||
      (r.descricao?.startsWith("Pagamento — Fatura") ?? false),
    [],
  );

  const receitasDeFatura = useMemo(() => receitas.filter(isFaturaReceita), [receitas, isFaturaReceita]);
  const receitasManuais = useMemo(() => receitas.filter((r) => !isFaturaReceita(r)), [receitas, isFaturaReceita]);

  const receitasBase =
    receitasTabFilter === "lancadas"
      ? receitasDeFatura
      : receitasTabFilter === "manuais"
        ? receitasManuais
        : receitas;

  const filtered = receitasBase.filter((r) => {
    const catNome = getCatNome(r);
    const matchSearch =
      r.descricao.toLowerCase().includes(search.toLowerCase()) ||
      catNome.toLowerCase().includes(search.toLowerCase());
    const matchCategoria = categoriaFilter === "todos" || catNome === categoriaFilter;
    const matchPeriodo = periodoFilter === "todos" || r.data_recebimento?.startsWith(periodoFilter);
    return matchSearch && matchCategoria && matchPeriodo;
  });

  const totalReceitasLancadas = filtered.reduce((s, r) => s + r.valor, 0);

  const handleSave = (receita: Receita) => {
    if (editingReceita) {
      updateReceita.mutate(
        { id: receita.id, patch: receita as Parameters<typeof updateReceita.mutate>[0]["patch"] },
        {
          onSuccess: () =>
            addLog({
              categoria: "financeiro",
              acao: "receita_editada",
              entidade_id: receita.id,
              descricao: `Receita "${receita.descricao}" editada — ${formatCurrency(receita.valor)}`,
              detalhes: { descricao: receita.descricao, valor: receita.valor, categoria_id: receita.categoria_id },
            }),
        },
      );
    } else {
      createReceita.mutate(receita as Parameters<typeof createReceita.mutate>[0], {
        onSuccess: () =>
          addLog({
            categoria: "financeiro",
            acao: "receita_criada",
            entidade_id: receita.id,
            descricao: `Receita "${receita.descricao}" lançada — ${formatCurrency(receita.valor)}`,
            detalhes: { descricao: receita.descricao, valor: receita.valor, categoria_id: receita.categoria_id },
          }),
      });
    }
    setEditingReceita(null);
  };

  const handleEdit = (r: Receita) => {
    setEditingReceita(r);
    setDialogOpen(true);
  };

  const handleViewFatura = (r: Receita) => {
    const match = r.observacao?.match(/^Fatura (FAT-[\w-]+)/);
    if (match) {
      const fatura = faturas.find((f) => f.numero === match[1]);
      if (fatura) setViewingFatura(fatura);
    }
  };

  const columns: Column<Receita>[] = [
    {
      key: "data_recebimento",
      header: "Data",
      sortable: true,
      cell: (r) => <span className="text-sm">{formatDateBR(r.data_recebimento)}</span>,
    },
    {
      key: "descricao",
      header: "Descrição",
      sortable: true,
      cell: (r) => <span className="font-medium">{r.descricao}</span>,
    },
    {
      key: "categoria_id",
      header: "Categoria",
      cell: (r) => <Badge variant="outline" className="text-xs">{getCatNome(r)}</Badge>,
    },
    {
      key: "valor",
      header: "Valor",
      sortable: true,
      cell: (r) => (
        <span className="font-semibold tabular-nums text-emerald-500">{formatCurrency(r.valor)}</span>
      ),
    },
    {
      key: "observacao",
      header: "Obs.",
      cell: (r) => <span className="text-sm text-muted-foreground">{r.observacao || "—"}</span>,
    },
    {
      key: "acoes",
      header: "Ações",
      className: "text-center",
      cell: (r) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-primary hover:bg-primary/10"
            onClick={(e) => { e.stopPropagation(); handleEdit(r); }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {isFaturaReceita(r) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full text-primary hover:bg-primary/10"
              onClick={(e) => { e.stopPropagation(); handleViewFatura(r); }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const renderMobileCard = (r: Receita) => (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{r.descricao}</span>
        <span className="font-semibold tabular-nums text-emerald-500">{formatCurrency(r.valor)}</span>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <Badge variant="outline" className="text-xs">{getCatNome(r)}</Badge>
        <span>{formatDateBR(r.data_recebimento)}</span>
      </div>
      <Button variant="outline" size="sm" className="w-full gap-1.5 mt-1" onClick={() => handleEdit(r)}>
        <Pencil className="h-3.5 w-3.5" /> Editar
      </Button>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-emerald-500/10 p-2.5">
              <DollarSign className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Receitas Lançadas</p>
              <p className="text-base sm:text-xl font-bold tabular-nums">{formatCurrency(totalReceitasLancadas)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Receitas Lançadas</h3>

        <Tabs
          value={receitasTabFilter}
          onValueChange={(v) => setReceitasTabFilter(v as "todas" | "lancadas" | "manuais")}
        >
          <TabsList>
            <TabsTrigger value="todas">Todas ({receitas.length})</TabsTrigger>
            <TabsTrigger value="lancadas">De Faturas ({receitasDeFatura.length})</TabsTrigger>
            <TabsTrigger value="manuais">Manuais ({receitasManuais.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar receitas..."
            className="flex-1 min-w-[200px]"
          />
          <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os meses</SelectItem>
              {periodos.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {(search || categoriaFilter !== "todos" || periodoFilter !== "todos") && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => { setSearch(""); setCategoriaFilter("todos"); setPeriodoFilter("todos"); }}
            >
              <X className="h-3.5 w-3.5" /> Limpar filtros
            </Button>
          )}
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => { setEditingReceita(null); setDialogOpen(true); }}
          >
            <Plus className="h-4 w-4" /> Nova Receita
          </Button>
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          pageSize={10}
          renderMobileCard={renderMobileCard}
          emptyTitle="Nenhuma receita encontrada"
          emptySubtitle="Receitas são geradas a partir das operações ou lançadas manualmente."
        />
      </div>

      <NovaReceitaDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingReceita(null); }}
        onSave={handleSave}
        editingReceita={editingReceita}
      />

      <Suspense fallback={null}>
        {viewingFatura && (
          <FaturaDetailsModal
            fatura={viewingFatura}
            open={!!viewingFatura}
            onOpenChange={(open) => !open && setViewingFatura(null)}
            viewOnly
          />
        )}
      </Suspense>
    </div>
  );
}

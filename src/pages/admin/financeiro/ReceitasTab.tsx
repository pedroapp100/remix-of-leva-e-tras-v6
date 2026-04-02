import { useState, useMemo, lazy, Suspense } from "react";
import { DataTable, SearchInput } from "@/components/shared";
import { useLogStore } from "@/contexts/LogStore";
import type { Column } from "@/components/shared/DataTable";
import type { Receita, Fatura } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import { Plus, Pencil, FileText, DollarSign, Eye, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NovaReceitaDialog } from "./NovaReceitaDialog";
const FaturaDetailsModal = lazy(() => import("@/pages/admin/faturas/FaturaDetailsModal").then(m => ({ default: m.FaturaDetailsModal })));

interface ReceitasTabProps {
  receitas: Receita[];
  onUpdate: (updated: Receita[]) => void;
  faturas: Fatura[];
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Aberta: "outline",
  Fechada: "secondary",
  Paga: "default",
  Finalizada: "default",
  Vencida: "destructive",
};

export function ReceitasTab({ receitas, onUpdate, faturas = [] }: ReceitasTabProps) {
  const { addLog } = useLogStore();
  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReceita, setEditingReceita] = useState<Receita | null>(null);

  const categorias = useMemo(() => [...new Set(receitas.map((r) => r.categoria))].sort(), [receitas]);

  const faturasRecebidas = (faturas || []).filter(
    (f) => f.status_geral === "Paga" || f.status_geral === "Finalizada"
  );

  const totalReceitasLancadas = receitas.reduce((s, r) => s + r.valor, 0);
  const totalFaturasRecebidas = faturasRecebidas.reduce((s, f) => s + (f.valor_taxas || 0), 0);

  const filtered = receitas.filter(
    (r) => {
      const matchSearch = r.descricao.toLowerCase().includes(search.toLowerCase()) ||
        r.categoria.toLowerCase().includes(search.toLowerCase());
      const matchCategoria = categoriaFilter === "todos" || r.categoria === categoriaFilter;
      return matchSearch && matchCategoria;
    }
  );

  const handleSave = (receita: Receita) => {
    if (editingReceita) {
      onUpdate(receitas.map((r) => (r.id === receita.id ? receita : r)));
      addLog({ categoria: "financeiro", acao: "receita_editada", entidade_id: receita.id, descricao: `Receita "${receita.descricao}" editada — ${formatCurrency(receita.valor)}`, detalhes: { descricao: receita.descricao, valor: receita.valor, categoria: receita.categoria } });
    } else {
      onUpdate([receita, ...receitas]);
      addLog({ categoria: "financeiro", acao: "receita_criada", entidade_id: receita.id, descricao: `Receita "${receita.descricao}" lançada — ${formatCurrency(receita.valor)}`, detalhes: { descricao: receita.descricao, valor: receita.valor, categoria: receita.categoria } });
    }
    setEditingReceita(null);
  };

  const handleEdit = (r: Receita) => {
    setEditingReceita(r);
    setDialogOpen(true);
  };

  const columns: Column<Receita>[] = [
    { key: "data_recebimento", header: "Data", sortable: true, cell: (r) => <span className="text-sm">{formatDateBR(r.data_recebimento)}</span> },
    { key: "descricao", header: "Descrição", sortable: true, cell: (r) => <span className="font-medium">{r.descricao}</span> },
    { key: "categoria", header: "Categoria", cell: (r) => <Badge variant="outline" className="text-xs">{r.categoria}</Badge> },
    {
      key: "valor", header: "Valor", sortable: true,
      cell: (r) => <span className="font-semibold tabular-nums text-emerald-500">{formatCurrency(r.valor)}</span>,
    },
    { key: "observacao", header: "Obs.", cell: (r) => <span className="text-sm text-muted-foreground">{r.observacao || "—"}</span> },
    {
      key: "acoes", header: "Ações", className: "text-center",
      cell: (r) => (
        <div className="flex items-center justify-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); handleEdit(r); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); /* view */ }}>
            <Eye className="h-4 w-4" />
          </Button>
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
        <Badge variant="outline" className="text-xs">{r.categoria}</Badge>
        <span>{formatDateBR(r.data_recebimento)}</span>
      </div>
      <Button variant="outline" size="sm" className="w-full gap-1.5 mt-1" onClick={() => handleEdit(r)}>
        <Pencil className="h-3.5 w-3.5" /> Editar
      </Button>
    </Card>
  );

  const [viewingFatura, setViewingFatura] = useState<Fatura | null>(null);

  // Faturas recebidas columns
  const faturaColumns: Column<Fatura>[] = [
    { key: "numero", header: "Nº Fatura", sortable: true, cell: (f) => <span className="font-medium text-sm">{f.numero}</span> },
    { key: "cliente_nome", header: "Cliente", sortable: true, cell: (f) => <span className="text-sm">{f.cliente_nome}</span> },
    { key: "data_emissao", header: "Emissão", cell: (f) => <span className="text-sm">{formatDateBR(f.data_emissao)}</span> },
    {
      key: "valor_taxas", header: "Valor Recebido", sortable: true,
      cell: (f) => <span className="font-semibold tabular-nums text-emerald-500">{formatCurrency(f.valor_taxas || 0)}</span>,
    },
    {
      key: "status_geral", header: "Status",
      cell: (f) => <Badge variant={STATUS_VARIANT[f.status_geral] || "outline"}>{f.status_geral}</Badge>,
    },
    {
      key: "acoes", header: "Ações", className: "text-center",
      cell: (f) => (
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); setViewingFatura(f); }}>
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-emerald-500/10 p-2.5">
              <DollarSign className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Receitas Lançadas</p>
              <p className="text-xl font-bold tabular-nums">{formatCurrency(totalReceitasLancadas)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Faturas Recebidas</p>
              <p className="text-xl font-bold tabular-nums">{formatCurrency(totalFaturasRecebidas)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Faturas recebidas */}
      {faturasRecebidas.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Faturas Recebidas</h3>
          <DataTable
            data={faturasRecebidas}
            columns={faturaColumns}
            pageSize={5}
            emptyTitle="Nenhuma fatura recebida"
            emptySubtitle="Faturas pagas aparecerão aqui."
          />
        </div>
      )}

      {/* Receitas lançadas */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Receitas Lançadas</h3>
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar receitas..." className="flex-1 min-w-[200px]" />
          <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {(search || categoriaFilter !== "todos") && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => { setSearch(""); setCategoriaFilter("todos"); }}>
              <X className="h-3.5 w-3.5" /> Limpar filtros
            </Button>
          )}
          <Button size="sm" className="gap-1.5" onClick={() => { setEditingReceita(null); setDialogOpen(true); }}>
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
            onFaturaUpdate={() => {}}
          />
        )}
      </Suspense>
    </div>
  );
}

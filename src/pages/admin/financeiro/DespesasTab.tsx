import { useState, useMemo, useCallback } from "react";
import { DataTable, SearchInput } from "@/components/shared";
import { useLogStore } from "@/contexts/LogStore";
import type { Column } from "@/components/shared/DataTable";
import type { Despesa } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import { STATUS_DESPESA_VARIANT } from "@/lib/formatters";
import { useCreateDespesa, useUpdateDespesa, useCategorias } from "@/hooks/useFinanceiro";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { NovaDespesaDialog } from "./NovaDespesaDialog";
import { PagarDespesaDialog } from "./PagarDespesaDialog";

interface DespesasTabProps {
  despesas: Despesa[];
}

export function DespesasTab({ despesas }: DespesasTabProps) {
  const { addLog } = useLogStore();
  const createDespesa = useCreateDespesa();
  const updateDespesa = useUpdateDespesa();
  const { data: allCategorias = [] } = useCategorias();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [categoriaFilter, setCategoriaFilter] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [despesaPagar, setDespesaPagar] = useState<Despesa | null>(null);

  const catMap = useMemo(() => {
    const m: Record<string, string> = {};
    allCategorias.forEach((c) => { m[c.id] = c.nome; });
    return m;
  }, [allCategorias]);

  const getCatNome = useCallback((d: Despesa) => (d.categoria_id ? catMap[d.categoria_id] : null) ?? "Sem categoria", [catMap]);

  const categorias = useMemo(() => [...new Set(despesas.map((d) => getCatNome(d)))].sort(), [despesas, getCatNome]);

  const handleAddDespesa = (nova: Despesa) => {
    createDespesa.mutate(nova as Parameters<typeof createDespesa.mutate>[0], {
      onSuccess: () => addLog({ categoria: "financeiro", acao: "despesa_criada", entidade_id: nova.id, descricao: `Despesa "${nova.descricao}" criada — ${formatCurrency(nova.valor)}`, detalhes: { descricao: nova.descricao, valor: nova.valor, categoria: getCatNome(nova), fornecedor: nova.fornecedor } }),
    });
  };
  const filtered = despesas.filter(
    (d) => {
      const catNome = getCatNome(d);
      const matchSearch = d.descricao.toLowerCase().includes(search.toLowerCase()) ||
        d.fornecedor.toLowerCase().includes(search.toLowerCase()) ||
        catNome.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "todos" || d.status === statusFilter;
      const matchCategoria = categoriaFilter === "todos" || catNome === categoriaFilter;
      return matchSearch && matchStatus && matchCategoria;
    }
  );

  const handleConfirmPagamento = (desp: Despesa, dados: { formaPagamento: string; dataPagamento: string; observacao: string }) => {
    updateDespesa.mutate(
      { id: desp.id, patch: { status: "Pago", data_pagamento: dados.dataPagamento, usuario_pagou_id: "user-admin" } },
      {
        onSuccess: () => {
          addLog({ categoria: "financeiro", acao: "despesa_paga", entidade_id: desp.id, descricao: `Pagamento da despesa "${desp.descricao}" registrado — ${formatCurrency(desp.valor)}`, detalhes: { forma_pagamento: dados.formaPagamento, data_pagamento: dados.dataPagamento } });
          toast.success(`Pagamento da despesa "${desp.descricao}" registrado com sucesso.`);
        },
      }
    );
  };

  const columns: Column<Despesa>[] = [
    { key: "descricao", header: "Descrição", sortable: true, cell: (d) => <span className="font-medium">{d.descricao}</span> },
    { key: "categoria_id", header: "Categoria", sortable: true, cell: (d) => <Badge variant="outline" className="text-xs">{getCatNome(d)}</Badge> },
    { key: "fornecedor", header: "Fornecedor", sortable: true, cell: (d) => <span>{d.fornecedor}</span> },
    { key: "vencimento", header: "Vencimento", sortable: true, cell: (d) => <span className="text-sm">{formatDateBR(d.vencimento)}</span> },
    {
      key: "valor", header: "Valor", sortable: true,
      cell: (d) => <span className="font-semibold tabular-nums">{formatCurrency(d.valor)}</span>,
    },
    {
      key: "status", header: "Status",
      cell: (d) => <Badge variant={STATUS_DESPESA_VARIANT[d.status]}>{d.status}</Badge>,
    },
    {
      key: "acoes", header: "Ações", className: "text-center",
      cell: (d) =>
        d.status !== "Pago" ? (
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={(e) => { e.stopPropagation(); setDespesaPagar(d); }}>
            <Check className="h-3.5 w-3.5" /> Pagar
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">{d.data_pagamento ? formatDateBR(d.data_pagamento) : "—"}</span>
        ),
    },
  ];

  const renderMobileCard = (d: Despesa) => (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{d.descricao}</span>
        <Badge variant={STATUS_DESPESA_VARIANT[d.status]} className="text-xs">{d.status}</Badge>
      </div>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{getCatNome(d)}</span>
        <span className="font-semibold tabular-nums text-foreground">{formatCurrency(d.valor)}</span>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{d.fornecedor}</span>
        <span>Venc.: {formatDateBR(d.vencimento)}</span>
      </div>
      {d.status !== "Pago" && (
        <Button variant="outline" size="sm" className="w-full gap-1.5 mt-1" onClick={() => setDespesaPagar(d)}>
          <Check className="h-3.5 w-3.5" /> Marcar como Paga
        </Button>
      )}
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por descrição, fornecedor ou categoria..." className="flex-1 min-w-[200px]" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="Pendente">Pendente</SelectItem>
            <SelectItem value="Pago">Pago</SelectItem>
            <SelectItem value="Atrasado">Atrasado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || statusFilter !== "todos" || categoriaFilter !== "todos") && (
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => { setSearch(""); setStatusFilter("todos"); setCategoriaFilter("todos"); }}>
            <X className="h-3.5 w-3.5" /> Limpar filtros
          </Button>
        )}
        <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Nova Despesa
        </Button>
      </div>
      <DataTable
        data={filtered}
        columns={columns}
        pageSize={10}
        renderMobileCard={renderMobileCard}
        emptyTitle="Nenhuma despesa encontrada"
        emptySubtitle="Adicione despesas para controlar seus gastos."
      />
      <NovaDespesaDialog open={dialogOpen} onOpenChange={setDialogOpen} onSave={handleAddDespesa} />
      <PagarDespesaDialog
        despesa={despesaPagar}
        open={!!despesaPagar}
        onOpenChange={(open) => !open && setDespesaPagar(null)}
        onConfirm={handleConfirmPagamento}
      />
    </div>
  );
}

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
import { useCreateDespesa, useUpdateDespesa, useDeleteDespesa, useCategorias } from "@/hooks/useFinanceiro";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { NovaDespesaDialog } from "./NovaDespesaDialog";
import { PagarDespesaDialog } from "./PagarDespesaDialog";

interface DespesasTabProps {
  despesas: Despesa[];
}

export function DespesasTab({ despesas }: DespesasTabProps) {
  const { addLog } = useLogStore();
  const createDespesa = useCreateDespesa();
  const updateDespesa = useUpdateDespesa();
  const deleteDespesa = useDeleteDespesa();
  const { data: allCategorias = [] } = useCategorias();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [categoriaFilter, setCategoriaFilter] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [despesaEditar, setDespesaEditar] = useState<Despesa | null>(null);
  const [despesaExcluir, setDespesaExcluir] = useState<Despesa | null>(null);
  const [despesaPagar, setDespesaPagar] = useState<Despesa | null>(null);

  const catMap = useMemo(() => {
    const m: Record<string, string> = {};
    allCategorias.forEach((c) => { m[c.id] = c.nome; });
    return m;
  }, [allCategorias]);

  const getCatNome = useCallback((d: Despesa) => (d.categoria_id ? catMap[d.categoria_id] : null) ?? "Sem categoria", [catMap]);

  const categorias = useMemo(() => [...new Set(despesas.map((d) => getCatNome(d)))].sort(), [despesas, getCatNome]);

  const handleAddDespesa = (nova: Omit<Despesa, "id" | "created_at" | "updated_at">) => {
    createDespesa.mutate(nova as Parameters<typeof createDespesa.mutate>[0], {
      onSuccess: (salva) => {
        toast.success(`Despesa "${nova.descricao}" criada com sucesso!`);
        addLog({ categoria: "financeiro", acao: "despesa_criada", entidade_id: salva.id, descricao: `Despesa "${nova.descricao}" criada — ${formatCurrency(nova.valor)}`, detalhes: { descricao: nova.descricao, valor: nova.valor, fornecedor: nova.fornecedor } });
      },
      onError: (err) => toast.error(`Erro ao salvar despesa: ${err.message}`),
    });
  };

  const handleEditDespesa = (patch: Omit<Despesa, "id" | "created_at" | "updated_at">) => {
    if (!despesaEditar) return;
    updateDespesa.mutate(
      { id: despesaEditar.id, patch: patch as Parameters<typeof updateDespesa.mutate>[0]["patch"] },
      {
        onSuccess: () => {
          toast.success(`Despesa "${patch.descricao}" atualizada!`);
          addLog({ categoria: "financeiro", acao: "despesa_editada", entidade_id: despesaEditar.id, descricao: `Despesa "${patch.descricao}" editada — ${formatCurrency(patch.valor)}`, detalhes: { descricao: patch.descricao, valor: patch.valor } });
          setDespesaEditar(null);
        },
        onError: (err) => toast.error(`Erro ao atualizar despesa: ${err.message}`),
      }
    );
  };

  const handleConfirmExcluir = () => {
    if (!despesaExcluir) return;
    deleteDespesa.mutate(despesaExcluir.id, {
      onSuccess: () => {
        toast.success(`Despesa "${despesaExcluir.descricao}" excluída.`);
        addLog({ categoria: "financeiro", acao: "despesa_excluida", entidade_id: despesaExcluir.id, descricao: `Despesa "${despesaExcluir.descricao}" excluída`, detalhes: { valor: despesaExcluir.valor } });
        setDespesaExcluir(null);
      },
      onError: (err) => toast.error(`Erro ao excluir despesa: ${err.message}`),
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
      key: "acoes", header: "Ações", className: "text-right",
      cell: (d) => (
        <div className="flex items-center justify-end gap-1">
          {d.status !== "Pago" && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-emerald-500 hover:text-emerald-400" onClick={(e) => { e.stopPropagation(); setDespesaPagar(d); }}>
              <Check className="h-3.5 w-3.5" /> Pagar
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); setDespesaEditar(d); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDespesaExcluir(d); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
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
      <div className="flex gap-2 mt-1">
        {d.status !== "Pago" && (
          <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => setDespesaPagar(d)}>
            <Check className="h-3.5 w-3.5" /> Pagar
          </Button>
        )}
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setDespesaEditar(d)}>
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setDespesaExcluir(d)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por descrição, fornecedor ou categoria..." className="flex-1 min-w-0 w-full sm:w-auto" />
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
      <NovaDespesaDialog
        open={!!despesaEditar}
        onOpenChange={(open) => !open && setDespesaEditar(null)}
        onSave={handleEditDespesa}
        despesaEditar={despesaEditar}
      />
      <PagarDespesaDialog
        despesa={despesaPagar}
        open={!!despesaPagar}
        onOpenChange={(open) => !open && setDespesaPagar(null)}
        onConfirm={handleConfirmPagamento}
      />
      <AlertDialog open={!!despesaExcluir} onOpenChange={(open) => !open && setDespesaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
            <AlertDialogDescription>
              A despesa <strong>"{despesaExcluir?.descricao}"</strong> de{" "}
              <strong>{despesaExcluir ? formatCurrency(despesaExcluir.valor) : ""}</strong> será removida permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleConfirmExcluir}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

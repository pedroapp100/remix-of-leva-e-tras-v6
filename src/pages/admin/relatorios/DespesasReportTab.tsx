import { useState } from "react";
import { DataTable, SearchInput } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import type { Despesa } from "@/types/database";
import { STATUS_DESPESA_VARIANT } from "@/lib/formatters";
import { useDespesas } from "@/hooks/useFinanceiro";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import type { DateRange } from "react-day-picker";

interface DespesasReportTabProps {
  dateRange?: DateRange;
}

export function DespesasReportTab({ dateRange }: DespesasReportTabProps) {
  const { data: despesas = [] } = useDespesas();
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todas");

  const categorias = [...new Set(despesas.map((d) => d.categoria_id ?? "Sem categoria"))];

  const filtered = despesas.filter((d) => {
    const matchSearch =
      d.descricao.toLowerCase().includes(search.toLowerCase()) ||
      d.fornecedor.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || d.status === statusFilter;
    const matchCategoria = categoriaFilter === "todas" || (d.categoria_id ?? "Sem categoria") === categoriaFilter;
    let matchDate = true;
    if (dateRange?.from) {
      const dt = new Date(d.vencimento);
      matchDate = dt >= dateRange.from && (!dateRange.to || dt <= dateRange.to);
    }
    return matchSearch && matchStatus && matchCategoria && matchDate;
  });

  const columns: Column<Despesa>[] = [
    { key: "descricao", header: "Descrição", sortable: true, cell: (d) => <span className="font-medium">{d.descricao}</span> },
    { key: "categoria_id", header: "Categoria", sortable: true, cell: (d) => <Badge variant="outline" className="text-xs">{d.categoria_id ?? "—"}</Badge> },
    { key: "fornecedor", header: "Fornecedor", sortable: true, cell: (d) => <span>{d.fornecedor}</span> },
    { key: "vencimento", header: "Vencimento", sortable: true, cell: (d) => <span className="text-sm">{formatDateBR(d.vencimento)}</span> },
    { key: "valor", header: "Valor", sortable: true, cell: (d) => <span className="font-semibold tabular-nums">{formatCurrency(d.valor)}</span> },
    { key: "status", header: "Status", cell: (d) => <Badge variant={STATUS_DESPESA_VARIANT[d.status]}>{d.status}</Badge> },
  ];

  const renderMobileCard = (d: Despesa) => (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{d.descricao}</span>
        <Badge variant={STATUS_DESPESA_VARIANT[d.status]} className="text-xs">{d.status}</Badge>
      </div>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{d.categoria_id ?? "—"}</span>
        <span className="font-semibold tabular-nums text-foreground">{formatCurrency(d.valor)}</span>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar despesas..." className="flex-1" />
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas Categorias</SelectItem>
            {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="Pendente">Pendente</SelectItem>
            <SelectItem value="Pago">Pago</SelectItem>
            <SelectItem value="Atrasado">Atrasado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTable
        data={filtered}
        columns={columns}
        pageSize={10}
        renderMobileCard={renderMobileCard}
        emptyTitle="Nenhuma despesa encontrada"
        emptySubtitle="Ajuste os filtros para visualizar as despesas."
      />
    </div>
  );
}

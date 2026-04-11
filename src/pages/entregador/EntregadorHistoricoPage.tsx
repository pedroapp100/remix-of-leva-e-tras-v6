import { useState, useMemo } from "react";
import { PageContainer } from "@/components/shared/PageContainer";
import { SearchInput } from "@/components/shared/SearchInput";
import { DataTable } from "@/components/shared/DataTable";
import type { Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { exportCSV, exportPDF } from "@/lib/exportTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import { useSolicitacoesByEntregador } from "@/hooks/useSolicitacoes";
import { useClientes } from "@/hooks/useClientes";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Calendar, User, Eye, X } from "lucide-react";
import type { Solicitacao, StatusSolicitacao } from "@/types/database";
import { STATUS_SOLICITACAO_LABELS } from "@/types/database";
import { ViewSolicitacaoDialog } from "@/pages/admin/solicitacoes/ViewSolicitacaoDialog";
import { useEntregadorId } from "@/hooks/useEntregadorId";

export default function EntregadorHistoricoPage() {
  const { entregadorId: ENTREGADOR_ID } = useEntregadorId();
  const { data: solicitacoes = [] } = useSolicitacoesByEntregador(ENTREGADOR_ID ?? "");
  const { data: clientes = [] } = useClientes();
  const getClienteNome = (id: string) => clientes.find((c) => c.id === id)?.nome ?? id;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [viewSol, setViewSol] = useState<Solicitacao | null>(null);

  const entregas = useMemo(() => {
    return solicitacoes
      .filter((s) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return s.codigo.toLowerCase().includes(q) || getClienteNome(s.cliente_id).toLowerCase().includes(q);
      })
      .filter((s) => statusFilter === "todos" || s.status === statusFilter)
      .filter((s) => {
        if (!dateRange?.from) return true;
        const solDate = new Date(s.data_solicitacao);
        const from = new Date(dateRange.from);
        from.setHours(0, 0, 0, 0);
        let match = solDate >= from;
        if (dateRange.to) {
          const to = new Date(dateRange.to);
          to.setHours(23, 59, 59, 999);
          match = match && solDate <= to;
        }
        return match;
      })
      .sort((a, b) => new Date(b.data_solicitacao).getTime() - new Date(a.data_solicitacao).getTime());
  }, [search, statusFilter, dateRange, solicitacoes, clientes]);

  const columns: Column<Solicitacao>[] = [
    { key: "codigo", header: "Código", sortable: true, cell: (s) => <span className="text-sm font-medium">{s.codigo}</span> },
    { key: "cliente_id", header: "Cliente", cell: (s) => <span className="text-sm text-muted-foreground">{getClienteNome(s.cliente_id)}</span> },
    { key: "ponto_coleta", header: "Coleta", cell: (s) => <span className="text-sm text-muted-foreground truncate max-w-[200px] block">{s.ponto_coleta}</span> },
    { key: "data_solicitacao", header: "Data", sortable: true, cell: (s) => <span className="text-sm">{formatDateBR(s.data_solicitacao)}</span> },
    
    { key: "status", header: "Status", cell: (s) => <StatusBadge status={s.status} /> },
    {
      key: "actions",
      header: "",
      cell: (s) => (
        <Button variant="ghost" size="icon" onClick={() => setViewSol(s)}>
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const renderMobileCard = (s: Solicitacao) => (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{s.codigo}</span>
            <StatusBadge status={s.status} />
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{getClienteNome(s.cliente_id)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{s.ponto_coleta}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>{formatDateBR(s.data_solicitacao)}</span>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0 space-y-2">
          <Button variant="ghost" size="sm" onClick={() => setViewSol(s)}>
            <Eye className="h-4 w-4 mr-1" /> Ver
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <PageContainer
      title="Histórico de Entregas"
      subtitle="Todas as suas corridas realizadas."
      actions={
        <ExportDropdown
          onExportPDF={() => {
            const cfg = {
              title: "Histórico de Entregas",
              subtitle: `${entregas.length} entregas`,
              headers: ["Código", "Cliente", "Coleta", "Data", "Status"],
              rows: entregas.map((s) => [
                s.codigo, getClienteNome(s.cliente_id), s.ponto_coleta,
                formatDateBR(s.data_solicitacao),
                s.status,
              ]),
              filename: "historico-entregas",
            };
            exportPDF(cfg);
          }}
          onExportExcel={() => {
            exportCSV({
              title: "Histórico de Entregas",
              headers: ["Código", "Cliente", "Coleta", "Data", "Status"],
              rows: entregas.map((s) => [
                s.codigo, getClienteNome(s.cliente_id), s.ponto_coleta,
                formatDateBR(s.data_solicitacao),
                s.status,
              ]),
              filename: "historico-entregas",
            });
          }}
        />
      }
    >
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div data-onboarding="driver-history-filters" className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar por código ou cliente..." className="flex-1 min-w-[200px]" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="aceita">Aceita</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <DatePickerWithRange value={dateRange} onChange={setDateRange} />
            {(search || statusFilter !== "todos" || dateRange?.from) && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => { setSearch(""); setStatusFilter("todos"); setDateRange(undefined); }}>
                <X className="h-3.5 w-3.5" /> Limpar filtros
              </Button>
            )}
          </div>

          <DataTable
            data={entregas}
            columns={columns}
            pageSize={10}
            renderMobileCard={renderMobileCard}
            emptyTitle="Nenhuma entrega encontrada"
            emptySubtitle="Tente ajustar a busca."
          />
        </CardContent>
      </Card>

      <ViewSolicitacaoDialog solicitacao={viewSol} onClose={() => setViewSol(null)} isDriverView />
    </PageContainer>
  );
}

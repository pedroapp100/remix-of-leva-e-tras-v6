import { useState, useMemo } from "react";
import { PageContainer } from "@/components/shared/PageContainer";
import { SearchInput } from "@/components/shared/SearchInput";
import { DataTable } from "@/components/shared/DataTable";
import type { Column } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import { getEntregadorName, STATUS_TABS } from "@/data/mockSolicitacoes";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import type { StatusSolicitacao, Solicitacao } from "@/types/database";
import { MapPin, Calendar, Eye, X } from "lucide-react";
import { ViewSolicitacaoDialog } from "@/pages/admin/solicitacoes/ViewSolicitacaoDialog";
import { useGlobalStore } from "@/contexts/GlobalStore";
import { TipoOperacaoBadge } from "@/components/shared/TipoOperacaoBadge";
import { useClienteId } from "@/hooks/useClienteId";

export default function MinhasSolicitacoesPage() {
  const { clienteId: CLIENTE_ID } = useClienteId();
  const { solicitacoes } = useGlobalStore();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<StatusSolicitacao | "todas">("todas");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [viewing, setViewing] = useState<Solicitacao | null>(null);

  const filtered = useMemo(() => {
    return solicitacoes
      .filter((s) => s.cliente_id === CLIENTE_ID)
      .filter((s) => tab === "todas" || s.status === tab)
      .filter((s) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return s.codigo.toLowerCase().includes(q) || s.ponto_coleta.toLowerCase().includes(q);
      })
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
  }, [search, tab, dateRange]);

  const columns: Column<Solicitacao>[] = [
    { key: "codigo", header: "Código", sortable: true, cell: (s) => <span className="text-sm font-medium">{s.codigo}</span> },
    { key: "ponto_coleta", header: "Coleta", cell: (s) => <span className="text-sm text-muted-foreground truncate max-w-[200px] block">{s.ponto_coleta}</span> },
    { key: "data_solicitacao", header: "Data", sortable: true, cell: (s) => <span className="text-sm">{formatDateBR(s.data_solicitacao)}</span> },
    { key: "tipo_operacao", header: "Tipo", cell: (s) => <TipoOperacaoBadge tipoOperacao={s.tipo_operacao} /> },
    { key: "entregador_id", header: "Entregador", cell: (s) => <span className="text-sm text-muted-foreground">{getEntregadorName(s.entregador_id)}</span> },
    { key: "valor_total_taxas", header: "Valor", sortable: true, cell: (s) => s.valor_total_taxas != null ? <span className="font-semibold tabular-nums">{formatCurrency(s.valor_total_taxas)}</span> : <span className="text-muted-foreground">—</span> },
    { key: "status", header: "Status", cell: (s) => <StatusBadge status={s.status} /> },
    {
      key: "id" as keyof Solicitacao,
      header: "Ações",
      cell: (s) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewing(s)}>
              <Eye className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Visualizar</TooltipContent>
        </Tooltip>
      ),
    },
  ];

  const renderMobileCard = (s: Solicitacao) => (
    <Card className="p-4 cursor-pointer" onClick={() => setViewing(s)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{s.codigo}</span>
            <TipoOperacaoBadge tipoOperacao={s.tipo_operacao} />
            <StatusBadge status={s.status} />
          </div>
          <div className="mt-2 space-y-1">
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
        <div className="text-right shrink-0">
          {s.valor_total_taxas != null && (
            <span className="text-base font-bold tabular-nums text-foreground">{formatCurrency(s.valor_total_taxas)}</span>
          )}
          {s.entregador_id && (
            <p className="text-xs text-muted-foreground mt-1">{getEntregadorName(s.entregador_id)}</p>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <PageContainer title="Minhas Solicitações" subtitle="Acompanhe suas entregas.">
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar por código ou ponto de coleta..." className="flex-1 sm:max-w-xs min-w-[200px]" />
            <DatePickerWithRange value={dateRange} onChange={setDateRange} />
            {(search || tab !== "todas" || dateRange?.from) && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => { setSearch(""); setTab("todas"); setDateRange(undefined); }}>
                <X className="h-3.5 w-3.5" /> Limpar filtros
              </Button>
            )}
          </div>

          <Tabs data-onboarding="request-status-client" value={tab} onValueChange={(v) => setTab(v as StatusSolicitacao | "todas")}>
            <TabsList className="flex-wrap">
              {STATUS_TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="text-xs">{t.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <DataTable
            data={filtered}
            columns={columns}
            pageSize={10}
            renderMobileCard={renderMobileCard}
            emptyTitle="Nenhuma solicitação encontrada"
            emptySubtitle="Tente ajustar os filtros."
          />
        </CardContent>
      </Card>

      <ViewSolicitacaoDialog solicitacao={viewing} onClose={() => setViewing(null)} />
    </PageContainer>
  );
}

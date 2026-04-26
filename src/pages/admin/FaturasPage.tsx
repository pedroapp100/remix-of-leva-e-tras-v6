import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageContainer, MetricCard, DataTable, SearchInput, StatusBadge } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import type { Fatura, StatusGeral } from "@/types/database";
import { STATUS_GERAL_LABELS } from "@/types/database";
import { STATUS_GERAL_VARIANT, TIPO_FATURAMENTO_LABELS, formatCurrency, formatDateBR } from "@/lib/formatters";
import { useFaturas } from "@/hooks/useFaturas";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { FileText, AlertTriangle, CheckCircle, Clock, Eye, Pencil, DollarSign, X, ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { exportCSV, exportPDF } from "@/lib/exportTable";
import { lazy, Suspense } from "react";
const FaturaDetailsModal = lazy(() => import("./faturas/FaturaDetailsModal").then(m => ({ default: m.FaturaDetailsModal })));

type TabFilter = "ativas" | "em_aberto" | "vencidas" | "finalizadas";

export default function FaturasPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: faturas = [] } = useFaturas();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [activeTab, setActiveTab] = useState<TabFilter>((searchParams.get("tab") as TabFilter) ?? "ativas");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [selectedFatura, setSelectedFatura] = useState<Fatura | null>(null);

  // Sync state → URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (activeTab !== "ativas") params.set("tab", activeTab);
    setSearchParams(params, { replace: true });
  }, [search, activeTab, setSearchParams]);

  // ── Single-pass metrics ──
  const metrics = useMemo(() => {
    let abertas = 0, vencidas = 0, valorVencido = 0, finalizadas = 0, saldoTotal = 0;

    for (const f of faturas) {
      const st = f.status_geral;
      if (st === "Aberta") abertas++;
      else if (st === "Vencida") { vencidas++; valorVencido += f.saldo_liquido ?? 0; }
      else if (st === "Finalizada") { finalizadas++; continue; }
      saldoTotal += f.saldo_liquido ?? 0;
    }

    return { abertas, vencidas, valorVencido, finalizadas, saldoTotal, ativas: abertas + vencidas };
  }, [faturas]);

  // ── Filtered data ──
  const filtered = useMemo(() => {
    return faturas.filter((f) => {
      const matchTab =
        activeTab === "ativas"    ? f.status_geral !== "Finalizada" :
        activeTab === "em_aberto" ? f.status_geral === "Aberta" :
        activeTab === "vencidas"  ? f.status_geral === "Vencida" :
        f.status_geral === "Finalizada";
      const matchSearch =
        f.numero.toLowerCase().includes(search.toLowerCase()) ||
        f.cliente_nome.toLowerCase().includes(search.toLowerCase());
      const matchTipo = tipoFilter === "todos" || f.tipo_faturamento === tipoFilter;
      let matchDate = true;
      if (dateRange?.from) {
        const emissao = new Date(f.data_emissao);
        matchDate = emissao >= dateRange.from && (!dateRange.to || emissao <= dateRange.to);
      }
      return matchTab && matchSearch && matchTipo && matchDate;
    });
  }, [faturas, activeTab, search, tipoFilter, dateRange]);

  // ── Columns ──
  const columns: Column<Fatura>[] = [
    {
      key: "numero",
      header: "Número",
      sortable: true,
      cell: (f) => <span className="font-mono font-medium text-sm">{f.numero}</span>,
    },
    {
      key: "cliente_nome",
      header: "Cliente",
      sortable: true,
      cell: (f) => <span className="font-medium">{f.cliente_nome}</span>,
    },
    {
      key: "tipo_faturamento",
      header: "Tipo",
      cell: (f) => (
        <Badge variant="outline" className="text-xs">
          {TIPO_FATURAMENTO_LABELS[f.tipo_faturamento]}
        </Badge>
      ),
    },
    {
      key: "data_emissao",
      header: "Emissão",
      sortable: true,
      cell: (f) => <span className="text-sm">{formatDateBR(f.data_emissao)}</span>,
    },
    {
      key: "data_vencimento",
      header: "Vencimento",
      sortable: true,
      cell: (f) => <span className="text-sm">{formatDateBR(f.data_vencimento)}</span>,
    },
    {
      key: "total_entregas",
      header: "Entregas",
      sortable: true,
      cell: (f) => <span className="tabular-nums">{f.total_entregas}</span>,
    },
    {
      key: "saldo_liquido",
      header: "Saldo Líquido",
      sortable: true,
      cell: (f) => {
        const saldo = f.saldo_liquido ?? 0;
        // saldo_liquido = total_creditos_loja - total_debitos_loja
        // Negativo = cliente deve à empresa (a cobrar); positivo = empresa deve ao cliente (crédito)
        return (
          <span className={cn("font-semibold tabular-nums",
            saldo < 0 ? "text-emerald-500" : saldo > 0 ? "text-destructive" : "text-muted-foreground"
          )}>
            {formatCurrency(Math.abs(saldo))}
          </span>
        );
      },
    },
    {
      key: "status_geral",
      header: "Status",
      cell: (f) => <StatusBadge status={f.status_geral} label={STATUS_GERAL_LABELS[f.status_geral]} />,
    },
    {
      key: "acoes",
      header: "Ações",
      className: "text-center",
      cell: (f) => (
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center justify-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setSelectedFatura(f); }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver detalhes</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  onClick={(e) => { e.stopPropagation(); setSelectedFatura(f); }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar fatura</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      ),
    },
  ];

  // ── Mobile card ──
  const renderMobileCard = (f: Fatura) => {
    const saldo = f.saldo_liquido ?? 0;
    return (
      <Card className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-medium">{f.numero}</span>
          <StatusBadge status={f.status_geral} label={STATUS_GERAL_LABELS[f.status_geral]} />
        </div>
        <p className="font-medium">{f.cliente_nome}</p>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{f.total_entregas} entregas</span>
          <span className={cn("font-semibold tabular-nums",
            saldo > 0 ? "text-emerald-500" : saldo < 0 ? "text-destructive" : "text-muted-foreground"
          )}>
            {formatCurrency(saldo)}
          </span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Emissão: {formatDateBR(f.data_emissao)}</span>
          <span>Venc.: {formatDateBR(f.data_vencimento)}</span>
        </div>
      </Card>
    );
  };

  return (
    <PageContainer
      title="Faturas"
      subtitle="Gerenciamento de faturas e fechamentos"
      actions={
        <ExportDropdown
          onExportPDF={() => {
            const cfg = {
              title: "Faturas",
              subtitle: `${filtered.length} faturas`,
              headers: ["Número", "Cliente", "Emissão", "Vencimento", "Entregas", "Saldo Líquido", "Status"],
              rows: filtered.map((f) => [
                f.numero, f.cliente_nome, formatDateBR(f.data_emissao), formatDateBR(f.data_vencimento),
                String(f.total_entregas), formatCurrency(f.saldo_liquido ?? 0), f.status_geral,
              ]),
              filename: "faturas",
            };
            exportPDF(cfg);
          }}
          onExportExcel={() => {
            exportCSV({
              title: "Faturas",
              headers: ["Número", "Cliente", "Tipo", "Emissão", "Vencimento", "Entregas", "Saldo Líquido", "Status"],
              rows: filtered.map((f) => [
                f.numero, f.cliente_nome, f.tipo_faturamento, formatDateBR(f.data_emissao),
                formatDateBR(f.data_vencimento), String(f.total_entregas),
                formatCurrency(f.saldo_liquido ?? 0), f.status_geral,
              ]),
              filename: "faturas",
            });
          }}
        />
      }
    >
      {/* MetricCards */}
      <div data-onboarding="invoice-filters" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard title="Abertas" value={metrics.abertas} icon={Clock} />
        <MetricCard title="Vencidas" value={metrics.vencidas} icon={AlertTriangle} subtitle={metrics.valorVencido > 0 ? formatCurrency(metrics.valorVencido) : undefined} />
        <MetricCard title="Finalizadas" value={metrics.finalizadas} icon={CheckCircle} />
        <MetricCard
          title="Saldo Pendente"
          value={formatCurrency(Math.abs(metrics.saldoTotal))}
          icon={DollarSign}
          valueColor={metrics.saldoTotal < 0 ? "text-emerald-500" : metrics.saldoTotal > 0 ? "text-destructive" : undefined}
          subtitle={metrics.saldoTotal < 0 ? "a receber da loja" : metrics.saldoTotal > 0 ? "a repassar à loja" : "quitado"}
        />
      </div>

      {/* Filters + Table */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="ativas" className="gap-1.5">
                <FileText className="h-4 w-4" /> Ativas
                <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                  {metrics.ativas}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="em_aberto" className="gap-1.5">
                <Clock className="h-4 w-4" /> Em Aberto
                <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                  {metrics.abertas}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="vencidas" className="gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Vencidas
                <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5 bg-destructive/15 text-destructive">
                  {metrics.vencidas}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="finalizadas" className="gap-1.5">
                <CheckCircle className="h-4 w-4" /> Finalizadas
                <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                  {metrics.finalizadas}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por número ou cliente..."
              className="flex-1 min-w-[200px]"
            />
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <div className="flex items-center gap-1.5">
                  <ListFilter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Tipo de fatura" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="por_entrega">Por Entrega</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="diario">Diário</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <DatePickerWithRange value={dateRange} onChange={setDateRange} />
            {(search || activeTab !== "ativas" || dateRange?.from || tipoFilter !== "todos") && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground w-full sm:w-auto" onClick={() => { setSearch(""); setActiveTab("ativas"); setDateRange(undefined); setTipoFilter("todos"); }}>
                <X className="h-3.5 w-3.5" /> Limpar filtros
              </Button>
            )}
          </div>

          {/* Table */}
          <DataTable
            data={filtered}
            columns={columns}
            pageSize={20}
            onRowClick={(row) => setSelectedFatura(row as Fatura)}
            renderMobileCard={renderMobileCard}
            emptyTitle="Nenhuma fatura encontrada"
            emptySubtitle="Ajuste os filtros ou aguarde novas faturas serem geradas."
          />
        </CardContent>
      </Card>

      {/* Detail Modal (lazy loaded) */}
      <Suspense fallback={null}>
        <FaturaDetailsModal
          fatura={selectedFatura}
          open={!!selectedFatura}
          onOpenChange={(open) => !open && setSelectedFatura(null)}
        />
      </Suspense>
    </PageContainer>
  );
}

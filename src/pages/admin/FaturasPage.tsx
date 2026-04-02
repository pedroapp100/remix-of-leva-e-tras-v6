import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageContainer, MetricCard, DataTable, SearchInput, StatusBadge } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import type { Fatura, StatusGeral } from "@/types/database";
import { STATUS_GERAL_LABELS } from "@/types/database";
import { STATUS_GERAL_VARIANT, TIPO_FATURAMENTO_LABELS } from "@/data/mockFaturas";
import { useGlobalStore } from "@/contexts/GlobalStore";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { FileText, AlertTriangle, CheckCircle, Clock, Eye, Pencil, DollarSign, X } from "lucide-react";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { exportCSV, exportPDF } from "@/lib/exportTable";
import { lazy, Suspense } from "react";
const FaturaDetailsModal = lazy(() => import("./faturas/FaturaDetailsModal").then(m => ({ default: m.FaturaDetailsModal })));

type TabFilter = "ativas" | "finalizadas";

export default function FaturasPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { faturas, updateFatura } = useGlobalStore();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [activeTab, setActiveTab] = useState<TabFilter>((searchParams.get("tab") as TabFilter) ?? "ativas");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedFatura, setSelectedFatura] = useState<Fatura | null>(null);

  // Sync state → URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (activeTab !== "ativas") params.set("tab", activeTab);
    setSearchParams(params, { replace: true });
  }, [search, activeTab, setSearchParams]);

  // ── Metrics ──
  const metrics = useMemo(() => {
    const abertas = faturas.filter((f) => f.status_geral === "Aberta").length;
    const vencidas = faturas.filter((f) => f.status_geral === "Vencida");
    const valorVencido = vencidas.reduce((s, f) => s + (f.saldo_liquido ?? 0), 0);
    const finalizadas = faturas.filter((f) => f.status_geral === "Finalizada").length;
    const saldoTotal = faturas
      .filter((f) => f.status_geral !== "Finalizada")
      .reduce((s, f) => s + (f.saldo_liquido ?? 0), 0);
    return { abertas, vencidas: vencidas.length, valorVencido, finalizadas, saldoTotal };
  }, [faturas]);

  // ── Filtered data ──
  const filtered = useMemo(() => {
    return faturas.filter((f) => {
      const matchTab = activeTab === "ativas"
        ? f.status_geral !== "Finalizada"
        : f.status_geral === "Finalizada";
      const matchSearch =
        f.numero.toLowerCase().includes(search.toLowerCase()) ||
        f.cliente_nome.toLowerCase().includes(search.toLowerCase());
      let matchDate = true;
      if (dateRange?.from) {
        const emissao = new Date(f.data_emissao);
        matchDate = emissao >= dateRange.from && (!dateRange.to || emissao <= dateRange.to);
      }
      return matchTab && matchSearch && matchDate;
    });
  }, [faturas, activeTab, search, dateRange]);

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
        return (
          <span className={cn("font-semibold tabular-nums",
            saldo > 0 ? "text-emerald-500" : saldo < 0 ? "text-destructive" : "text-muted-foreground"
          )}>
            {formatCurrency(saldo)}
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
        <MetricCard title="Saldo Pendente" value={formatCurrency(metrics.saldoTotal)} icon={DollarSign} />
      </div>

      {/* Filters + Table */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)}>
            <TabsList>
              <TabsTrigger value="ativas" className="gap-1.5">
                <FileText className="h-4 w-4" /> Ativas
                <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                  {faturas.filter((f) => f.status_geral !== "Finalizada").length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="finalizadas" className="gap-1.5">
                <CheckCircle className="h-4 w-4" /> Finalizadas
                <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                  {faturas.filter((f) => f.status_geral === "Finalizada").length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search + Date */}
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por número ou cliente..."
              className="flex-1 min-w-[200px]"
            />
            <DatePickerWithRange value={dateRange} onChange={setDateRange} />
            {(search || activeTab !== "ativas" || dateRange?.from) && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => { setSearch(""); setActiveTab("ativas"); setDateRange(undefined); }}>
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
          onFaturaUpdate={(updated) => {
            updateFatura(updated.id, () => updated);
            setSelectedFatura(updated);
          }}
        />
      </Suspense>
    </PageContainer>
  );
}

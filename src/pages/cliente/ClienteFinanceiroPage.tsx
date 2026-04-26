import { useState, useMemo, lazy, Suspense } from "react";
import type { Fatura } from "@/types/database";
import { motion } from "framer-motion";
import { FileText, DollarSign, Calendar, Package, AlertCircle, CheckCircle, Eye } from "lucide-react";
import { SearchInput } from "@/components/shared/SearchInput";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/shared/PageContainer";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { exportCSV, exportPDF } from "@/lib/exportTable";
import { MetricCard } from "@/components/shared/MetricCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/shared/DataTable";
import type { Column } from "@/components/shared/DataTable";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import { useFaturas } from "@/hooks/useFaturas";
import { cn } from "@/lib/utils";
import { PrePagoFinanceiroView } from "./PrePagoFinanceiroView";
import { useClienteId } from "@/hooks/useClienteId";

const FaturaDetailsModal = lazy(() =>
  import("@/pages/admin/faturas/FaturaDetailsModal").then((m) => ({ default: m.FaturaDetailsModal }))
);

type TabFiltro = "todas" | "abertas" | "vencidas" | "finalizadas";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function ClienteFinanceiroPage() {
  const { data: allFaturasGlobal = [] } = useFaturas();
  const { clienteId: CLIENTE_ID, cliente } = useClienteId();
  const isPrePago = cliente?.modalidade === "pre_pago";
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabFiltro>("todas");
  const [selectedFatura, setSelectedFatura] = useState<Fatura | null>(null);

  const allFaturas = useMemo(
    () =>
      allFaturasGlobal
        .filter((f) => f.cliente_id === CLIENTE_ID)
        .sort((a, b) => new Date(b.data_emissao).getTime() - new Date(a.data_emissao).getTime()),
    [allFaturasGlobal, CLIENTE_ID]
  );

  const metrics = useMemo(() => {
    let abertas = 0, vencidas = 0, finalizadas = 0, totalAberto = 0;
    for (const f of allFaturas) {
      if (f.status_geral === "Aberta") { abertas++; totalAberto += Math.abs(f.saldo_liquido ?? 0); }
      else if (f.status_geral === "Vencida") { vencidas++; totalAberto += Math.abs(f.saldo_liquido ?? 0); }
      else if (f.status_geral === "Finalizada") finalizadas++;
    }
    return { totalFaturas: allFaturas.length, totalAberto, abertas, vencidas, finalizadas };
  }, [allFaturas]);

  const faturas = useMemo(() => {
    return allFaturas.filter((f) => {
      const matchSearch = f.numero.toLowerCase().includes(search.toLowerCase());
      const matchTab =
        activeTab === "todas"       ? true :
        activeTab === "abertas"     ? f.status_geral === "Aberta" :
        activeTab === "vencidas"    ? f.status_geral === "Vencida" :
        f.status_geral === "Finalizada";
      return matchSearch && matchTab;
    });
  }, [allFaturas, search, activeTab]);

  const columns: Column<Fatura>[] = [
    { key: "numero", header: "Número", sortable: true, cell: (f) => <span className="text-sm font-medium">{f.numero}</span> },
    { key: "data_emissao", header: "Emissão", sortable: true, cell: (f) => <span className="text-sm">{formatDateBR(f.data_emissao)}</span> },
    { key: "data_vencimento", header: "Vencimento", sortable: true, cell: (f) => <span className="text-sm">{formatDateBR(f.data_vencimento)}</span> },
    { key: "total_entregas", header: "Entregas", sortable: true, cell: (f) => <span className="text-sm tabular-nums">{f.total_entregas}</span> },
    {
      key: "saldo_liquido", header: "Saldo", sortable: true,
      cell: (f) => (
        <span className={cn("font-semibold tabular-nums", (f.saldo_liquido ?? 0) > 0 ? "text-primary" : (f.saldo_liquido ?? 0) < 0 ? "text-destructive" : "text-muted-foreground")}>
          {formatCurrency(f.saldo_liquido ?? 0)}
        </span>
      ),
    },
    {
      key: "status_geral", header: "Status",
      cell: (f) => (
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={f.status_geral} />
          {f.status_geral === "Finalizada" && (
            <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-xs gap-1 h-5">
              <CheckCircle className="h-3 w-3" /> Paga
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "acoes", header: "",
      cell: (f) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-primary hover:bg-primary/10"
          onClick={(e) => { e.stopPropagation(); setSelectedFatura(f); }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const renderMobileCard = (f: Fatura) => (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{f.numero}</span>
            <StatusBadge status={f.status_geral} />
            {f.status_geral === "Finalizada" && (
              <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-xs gap-1 h-5">
                <CheckCircle className="h-3 w-3" /> Paga
              </Badge>
            )}
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>Emissão: {formatDateBR(f.data_emissao)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span>Vencimento: {formatDateBR(f.data_vencimento)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Package className="h-3 w-3 shrink-0" />
              <span>{f.total_entregas} entregas</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={cn("text-base font-bold tabular-nums", (f.saldo_liquido ?? 0) > 0 ? "text-primary" : (f.saldo_liquido ?? 0) < 0 ? "text-destructive" : "text-foreground")}>
            {formatCurrency(f.saldo_liquido ?? 0)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-primary hover:bg-primary/10 px-2"
            onClick={() => setSelectedFatura(f)}
          >
            <Eye className="h-3.5 w-3.5" /> Ver detalhes
          </Button>
        </div>
      </div>
    </Card>
  );

  const exportConfig = useMemo(() => {
    const headers = ["Número", "Emissão", "Vencimento", "Entregas", "Saldo", "Status"];
    const rows = faturas.map((f: Fatura) => [
      f.numero,
      formatDateBR(f.data_emissao),
      formatDateBR(f.data_vencimento),
      String(f.total_entregas),
      formatCurrency(f.saldo_liquido ?? 0),
      f.status_geral,
    ]);
    return { title: "Meus Fechamentos", headers, rows, filename: "meus-fechamentos" };
  }, [faturas]);

  if (isPrePago) {
    return <PrePagoFinanceiroView clienteId={CLIENTE_ID!} />;
  }

  return (
    <PageContainer
      title="Meu Financeiro"
      subtitle="Acompanhe seus fechamentos e faturas."
      actions={
        <ExportDropdown
          onExportPDF={() => exportPDF(exportConfig)}
          onExportExcel={() => exportCSV(exportConfig)}
        />
      }
    >
      {/* ── Cards de Métricas ── */}
      <motion.div
        data-onboarding="client-balance"
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid gap-4 grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={fadeUp}>
          <MetricCard title="Total de Faturas" value={metrics.totalFaturas} icon={FileText} subtitle="Todas as faturas" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard
            title="Saldo em Aberto"
            value={formatCurrency(metrics.totalAberto)}
            icon={DollarSign}
            subtitle="Abertas + Vencidas"
            className={metrics.totalAberto > 0 ? "border-l-4 border-l-chart-3" : ""}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard
            title="Faturas Vencidas"
            value={metrics.vencidas}
            icon={AlertCircle}
            subtitle="Requer atenção"
            className={metrics.vencidas > 0 ? "border-l-4 border-l-destructive" : ""}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard
            title="Pagas / Quitadas"
            value={metrics.finalizadas}
            icon={CheckCircle}
            subtitle="Totalmente quitadas"
            className={metrics.finalizadas > 0 ? "border-l-4 border-l-emerald-500" : ""}
          />
        </motion.div>
      </motion.div>

      {/* ── Tabela de Fechamentos ── */}
      <Card className="mt-6">
        <CardContent className="p-4 space-y-4">
          {/* Abas de filtro */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFiltro)}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="todas" className="gap-1.5">
                <FileText className="h-4 w-4" /> Todas
                <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                  {metrics.totalFaturas}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="abertas" className="gap-1.5">
                <DollarSign className="h-4 w-4" /> Abertas
                <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5">
                  {metrics.abertas}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="vencidas" className="gap-1.5">
                <AlertCircle className="h-4 w-4" /> Vencidas
                <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5 bg-destructive/15 text-destructive">
                  {metrics.vencidas}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="finalizadas" className="gap-1.5">
                <CheckCircle className="h-4 w-4" /> Finalizadas
                <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5 bg-emerald-500/15 text-emerald-600">
                  {metrics.finalizadas}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Busca */}
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por número..."
            className="sm:max-w-xs"
          />

          <DataTable
            data={faturas}
            columns={columns}
            pageSize={10}
            renderMobileCard={renderMobileCard}
            emptyTitle="Sem fechamentos"
            emptySubtitle="Nenhuma fatura encontrada para o filtro selecionado."
          />
        </CardContent>
      </Card>

      {/* Modal de detalhes (somente leitura para faturas finalizadas) */}
      <Suspense fallback={null}>
        {selectedFatura && (
          <FaturaDetailsModal
            fatura={selectedFatura}
            open={!!selectedFatura}
            onOpenChange={(open) => { if (!open) setSelectedFatura(null); }}
            viewOnly
          />
        )}
      </Suspense>
    </PageContainer>
  );
}

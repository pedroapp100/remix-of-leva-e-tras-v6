import { useState, useMemo } from "react";
import type { Fatura } from "@/types/database";
import { motion } from "framer-motion";
import { FileText, DollarSign, Calendar, Package, AlertCircle, X } from "lucide-react";
import { SearchInput } from "@/components/shared/SearchInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/shared/PageContainer";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { exportCSV, exportPDF } from "@/lib/exportTable";
import { MetricCard } from "@/components/shared/MetricCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/shared/DataTable";
import type { Column } from "@/components/shared/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import { useFaturas } from "@/hooks/useFaturas";
import { cn } from "@/lib/utils";
import { PrePagoFinanceiroView } from "./PrePagoFinanceiroView";
import { useClienteId } from "@/hooks/useClienteId";

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
  const [statusFilter, setStatusFilter] = useState("todos");

  const allFaturas = useMemo(
    () => allFaturasGlobal.filter((f) => f.cliente_id === CLIENTE_ID)
      .sort((a, b) => new Date(b.data_emissao).getTime() - new Date(a.data_emissao).getTime()),
    [allFaturasGlobal]
  );

  const faturas = useMemo(() => {
    return allFaturas.filter((f) => {
      const matchSearch = f.numero.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "todos" || f.status_geral === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [allFaturas, search, statusFilter]);

  const metrics = useMemo(() => {
    const abertas = allFaturas.filter((f) => f.status_geral === "Aberta" || f.status_geral === "Vencida");
    const totalAberto = abertas.reduce((sum, f) => sum + Math.abs(f.saldo_liquido ?? 0), 0);
    const vencidas = allFaturas.filter((f) => f.status_geral === "Vencida").length;
    return { totalFaturas: allFaturas.length, totalAberto, vencidas };
  }, [allFaturas]);

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
    { key: "status_geral", header: "Status", cell: (f) => <StatusBadge status={f.status_geral} /> },
  ];

  const renderMobileCard = (f: Fatura) => (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{f.numero}</span>
            <StatusBadge status={f.status_geral} />
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
        <div className="text-right shrink-0">
          <span className={cn("text-base font-bold tabular-nums", (f.saldo_liquido ?? 0) > 0 ? "text-primary" : (f.saldo_liquido ?? 0) < 0 ? "text-destructive" : "text-foreground")}>
            {formatCurrency(f.saldo_liquido ?? 0)}
          </span>
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
      <motion.div data-onboarding="client-balance" variants={stagger} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-3">
        <motion.div variants={fadeUp}>
          <MetricCard title="Total de Faturas" value={metrics.totalFaturas} icon={FileText} subtitle="Todas as faturas" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard title="Saldo em Aberto" value={formatCurrency(metrics.totalAberto)} icon={DollarSign} subtitle="Abertas + Vencidas" className={metrics.totalAberto > 0 ? "border-l-4 border-l-chart-3" : ""} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard title="Faturas Vencidas" value={metrics.vencidas} icon={FileText} subtitle="Requer atenção" className={metrics.vencidas > 0 ? "border-l-4 border-l-destructive" : ""} />
        </motion.div>
      </motion.div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Meus Fechamentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar por número..." className="flex-1 sm:max-w-xs min-w-[200px]" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Aberta">Aberta</SelectItem>
                <SelectItem value="Fechada">Fechada</SelectItem>
                <SelectItem value="Paga">Paga</SelectItem>
                <SelectItem value="Finalizada">Finalizada</SelectItem>
                <SelectItem value="Vencida">Vencida</SelectItem>
              </SelectContent>
            </Select>
            {(search || statusFilter !== "todos") && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => { setSearch(""); setStatusFilter("todos"); }}>
                <X className="h-3.5 w-3.5" /> Limpar filtros
              </Button>
            )}
          </div>
          <DataTable
            data={faturas}
            columns={columns}
            pageSize={10}
            renderMobileCard={renderMobileCard}
            emptyTitle="Sem fechamentos"
            emptySubtitle="Nenhuma fatura gerada ainda."
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}

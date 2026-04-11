import { useState, useMemo } from "react";
import { PageContainer } from "@/components/shared";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Users, TrendingDown, TrendingUp, DollarSign, CalendarDays, X } from "lucide-react";
import { ResumoFinanceiroTab } from "./relatorios/ResumoFinanceiroTab";
import { ClientesReportTab } from "./relatorios/ClientesReportTab";
import { ReceitasReportTab } from "./relatorios/ReceitasReportTab";
import { DespesasPrevistasTab } from "./relatorios/DespesasPrevistasTab";
import { ComissoesTab } from "./relatorios/ComissoesTab";
import { useDespesas, useReceitas } from "@/hooks/useFinanceiro";
import { useAllComissoes } from "@/hooks/useComissao";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import { exportCSV, exportPDF } from "@/lib/exportTable";
import { subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";

type QuickPeriod = "7d" | "15d" | "30d" | "mes_atual" | "mes_anterior" | "trimestre" | "ano" | "custom" | null;

const QUICK_PERIODS: { key: QuickPeriod; label: string }[] = [
  { key: "7d", label: "7 dias" },
  { key: "15d", label: "15 dias" },
  { key: "30d", label: "30 dias" },
  { key: "mes_atual", label: "Mês atual" },
  { key: "mes_anterior", label: "Mês anterior" },
  { key: "trimestre", label: "Trimestre" },
  { key: "ano", label: "Ano" },
];

function getDateRangeFromPeriod(period: QuickPeriod): DateRange | undefined {
  const today = new Date();
  switch (period) {
    case "7d": return { from: subDays(today, 7), to: today };
    case "15d": return { from: subDays(today, 15), to: today };
    case "30d": return { from: subDays(today, 30), to: today };
    case "mes_atual": return { from: startOfMonth(today), to: endOfMonth(today) };
    case "mes_anterior": {
      const prev = subMonths(today, 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    }
    case "trimestre": return { from: subMonths(today, 3), to: today };
    case "ano": return { from: startOfYear(today), to: today };
    default: return undefined;
  }
}

export default function RelatoriosPage() {
  const [activePeriod, setActivePeriod] = useState<QuickPeriod>(null);
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const { data: despesas = [] } = useDespesas();
  const { data: receitas = [] } = useReceitas();
  const comissoes = useAllComissoes();

  const dateRange = useMemo(() => {
    if (activePeriod === "custom") return customDateRange;
    if (activePeriod) return getDateRangeFromPeriod(activePeriod);
    return undefined;
  }, [activePeriod, customDateRange]);

  const handleQuickPeriod = (period: QuickPeriod) => {
    setActivePeriod(activePeriod === period ? null : period);
  };

  const handleCustomDate = (range: DateRange | undefined) => {
    setCustomDateRange(range);
    setActivePeriod(range ? "custom" : null);
  };

  const clearFilters = () => {
    setActivePeriod(null);
    setCustomDateRange(undefined);
  };

  const hasActiveFilter = activePeriod !== null;

  const handleExport = (format: "csv" | "pdf") => {
    const comRows = comissoes.map((c) => [
      c.nome, String(c.entregas), formatCurrency(c.valor_gerado),
      c.tipo_comissao === "percentual" ? `${c.taxa}%` : `R$ ${c.taxa}/entrega`,
      formatCurrency(c.comissao),
    ]);
    const despRows = despesas.map((d) => [
      d.descricao, d.categoria_id ?? "", d.fornecedor, formatDateBR(d.vencimento),
      formatCurrency(d.valor), d.status,
    ]);
    const recRows = receitas.map((r) => [
      r.descricao, r.categoria_id ?? "", formatDateBR(r.data_recebimento), formatCurrency(r.valor),
    ]);

    const headers = ["Seção", "Col1", "Col2", "Col3", "Col4", "Col5"];
    const rows = [
      ["── COMISSÕES ──", "", "", "", "", ""],
      ["Entregador", "Entregas", "Valor Gerado", "Tipo", "Comissão", ""],
      ...comRows.map((r) => [...r, ""]),
      ["── DESPESAS ──", "", "", "", "", ""],
      ["Descrição", "Categoria", "Fornecedor", "Vencimento", "Valor", "Status"],
      ...despRows,
      ["── RECEITAS ──", "", "", "", "", ""],
      ["Descrição", "Categoria", "Data", "Valor", "", ""],
      ...recRows.map((r) => [...r, "", ""]),
    ];

    const fn = format === "csv" ? exportCSV : exportPDF;
    fn({ title: "Relatórios", subtitle: "Comissões, Despesas e Receitas", headers, rows, filename: "relatorios" });
  };

  return (
    <PageContainer
      title="Relatórios"
      subtitle="Análises financeiras e operacionais"
      actions={<div data-onboarding="export-btn"><ExportDropdown onExportPDF={() => handleExport("pdf")} onExportExcel={() => handleExport("csv")} /></div>}
    >
      {/* Modern Filter Bar */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-muted-foreground">Período:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {QUICK_PERIODS.map(({ key, label }) => (
                <Button
                  key={key}
                  variant={activePeriod === key ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => handleQuickPeriod(key)}
                >
                  {label}
                </Button>
              ))}

              <div className="h-6 w-px bg-border hidden sm:block" />

              <DatePickerWithRange
                value={activePeriod === "custom" ? customDateRange : undefined}
                onChange={handleCustomDate}
                placeholder="Personalizado"
                className="shrink-0"
              />

              {hasActiveFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1 text-muted-foreground hover:text-destructive"
                  onClick={clearFilters}
                >
                  <X className="h-3.5 w-3.5" />
                  Limpar
                </Button>
              )}
            </div>

            {hasActiveFilter && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {activePeriod === "custom"
                    ? `${customDateRange?.from ? formatDateBR(customDateRange.from) : "..."} — ${customDateRange?.to ? formatDateBR(customDateRange.to) : "..."}`
                    : QUICK_PERIODS.find((p) => p.key === activePeriod)?.label
                  }
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <CardContent className="p-4">
          <Tabs defaultValue="resumo" data-onboarding="report-tabs">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="resumo" className="gap-1.5">
                <BarChart3 className="h-4 w-4" /> Resumo
              </TabsTrigger>
              <TabsTrigger value="clientes" className="gap-1.5">
                <Users className="h-4 w-4" /> Clientes
              </TabsTrigger>
              <TabsTrigger value="receitas" className="gap-1.5">
                <TrendingUp className="h-4 w-4" /> Receitas
              </TabsTrigger>
              <TabsTrigger value="despesas" className="gap-1.5">
                <TrendingDown className="h-4 w-4" /> Despesas
              </TabsTrigger>
              <TabsTrigger value="comissoes" className="gap-1.5">
                <DollarSign className="h-4 w-4" /> Comissões
              </TabsTrigger>
            </TabsList>
            <TabsContent value="resumo" className="mt-4">
              <ResumoFinanceiroTab dateRange={dateRange} />
            </TabsContent>
            <TabsContent value="clientes" className="mt-4">
              <ClientesReportTab />
            </TabsContent>
            <TabsContent value="receitas" className="mt-4">
              <ReceitasReportTab dateRange={dateRange} />
            </TabsContent>
            <TabsContent value="despesas" className="mt-4">
              <DespesasPrevistasTab dateRange={dateRange} />
            </TabsContent>
            <TabsContent value="comissoes" className="mt-4">
              <ComissoesTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

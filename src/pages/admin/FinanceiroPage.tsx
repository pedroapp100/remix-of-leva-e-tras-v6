import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { PageContainer, MetricCard } from "@/components/shared";
import type { LivroCaixaEntry } from "@/types/database";
import { useDespesas, useReceitas, useCategorias } from "@/hooks/useFinanceiro";
import { useFaturas } from "@/hooks/useFaturas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DollarSign, TrendingDown, Clock, CheckCircle, Receipt, BookOpen, RefreshCw } from "lucide-react";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { exportCSV, exportPDF } from "@/lib/exportTable";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { DespesasTab } from "./financeiro/DespesasTab";
import { ReceitasTab } from "./financeiro/ReceitasTab";
import { LivroCaixaTab } from "./financeiro/LivroCaixaTab";
import { DespesasRecorrentesTab } from "./financeiro/DespesasRecorrentesTab";

export default function FinanceiroPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: despesas = [] } = useDespesas();
  const { data: receitas = [] } = useReceitas();
  const { data: allCategorias = [] } = useCategorias();
  const { data: faturas = [] } = useFaturas();
  const activeFinTab = searchParams.get("tab") ?? "despesas";

  const catMap = useMemo(() => {
    const m: Record<string, string> = {};
    allCategorias.forEach((c) => { m[c.id] = c.nome; });
    return m;
  }, [allCategorias]);

  const getCatNome = useCallback((catId: string | null) => (catId ? catMap[catId] : null) ?? "Sem categoria", [catMap]);

  const setActiveFinTab = (tab: string) => {
    setSearchParams(tab !== "despesas" ? { tab } : {}, { replace: true });
  };

  const CHART_FILLS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-4))", "hsl(var(--chart-3))", "hsl(var(--chart-5))", "hsl(var(--muted-foreground))"];

  // Single-pass: metrics + fluxo mensal + despesas por categoria
  const { metrics, fluxoCaixaMensal, despesasPorCategoria } = useMemo(() => {
    const now = new Date();
    const monthBuckets: Record<string, { mes: string; receitas: number; despesas: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(" de ", "/").replace(".", "");
      monthBuckets[key] = { mes: label.charAt(0).toUpperCase() + label.slice(1), receitas: 0, despesas: 0 };
    }

    let totalDespesas = 0, pendentes = 0, pagas = 0;
    const catGrouped: Record<string, number> = {};

    for (const d of despesas) {
      totalDespesas += d.valor;
      if (d.status === "Pendente" || d.status === "Atrasado") pendentes += d.valor;
      else if (d.status === "Pago") pagas += d.valor;

      const mKey = d.vencimento?.slice(0, 7);
      if (mKey && monthBuckets[mKey]) monthBuckets[mKey].despesas += d.valor;

      const catNome = getCatNome(d.categoria_id);
      catGrouped[catNome] = (catGrouped[catNome] ?? 0) + d.valor;
    }

    let totalReceitas = 0;
    for (const r of receitas) {
      totalReceitas += r.valor;
      const mKey = r.data_recebimento?.slice(0, 7);
      if (mKey && monthBuckets[mKey]) monthBuckets[mKey].receitas += r.valor;
    }

    return {
      metrics: { totalDespesas, pendentes, pagas, totalReceitas },
      fluxoCaixaMensal: Object.values(monthBuckets),
      despesasPorCategoria: Object.entries(catGrouped).map(([categoria, valor], i) => ({
        categoria, valor, fill: CHART_FILLS[i % CHART_FILLS.length],
      })),
    };
  }, [despesas, receitas, getCatNome]);

  const livroCaixaEntries: LivroCaixaEntry[] = [];

  return (
    <PageContainer
      title="Financeiro"
      subtitle="Controle de receitas, despesas e fluxo de caixa"
      actions={
        <ExportDropdown
          onExportPDF={() => {
            const allData = [
              ...despesas.map((d) => ["Despesa", d.descricao, getCatNome(d.categoria_id), d.fornecedor, formatDateBR(d.vencimento), formatCurrency(d.valor), d.status]),
              ...receitas.map((r) => ["Receita", r.descricao, getCatNome(r.categoria_id), "", formatDateBR(r.data_recebimento), formatCurrency(r.valor), ""]),
            ];
            exportPDF({ title: "Financeiro", subtitle: "Despesas e Receitas", headers: ["Tipo", "Descrição", "Categoria", "Fornecedor", "Data", "Valor", "Status"], rows: allData, filename: "financeiro" });
          }}
          onExportExcel={() => {
            const allData = [
              ...despesas.map((d) => ["Despesa", d.descricao, getCatNome(d.categoria_id), d.fornecedor, formatDateBR(d.vencimento), formatCurrency(d.valor), d.status]),
              ...receitas.map((r) => ["Receita", r.descricao, getCatNome(r.categoria_id), "", formatDateBR(r.data_recebimento), formatCurrency(r.valor), ""]),
            ];
            exportCSV({ title: "Financeiro", headers: ["Tipo", "Descrição", "Categoria", "Fornecedor", "Data", "Valor", "Status"], rows: allData, filename: "financeiro" });
          }}
        />
      }
    >
      {/* MetricCards */}
      <div data-onboarding="finance-summary" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard title="Total Despesas" value={formatCurrency(metrics.totalDespesas)} icon={TrendingDown} />
        <MetricCard title="Pendentes" value={formatCurrency(metrics.pendentes)} icon={Clock} />
        <MetricCard title="Pagas" value={formatCurrency(metrics.pagas)} icon={CheckCircle} />
        <MetricCard title="Receitas" value={formatCurrency(metrics.totalReceitas)} icon={DollarSign} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart - Fluxo de Caixa */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fluxo de Caixa — Últimos 6 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={fluxoCaixaMensal} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="receitas" name="Receitas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - Despesas por Categoria */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={despesasPorCategoria}
                  dataKey="valor"
                  nameKey="categoria"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={2}
                  label={({ categoria, percent }) => `${categoria} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {despesasPorCategoria.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                  formatter={(value: number) => formatCurrency(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={activeFinTab} onValueChange={setActiveFinTab} data-onboarding="finance-tabs">
            <TabsList>
              <TabsTrigger value="despesas" className="gap-1.5">
                <TrendingDown className="h-4 w-4" /> Despesas
              </TabsTrigger>
              <TabsTrigger value="receitas" className="gap-1.5">
                <Receipt className="h-4 w-4" /> Receitas
              </TabsTrigger>
              <TabsTrigger value="recorrentes" className="gap-1.5">
                <RefreshCw className="h-4 w-4" /> Recorrentes
              </TabsTrigger>
              <TabsTrigger value="livro-caixa" className="gap-1.5">
                <BookOpen className="h-4 w-4" /> Livro Caixa
              </TabsTrigger>
            </TabsList>
            <TabsContent value="despesas" className="mt-4">
              <DespesasTab despesas={despesas} />
            </TabsContent>
            <TabsContent value="receitas" className="mt-4">
              <ReceitasTab receitas={receitas} faturas={faturas} />
            </TabsContent>
            <TabsContent value="recorrentes" className="mt-4">
              <DespesasRecorrentesTab />
            </TabsContent>
            <TabsContent value="livro-caixa" className="mt-4">
              <LivroCaixaTab entries={livroCaixaEntries} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

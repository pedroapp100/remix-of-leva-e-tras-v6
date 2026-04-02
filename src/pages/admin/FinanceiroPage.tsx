import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageContainer, MetricCard } from "@/components/shared";
import type { Despesa } from "@/types/database";
import { MOCK_DESPESAS, MOCK_RECEITAS, MOCK_LIVRO_CAIXA, FLUXO_CAIXA_MENSAL, DESPESAS_POR_CATEGORIA } from "@/data/mockFinanceiro";
import { MOCK_FATURAS } from "@/data/mockFaturas";
import type { Receita } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DollarSign, TrendingDown, Clock, CheckCircle, Receipt, BookOpen } from "lucide-react";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { exportCSV, exportPDF } from "@/lib/exportTable";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { DespesasTab } from "./financeiro/DespesasTab";
import { ReceitasTab } from "./financeiro/ReceitasTab";
import { LivroCaixaTab } from "./financeiro/LivroCaixaTab";

export default function FinanceiroPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [despesas, setDespesas] = useState<Despesa[]>(MOCK_DESPESAS);
  const [receitas, setReceitas] = useState<Receita[]>(MOCK_RECEITAS);
  const activeFinTab = searchParams.get("tab") ?? "despesas";

  const setActiveFinTab = (tab: string) => {
    setSearchParams(tab !== "despesas" ? { tab } : {}, { replace: true });
  };

  const metrics = useMemo(() => {
    const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0);
    const pendentes = despesas.filter((d) => d.status === "Pendente" || d.status === "Atrasado").reduce((s, d) => s + d.valor, 0);
    const pagas = despesas.filter((d) => d.status === "Pago").reduce((s, d) => s + d.valor, 0);
    const totalReceitas = receitas.reduce((s, r) => s + r.valor, 0);
    return { totalDespesas, pendentes, pagas, totalReceitas };
  }, [despesas]);

  return (
    <PageContainer
      title="Financeiro"
      subtitle="Controle de receitas, despesas e fluxo de caixa"
      actions={
        <ExportDropdown
          onExportPDF={() => {
            const allData = [
              ...despesas.map((d) => ["Despesa", d.descricao, d.categoria, d.fornecedor, formatDateBR(d.vencimento), formatCurrency(d.valor), d.status]),
              ...receitas.map((r) => ["Receita", r.descricao, r.categoria, "", formatDateBR(r.data_recebimento), formatCurrency(r.valor), ""]),
            ];
            exportPDF({ title: "Financeiro", subtitle: "Despesas e Receitas", headers: ["Tipo", "Descrição", "Categoria", "Fornecedor", "Data", "Valor", "Status"], rows: allData, filename: "financeiro" });
          }}
          onExportExcel={() => {
            const allData = [
              ...despesas.map((d) => ["Despesa", d.descricao, d.categoria, d.fornecedor, formatDateBR(d.vencimento), formatCurrency(d.valor), d.status]),
              ...receitas.map((r) => ["Receita", r.descricao, r.categoria, "", formatDateBR(r.data_recebimento), formatCurrency(r.valor), ""]),
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
              <BarChart data={FLUXO_CAIXA_MENSAL} barGap={4}>
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
                  data={DESPESAS_POR_CATEGORIA}
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
                  {DESPESAS_POR_CATEGORIA.map((entry, index) => (
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
              <TabsTrigger value="livro-caixa" className="gap-1.5">
                <BookOpen className="h-4 w-4" /> Livro Caixa
              </TabsTrigger>
            </TabsList>
            <TabsContent value="despesas" className="mt-4">
              <DespesasTab despesas={despesas} onUpdate={setDespesas} />
            </TabsContent>
            <TabsContent value="receitas" className="mt-4">
              <ReceitasTab receitas={receitas} onUpdate={setReceitas} faturas={MOCK_FATURAS} />
            </TabsContent>
            <TabsContent value="livro-caixa" className="mt-4">
              <LivroCaixaTab entries={MOCK_LIVRO_CAIXA} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

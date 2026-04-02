import { useMemo } from "react";
import { MetricCard } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_RECEITAS, MOCK_DESPESAS, FLUXO_CAIXA_MENSAL } from "@/data/mockFinanceiro";
import { formatCurrency } from "@/lib/formatters";
import { DollarSign, TrendingDown, TrendingUp, Percent } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DateRange } from "react-day-picker";

interface ResumoFinanceiroTabProps {
  dateRange?: DateRange;
}

const chartTooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))",
};

const axisTickStyle = { fontSize: 12, fill: "hsl(var(--muted-foreground))" };

export function ResumoFinanceiroTab({ dateRange }: ResumoFinanceiroTabProps) {
  const metrics = useMemo(() => {
    let receitas = MOCK_RECEITAS;
    let despesas = MOCK_DESPESAS;
    if (dateRange?.from) {
      receitas = receitas.filter((r) => {
        const d = new Date(r.data_recebimento);
        return d >= dateRange.from! && (!dateRange.to || d <= dateRange.to);
      });
      despesas = despesas.filter((d) => {
        const dt = new Date(d.vencimento);
        return dt >= dateRange.from! && (!dateRange.to || dt <= dateRange.to);
      });
    }
    const totalReceitas = receitas.reduce((s, r) => s + r.valor, 0);
    const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0);
    const lucro = totalReceitas - totalDespesas;
    const margem = totalReceitas > 0 ? (lucro / totalReceitas) * 100 : 0;
    return { totalReceitas, totalDespesas, lucro, margem };
  }, [dateRange]);

  const evolutionData = FLUXO_CAIXA_MENSAL.map((m) => ({
    mes: m.mes,
    receitas: m.receitas,
    despesas: m.despesas,
    lucro: m.receitas - m.despesas,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard title="Total Receitas" value={formatCurrency(metrics.totalReceitas)} icon={TrendingUp} />
        <MetricCard title="Total Despesas" value={formatCurrency(metrics.totalDespesas)} icon={TrendingDown} />
        <MetricCard title="Lucro Líquido" value={formatCurrency(metrics.lucro)} icon={DollarSign} />
        <MetricCard title="Margem %" value={`${metrics.margem.toFixed(1)}%`} icon={Percent} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Evolução Financeira — 6 Meses</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={axisTickStyle} />
              <YAxis tick={axisTickStyle} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="receitas" name="Receitas" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lucro" name="Lucro" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

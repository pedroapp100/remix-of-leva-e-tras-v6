import { useMemo } from "react";
import { MetricCard, DataTable } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RECEITAS_MENSAIS, RECEITAS_POR_TIPO_OPERACAO, RECEITAS_POR_CLIENTE, getReceitasMetrics } from "@/data/mockRelatorios";
import { formatCurrency } from "@/lib/formatters";
import { DollarSign, Target, TrendingUp, Zap } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Line, ComposedChart } from "recharts";
import type { DateRange } from "react-day-picker";

const chartTooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))",
};
const axisTickStyle = { fontSize: 12, fill: "hsl(var(--muted-foreground))" };

interface ReceitasReportTabProps {
  dateRange?: DateRange;
}

export function ReceitasReportTab({ dateRange }: ReceitasReportTabProps) {
  const metrics = useMemo(() => getReceitasMetrics(), []);

  const clienteColumns: Column<typeof RECEITAS_POR_CLIENTE[number]>[] = [
    { key: "cliente", header: "Cliente", sortable: true, cell: (c) => <span className="font-medium">{c.cliente}</span> },
    { key: "entregas", header: "Entregas", sortable: true, cell: (c) => <span className="tabular-nums">{c.entregas}</span> },
    { key: "receita", header: "Receita (Taxas)", sortable: true, cell: (c) => <span className="font-semibold tabular-nums text-primary">{formatCurrency(c.receita)}</span> },
  ];

  const renderMobileCard = (c: typeof RECEITAS_POR_CLIENTE[number]) => (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{c.cliente}</span>
        <span className="font-semibold tabular-nums text-primary">{formatCurrency(c.receita)}</span>
      </div>
      <div className="text-sm text-muted-foreground">{c.entregas} entregas</div>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard title="Receita Realizada" value={formatCurrency(metrics.totalRealizado)} icon={DollarSign} />
        <MetricCard title="Meta do Mês" value={formatCurrency(metrics.metaAtual)} icon={Target} subtitle={`${metrics.percentualMeta.toFixed(0)}% atingido`} />
        <MetricCard title="Ticket Médio/Entrega" value={formatCurrency(metrics.ticketMedio)} icon={TrendingUp} />
        <MetricCard title="Previsão Próx. Mês" value={formatCurrency(metrics.totalPrevistoProximoMes)} icon={Zap} />
      </div>

      <p className="text-xs text-muted-foreground">⚠️ Todas as receitas são provenientes das <strong>taxas de operação</strong> cobradas nas entregas.</p>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Realizado vs Previsto */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receitas — Realizado vs Previsto</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={RECEITAS_MENSAIS}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={axisTickStyle} />
                <YAxis tick={axisTickStyle} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="realizado" name="Realizado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="previsto" name="Previsto" stroke="hsl(var(--chart-4))" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: "hsl(var(--chart-4))" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Receita por Tipo de Operação */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receita por Tipo de Operação</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={RECEITAS_POR_TIPO_OPERACAO}
                  dataKey="valor"
                  nameKey="tipo"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={2}
                  label={({ tipo, percent }) => `${tipo} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {RECEITAS_POR_TIPO_OPERACAO.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Receita por Cliente */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Receita por Cliente (Taxas de Operação)</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={RECEITAS_POR_CLIENTE}
            columns={clienteColumns}
            pageSize={10}
            renderMobileCard={renderMobileCard}
            emptyTitle="Nenhuma receita encontrada"
            emptySubtitle="Sem dados de receitas no período."
          />
        </CardContent>
      </Card>
    </div>
  );
}

import { useMemo } from "react";
import { MetricCard, DataTable } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DESPESAS_MENSAIS, DESPESAS_RECORRENTES, getDespesasMetrics } from "@/data/mockRelatorios";
import { DESPESAS_POR_CATEGORIA } from "@/data/mockFinanceiro";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import { TrendingDown, Clock, AlertTriangle, CalendarClock } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Line, ComposedChart } from "recharts";
import type { DateRange } from "react-day-picker";

const chartTooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))",
};
const axisTickStyle = { fontSize: 12, fill: "hsl(var(--muted-foreground))" };

interface DespesasPrevistasTabProps {
  dateRange?: DateRange;
}

type DespesaRecorrente = typeof DESPESAS_RECORRENTES[number];

export function DespesasPrevistasTab({ dateRange }: DespesasPrevistasTabProps) {
  const metrics = useMemo(() => getDespesasMetrics(), []);

  const columns: Column<DespesaRecorrente>[] = [
    { key: "descricao", header: "Despesa", sortable: true, cell: (d) => <span className="font-medium">{d.descricao}</span> },
    { key: "categoria", header: "Categoria", cell: (d) => <Badge variant="outline" className="text-xs">{d.categoria}</Badge> },
    { key: "valor_mensal", header: "Valor Mensal", sortable: true, cell: (d) => <span className="font-semibold tabular-nums">{formatCurrency(d.valor_mensal)}</span> },
    { key: "proximo_vencimento", header: "Próx. Vencimento", sortable: true, cell: (d) => <span className="text-sm">{formatDateBR(d.proximo_vencimento)}</span> },
  ];

  const renderMobileCard = (d: DespesaRecorrente) => (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{d.descricao}</span>
        <Badge variant="outline" className="text-xs">{d.categoria}</Badge>
      </div>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{formatDateBR(d.proximo_vencimento)}</span>
        <span className="font-semibold tabular-nums text-foreground">{formatCurrency(d.valor_mensal)}</span>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard title="Total Realizado" value={formatCurrency(metrics.totalRealizado)} icon={TrendingDown} />
        <MetricCard title="Pendentes" value={formatCurrency(metrics.totalPendentes)} icon={Clock} />
        <MetricCard title="Atrasadas" value={formatCurrency(metrics.totalAtrasadas)} icon={AlertTriangle} />
        <MetricCard title="Previsão Próx. Mês" value={formatCurrency(metrics.previstoProximoMes)} icon={CalendarClock} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Realizado vs Previsto */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Despesas — Realizado vs Previsto</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={DESPESAS_MENSAIS}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={axisTickStyle} />
                <YAxis tick={axisTickStyle} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="realizado" name="Realizado" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="previsto" name="Previsto" stroke="hsl(var(--chart-5))" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: "hsl(var(--chart-5))" }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Despesas por Categoria */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
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
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Custo Recorrente Mensal */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Custo Fixo Mensal Estimado: </span>
          <span className="font-bold tabular-nums">{formatCurrency(metrics.totalRecorrente)}</span>
        </div>
      </Card>

      {/* Despesas Recorrentes Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Despesas Recorrentes — Próximos Vencimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={DESPESAS_RECORRENTES}
            columns={columns}
            pageSize={10}
            renderMobileCard={renderMobileCard}
            emptyTitle="Nenhuma despesa recorrente"
            emptySubtitle="Cadastre despesas fixas para projeções."
          />
        </CardContent>
      </Card>
    </div>
  );
}

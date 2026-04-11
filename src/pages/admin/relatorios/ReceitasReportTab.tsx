import { useMemo } from "react";
import { MetricCard, DataTable } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useReceitas } from "@/hooks/useFinanceiro";
import { useSolicitacoesAll } from "@/hooks/useSolicitacoes";
import { useClientes } from "@/hooks/useClientes";
import { formatCurrency } from "@/lib/formatters";
import { DollarSign, Target, TrendingUp, Zap } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Line, ComposedChart } from "recharts";
import type { DateRange } from "react-day-picker";

const CHART_FILLS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-4))", "hsl(var(--chart-3))", "hsl(var(--chart-5))", "hsl(var(--muted-foreground))"];

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
  const { data: receitas = [] } = useReceitas();
  const { data: solicitacoes = [] } = useSolicitacoesAll();
  const { data: clientes = [] } = useClientes();

  const metrics = useMemo(() => {
    const totalRealizado = receitas.reduce((s, r) => s + r.valor, 0);
    const concluidas = solicitacoes.filter((s) => s.status === "concluida").length;
    const ticketMedio = concluidas > 0 ? totalRealizado / concluidas : 0;
    return { totalRealizado, ticketMedio, metaAtual: 0, percentualMeta: 0, totalPrevistoProximoMes: 0 };
  }, [receitas, solicitacoes]);

  const receitasMensais = useMemo(() => {
    const months: Record<string, { mes: string; realizado: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(" de ", "/").replace(".", "");
      months[key] = { mes: label.charAt(0).toUpperCase() + label.slice(1), realizado: 0 };
    }
    receitas.forEach((r) => { const k = r.data_recebimento?.slice(0, 7); if (k && months[k]) months[k].realizado += r.valor; });
    return Object.values(months);
  }, [receitas]);

  const receitasPorCategoria = useMemo(() => {
    const grouped: Record<string, number> = {};
    receitas.forEach((r) => { const cat = r.categoria_id ?? "Sem categoria"; grouped[cat] = (grouped[cat] ?? 0) + r.valor; });
    return Object.entries(grouped).map(([tipo, valor], i) => ({ tipo, valor, fill: CHART_FILLS[i % CHART_FILLS.length] }));
  }, [receitas]);

  const receitasPorCliente = useMemo(() => {
    const grouped: Record<string, { cliente: string; receita: number; entregas: number }> = {};
    receitas.forEach((r) => {
      const clienteId = r.cliente_id ?? "";
      const nome = clientes.find((c) => c.id === clienteId)?.nome ?? "Outros";
      if (!grouped[clienteId]) grouped[clienteId] = { cliente: nome, receita: 0, entregas: 0 };
      grouped[clienteId].receita += r.valor;
    });
    solicitacoes.filter((s) => s.status === "concluida").forEach((s) => {
      const id = s.cliente_id ?? "";
      if (grouped[id]) grouped[id].entregas++;
    });
    return Object.entries(grouped).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.receita - a.receita).slice(0, 10);
  }, [receitas, solicitacoes, clientes]);

  type ClienteRow = typeof receitasPorCliente[number];

  const clienteColumns: Column<ClienteRow>[] = [
    { key: "cliente", header: "Cliente", sortable: true, cell: (c) => <span className="font-medium">{c.cliente}</span> },
    { key: "entregas", header: "Entregas", sortable: true, cell: (c) => <span className="tabular-nums">{c.entregas}</span> },
    { key: "receita", header: "Receita (Taxas)", sortable: true, cell: (c) => <span className="font-semibold tabular-nums text-primary">{formatCurrency(c.receita)}</span> },
  ];

  const renderMobileCard = (c: ClienteRow) => (
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
              <ComposedChart data={receitasMensais}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={axisTickStyle} />
                <YAxis tick={axisTickStyle} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="realizado" name="Realizado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
                  data={receitasPorCategoria}
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
                  {receitasPorCategoria.map((entry, index) => (
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
            data={receitasPorCliente}
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

import { useMemo } from "react";
import { MetricCard, DataTable } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getClientesPorModalidade } from "@/data/mockRelatorios";
import { formatCurrency } from "@/lib/formatters";
import { useGlobalStore } from "@/contexts/GlobalStore";
import { useSettingsStore } from "@/contexts/SettingsStore";
import { Users, CreditCard, Receipt, TrendingUp, AlertTriangle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

const chartTooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))",
};
const axisTickStyle = { fontSize: 12, fill: "hsl(var(--muted-foreground))" };

interface ClienteRow {
  id: string;
  nome: string;
  modalidade: string;
  status: string;
  receita: number;
  entregas: number;
}

export function ClientesReportTab() {
  const data = useMemo(() => getClientesPorModalidade(), []);
  const { getClienteSaldo } = useGlobalStore();
  const limiteMinimo = useSettingsStore((s) => s.limite_saldo_pre_pago);

  const columns: Column<ClienteRow>[] = [
    { key: "nome", header: "Cliente", sortable: true, cell: (c) => <span className="font-medium">{c.nome}</span> },
    {
      key: "modalidade", header: "Modalidade",
      cell: (c) => {
        const isPrePago = c.modalidade === "pre_pago";
        const saldo = isPrePago ? getClienteSaldo(c.id) : null;
        const saldoBaixo = isPrePago && saldo !== null && saldo < limiteMinimo;
        return (
          <div className="flex items-center gap-2">
            <Badge variant={c.modalidade === "faturado" ? "default" : "secondary"} className="text-xs">
              {c.modalidade === "faturado" ? "Faturado" : "Pré-pago"}
            </Badge>
            {saldoBaixo && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      {formatCurrency(saldo!)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Saldo abaixo do limite mínimo de {formatCurrency(limiteMinimo)}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      },
    },
    { key: "entregas", header: "Entregas", sortable: true, cell: (c) => <span className="tabular-nums">{c.entregas}</span> },
    { key: "receita", header: "Receita Gerada", sortable: true, cell: (c) => <span className="font-semibold tabular-nums">{formatCurrency(c.receita)}</span> },
    {
      key: "status", header: "Status",
      cell: (c) => (
        <Badge variant={c.status === "ativo" ? "default" : "outline"} className="text-xs">
          {c.status === "ativo" ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
  ];

  const renderMobileCard = (c: ClienteRow) => (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{c.nome}</span>
        <div className="flex items-center gap-1.5">
          <Badge variant={c.modalidade === "faturado" ? "default" : "secondary"} className="text-xs">
            {c.modalidade === "faturado" ? "Faturado" : "Pré-pago"}
          </Badge>
          {c.modalidade === "pre_pago" && (() => {
            const saldo = getClienteSaldo(c.id);
            return saldo !== null && saldo < limiteMinimo ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                <AlertTriangle className="h-3 w-3" />
                {formatCurrency(saldo)}
              </span>
            ) : null;
          })()}
        </div>
      </div>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{c.entregas} entregas</span>
        <span className="font-semibold tabular-nums text-foreground">{formatCurrency(c.receita)}</span>
      </div>
    </Card>
  );

  const comparativoData = [
    { label: "Receita", faturados: data.receitaFaturados, prePagos: data.receitaPrePagos },
    { label: "Entregas", faturados: data.entregasFaturados * 100, prePagos: data.entregasPrePagos * 100 },
  ];

  return (
    <div className="space-y-4">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard title="Clientes Faturados" value={String(data.totalFaturados)} icon={Receipt} subtitle={`${data.faturadosAtivos} ativos`} />
        <MetricCard title="Clientes Pré-pagos" value={String(data.totalPrePagos)} icon={CreditCard} subtitle={`${data.prePagosAtivos} ativos`} />
        <MetricCard title="Receita Faturados" value={formatCurrency(data.receitaFaturados)} icon={TrendingUp} />
        <MetricCard title="Receita Pré-pagos" value={formatCurrency(data.receitaPrePagos)} icon={Users} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie: Distribuição */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribuição de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data.distribuicao}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.distribuicao.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar: Receita por Modalidade */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receita por Modalidade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.receitaPorModalidade} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={axisTickStyle} />
                <YAxis tick={axisTickStyle} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="value" name="Receita" radius={[4, 4, 0, 0]}>
                  {data.receitaPorModalidade.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Faturas Status */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Faturas Abertas</p>
          <p className="text-2xl font-bold tabular-nums">{data.faturasAbertas}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Faturas Vencidas</p>
          <p className="text-2xl font-bold tabular-nums text-destructive">{data.faturasVencidas}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Faturas Pagas/Finalizadas</p>
          <p className="text-2xl font-bold tabular-nums text-primary">{data.faturasPagas}</p>
        </Card>
      </div>

      {/* Top Clientes Table */}
      <DataTable
        data={data.topClientes}
        columns={columns}
        pageSize={10}
        renderMobileCard={renderMobileCard}
        emptyTitle="Nenhum cliente encontrado"
        emptySubtitle="Não há dados de clientes disponíveis."
      />
    </div>
  );
}

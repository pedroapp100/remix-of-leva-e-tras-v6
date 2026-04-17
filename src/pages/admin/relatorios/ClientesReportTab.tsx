import { useMemo } from "react";
import { MetricCard, DataTable } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/formatters";
import { useClientes, useClienteSaldoMap } from "@/hooks/useClientes";
import { useSolicitacoesAll } from "@/hooks/useSolicitacoes";
import { useFaturas } from "@/hooks/useFaturas";
import { useSettingsStore } from "@/contexts/SettingsStore";
import { useReceitas } from "@/hooks/useFinanceiro";
import { Users, CreditCard, Receipt, TrendingUp, AlertTriangle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis, Legend } from "recharts";

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
  const { data: clientes = [] } = useClientes();
  const { data: solicitacoes = [] } = useSolicitacoesAll();
  const { data: faturas = [] } = useFaturas();
  const { getClienteSaldo } = useClienteSaldoMap();
  const { data: receitas = [] } = useReceitas();
  const limiteMinimo = useSettingsStore((s) => s.limite_saldo_pre_pago);

  const data = useMemo(() => {
    const faturados = clientes.filter((c) => c.modalidade === "faturado");
    const prePagos = clientes.filter((c) => c.modalidade === "pre_pago");
    const faturadosAtivos = faturados.filter((c) => c.status === "ativo").length;
    const prePagosAtivos = prePagos.filter((c) => c.status === "ativo").length;

    const receitaFaturados = receitas
      .filter((r) => { const cli = clientes.find((c) => c.id === r.cliente_id); return cli?.modalidade === "faturado"; })
      .reduce((s, r) => s + r.valor, 0);
    const receitaPrePagos = receitas
      .filter((r) => { const cli = clientes.find((c) => c.id === r.cliente_id); return cli?.modalidade === "pre_pago"; })
      .reduce((s, r) => s + r.valor, 0);

    const entregasFaturados = solicitacoes
      .filter((s) => { const cli = clientes.find((c) => c.id === s.cliente_id); return cli?.modalidade === "faturado" && s.status === "concluida"; }).length;
    const entregasPrePagos = solicitacoes
      .filter((s) => { const cli = clientes.find((c) => c.id === s.cliente_id); return cli?.modalidade === "pre_pago" && s.status === "concluida"; }).length;

    const faturasAbertas = faturas.filter((f) => f.status_geral === "Aberta").length;
    const faturasVencidas = faturas.filter((f) => f.status_geral === "Vencida").length;
    const faturasPagas = faturas.filter((f) => f.status_geral === "Paga" || f.status_geral === "Finalizada").length;

    const topClientes = clientes
      .filter((c) => c.status === "ativo")
      .map((c) => {
        const receita = receitas.filter((r) => r.cliente_id === c.id).reduce((s, r) => s + r.valor, 0);
        const entregas = solicitacoes.filter((s) => s.cliente_id === c.id && s.status === "concluida").length;
        return { ...c, receita, entregas };
      })
      .sort((a, b) => b.receita - a.receita);

    return {
      totalFaturados: faturados.length,
      totalPrePagos: prePagos.length,
      faturadosAtivos,
      prePagosAtivos,
      receitaFaturados,
      receitaPrePagos,
      entregasFaturados,
      entregasPrePagos,
      faturasAbertas,
      faturasVencidas,
      faturasPagas,
      distribuicao: [
        { name: "Faturados", value: faturados.length, fill: "hsl(var(--primary))" },
        { name: "Pré-pagos", value: prePagos.length, fill: "hsl(var(--chart-4))" },
      ],
      receitaPorModalidade: [
        { name: "Faturados", value: receitaFaturados, fill: "hsl(var(--primary))" },
        { name: "Pré-pagos", value: receitaPrePagos, fill: "hsl(var(--chart-4))" },
      ],
      topClientes,
    };
  }, [clientes, solicitacoes, faturas, receitas]);

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
                <UiTooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      {formatCurrency(saldo!)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Saldo abaixo do limite mínimo de {formatCurrency(limiteMinimo)}
                  </TooltipContent>
                </UiTooltip>
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
                <RechartsTooltip contentStyle={chartTooltipStyle} />
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
                <RechartsTooltip contentStyle={chartTooltipStyle} formatter={(value: number) => formatCurrency(value)} />
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
          <p className="text-xl sm:text-2xl font-bold tabular-nums">{data.faturasAbertas}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Faturas Vencidas</p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums text-destructive">{data.faturasVencidas}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground">Faturas Pagas/Finalizadas</p>
          <p className="text-xl sm:text-2xl font-bold tabular-nums text-primary">{data.faturasPagas}</p>
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

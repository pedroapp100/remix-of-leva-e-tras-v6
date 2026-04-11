import { useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  CreditCard,
  AlertTriangle,
  Truck,
  DollarSign,
  ClipboardList,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageContainer } from "@/components/shared/PageContainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import { useSolicitacoes } from "@/hooks/useSolicitacoes";
import { useFaturas } from "@/hooks/useFaturas";
import { useDespesas, useReceitas } from "@/hooks/useFinanceiro";

function useDashboardData() {
  const { data: solicitacoes = [] } = useSolicitacoes();
  const { data: faturas = [] } = useFaturas();
  const { data: despesas = [] } = useDespesas();
  const { data: receitas = [] } = useReceitas();

  const metrics = useMemo(() => {
    // Contas a Pagar
    const contasAPagar = despesas
      .filter((d) => d.status === "Pendente" || d.status === "Atrasado")
      .reduce((sum, d) => sum + d.valor, 0);

    // Faturas Vencidas
    const faturasVencidas = faturas.filter((f) => f.status_geral === "Vencida");
    const faturasVencidasValor = faturasVencidas.reduce(
      (sum, f) => sum + (f.valor_taxas || 0),
      0
    );

    // Entregas Hoje (concluídas hoje)
    const today = new Date().toISOString().slice(0, 10);
    const entregasHoje = solicitacoes.filter(
      (s) => s.status === "concluida" && s.data_conclusao?.slice(0, 10) === today
    ).length;

    // Calculate real average: entregas concluídas nos últimos 30 dias / 30
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const entregasUltimos30d = solicitacoes.filter((s) => {
      if (s.status !== "concluida" || !s.data_conclusao) return false;
      return new Date(s.data_conclusao) >= thirtyDaysAgo;
    }).length;
    const mediaEntregasDia = entregasUltimos30d > 0 ? Math.round(entregasUltimos30d / 30 * 10) / 10 : 1;

    // Taxas Recebidas (mês atual)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const taxasRecebidas = receitas
      .filter((r) => {
        const d = new Date(r.data_recebimento);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, r) => sum + r.valor, 0);

    // Novas Solicitações pendentes
    const novasSolicitacoes = solicitacoes.filter(
      (s) => s.status === "pendente"
    ).length;

    return {
      contasAPagar,
      faturasVencidas: faturasVencidas.length,
      faturasVencidasValor,
      entregasHoje,
      mediaEntregasDia,
      taxasRecebidas,
      novasSolicitacoes,
    };
  }, [solicitacoes, faturas, despesas, receitas]);

  // Recent transactions (últimas 10 receitas + despesas mescladas por data)
  const recentTransactions = useMemo(() => {
    const rec = receitas.map((r) => ({
      id: r.id,
      tipo: "entrada" as const,
      descricao: r.descricao,
      categoria: r.categoria_id,
      valor: r.valor,
      data: r.data_recebimento,
    }));

    const desp = despesas
      .filter((d) => d.data_pagamento)
      .map((d) => ({
        id: d.id,
        tipo: "saida" as const,
        descricao: d.descricao,
        categoria: d.categoria_id,
        valor: d.valor,
        data: d.data_pagamento!,
      }));

    return [...rec, ...desp]
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 10);
  }, [receitas, despesas]);

  return { metrics, recentTransactions };
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

export default function AdminDashboard() {
  const { metrics, recentTransactions } = useDashboardData();
  const navigate = useNavigate();

  return (
    <PageContainer title="Dashboard" subtitle="Visão geral das operações logísticas.">
      <>
        {/* MetricCards */}
          <motion.div
            data-onboarding="metric-cards"
            variants={stagger}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
          >
            <motion.div variants={fadeUp}>
              <MetricCard
                title="Contas a Pagar"
                value={formatCurrency(metrics.contasAPagar)}
                icon={CreditCard}
                subtitle="Pendentes + Atrasadas"
                className="border-l-4 border-l-primary"
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <MetricCard
                title="Faturas Vencidas"
                value={metrics.faturasVencidas}
                icon={AlertTriangle}
                subtitle={formatCurrency(metrics.faturasVencidasValor)}
                className="border-l-4 border-l-destructive"
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <MetricCard
                title="Entregas Hoje"
                value={metrics.entregasHoje}
                icon={Truck}
                subtitle="Concluídas"
                delta={metrics.mediaEntregasDia > 0 ? Math.round(((metrics.entregasHoje - metrics.mediaEntregasDia) / metrics.mediaEntregasDia) * 100) : 0}
                deltaLabel="vs média"
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <MetricCard
                title="Taxas Recebidas"
                value={formatCurrency(metrics.taxasRecebidas)}
                icon={DollarSign}
                subtitle="Mês atual"
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <MetricCard
                title="Novas Solicitações"
                value={metrics.novasSolicitacoes}
                icon={ClipboardList}
                subtitle="Aguardando ação"
                className={metrics.novasSolicitacoes > 0 ? "border-l-4 border-l-chart-3" : ""}
              />
            </motion.div>
          </motion.div>

          {/* Recent Transactions */}
          <motion.div
            data-onboarding="recent-requests"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="mt-6"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold">Últimas Transações</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => navigate("/admin/financeiro")}
                >
                  Ver todas <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {recentTransactions.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      icon={DollarSign}
                      title="Sem transações"
                      subtitle="Nenhuma transação registrada ainda."
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {recentTransactions.map((tx, i) => (
                      <motion.div
                        key={tx.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + i * 0.05 }}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors"
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            tx.tipo === "entrada"
                              ? "bg-primary/10 text-primary"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {tx.tipo === "entrada" ? (
                            <ArrowDownLeft className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{tx.descricao}</p>
                          <p className="text-xs text-muted-foreground">{tx.categoria}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p
                            className={`text-sm font-semibold tabular-nums ${
                              tx.tipo === "entrada" ? "text-primary" : "text-destructive"
                            }`}
                          >
                            {tx.tipo === "entrada" ? "+" : "-"}{formatCurrency(tx.valor)}
                          </p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {formatDateBR(tx.data)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
    </PageContainer>
  );
}

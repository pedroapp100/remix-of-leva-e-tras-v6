import { useMemo } from "react";
import { motion } from "framer-motion";
import { Package, Truck, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageContainer } from "@/components/shared/PageContainer";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import { useSolicitacoes } from "@/hooks/useSolicitacoes";
import { useFaturas } from "@/hooks/useFaturas";
import { useClienteSaldoMap } from "@/hooks/useClientes";
import { useEntregadores } from "@/hooks/useEntregadores";
import { useClienteId } from "@/hooks/useClienteId";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

export default function ClienteDashboard() {
  const { data: solicitacoes = [] } = useSolicitacoes();
  const { data: faturas = [] } = useFaturas();
  const { getClienteSaldo } = useClienteSaldoMap();
  const { data: entregadores = [] } = useEntregadores();
  const getEntregadorNome = (id: string | null | undefined) => !id ? "—" : (entregadores.find((e) => e.id === id)?.nome ?? id);
  const { clienteId, cliente } = useClienteId();
  const CLIENTE_ID = clienteId;
  const isPrePago = cliente?.modalidade === "pre_pago";

  // Single-pass: solicitações metrics + recent list + faturas metrics
  const { metrics, recentSolicitacoes } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let pedidosDoMes = 0, emAndamento = 0, concluidas = 0;
    const recents: typeof solicitacoes = [];

    for (const s of solicitacoes) {
      if (s.cliente_id !== CLIENTE_ID) continue;
      recents.push(s);
      const d = new Date(s.data_solicitacao);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) pedidosDoMes++;
      if (s.status === "em_andamento" || s.status === "aceita") emAndamento++;
      if (s.status === "concluida") concluidas++;
    }
    recents.sort((a, b) => new Date(b.data_solicitacao).getTime() - new Date(a.data_solicitacao).getTime());

    let saldoDevedor = 0, saldoAReceber = 0;
    for (const f of faturas) {
      if (f.cliente_id !== CLIENTE_ID || f.status_geral === "Finalizada") continue;
      const saldo = f.saldo_liquido ?? 0;
      if (saldo < 0) saldoDevedor += Math.abs(saldo);
      else saldoAReceber += saldo;
    }

    return {
      metrics: { pedidosDoMes, emAndamento, saldoDevedor, saldoAReceber, concluidas },
      recentSolicitacoes: recents.slice(0, 5),
    };
  }, [solicitacoes, faturas]);

  const saldoPrePago = isPrePago && CLIENTE_ID ? getClienteSaldo(CLIENTE_ID) : 0;

  return (
    <PageContainer title="Dashboard" subtitle="Visão geral das suas entregas e financeiro.">
      <motion.div data-onboarding="client-metrics" variants={stagger} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={fadeUp}>
          <MetricCard title="Pedidos do Mês" value={metrics.pedidosDoMes} icon={Package} subtitle="Solicitações criadas" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard title="Em Andamento" value={metrics.emAndamento} icon={Truck} subtitle="Aceitas + em trânsito" className={metrics.emAndamento > 0 ? "border-l-4 border-l-chart-3" : ""} />
        </motion.div>
        {isPrePago ? (
          <motion.div variants={fadeUp}>
            <MetricCard
              title="Saldo Pré-Pago"
              value={formatCurrency(saldoPrePago)}
              icon={Wallet}
              subtitle="Crédito disponível"
              className={saldoPrePago <= 100 ? "border-l-4 border-l-destructive" : "border-l-4 border-l-primary"}
            />
          </motion.div>
        ) : (
          <motion.div variants={fadeUp}>
            <MetricCard title="Saldo Devedor" value={formatCurrency(metrics.saldoDevedor)} icon={TrendingDown} subtitle="Você deve à operação" className={metrics.saldoDevedor > 0 ? "border-l-4 border-l-destructive" : ""} />
          </motion.div>
        )}
        <motion.div variants={fadeUp}>
          {isPrePago ? (
            <MetricCard
              title="Corridas Concluídas"
              value={metrics.concluidas}
              icon={Package}
              subtitle="Total de entregas finalizadas"
            />
          ) : (
            <MetricCard title="Saldo a Receber" value={formatCurrency(metrics.saldoAReceber)} icon={TrendingUp} subtitle="Operação deve repassar" className={metrics.saldoAReceber > 0 ? "border-l-4 border-l-primary" : ""} />
          )}
        </motion.div>
      </motion.div>

      <motion.div data-onboarding="client-recent" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Últimas Solicitações</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentSolicitacoes.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={Package} title="Sem solicitações" subtitle="Você ainda não possui solicitações." />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentSolicitacoes.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.05 }}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{s.codigo}</p>
                      <p className="text-xs text-muted-foreground">{formatDateBR(s.data_solicitacao)} • {getEntregadorNome(s.entregador_id)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {s.valor_total_taxas != null && (
                        <span className="text-sm font-semibold tabular-nums">{formatCurrency(s.valor_total_taxas)}</span>
                      )}
                      <StatusBadge status={s.status} />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </PageContainer>
  );
}

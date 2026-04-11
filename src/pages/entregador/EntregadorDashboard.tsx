import { useMemo } from "react";
import { motion } from "framer-motion";
import { Truck, CheckCircle2, DollarSign, TrendingUp, Package } from "lucide-react";
import { MetricCard } from "@/components/shared/MetricCard";
import { PageContainer } from "@/components/shared/PageContainer";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import { useSolicitacoes } from "@/hooks/useSolicitacoes";
import { useClientes } from "@/hooks/useClientes";
import { useComissao } from "@/hooks/useComissao";
import { useEntregadorId } from "@/hooks/useEntregadorId";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

export default function EntregadorDashboard() {
  const { entregadorId: ENTREGADOR_ID } = useEntregadorId();
  const { data: solicitacoes = [] } = useSolicitacoes();
  const { data: clientes = [] } = useClientes();
  const getClienteNome = (id: string) => clientes.find((c) => c.id === id)?.nome ?? id;
  const comissaoData = useComissao(ENTREGADOR_ID);

  const { metrics, recentEntregas } = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let corridasAtivas = 0, concluidasHoje = 0;
    const concluidas: typeof solicitacoes = [];

    for (const s of solicitacoes) {
      if (s.entregador_id !== ENTREGADOR_ID) continue;
      if (s.status === "em_andamento" || s.status === "aceita") corridasAtivas++;
      if (s.status === "concluida") {
        if (s.data_conclusao?.slice(0, 10) === today) concluidasHoje++;
        concluidas.push(s);
      }
    }

    const comissaoMes = comissaoData?.comissao ?? 0;
    const comissaoDia = comissaoMes > 0 ? Math.round((comissaoMes / 22) * 100) / 100 : 0;

    concluidas.sort((a, b) => new Date(b.data_conclusao!).getTime() - new Date(a.data_conclusao!).getTime());

    return {
      metrics: { corridasAtivas, concluidasHoje, comissaoDia, comissaoMes },
      recentEntregas: concluidas.slice(0, 5),
    };
  }, [solicitacoes, comissaoData]);

  return (
    <PageContainer title="Dashboard" subtitle="Suas corridas e comissões de hoje.">
      <motion.div data-onboarding="driver-metrics" variants={stagger} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={fadeUp}>
          <MetricCard title="Corridas Ativas" value={metrics.corridasAtivas} icon={Truck} subtitle="Aceitas + em andamento" className={metrics.corridasAtivas > 0 ? "border-l-4 border-l-chart-3" : ""} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard title="Concluídas Hoje" value={metrics.concluidasHoje} icon={CheckCircle2} subtitle="Entregas finalizadas" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard title="Comissão do Dia" value={formatCurrency(metrics.comissaoDia)} icon={DollarSign} subtitle="Estimativa" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard title="Comissão do Mês" value={formatCurrency(metrics.comissaoMes)} icon={TrendingUp} subtitle="Sobre receita operação" className="border-l-4 border-l-primary" />
        </motion.div>
      </motion.div>

      <motion.div data-onboarding="driver-pending" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Últimas Entregas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentEntregas.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={Package} title="Sem entregas" subtitle="Nenhuma entrega concluída ainda." />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentEntregas.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.05 }}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{s.codigo}</p>
                      <p className="text-xs text-muted-foreground">{getClienteNome(s.cliente_id)} • {formatDateBR(s.data_conclusao!)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
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

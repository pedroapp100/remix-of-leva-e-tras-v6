import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { PageContainer } from "@/components/shared/PageContainer";
import { MetricCard } from "@/components/shared/MetricCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDateBR } from "@/lib/formatters";
import { useSolicitacoesByEntregador, useUpdateSolicitacao, useRotasBySolicitacaoIds } from "@/hooks/useSolicitacoes";
import { useBairros } from "@/hooks/useSettings";
import { STATUS_SOLICITACAO_LABELS } from "@/types/database";
import { TipoOperacaoBadge } from "@/components/shared/TipoOperacaoBadge";
import type { Solicitacao } from "@/types/database";
import {
  Truck, Play, CheckCheck, MapPin, Package,
  ClipboardList, Eye, Navigation
} from "lucide-react";
import { ViewSolicitacaoDialog } from "@/pages/admin/solicitacoes/ViewSolicitacaoDialog";
import { toast } from "sonner";
import { sendNotificationToRole } from "@/services/notifications";
import { lazy, Suspense } from "react";
import { useEntregadorId } from "@/hooks/useEntregadorId";

const ConciliacaoDialog = lazy(() =>
  import("@/pages/admin/solicitacoes/ConciliacaoDialog").then((m) => ({ default: m.ConciliacaoDialog }))
);

const fmt = (v: number | null | undefined) =>
  v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function EntregadorCorridasPage() {
  const { entregadorId: ENTREGADOR_ID } = useEntregadorId();
  const { data: solicitacoes = [] } = useSolicitacoesByEntregador(ENTREGADOR_ID ?? "");
  const updateSolMut = useUpdateSolicitacao();
  const solIds = useMemo(() => solicitacoes.map((s) => s.id), [solicitacoes]);
  const { data: allRotas = [] } = useRotasBySolicitacaoIds(solIds);
  const { data: bairros = [] } = useBairros();
  const getBairroNome = (id: string) => bairros.find((b) => b.id === id)?.nome ?? id;
  const [activeTab, setActiveTab] = useState<"ativas" | "todas">("ativas");
  const [viewSol, setViewSol] = useState<Solicitacao | null>(null);
  const [conciliacaoTarget, setConciliacaoTarget] = useState<Solicitacao | null>(null);

  const filtered = useMemo(() => {
    if (activeTab === "ativas") {
      return solicitacoes
        .filter((s) => s.status === "aceita" || s.status === "em_andamento")
        .sort((a, b) => {
          const order: Record<string, number> = { em_andamento: 0, aceita: 1 };
          return (order[a.status] ?? 9) - (order[b.status] ?? 9);
        });
    }
    return [...solicitacoes].sort(
      (a, b) => new Date(b.data_solicitacao).getTime() - new Date(a.data_solicitacao).getTime()
    );
  }, [solicitacoes, activeTab]);

  const metrics = useMemo(() => {
    const aceitas = solicitacoes.filter((s) => s.status === "aceita").length;
    const emAndamento = solicitacoes.filter((s) => s.status === "em_andamento").length;
    const hoje = new Date().toISOString().slice(0, 10);
    const concluidasHoje = solicitacoes.filter(
      (s) => s.status === "concluida" && s.data_conclusao?.startsWith(hoje)
    ).length;
    return { aceitas, emAndamento, concluidasHoje, total: solicitacoes.length };
  }, [solicitacoes]);

  const handleStart = (sol: Solicitacao) => {
    updateSolMut.mutate({ id: sol.id, patch: {
      status: "em_andamento",
      data_inicio: new Date().toISOString(),
    } });
    toast.success("Corrida iniciada! Boa entrega! 🚀");
    void sendNotificationToRole("admin", {
      title: "Corrida iniciada",
      message: `Entregador iniciou a corrida ${sol.codigo} — ${sol.cliente_nome ?? sol.codigo}.`,
      type: "info",
      link: "/admin/solicitacoes",
    });
  };

  const handleConcluir = (sol: Solicitacao) => {
    updateSolMut.mutate({ id: sol.id, patch: {
      status: "concluida",
      data_conclusao: new Date().toISOString(),
    } });
    toast.success("Entrega concluída com sucesso! ✅");
    void sendNotificationToRole("admin", {
      title: "Entrega conclueída",
      message: `Corrida ${sol.codigo} foi conclueída — ${sol.cliente_nome ?? sol.codigo}.`,
      type: "success",
      link: "/admin/solicitacoes",
    });
  };

  // tipoStyles removed — now using TipoOperacaoBadge

  const tabCounts = {
    ativas: solicitacoes.filter((s) => s.status === "aceita" || s.status === "em_andamento").length,
    todas: solicitacoes.length,
  };

  return (
    <PageContainer title="Minhas Corridas" subtitle="Gerencie suas entregas atribuídas.">
      {/* Metrics */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={fadeUp}>
          <MetricCard title="Aguardando Início" value={metrics.aceitas} icon={ClipboardList} subtitle="Aceitas" className={metrics.aceitas > 0 ? "border-l-4 border-l-status-pending" : ""} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard title="Em Andamento" value={metrics.emAndamento} icon={Truck} subtitle="Corridas ativas" className={metrics.emAndamento > 0 ? "border-l-4 border-l-chart-3" : ""} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard title="Concluídas Hoje" value={metrics.concluidasHoje} icon={CheckCheck} subtitle="Finalizadas" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard title="Total Atribuídas" value={metrics.total} icon={Package} subtitle="Todas as corridas" />
        </motion.div>
      </motion.div>

      {/* Tabs + Cards */}
      <Card className="mt-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Corridas</CardTitle>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "ativas" | "todas")}>
              <TabsList>
                <TabsTrigger value="ativas" className="gap-1.5">
                  Ativas
                  <Badge variant="secondary" className="text-xs h-5 px-1.5 tabular-nums">{tabCounts.ativas}</Badge>
                </TabsTrigger>
                <TabsTrigger value="todas" className="gap-1.5">
                  Todas
                  <Badge variant="secondary" className="text-xs h-5 px-1.5 tabular-nums">{tabCounts.todas}</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Package}
                title={activeTab === "ativas" ? "Nenhuma corrida ativa" : "Nenhuma corrida encontrada"}
                subtitle={activeTab === "ativas" ? "Quando uma solicitação for atribuída a você, ela aparecerá aqui." : "Você ainda não possui corridas."}
              />
            </div>
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="show" className="divide-y divide-border">
              {filtered.map((sol) => {
                const rotas = allRotas.filter(r => r.solicitacao_id === sol.id);
                return (
                  <motion.div
                    key={sol.id}
                    variants={fadeUp}
                    className="p-4 sm:p-5 hover:bg-muted/30 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-semibold">{sol.codigo}</span>
                          <StatusBadge status={sol.status} label={STATUS_SOLICITACAO_LABELS[sol.status]} />
                          <TipoOperacaoBadge tipoOperacao={sol.tipo_operacao} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          <span className="font-medium text-foreground">{sol.cliente_nome ?? "—"}</span>
                          {" • "}{formatDateBR(sol.data_solicitacao)}
                        </p>
                      </div>
                    </div>

                    {/* Ponto de coleta */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <Navigation className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="truncate">{sol.ponto_coleta}</span>
                    </div>

                    {/* Rotas resumo */}
                    {rotas.length > 0 && (
                      <div className="grid gap-2 sm:grid-cols-2 mb-3">
                        {rotas.map((rota) => (
                          <div key={rota.id} className="flex items-center gap-2 text-sm rounded-md border border-border/60 px-3 py-2 bg-muted/20">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate font-medium">{getBairroNome(rota.bairro_destino_id)}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground truncate">{rota.responsavel}</span>
                            {rota.receber_do_cliente && rota.valor_a_receber && (
                              <Badge variant="outline" className="ml-auto text-xs shrink-0">
                                Cobrar: {fmt(rota.valor_a_receber)}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                      <Button variant="ghost" size="sm" onClick={() => setViewSol(sol)}>
                        <Eye className="h-4 w-4 mr-1.5" /> Detalhes
                      </Button>
                      {sol.status === "aceita" && (
                        <Button size="sm" onClick={() => handleStart(sol)} className="bg-chart-3 hover:bg-chart-3/90 text-white">
                          <Play className="h-4 w-4 mr-1.5" /> Iniciar Corrida
                        </Button>
                      )}
                      {sol.status === "em_andamento" && (
                        <Button size="sm" onClick={() => setConciliacaoTarget(sol)} className="bg-status-completed hover:bg-status-completed/90 text-white">
                          <CheckCheck className="h-4 w-4 mr-1.5" /> Concluir & Conciliar
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <ViewSolicitacaoDialog solicitacao={viewSol} onClose={() => setViewSol(null)} isDriverView />

      {/* Conciliação Dialog */}
      {conciliacaoTarget && (
        <Suspense fallback={null}>
          <ConciliacaoDialog
            open={!!conciliacaoTarget}
            onOpenChange={(open) => !open && setConciliacaoTarget(null)}
            rotas={allRotas.filter(r => r.solicitacao_id === conciliacaoTarget.id)}
            clienteId={conciliacaoTarget.cliente_id}
            isConcluding
            isDriverView
            onConcluir={() => handleConcluir(conciliacaoTarget)}
          />
        </Suspense>
      )}
    </PageContainer>
  );
}



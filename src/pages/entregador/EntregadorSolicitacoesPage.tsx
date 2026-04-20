import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { PageContainer, MetricCard, DataTable, SearchInput, StatusBadge } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import type { Solicitacao } from "@/types/database";
import { STATUS_SOLICITACAO_LABELS } from "@/types/database";
import { TipoOperacaoBadge } from "@/components/shared/TipoOperacaoBadge";

import { useSolicitacoesByEntregador, useUpdateSolicitacao, useRotasBySolicitacaoIds, useAppendHistorico } from "@/hooks/useSolicitacoes";
import { useConcluirComCaixa } from "@/hooks/useConcluirComCaixa";
import { useAuth } from "@/contexts/AuthContext";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, CheckCircle, Truck, Eye, Play, CheckCheck, Package, Clock, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { sendNotificationToRole } from "@/services/notifications";
import { lazy, Suspense } from "react";
import { useEntregadorId } from "@/hooks/useEntregadorId";

const ViewSolicitacaoDialog = lazy(() =>
  import("@/pages/admin/solicitacoes/ViewSolicitacaoDialog").then((m) => ({ default: m.ViewSolicitacaoDialog }))
);
const ConciliacaoDialog = lazy(() =>
  import("@/pages/admin/solicitacoes/ConciliacaoDialog").then((m) => ({ default: m.ConciliacaoDialog }))
);

const fmt = (v: number | null | undefined) =>
  v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

const STATUS_TABS_DRIVER = [
  { value: "todas", label: "Todas" },
  { value: "aceita", label: "Aceitas" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "concluida", label: "Concluídas" },
];

export default function EntregadorSolicitacoesPage() {
  const { entregadorId: ENTREGADOR_ID } = useEntregadorId();
  const { data: solicitacoes = [] } = useSolicitacoesByEntregador(ENTREGADOR_ID ?? "");
  const updateSolMut = useUpdateSolicitacao();
  const solIds = useMemo(() => solicitacoes.map((s) => s.id), [solicitacoes]);
  const { data: allRotas = [] } = useRotasBySolicitacaoIds(solIds);
  const getRotasBySolicitacao = (solId: string) => allRotas.filter(r => r.solicitacao_id === solId);
  const concluirComCaixa = useConcluirComCaixa();
  const appendHistoricoMut = useAppendHistorico();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("todas");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [viewSolicitacao, setViewSolicitacao] = useState<Solicitacao | null>(null);
  const [conciliacaoTarget, setConciliacaoTarget] = useState<Solicitacao | null>(null);

  const filtered = useMemo(() => {
    return solicitacoes.filter((s) => {
      const matchSearch =
        s.codigo.toLowerCase().includes(search.toLowerCase()) ||
        (s.cliente_nome ?? "").toLowerCase().includes(search.toLowerCase());
      const matchTab = activeTab === "todas" || s.status === activeTab;

      let matchDate = true;
      if (dateRange?.from) {
        const solDate = new Date(s.data_solicitacao);
        const from = new Date(dateRange.from);
        from.setHours(0, 0, 0, 0);
        matchDate = solDate >= from;
        if (dateRange.to) {
          const to = new Date(dateRange.to);
          to.setHours(23, 59, 59, 999);
          matchDate = matchDate && solDate <= to;
        }
      }

      return matchSearch && matchTab && matchDate;
    });
  }, [solicitacoes, search, activeTab, dateRange]);

  const metrics = useMemo(() => {
    const aceitas = solicitacoes.filter((s) => s.status === "aceita").length;
    const emAndamento = solicitacoes.filter((s) => s.status === "em_andamento").length;
    const hoje = new Date().toISOString().slice(0, 10);
    const concluidasHoje = solicitacoes.filter(
      (s) => s.status === "concluida" && s.data_conclusao?.startsWith(hoje)
    ).length;
    return { aceitas, emAndamento, concluidasHoje, total: solicitacoes.length };
  }, [solicitacoes]);

  const statusCounts: Record<string, number> = {
    todas: solicitacoes.length,
    aceita: metrics.aceitas,
    em_andamento: metrics.emAndamento,
    concluida: solicitacoes.filter((s) => s.status === "concluida").length,
  };

  const handleStart = (sol: Solicitacao) => {
    updateSolMut.mutate({ id: sol.id, patch: {
      status: "em_andamento",
      data_inicio: new Date().toISOString(),
    } });
    appendHistoricoMut.mutate({ solId: sol.id, tipo: "inicio", descricao: "Entrega iniciada pelo entregador", extra: { usuario_id: user?.id ?? null, status_anterior: sol.status, status_novo: "em_andamento" } });
    toast.success("Corrida iniciada! Boa entrega! 🚀");
    void sendNotificationToRole("admin", {
      title: "Corrida iniciada",
      message: `Entregador iniciou a corrida ${sol.codigo} — ${sol.cliente_nome ?? sol.codigo}.`,
      type: "info",
      link: "/admin/solicitacoes",
    });
  };

  const handleConcluir = async (sol: Solicitacao) => {
    // skipFatura: fatura é responsabilidade do admin na conciliação administrativa
    const result = await concluirComCaixa(sol.id, { skipFatura: true });
    if (!result.success) {
      toast.error(result.error ?? "Erro ao concluir entrega.");
      return;
    }
    toast.success("Entrega concluída com sucesso! ✅");
    appendHistoricoMut.mutate({ solId: sol.id, tipo: "conclusao", descricao: "Entrega concluída pelo entregador", extra: { usuario_id: user?.id ?? null, status_anterior: sol.status, status_novo: "concluida" } });
    void sendNotificationToRole("admin", {
      title: "Entrega concluída",
      message: `Corrida ${sol.codigo} foi concluída — ${sol.cliente_nome ?? sol.codigo}.`,
      type: "success",
      link: "/admin/solicitacoes",
    });
  };

  const ActionButton = ({
    tooltip,
    icon: Icon,
    onClick,
    variant = "default",
  }: {
    tooltip: string;
    icon: React.ElementType;
    onClick: (e: React.MouseEvent) => void;
    variant?: "default" | "success" | "info";
  }) => {
    const variantStyles: Record<string, string> = {
      default: "text-foreground hover:bg-accent",
      success: "text-status-completed hover:bg-status-completed/15",
      info: "text-primary hover:bg-primary/10",
    };
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 rounded-full transition-colors", variantStyles[variant])}
            onClick={(e) => {
              e.stopPropagation();
              onClick(e);
            }}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  const renderActions = (sol: Solicitacao) => (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center justify-end gap-1">
        <ActionButton tooltip="Visualizar" icon={Eye} onClick={() => setViewSolicitacao(sol)} variant="info" />
        {sol.status === "aceita" && (
          <ActionButton tooltip="Iniciar corrida" icon={Play} onClick={() => handleStart(sol)} variant="success" />
        )}
        {sol.status === "em_andamento" && (
          <ActionButton tooltip="Concluir & Conciliar" icon={CheckCheck} onClick={() => setConciliacaoTarget(sol)} variant="success" />
        )}
      </div>
    </TooltipProvider>
  );

  // tipoStyles removed — now using TipoOperacaoBadge

  const columns: Column<Solicitacao>[] = [
    {
      key: "codigo",
      header: "Código",
      sortable: true,
      cell: (r) => <span className="font-mono text-sm font-medium">{r.codigo}</span>,
    },
    {
      key: "cliente_id",
      header: "Cliente",
      cell: (r) => <span className="font-medium">{r.cliente_nome ?? "—"}</span>,
    },
    {
      key: "tipo_operacao",
      header: "Tipo",
      cell: (r) => <TipoOperacaoBadge tipoOperacao={r.tipo_operacao} />,
    },
    {
      key: "rotas",
      header: "Rotas",
      cell: (r) => (
        <Badge variant="secondary" className="tabular-nums">
          {getRotasBySolicitacao(r.id).length}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusBadge status={r.status} label={STATUS_SOLICITACAO_LABELS[r.status]} />,
    },
    {
      key: "data_solicitacao",
      header: "Data",
      sortable: true,
      cell: (r) => <span className="tabular-nums text-sm text-muted-foreground">{fmtDate(r.data_solicitacao)}</span>,
    },
    {
      key: "actions",
      header: "Ações",
      className: "w-28 text-right",
      cell: (r) => renderActions(r),
    },
  ];

  return (
    <PageContainer title="Solicitações" subtitle="Gerencie suas solicitações de entrega.">
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Aceitas" value={metrics.aceitas} icon={ClipboardList} />
        <MetricCard title="Em Andamento" value={metrics.emAndamento} icon={Truck} />
        <MetricCard title="Concluídas Hoje" value={metrics.concluidasHoje} icon={CheckCircle} />
        <MetricCard title="Total" value={metrics.total} icon={Package} />
      </div>

      {/* Tabs + Table */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap h-auto">
              {STATUS_TABS_DRIVER.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                  {tab.label}
                  <Badge variant="secondary" className="ml-1 text-xs h-5 px-1.5 tabular-nums">
                    {statusCounts[tab.value] ?? 0}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar por código ou cliente..." className="flex-1" />
            <DatePickerWithRange value={dateRange} onChange={setDateRange} />
            {(search || activeTab !== "todas" || dateRange?.from) && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground w-full sm:w-auto" onClick={() => { setSearch(""); setActiveTab("todas"); setDateRange(undefined); }}>
                <X className="h-3.5 w-3.5" /> Limpar filtros
              </Button>
            )}
          </div>

          <DataTable
            data={filtered}
            columns={columns}
            onRowClick={(r) => setViewSolicitacao(r)}
            emptyTitle="Nenhuma solicitação encontrada"
            emptySubtitle="Quando uma solicitação for atribuída a você, ela aparecerá aqui."
            renderMobileCard={(r) => (
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium">{r.codigo}</span>
                  <StatusBadge status={r.status} label={STATUS_SOLICITACAO_LABELS[r.status]} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{r.cliente_nome ?? "—"}</span>
                  <TipoOperacaoBadge tipoOperacao={r.tipo_operacao} />
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{fmtDate(r.data_solicitacao)}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="tabular-nums text-xs">
                      {getRotasBySolicitacao(r.id).length} rotas
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-2">
                  {renderActions(r)}
                </div>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Suspense fallback={null}>
        <ViewSolicitacaoDialog solicitacao={viewSolicitacao} onClose={() => setViewSolicitacao(null)} isDriverView />
        {conciliacaoTarget && (
          <ConciliacaoDialog
            open={!!conciliacaoTarget}
            onOpenChange={(open) => !open && setConciliacaoTarget(null)}
            rotas={getRotasBySolicitacao(conciliacaoTarget.id)}
            clienteId={conciliacaoTarget.cliente_id}
            solicitacaoId={conciliacaoTarget.id}
            isConcluding={conciliacaoTarget.status === "em_andamento"}
            isDriverView
            onConcluir={() => {
              handleConcluir(conciliacaoTarget);
              setConciliacaoTarget(null);
            }}
          />
        )}
      </Suspense>
    </PageContainer>
  );
}

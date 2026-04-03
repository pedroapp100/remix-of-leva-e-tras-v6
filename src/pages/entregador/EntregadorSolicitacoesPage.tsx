import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { PageContainer, MetricCard, DataTable, SearchInput, StatusBadge } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import type { Solicitacao, StatusSolicitacao } from "@/types/database";
import { STATUS_SOLICITACAO_LABELS } from "@/types/database";
import { TipoOperacaoBadge } from "@/components/shared/TipoOperacaoBadge";
import { getClienteName } from "@/data/mockSolicitacoes";
import { useGlobalStore } from "@/contexts/GlobalStore";
import { useConcluirComCaixa } from "@/hooks/useConcluirComCaixa";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, CheckCircle, Truck, Eye, Play, CheckCheck, Package, Clock, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useNotifications } from "@/contexts/NotificationContext";
import { lazy, Suspense } from "react";

const ViewSolicitacaoDialog = lazy(() =>
  import("@/pages/admin/solicitacoes/ViewSolicitacaoDialog").then((m) => ({ default: m.ViewSolicitacaoDialog }))
);
const ConciliacaoDialog = lazy(() =>
  import("@/pages/admin/solicitacoes/ConciliacaoDialog").then((m) => ({ default: m.ConciliacaoDialog }))
);

const ENTREGADOR_ID = "ent-001";

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
  const { addNotification } = useNotifications();
  const { solicitacoes, updateSolicitacao, getRotasBySolicitacao } = useGlobalStore();
  const concluirComCaixa = useConcluirComCaixa();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("todas");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [viewSolicitacao, setViewSolicitacao] = useState<Solicitacao | null>(null);
  const [conciliacaoTarget, setConciliacaoTarget] = useState<Solicitacao | null>(null);

  const minhas = useMemo(
    () => solicitacoes.filter((s) => s.entregador_id === ENTREGADOR_ID),
    [solicitacoes]
  );

  const filtered = useMemo(() => {
    return minhas.filter((s) => {
      const matchSearch =
        s.codigo.toLowerCase().includes(search.toLowerCase()) ||
        getClienteName(s.cliente_id).toLowerCase().includes(search.toLowerCase());
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
  }, [minhas, search, activeTab, dateRange]);

  const metrics = useMemo(() => {
    const aceitas = minhas.filter((s) => s.status === "aceita").length;
    const emAndamento = minhas.filter((s) => s.status === "em_andamento").length;
    const hoje = new Date().toISOString().slice(0, 10);
    const concluidasHoje = minhas.filter(
      (s) => s.status === "concluida" && s.data_conclusao?.startsWith(hoje)
    ).length;
    return { aceitas, emAndamento, concluidasHoje, total: minhas.length };
  }, [minhas]);

  const statusCounts: Record<string, number> = {
    todas: minhas.length,
    aceita: metrics.aceitas,
    em_andamento: metrics.emAndamento,
    concluida: minhas.filter((s) => s.status === "concluida").length,
  };

  const handleStart = (sol: Solicitacao) => {
    updateSolicitacao(sol.id, (s) => ({
      ...s,
      status: "em_andamento" as StatusSolicitacao,
      data_inicio: new Date().toISOString(),
      historico: [
        ...s.historico,
        {
          tipo: "em_andamento",
          status_anterior: "aceita",
          status_novo: "em_andamento",
          timestamp: new Date().toISOString(),
          descricao: "Entregador iniciou a coleta",
        },
      ],
    }));
    toast.success("Corrida iniciada! Boa entrega! 🚀");
    addNotification({
      title: "Corrida iniciada",
      message: `Entregador iniciou a corrida ${sol.codigo} — ${getClienteName(sol.cliente_id)}.`,
      type: "info",
      link: "/admin/solicitacoes",
    });
  };

  const handleConcluir = (sol: Solicitacao) => {
    const result = concluirComCaixa(sol.id);
    if (!result.success) {
      toast.error(result.error ?? "Erro ao concluir entrega.");
      return;
    }
    toast.success("Entrega concluída com sucesso! ✅");
    addNotification({
      title: "Entrega concluída",
      message: `Corrida ${sol.codigo} foi concluída e conciliada — ${getClienteName(sol.cliente_id)}.`,
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
      cell: (r) => <span className="font-medium">{getClienteName(r.cliente_id)}</span>,
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
            <TabsList>
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
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar por código ou cliente..." className="flex-1 min-w-[200px]" />
            <DatePickerWithRange value={dateRange} onChange={setDateRange} />
            {(search || activeTab !== "todas" || dateRange?.from) && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => { setSearch(""); setActiveTab("todas"); setDateRange(undefined); }}>
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
                  <span className="font-medium">{getClienteName(r.cliente_id)}</span>
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

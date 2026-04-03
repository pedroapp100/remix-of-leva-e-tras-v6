import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PageContainer, MetricCard, DataTable, SearchInput, StatusBadge, PermissionGuard } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import type { Solicitacao, StatusSolicitacao, Rota } from "@/types/database";
import { STATUS_SOLICITACAO_LABELS } from "@/types/database";
import { TipoOperacaoBadge } from "@/components/shared/TipoOperacaoBadge";
import { getClienteName, getEntregadorName, STATUS_TABS } from "@/data/mockSolicitacoes";
import { useGlobalStore } from "@/contexts/GlobalStore";
import { useConcluirComCaixa } from "@/hooks/useConcluirComCaixa";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ClipboardList, Clock, CheckCircle, Truck, Eye, UserPlus, Play, X, Trash2, Pencil, CheckCheck, Calculator, ClipboardCheck, History, ArrowLeftRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SimuladorOperacoes } from "@/components/shared/SimuladorOperacoes";
import { toast } from "sonner";
import { useNotifications } from "@/contexts/NotificationContext";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
const LaunchSolicitacaoDialog = lazy(() => import("./solicitacoes/LaunchSolicitacaoDialog").then(m => ({ default: m.LaunchSolicitacaoDialog })));
const ViewSolicitacaoDialog = lazy(() => import("./solicitacoes/ViewSolicitacaoDialog").then(m => ({ default: m.ViewSolicitacaoDialog })));
const AssignDriverDialog = lazy(() => import("./solicitacoes/AssignDriverDialog").then(m => ({ default: m.AssignDriverDialog })));
const ConciliacaoDialog = lazy(() => import("./solicitacoes/ConciliacaoDialog").then(m => ({ default: m.ConciliacaoDialog })));
const AdminConciliacaoDialog = lazy(() => import("./solicitacoes/AdminConciliacaoDialog").then(m => ({ default: m.AdminConciliacaoDialog })));
import { JustificationDialog } from "@/components/shared/JustificationDialog";

const statusVariant = (s: StatusSolicitacao): "default" | "secondary" | "outline" | "destructive" => {
  switch (s) {
    case "concluida": return "default";
    case "pendente": return "secondary";
    case "cancelada": case "rejeitada": return "destructive";
    default: return "outline";
  }
};

const fmt = (v: number | null | undefined) => v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

export default function SolicitacoesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { solicitacoes, addSolicitacao, updateSolicitacao, getRotasBySolicitacao, addPagamentos } = useGlobalStore();
  const concluirComCaixa = useConcluirComCaixa();
  const { addNotification } = useNotifications();

  // Listener para saldo baixo pré-pago → notifica admin
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      addNotification({
        title: "Saldo baixo — Pré-pago",
        message: detail.message,
        type: "warning",
        link: `/admin/clientes?perfil=${detail.clienteId}`,
      });
      toast.warning(`Saldo baixo: ${detail.clienteNome}`, {
        description: `Saldo restante: ${detail.saldoApos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      });
    };
    window.addEventListener("saldo-baixo-pre-pago", handler);
    return () => window.removeEventListener("saldo-baixo-pre-pago", handler);
  }, [addNotification]);

  // Initialize state from URL params
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [activeTab, setActiveTab] = useState<string>(searchParams.get("tab") ?? "todas");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Sync state → URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (activeTab !== "todas") params.set("tab", activeTab);
    setSearchParams(params, { replace: true });
  }, [search, activeTab, setSearchParams]);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [viewSolicitacao, setViewSolicitacao] = useState<Solicitacao | null>(null);
  const [assignTarget, setAssignTarget] = useState<Solicitacao | null>(null);
  const [transferTarget, setTransferTarget] = useState<Solicitacao | null>(null);
  const [transferJustify, setTransferJustify] = useState<Solicitacao | null>(null);
  const [transferMotivo, setTransferMotivo] = useState("");
  const [conciliacaoTarget, setConciliacaoTarget] = useState<Solicitacao | null>(null);
  const [justifyTarget, setJustifyTarget] = useState<{ sol: Solicitacao; action: "cancelar" | "rejeitar" } | null>(null);
  const [simuladorOpen, setSimuladorOpen] = useState(false);
  const [adminConciliacaoTarget, setAdminConciliacaoTarget] = useState<Solicitacao | null>(null);

  const filtered = useMemo(() => {
    return solicitacoes.filter((s) => {
      const matchSearch = s.codigo.toLowerCase().includes(search.toLowerCase()) ||
        getClienteName(s.cliente_id).toLowerCase().includes(search.toLowerCase());
      const matchTab = activeTab === "todas" || s.status === activeTab;
      
      // Date range filter
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

  // Dynamic metrics
  const metrics = useMemo(() => {
    const pendentes = solicitacoes.filter((s) => s.status === "pendente").length;
    const aceitas = solicitacoes.filter((s) => s.status === "aceita").length;
    const emAndamento = solicitacoes.filter((s) => s.status === "em_andamento").length;
    
    const hoje = new Date().toISOString().slice(0, 10);
    const concluidasHoje = solicitacoes.filter((s) => s.status === "concluida" && s.data_conclusao?.startsWith(hoje)).length;
    
    // Tempo médio dinâmico (em minutos)
    const concluidas = solicitacoes.filter((s) => s.status === "concluida" && s.data_inicio && s.data_conclusao);
    let tempoMedio = "—";
    if (concluidas.length > 0) {
      const totalMin = concluidas.reduce((sum, s) => {
        const inicio = new Date(s.data_inicio!).getTime();
        const fim = new Date(s.data_conclusao!).getTime();
        return sum + (fim - inicio) / 60000;
      }, 0);
      const avg = Math.round(totalMin / concluidas.length);
      tempoMedio = avg >= 60 ? `${Math.floor(avg / 60)}h${avg % 60 > 0 ? String(avg % 60).padStart(2, "0") : ""}` : `${avg}min`;
    }

    return { pendentes, aceitas, emAndamento, concluidasHoje, tempoMedio };
  }, [solicitacoes]);

  const statusCounts: Record<string, number> = {
    todas: solicitacoes.length,
    pendente: metrics.pendentes,
    aceita: metrics.aceitas,
    em_andamento: metrics.emAndamento,
    concluida: solicitacoes.filter((s) => s.status === "concluida").length,
    cancelada: solicitacoes.filter((s) => s.status === "cancelada").length,
    rejeitada: solicitacoes.filter((s) => s.status === "rejeitada").length,
  };

  // Actions
  const handleLaunch = (data: { clienteId: string; tipoOperacao: string; tipoColeta?: string; pontoColeta: string; entregadorId?: string; dataRetroativa?: string; retroativoConcluida?: boolean; rotas: { id?: string; bairro_destino_id?: string; responsavel?: string; telefone?: string; observacoes?: string; receber_do_cliente?: boolean; valor_a_receber?: number; taxa_resolvida: number | null; taxas_extras?: { nome: string; valor: number }[] }[] }) => {
    const now = data.dataRetroativa ?? new Date().toISOString();
    const dateForCode = data.dataRetroativa ? data.dataRetroativa.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const codigo = `LT-${dateForCode.replace(/-/g, "")}-${String(solicitacoes.length + 1).padStart(5, "0")}`;
    
    const valorTotalTaxas = data.rotas.reduce((sum, r) => {
      const taxa = r.taxa_resolvida ?? 0;
      const extras = (r.taxas_extras ?? []).reduce((s, e) => s + e.valor, 0);
      return sum + taxa + extras;
    }, 0);

    const solId = `sol-${Date.now()}`;
    const isRetroativoConcluida = !!data.retroativoConcluida;

    const novasRotas: Rota[] = data.rotas.map((r, idx) => ({
      id: r.id || `rota-${Date.now()}-${idx}`,
      solicitacao_id: solId,
      bairro_destino_id: r.bairro_destino_id || "",
      responsavel: r.responsavel || "",
      telefone: r.telefone || "",
      observacoes: r.observacoes || null,
      receber_do_cliente: r.receber_do_cliente ?? false,
      valor_a_receber: r.valor_a_receber ?? null,
      taxa_resolvida: r.taxa_resolvida,
      regra_preco_id: null,
      status: isRetroativoConcluida ? "concluida" as const : "ativa" as const,
    }));

    // Determine status and dates based on retroativoConcluida
    let status: StatusSolicitacao = data.entregadorId ? "aceita" : "pendente";
    let dataInicio: string | null = null;
    let dataConclusao: string | null = null;
    const historico: any[] = [
      { tipo: "criacao", timestamp: now, descricao: "Solicitação criada (retroativo)" },
    ];

    if (isRetroativoConcluida) {
      status = "concluida";
      // Simulate: started 30min after creation, concluded 60min after
      const baseDate = new Date(now);
      dataInicio = new Date(baseDate.getTime() + 30 * 60000).toISOString();
      dataConclusao = new Date(baseDate.getTime() + 60 * 60000).toISOString();
      if (data.entregadorId) {
        historico.push({ tipo: "aceita", status_anterior: "pendente", status_novo: "aceita", timestamp: now, descricao: `Atribuída a ${getEntregadorName(data.entregadorId)}` });
      }
      historico.push({ tipo: "em_andamento", status_anterior: "aceita", status_novo: "em_andamento", timestamp: dataInicio, descricao: "Entregador iniciou coleta" });
      historico.push({ tipo: "concluida", status_anterior: "em_andamento", status_novo: "concluida", timestamp: dataConclusao, descricao: "Entrega concluída (retroativo)" });
    } else {
      if (data.entregadorId) {
        historico.push({ tipo: "aceita", status_anterior: "pendente", status_novo: "aceita", timestamp: now, descricao: `Atribuída a ${getEntregadorName(data.entregadorId)}` });
      }
    }

    const newSol: Solicitacao = {
      id: solId, codigo, cliente_id: data.clienteId,
      entregador_id: data.entregadorId || null,
      status,
      tipo_operacao: data.tipoOperacao as Solicitacao["tipo_operacao"],
      ponto_coleta: data.pontoColeta, data_solicitacao: now, data_inicio: dataInicio, data_conclusao: dataConclusao,
      valor_total_taxas: valorTotalTaxas, valor_total_repasse: null, justificativa: null,
      retroativo: !!data.dataRetroativa,
      historico,
      created_at: now, updated_at: new Date().toISOString(),
    };
    addSolicitacao(newSol, novasRotas);
    toast.success(`Solicitação ${codigo} criada!`);
    if (data.entregadorId) {
      addNotification({
        title: "Nova corrida atribuída",
        message: `Solicitação ${codigo} foi atribuída a ${getEntregadorName(data.entregadorId)}.`,
        type: "info",
        link: "/entregador/solicitacoes",
      });
    }
  };

  const handleAssign = (solId: string, entregadorId: string) => {
    const sol = solicitacoes.find((s) => s.id === solId);
    updateSolicitacao(solId, (s) => ({
      ...s, entregador_id: entregadorId, status: "aceita" as StatusSolicitacao,
      historico: [...s.historico, { tipo: "aceita", status_anterior: s.status, status_novo: "aceita", timestamp: new Date().toISOString(), descricao: `Atribuída a ${getEntregadorName(entregadorId)}` }],
    }));
    toast.success("Entregador atribuído!");
    addNotification({
      title: "Nova corrida atribuída",
      message: `Solicitação ${sol?.codigo ?? solId} foi atribuída a ${getEntregadorName(entregadorId)}.`,
      type: "info",
      link: "/entregador/solicitacoes",
    });
  };

  const handleStartDelivery = (sol: Solicitacao) => {
    updateSolicitacao(sol.id, (s) => ({
      ...s, status: "em_andamento" as StatusSolicitacao, data_inicio: new Date().toISOString(),
      historico: [...s.historico, { tipo: "em_andamento", status_anterior: "aceita", status_novo: "em_andamento", timestamp: new Date().toISOString(), descricao: "Entregador iniciou coleta" }],
    }));
    toast.success("Entrega iniciada!");
  };

  const handleConcluir = (sol: Solicitacao) => {
    const result = concluirComCaixa(sol.id);
    if (!result.success) {
      toast.error(result.error ?? "Erro ao concluir solicitação.");
      return;
    }
    toast.success("Solicitação concluída!");
  };

  const handleJustify = (justificativa: string) => {
    if (!justifyTarget) return;
    const { sol, action } = justifyTarget;
    const newStatus = action === "cancelar" ? "cancelada" : "rejeitada";
    updateSolicitacao(sol.id, (s) => ({
      ...s, status: newStatus as StatusSolicitacao, justificativa,
      historico: [...s.historico, { tipo: newStatus, status_anterior: s.status, status_novo: newStatus, timestamp: new Date().toISOString(), descricao: `${newStatus === "cancelada" ? "Cancelada" : "Rejeitada"}: ${justificativa}` }],
    }));
    toast.success(`Solicitação ${newStatus}!`);
    setJustifyTarget(null);
  };

  const handleTransfer = (newEntregadorId: string) => {
    if (!transferTarget) return;
    const sol = transferTarget;
    const previousEntregadorId = sol.entregador_id;
    const previousName = getEntregadorName(previousEntregadorId);
    const newName = getEntregadorName(newEntregadorId);
    updateSolicitacao(sol.id, (s) => ({
      ...s,
      entregador_id: newEntregadorId,
      status: "aceita" as StatusSolicitacao,
      data_inicio: s.status === "em_andamento" ? null : s.data_inicio,
      historico: [
        ...s.historico,
        {
          tipo: "aceita",
          status_anterior: s.status,
          status_novo: "aceita",
          timestamp: new Date().toISOString(),
          descricao: `Transferida de ${previousName} para ${newName}: ${transferMotivo}`,
        },
      ],
    }));
    toast.success(`Solicitação transferida para ${newName}!`);
    addNotification({
      title: "Corrida transferida",
      message: `Solicitação ${sol.codigo} foi transferida de ${previousName} para ${newName}.`,
      type: "info",
      link: "/entregador/solicitacoes",
    });
    setTransferTarget(null);
    setTransferMotivo("");
  };

  const ActionButton = ({ tooltip, icon: Icon, onClick, variant = "default" }: { tooltip: string; icon: React.ElementType; onClick: (e: React.MouseEvent) => void; variant?: "default" | "destructive" | "success" | "info" }) => {
    const variantStyles: Record<string, string> = {
      default: "text-foreground hover:bg-accent",
      destructive: "text-destructive hover:bg-destructive/15",
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
            onClick={(e) => { e.stopPropagation(); onClick(e); }}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top"><p>{tooltip}</p></TooltipContent>
      </Tooltip>
    );
  };

  const renderActions = (sol: Solicitacao) => (
    <TooltipProvider delayDuration={200}>
      <div data-onboarding="request-actions" className="flex items-center justify-center gap-1">
        <ActionButton tooltip="Visualizar" icon={Eye} onClick={() => setViewSolicitacao(sol)} variant="info" />
        {sol.status === "pendente" && (
          <>
            <PermissionGuard permission="solicitacoes.edit">
              <ActionButton tooltip="Atribuir entregador" icon={UserPlus} onClick={() => setAssignTarget(sol)} variant="success" />
            </PermissionGuard>
            <PermissionGuard permission="solicitacoes.delete">
              <ActionButton tooltip="Rejeitar" icon={X} onClick={() => setJustifyTarget({ sol, action: "rejeitar" })} variant="destructive" />
            </PermissionGuard>
          </>
        )}
        {sol.status === "aceita" && (
          <PermissionGuard permission="solicitacoes.edit">
            <ActionButton tooltip="Transferir entregador" icon={ArrowLeftRight} onClick={() => setTransferJustify(sol)} variant="info" />
            <ActionButton tooltip="Iniciar entrega" icon={Play} onClick={() => handleStartDelivery(sol)} variant="success" />
          </PermissionGuard>
        )}
        {sol.status === "em_andamento" && (
          <PermissionGuard permission="solicitacoes.edit">
            <ActionButton tooltip="Transferir entregador" icon={ArrowLeftRight} onClick={() => setTransferJustify(sol)} variant="info" />
            <ActionButton tooltip="Concluir entrega" icon={CheckCheck} onClick={() => setConciliacaoTarget(sol)} variant="success" />
          </PermissionGuard>
        )}
        {sol.status === "concluida" && (
          <PermissionGuard permission="solicitacoes.edit">
            <ActionButton tooltip="Conciliação ADM" icon={ClipboardCheck} onClick={() => setAdminConciliacaoTarget(sol)} variant="success" />
            <ActionButton tooltip="Editar conciliação" icon={Pencil} onClick={() => setConciliacaoTarget(sol)} variant="info" />
          </PermissionGuard>
        )}
        {["pendente", "aceita", "em_andamento"].includes(sol.status) && (
          <PermissionGuard permission="solicitacoes.delete">
            <ActionButton tooltip="Cancelar" icon={Trash2} onClick={() => setJustifyTarget({ sol, action: "cancelar" })} variant="destructive" />
          </PermissionGuard>
        )}
      </div>
    </TooltipProvider>
  );

  const columns: Column<Solicitacao>[] = [
    {
      key: "codigo", header: "Código", sortable: true,
      cell: (r) => <span className="font-mono text-sm font-medium">{r.codigo}</span>,
    },
    {
      key: "cliente_id", header: "Cliente",
      cell: (r) => <span className="font-medium">{getClienteName(r.cliente_id)}</span>,
    },
    {
      key: "tipo_operacao", header: "Tipo",
      cell: (r) => <TipoOperacaoBadge tipoOperacao={r.tipo_operacao} />,
    },
    {
      key: "entregador_id", header: "Entregador",
      cell: (r) => <span className="text-muted-foreground">{getEntregadorName(r.entregador_id)}</span>,
    },
    {
      key: "rotas", header: "Rotas",
      cell: (r) => {
        const count = getRotasBySolicitacao(r.id).length;
        return <Badge variant="secondary" className="tabular-nums">{count}</Badge>;
      },
    },
    {
      key: "valor_total_taxas", header: "Taxas",
      cell: (r) => <span className="tabular-nums font-medium">{fmt(r.valor_total_taxas)}</span>,
    },
    {
      key: "status", header: "Status",
      cell: (r) => <StatusBadge status={r.status} label={STATUS_SOLICITACAO_LABELS[r.status]} />,
    },
    {
      key: "data_solicitacao", header: "Data", sortable: true,
      cell: (r) => (
        <div className="flex items-center gap-1.5">
          <span className="tabular-nums text-sm text-muted-foreground">{fmtDate(r.data_solicitacao)}</span>
          {r.retroativo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-amber-500/30 text-amber-600 gap-0.5">
                  <History className="h-3 w-3" />
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top"><p>Lançamento retroativo</p></TooltipContent>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      key: "actions", header: "Ações", className: "w-36 text-center",
      cell: (r) => renderActions(r),
    },
  ];

  return (
    <PageContainer
      title="Solicitações"
      subtitle="Gerencie todas as solicitações de entrega."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSimuladorOpen(true)}>
            <Calculator className="h-4 w-4 mr-2" /> Simulador
          </Button>
          <PermissionGuard permission="solicitacoes.create">
            <Button data-onboarding="new-request-btn" onClick={() => setLaunchOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Nova Solicitação
            </Button>
          </PermissionGuard>
        </div>
      }
    >
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard title="Pendentes" value={metrics.pendentes} icon={ClipboardList} />
        <MetricCard title="Aceitas" value={metrics.aceitas} icon={CheckCircle} />
        <MetricCard title="Em Andamento" value={metrics.emAndamento} icon={Truck} />
        <MetricCard title="Concluídas Hoje" value={metrics.concluidasHoje} icon={CheckCircle} />
        <MetricCard title="Tempo Médio" value={metrics.tempoMedio} icon={Clock} />
      </div>

      {/* Tabs + Table */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} data-onboarding="status-tabs">
            <TabsList>
              {STATUS_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="gap-1.5"
                >
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
            emptySubtitle="Crie a primeira solicitação para começar."
            emptyActionLabel="Nova Solicitação"
            onEmptyAction={() => setLaunchOpen(true)}
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
                  <span>{getEntregadorName(r.entregador_id)}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="tabular-nums text-xs">{getRotasBySolicitacao(r.id).length} rotas</Badge>
                    <span className="tabular-nums">{fmt(r.valor_total_taxas)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-2">
                  <span className="text-xs text-muted-foreground tabular-nums">{fmtDate(r.data_solicitacao)}</span>
                  {renderActions(r)}
                </div>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Dialogs (lazy loaded) */}
      <Suspense fallback={null}>
        <LaunchSolicitacaoDialog open={launchOpen} onOpenChange={setLaunchOpen} onSubmit={handleLaunch} />
        <ViewSolicitacaoDialog solicitacao={viewSolicitacao} onClose={() => setViewSolicitacao(null)} />
        <AssignDriverDialog
          open={!!assignTarget}
          onOpenChange={(open) => !open && setAssignTarget(null)}
          onAssign={(entregadorId) => { if (assignTarget) handleAssign(assignTarget.id, entregadorId); setAssignTarget(null); }}
        />
        <AssignDriverDialog
          open={!!transferTarget}
          onOpenChange={(open) => { if (!open) { setTransferTarget(null); setTransferMotivo(""); } }}
          onAssign={(entregadorId) => handleTransfer(entregadorId)}
          excludeEntregadorId={transferTarget?.entregador_id}
        />
        {conciliacaoTarget && (
          <ConciliacaoDialog
            open={!!conciliacaoTarget}
            onOpenChange={(open) => !open && setConciliacaoTarget(null)}
            rotas={getRotasBySolicitacao(conciliacaoTarget.id)}
            clienteId={conciliacaoTarget.cliente_id}
            solicitacaoId={conciliacaoTarget.id}
            onConcluir={() => { handleConcluir(conciliacaoTarget); setConciliacaoTarget(null); }}
            isEditing={conciliacaoTarget.status === "concluida"}
            isConcluding={conciliacaoTarget.status === "em_andamento"}
          />
        )}
        {adminConciliacaoTarget && (
          <AdminConciliacaoDialog
            open={!!adminConciliacaoTarget}
            onOpenChange={(open) => !open && setAdminConciliacaoTarget(null)}
            solicitacao={adminConciliacaoTarget}
            onConfirm={() => setAdminConciliacaoTarget(null)}
          />
        )}
      </Suspense>
      <JustificationDialog
        open={!!transferJustify}
        onOpenChange={(open) => { if (!open) setTransferJustify(null); }}
        title="Transferir Entregador"
        description="Informe o motivo da transferência (ex: pane na moto). Mínimo 10 caracteres."
        onConfirm={(motivo) => {
          setTransferMotivo(motivo);
          setTransferTarget(transferJustify);
          setTransferJustify(null);
        }}
      />
      <JustificationDialog
        open={!!justifyTarget}
        onOpenChange={(open) => !open && setJustifyTarget(null)}
        title={justifyTarget?.action === "cancelar" ? "Cancelar Solicitação" : "Rejeitar Solicitação"}
        description="Informe o motivo (mínimo 10 caracteres)."
        onConfirm={handleJustify}
      />
      <Dialog open={simuladorOpen} onOpenChange={setSimuladorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Simulador de Operações</DialogTitle>
          </DialogHeader>
          <SimuladorOperacoes showClienteSelector />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

import { useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PageContainer, MetricCard, DataTable, SearchInput, StatusBadge, PermissionGuard } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import type { Solicitacao, StatusSolicitacao } from "@/types/database";
import { STATUS_SOLICITACAO_LABELS } from "@/types/database";
import { TipoOperacaoBadge } from "@/components/shared/TipoOperacaoBadge";
import { useSolicitacoes, useSolicitacoesPageable, useUpdateSolicitacao, useCreateSolicitacaoWithRotas, useRotasBySolicitacaoIds, useAppendHistorico } from "@/hooks/useSolicitacoes";
import { useClientes } from "@/hooks/useClientes";
import { useEntregadores } from "@/hooks/useEntregadores";
import { useConcluirComCaixa } from "@/hooks/useConcluirComCaixa";
import { useAuth } from "@/contexts/AuthContext";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ClipboardList, Clock, CheckCircle, CheckCircle2, Truck, Eye, UserPlus, Play, X, Trash2, Pencil, CheckCheck, Calculator, ClipboardCheck, History, ArrowLeftRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SimuladorOperacoes } from "@/components/shared/SimuladorOperacoes";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { sendNotificationToUser, sendNotificationToRole } from "@/services/notifications";
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
  const { data: solicitacoes = [] } = useSolicitacoes();
  const updateSolMut = useUpdateSolicitacao();
  const queryClient = useQueryClient();
  const createSolMut = useCreateSolicitacaoWithRotas();
  const appendHistoricoMut = useAppendHistorico();
  const { data: clientes = [] } = useClientes();
  const { data: entregadores = [] } = useEntregadores();
  const concluirComCaixa = useConcluirComCaixa();
  const { user } = useAuth();

  const getClienteNome = (id: string) => clientes.find((c) => c.id === id)?.nome ?? id;
  const getEntregadorNome = (id: string | null | undefined) => !id ? "—" : (entregadores.find((e) => e.id === id)?.nome ?? id);
  const STATUS_TABS = [
    { value: "todas", label: "Todas" },
    { value: "pendente", label: "Pendentes" },
    { value: "aceita", label: "Aceitas" },
    { value: "em_andamento", label: "Em Andamento" },
    { value: "concluida", label: "Concluídas" },
    { value: "cancelada", label: "Canceladas" },
    { value: "rejeitada", label: "Rejeitadas" },
  ] as const;

  // Initialize state from URL params
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [activeTab, setActiveTab] = useState<string>(searchParams.get("tab") ?? "todas");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Server-side pagination state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Reset to page 0 whenever filters change
  useEffect(() => { setPage(0); }, [search, activeTab, dateRange, pageSize]);

  // Compute matched cliente IDs for name search (client-side lookup from cached list)
  const matchedClienteIds = useMemo(() => {
    if (!search.trim() || clientes.length === 0) return [];
    return clientes
      .filter((c) => c.nome.toLowerCase().includes(search.toLowerCase()))
      .map((c) => c.id);
  }, [search, clientes]);

  // Default 90-day window (same as useSolicitacoes) — overridden by user's date picker
  const defaultDateFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 10);
  }, []);

  const dateFrom = dateRange?.from ? dateRange.from.toISOString().slice(0, 10) : defaultDateFrom;
  const dateTo = dateRange?.to ? dateRange.to.toISOString().slice(0, 10) : undefined;

  // Server-side paginated table data
  const { data: pagedResult, isFetching: isTableFetching } = useSolicitacoesPageable({
    page,
    pageSize,
    status: activeTab,
    search: search.trim() || undefined,
    clienteIds: matchedClienteIds.length > 0 ? matchedClienteIds : undefined,
    dateFrom,
    dateTo,
  });

  // Rotas scoped to current page's solicitation IDs (max 25 at a time)
  const pagedSolIds = useMemo(() => pagedResult?.data.map((s) => s.id) ?? [], [pagedResult?.data]);
  const { data: pagedRotas = [] } = useRotasBySolicitacaoIds(pagedSolIds);
  const getRotasBySolicitacao = (solId: string) => pagedRotas.filter(r => r.solicitacao_id === solId);

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
  // Session-local set for instant icon feedback before server refetch completes
  const [sessionConciliadas, setSessionConciliadas] = useState<Set<string>>(new Set());

  // useSolicitacoes (90-day windowed cache) is used only for metrics, tab counts, and code generation.
  // The table itself is powered by useSolicitacoesPageable (server-side paginated).

  // Single-pass metrics + status counts
  const { metrics, statusCounts } = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const counts: Record<string, number> = { todas: 0, pendente: 0, aceita: 0, em_andamento: 0, concluida: 0, cancelada: 0, rejeitada: 0 };
    let concluidasHoje = 0;
    let tempoTotal = 0;
    let tempoCount = 0;

    for (const s of solicitacoes) {
      counts.todas++;
      counts[s.status] = (counts[s.status] ?? 0) + 1;

      if (s.status === "concluida") {
        if (s.data_conclusao?.startsWith(hoje)) concluidasHoje++;
        if (s.data_inicio && s.data_conclusao) {
          tempoTotal += (new Date(s.data_conclusao).getTime() - new Date(s.data_inicio).getTime()) / 60000;
          tempoCount++;
        }
      }
    }

    let tempoMedio = "—";
    if (tempoCount > 0) {
      const avg = Math.round(tempoTotal / tempoCount);
      tempoMedio = avg >= 60 ? `${Math.floor(avg / 60)}h${avg % 60 > 0 ? String(avg % 60).padStart(2, "0") : ""}` : `${avg}min`;
    }

    return {
      metrics: { pendentes: counts.pendente, aceitas: counts.aceita, emAndamento: counts.em_andamento, concluidasHoje, tempoMedio },
      statusCounts: counts,
    };
  }, [solicitacoes]);

  // Actions
  const handleLaunch = async (data: { clienteId: string; tipoOperacao: string; tipoColeta?: string; pontoColeta: string; entregadorId?: string; dataRetroativa?: string; retroativoConcluida?: boolean; rotas: { id?: string; bairro_destino_id?: string; responsavel?: string; telefone?: string; observacoes?: string; receber_do_cliente?: boolean; valor_a_receber?: number; taxa_resolvida: number | null; taxas_extras?: { nome: string; valor: number }[] }[] }) => {
    const now = data.dataRetroativa ?? new Date().toISOString();
    const dateForCode = data.dataRetroativa ? data.dataRetroativa.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const { data: codigoGerado } = await supabase.rpc("gerar_codigo_solicitacao");
    const codigo = (codigoGerado && codigoGerado.trim().length > 0)
      ? codigoGerado
      : `LT-${dateForCode.replace(/-/g, "")}-${String(solicitacoes.length + 1).padStart(5, "0")}`;
    
    const isRetroativoConcluida = !!data.retroativoConcluida;

    // Determine status and dates based on retroativoConcluida
    let status: StatusSolicitacao = data.entregadorId ? "aceita" : "pendente";
    let dataInicio: string | null = null;
    let dataConclusao: string | null = null;

    if (isRetroativoConcluida) {
      status = "concluida";
      const baseDate = new Date(now);
      dataInicio = new Date(baseDate.getTime() + 30 * 60000).toISOString();
      dataConclusao = new Date(baseDate.getTime() + 60 * 60000).toISOString();
    }

    const rotaInserts = data.rotas.map((r) => ({
      solicitacao_id: "", // will be set by hook
      bairro_destino_id: r.bairro_destino_id || "",
      responsavel: r.responsavel || "",
      telefone: r.telefone || "",
      observacoes: r.observacoes || null,
      receber_do_cliente: r.receber_do_cliente ?? false,
      valor_a_receber: r.valor_a_receber ?? null,
      taxa_resolvida: r.taxa_resolvida,
      regra_preco_id: null,
      pagamento_operacao: r.pagamento_operacao ?? "faturar",
      meios_pagamento_operacao: r.meios_pagamento_operacao ?? [],
      status: isRetroativoConcluida ? "concluida" as const : "ativa" as const,
    }));

    try {
      const result = await createSolMut.mutateAsync({
        sol: {
          codigo,
          cliente_id: data.clienteId,
          entregador_id: data.entregadorId || null,
          status,
          tipo_operacao: data.tipoOperacao,
          tipo_coleta: data.tipoColeta ?? "loja_cliente",
          ponto_coleta: data.pontoColeta,
          data_solicitacao: now,
          data_inicio: dataInicio,
          data_conclusao: dataConclusao,
          justificativa: null,
          retroativo: !!data.dataRetroativa,
        },
        rotas: rotaInserts,
      });

      const clienteNome = getClienteNome(data.clienteId);
      const nRotas = data.rotas.length;
      if (isRetroativoConcluida) {
        const entNome = data.entregadorId ? getEntregadorNome(data.entregadorId) : null;
        appendHistoricoMut.mutate({ solId: result.sol.id, tipo: "criacao", descricao: `Solicitação retroativa criada já como concluída para ${clienteNome} com ${nRotas} rota${nRotas > 1 ? "s" : ""}${entNome && entNome !== "—" ? ` — atribuída a ${entNome}` : ""}`, extra: { usuario_id: user?.id ?? null, status_novo: "concluida" } });
      } else {
        appendHistoricoMut.mutate({ solId: result.sol.id, tipo: "criacao", descricao: `Solicitação criada para ${clienteNome} com ${nRotas} rota${nRotas > 1 ? "s" : ""}`, extra: { usuario_id: user?.id ?? null, status_novo: status } });
      }

      toast.success(`Solicitação ${codigo} criada!`);

      if (data.entregadorId) {
        const entregador = entregadores.find((e) => e.id === data.entregadorId);
        if (entregador?.profile_id) {
          void sendNotificationToUser(entregador.profile_id, {
            title: "Nova corrida atribuída",
            message: `Solicitação ${codigo} está aguardando você.`,
            type: "info",
            link: "/entregador/solicitacoes",
          });
        }
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido ao criar solicitação.";
      toast.error(`Erro ao criar solicitação: ${message}`);
      return false;
    }
  };

  const handleAssign = (solId: string, entregadorId: string) => {
    const sol = solicitacoes.find((s) => s.id === solId);
    updateSolMut.mutate({ id: solId, patch: { entregador_id: entregadorId, status: "aceita" } });
    const entNome = getEntregadorNome(entregadorId);
    appendHistoricoMut.mutate({ solId, tipo: "atribuicao", descricao: `Entregador ${entNome} foi atribuído à solicitação`, extra: { usuario_id: user?.id ?? null, status_anterior: sol?.status ?? "", status_novo: "aceita" } });
    toast.success("Entregador atribuído!");
    const entregador = entregadores.find((e) => e.id === entregadorId);
    if (entregador?.profile_id) {
      void sendNotificationToUser(entregador.profile_id, {
        title: "Nova corrida atribuída",
        message: `Solicitação ${sol?.codigo ?? solId} está aguardando você.`,
        type: "info",
        link: "/entregador/solicitacoes",
      });
    }
  };

  const handleStartDelivery = (sol: Solicitacao) => {
    updateSolMut.mutate({ id: sol.id, patch: { status: "em_andamento", data_inicio: new Date().toISOString() } });
    appendHistoricoMut.mutate({ solId: sol.id, tipo: "inicio", descricao: "Entrega iniciada pelo administrador", extra: { usuario_id: user?.id ?? null, status_anterior: sol.status, status_novo: "em_andamento" } });
    toast.success("Entrega iniciada!");
    if (sol.entregador_id) {
      const entregador = entregadores.find((e) => e.id === sol.entregador_id);
      if (entregador?.profile_id) {
        void sendNotificationToUser(entregador.profile_id, {
          title: "Entrega iniciada",
          message: `A solicitação ${sol.codigo} foi marcada como iniciada pelo admin.`,
          type: "info",
          link: "/entregador/solicitacoes",
        });
      }
    }
  };

  const handleConcluir = async (sol: Solicitacao) => {
    const result = await concluirComCaixa(sol.id);
    if (!result.success) {
      toast.error(result.error ?? "Erro ao concluir solicitação.");
      return;
    }
    appendHistoricoMut.mutate({ solId: sol.id, tipo: "conclusao", descricao: "Entrega concluída pelo administrador", extra: { usuario_id: user?.id ?? null, status_anterior: sol.status, status_novo: "concluida" } });
    toast.success("Solicitação concluída!");
    if (sol.entregador_id) {
      const entregador = entregadores.find((e) => e.id === sol.entregador_id);
      if (entregador?.profile_id) {
        void sendNotificationToUser(entregador.profile_id, {
          title: "Corrida concluída",
          message: `A solicitação ${sol.codigo} foi concluída com sucesso.`,
          type: "success",
          link: "/entregador/solicitacoes",
        });
      }
    }
  };

  const handleJustify = (justificativa: string) => {
    if (!justifyTarget) return;
    const { sol, action } = justifyTarget;
    const newStatus = action === "cancelar" ? "cancelada" : "rejeitada";
    updateSolMut.mutate({ id: sol.id, patch: { status: newStatus, justificativa } });
    const tipoHist = action === "cancelar" ? "cancelamento" : "rejeicao";
    appendHistoricoMut.mutate({ solId: sol.id, tipo: tipoHist, descricao: `Solicitação ${newStatus}. Motivo: ${justificativa}`, extra: { usuario_id: user?.id ?? null, status_anterior: sol.status, status_novo: newStatus } });
    toast.success(`Solicitação ${newStatus}!`);
    if (sol.entregador_id) {
      const entregador = entregadores.find((e) => e.id === sol.entregador_id);
      if (entregador?.profile_id) {
        void sendNotificationToUser(entregador.profile_id, {
          title: newStatus === "cancelada" ? "Corrida cancelada" : "Corrida rejeitada",
          message: `Solicitação ${sol.codigo} foi ${newStatus}.`,
          type: "warning",
          link: "/entregador/solicitacoes",
        });
      }
    }
    setJustifyTarget(null);
  };

  const handleTransfer = (newEntregadorId: string) => {
    if (!transferTarget) return;
    const sol = transferTarget;
    const previousEntregadorId = sol.entregador_id;
    const previousName = getEntregadorNome(previousEntregadorId);
    const newName = getEntregadorNome(newEntregadorId);
    updateSolMut.mutate({ id: sol.id, patch: {
      entregador_id: newEntregadorId,
      status: "aceita",
      data_inicio: sol.status === "em_andamento" ? null : sol.data_inicio,
    } });
    appendHistoricoMut.mutate({ solId: sol.id, tipo: "transferencia", descricao: `Entrega transferida de ${previousName} para ${newName}`, extra: { usuario_id: user?.id ?? null, status_anterior: sol.status, status_novo: "aceita" } });
    toast.success(`Solicitação transferida para ${newName}!`);
    const novoEntregador = entregadores.find((e) => e.id === newEntregadorId);
    if (novoEntregador?.profile_id) {
      void sendNotificationToUser(novoEntregador.profile_id, {
        title: "Corrida transferida para você",
        message: `Solicitação ${sol.codigo} foi transferida de ${previousName} para você.`,
        type: "info",
        link: "/entregador/solicitacoes",
      });
    }
    setTransferTarget(null);
    setTransferMotivo("");
  };

  const ActionButton = ({ tooltip, icon: Icon, onClick, variant = "default", disabled = false }: { tooltip: string; icon: React.ElementType; onClick: (e: React.MouseEvent) => void; variant?: "default" | "destructive" | "success" | "info" | "warning"; disabled?: boolean }) => {
    const variantStyles: Record<string, string> = {
      default: "text-foreground hover:bg-accent",
      destructive: "text-destructive hover:bg-destructive/15",
      success: "text-status-completed hover:bg-status-completed/15",
      info: "text-primary hover:bg-primary/10",
      warning: "text-amber-500 hover:bg-amber-500/15",
    };
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            className={cn("h-8 w-8 rounded-full transition-colors", variantStyles[variant], disabled && "opacity-40 cursor-not-allowed pointer-events-none")}
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
            {(() => {
              const isConciliada = sol.admin_conciliada_at != null || sessionConciliadas.has(sol.id);
              return (
                <ActionButton
                  tooltip={isConciliada ? "Conciliação ADM (já realizada)" : "Conciliação ADM"}
                  icon={isConciliada ? CheckCircle2 : ClipboardCheck}
                  onClick={() => setAdminConciliacaoTarget(sol)}
                  variant={isConciliada ? "success" : "warning"}
                  disabled={isConciliada}
                />
              );
            })()}
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
      cell: (r) => <span className="font-medium">{getClienteNome(r.cliente_id)}</span>,
    },
    {
      key: "tipo_operacao", header: "Tipo",
      cell: (r) => <TipoOperacaoBadge tipoOperacao={r.tipo_operacao} />,
    },
    {
      key: "entregador_id", header: "Entregador",
      cell: (r) => <span className="text-muted-foreground">{getEntregadorNome(r.entregador_id)}</span>,
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
      cell: (r) => {
        const total = getRotasBySolicitacao(r.id).reduce((s, rota) => s + (rota.taxa_resolvida ?? 0), 0);
        return <span className="tabular-nums font-medium">{total > 0 ? fmt(total) : "—"}</span>;
      },
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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
            <TabsList className="flex-wrap h-auto">
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
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar por código ou cliente..." className="flex-1" />
            <DatePickerWithRange value={dateRange} onChange={setDateRange} />
            {(search || activeTab !== "todas" || dateRange?.from) && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground w-full sm:w-auto" onClick={() => { setSearch(""); setActiveTab("todas"); setDateRange(undefined); }}>
                <X className="h-3.5 w-3.5" /> Limpar filtros
              </Button>
            )}
          </div>

          <DataTable
            data={pagedResult?.data ?? []}
            columns={columns}
            onRowClick={(r) => setViewSolicitacao(r)}
            loading={isTableFetching && !pagedResult}
            emptyTitle="Nenhuma solicitação encontrada"
            emptySubtitle="Crie a primeira solicitação para começar."
            emptyActionLabel="Nova Solicitação"
            onEmptyAction={() => setLaunchOpen(true)}
            externalPagination={{
              page,
              pageCount: pagedResult?.pageCount ?? 1,
              total: pagedResult?.total ?? 0,
              onPageChange: setPage,
              pageSize,
              onPageSizeChange: setPageSize,
            }}
            renderMobileCard={(r) => (
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium">{r.codigo}</span>
                  <StatusBadge status={r.status} label={STATUS_SOLICITACAO_LABELS[r.status]} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{getClienteNome(r.cliente_id)}</span>
                  <TipoOperacaoBadge tipoOperacao={r.tipo_operacao} />
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{getEntregadorNome(r.entregador_id)}</span>
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
            onConfirm={() => {
              if (adminConciliacaoTarget) {
                // Instant local feedback: icon flips now, DB value confirmed on next refetch
                setSessionConciliadas((prev) => new Set(prev).add(adminConciliacaoTarget.id));
              }
              setAdminConciliacaoTarget(null);
            }}
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
          <DialogDescription className="sr-only">.</DialogDescription>
          </DialogHeader>
          <SimuladorOperacoes showClienteSelector />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

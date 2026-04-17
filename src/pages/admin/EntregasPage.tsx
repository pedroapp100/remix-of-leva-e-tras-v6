import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageContainer, MetricCard, DataTable, SearchInput, StatusBadge, ExportDropdown } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import type { Rota } from "@/types/database";
import { TipoOperacaoBadge, getTipoOperacaoLabel } from "@/components/shared/TipoOperacaoBadge";
import { useSolicitacoes, useRotasWindow } from "@/hooks/useSolicitacoes";
import { useClientes } from "@/hooks/useClientes";
import { useEntregadores } from "@/hooks/useEntregadores";
import { useBairros } from "@/hooks/useSettings";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Package, CheckCircle, Clock, MapPin, X, Eye, Truck, XCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { exportCSV, exportPDF } from "@/lib/exportTable";
import { formatCurrency, formatDateBR } from "@/lib/formatters";

// ── Types ──

type StatusRota = "ativa" | "concluida" | "cancelada";

interface EntregaView {
  id: string;
  rota: Rota;
  solicitacao_id: string;
  codigo: string;
  cliente_id: string;
  entregador_id: string | null | undefined;
  tipo_operacao: string;
  data_solicitacao: string;
  data_conclusao: string | null | undefined;
  bairro_nome: string;
}

const STATUS_ROTA_LABELS: Record<StatusRota, string> = {
  ativa: "Ativa",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const STATUS_TABS: { value: StatusRota | "todas"; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "ativa", label: "Ativas" },
  { value: "concluida", label: "Concluídas" },
  { value: "cancelada", label: "Canceladas" },
];

const fmt = (v: number | null | undefined) =>
  v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

const getBairroName = (id: string, _bairros: { id: string; nome: string }[]) =>
  _bairros.find((b) => b.id === id)?.nome ?? "—";

export default function EntregasPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: solicitacoes = [] } = useSolicitacoes();
  const { data: rotas = [] } = useRotasWindow();
  const { data: clientes = [] } = useClientes();
  const { data: entregadores = [] } = useEntregadores();
  const { data: bairros = [] } = useBairros();

  const getClienteNome = (id: string) => clientes.find((c) => c.id === id)?.nome ?? id;
  const getEntregadorNome = (id: string | null | undefined) => !id ? "—" : (entregadores.find((e) => e.id === id)?.nome ?? id);

  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [activeTab, setActiveTab] = useState<string>(searchParams.get("tab") ?? "todas");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [filterEntregador, setFilterEntregador] = useState<string>("todos");
  const [viewEntrega, setViewEntrega] = useState<EntregaView | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (activeTab !== "todas") params.set("tab", activeTab);
    setSearchParams(params, { replace: true });
  }, [search, activeTab, setSearchParams]);

  // Build flat list of entregas (each rota = 1 entrega) — O(n+m) with Map.
  // Rotas without a matching solicitação in the active window are skipped gracefully.
  const entregas: EntregaView[] = useMemo(() => {
    const solMap = new Map(solicitacoes.map((s) => [s.id, s]));
    return rotas.flatMap((rota) => {
      const sol = solMap.get(rota.solicitacao_id);
      if (!sol) return []; // solicitação outside active window — skip
      return [{
        id: rota.id,
        rota,
        solicitacao_id: rota.solicitacao_id,
        codigo: sol.codigo,
        cliente_id: sol.cliente_id,
        entregador_id: sol.entregador_id,
        tipo_operacao: sol.tipo_operacao,
        data_solicitacao: sol.data_solicitacao,
        data_conclusao: sol.data_conclusao,
        bairro_nome: getBairroName(rota.bairro_destino_id, bairros),
      }];
    });
  }, [rotas, solicitacoes]);

  // Single-pass: options + metrics + status counts
  const { tipoOptions, entregadorOptions, metrics, statusCounts } = useMemo(() => {
    const tiposSet = new Set<string>();
    const entregadorSet = new Set<string>();
    let ativas = 0, concluidas = 0, canceladas = 0, totalTaxas = 0, totalRepasse = 0;

    for (const e of entregas) {
      const tipoOperacao = (e.tipo_operacao ?? "").trim();
      if (tipoOperacao) tiposSet.add(tipoOperacao);

      const entregadorId = (e.entregador_id ?? "").trim();
      if (entregadorId) entregadorSet.add(entregadorId);

      const st = e.rota.status;
      if (st === "ativa") ativas++;
      else if (st === "concluida") {
        concluidas++;
        totalTaxas += e.rota.taxa_resolvida ?? 0;
        if (e.rota.receber_do_cliente) totalRepasse += e.rota.valor_a_receber ?? 0;
      } else if (st === "cancelada") canceladas++;
    }

    return {
      tipoOptions: [...tiposSet].map((t) => ({ value: t, label: getTipoOperacaoLabel(t) })),
      entregadorOptions: [...entregadorSet].map((id) => ({ value: id, label: getEntregadorNome(id) })),
      metrics: { total: entregas.length, ativas, concluidas, canceladas, totalTaxas, totalRepasse },
      statusCounts: { todas: entregas.length, ativa: ativas, concluida: concluidas, cancelada: canceladas } as Record<string, number>,
    };
  }, [entregas]);

  // Filter
  const filtered = useMemo(() => {
    return entregas.filter((e) => {
      const matchSearch =
        e.codigo.toLowerCase().includes(search.toLowerCase()) ||
        getClienteNome(e.cliente_id).toLowerCase().includes(search.toLowerCase()) ||
        e.rota.responsavel.toLowerCase().includes(search.toLowerCase()) ||
        e.bairro_nome.toLowerCase().includes(search.toLowerCase());
      const matchTab = activeTab === "todas" || e.rota.status === activeTab;
      const matchTipo = filterTipo === "todos" || e.tipo_operacao === filterTipo;
      const matchEntregador = filterEntregador === "todos" || e.entregador_id === filterEntregador;

      let matchDate = true;
      if (dateRange?.from) {
        const d = new Date(e.data_solicitacao);
        const from = new Date(dateRange.from);
        from.setHours(0, 0, 0, 0);
        matchDate = d >= from;
        if (dateRange.to) {
          const to = new Date(dateRange.to);
          to.setHours(23, 59, 59, 999);
          matchDate = matchDate && d <= to;
        }
      }

      return matchSearch && matchTab && matchDate && matchTipo && matchEntregador;
    });
  }, [entregas, search, activeTab, dateRange, filterTipo, filterEntregador]);

  const statusVariant = (s: StatusRota): "default" | "secondary" | "destructive" | "outline" => {
    switch (s) {
      case "concluida": return "default";
      case "ativa": return "outline";
      case "cancelada": return "destructive";
      default: return "secondary";
    }
  };

  const columns: Column<EntregaView>[] = [
    {
      key: "codigo",
      header: "Solicitação",
      sortable: true,
      cell: (r) => <span className="font-mono text-sm font-medium">{r.codigo}</span>,
    },
    {
      key: "cliente_id",
      header: "Cliente",
      cell: (r) => <span className="font-medium">{getClienteNome(r.cliente_id)}</span>,
    },
    {
      key: "bairro_nome",
      header: "Destino",
      cell: (r) => (
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{r.bairro_nome}</span>
        </div>
      ),
    },
    {
      key: "responsavel",
      header: "Destinatário",
      cell: (r) => <span>{r.rota.responsavel || "—"}</span>,
    },
    {
      key: "entregador_id",
      header: "Entregador",
      cell: (r) => (
        <span className="text-muted-foreground">{getEntregadorNome(r.entregador_id)}</span>
      ),
    },
    {
      key: "tipo_operacao",
      header: "Tipo",
      cell: (r) => <TipoOperacaoBadge tipoOperacao={r.tipo_operacao} />,
    },
    {
      key: "taxa_resolvida",
      header: "Taxa",
      cell: (r) => <span className="tabular-nums font-medium text-status-completed">{fmt(r.rota.taxa_resolvida)}</span>,
    },
    {
      key: "valor_a_receber",
      header: "Valor de Repasse",
      cell: (r) =>
        r.rota.receber_do_cliente ? (
          <span className="tabular-nums font-medium text-destructive">{fmt(r.rota.valor_a_receber)}</span>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusBadge status={r.rota.status} label={STATUS_ROTA_LABELS[r.rota.status]} />,
    },
    {
      key: "data_solicitacao",
      header: "Data",
      sortable: true,
      cell: (r) => (
        <span className="tabular-nums text-sm text-muted-foreground">
          {r.data_solicitacao ? fmtDate(r.data_solicitacao) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-12 text-center",
      cell: (r) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-primary hover:bg-primary/10"
          onClick={(e) => {
            e.stopPropagation();
            setViewEntrega(r);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const exportHeaders = ["Solicitação", "Cliente", "Destino", "Destinatário", "Entregador", "Tipo", "Taxa", "Valor de Repasse", "Status", "Data"];
  const buildExportRows = () =>
    filtered.map((e) => [
      e.codigo,
      getClienteNome(e.cliente_id),
      e.bairro_nome,
      e.rota.responsavel || "—",
      getEntregadorNome(e.entregador_id),
      getTipoOperacaoLabel(e.tipo_operacao),
      e.rota.taxa_resolvida != null ? formatCurrency(e.rota.taxa_resolvida) : "—",
      e.rota.receber_do_cliente && e.rota.valor_a_receber != null ? formatCurrency(e.rota.valor_a_receber) : "—",
      STATUS_ROTA_LABELS[e.rota.status],
      e.data_solicitacao ? formatDateBR(e.data_solicitacao) : "—",
    ]);
  const handleExportCSV = () => exportCSV({ title: "Entregas", headers: exportHeaders, rows: buildExportRows(), filename: "entregas" });
  const handleExportPDF = () => exportPDF({ title: "Entregas", subtitle: `${filtered.length} registros`, headers: exportHeaders, rows: buildExportRows(), filename: "entregas" });

  return (
    <PageContainer
      title="Entregas"
      subtitle="Visualize todas as entregas (rotas) do sistema."
      actions={<ExportDropdown onExportExcel={handleExportCSV} onExportPDF={handleExportPDF} />}
    >
      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard title="Total" value={metrics.total} icon={Package} />
        <MetricCard title="Ativas" value={metrics.ativas} icon={Truck} />
        <MetricCard title="Concluídas" value={metrics.concluidas} icon={CheckCircle} />
        <MetricCard title="Taxas (Conc.)" value={fmt(metrics.totalTaxas)} icon={Clock} />
        <MetricCard title="Repasse (Conc.)" value={fmt(metrics.totalRepasse)} icon={MapPin} />
      </div>

      {/* Tabs + Table */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex-wrap h-auto">
              {STATUS_TABS.map((tab) => (
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
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por código, cliente, destinatário ou bairro..."
              className="flex-1"
            />
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-full sm:w-[160px] h-9">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {tipoOptions.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEntregador} onValueChange={setFilterEntregador}>
              <SelectTrigger className="w-full sm:w-[180px] h-9">
                <SelectValue placeholder="Entregador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos entregadores</SelectItem>
                {entregadorOptions.map((e) => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DatePickerWithRange value={dateRange} onChange={setDateRange} />
            {(search || activeTab !== "todas" || dateRange?.from || filterTipo !== "todos" || filterEntregador !== "todos") && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground w-full sm:w-auto"
                onClick={() => {
                  setSearch("");
                  setActiveTab("todas");
                  setDateRange(undefined);
                  setFilterTipo("todos");
                  setFilterEntregador("todos");
                }}
              >
                <X className="h-3.5 w-3.5" /> Limpar filtros
              </Button>
            )}
          </div>

          <DataTable
            data={filtered}
            columns={columns}
            onRowClick={(r) => setViewEntrega(r)}
            emptyTitle="Nenhuma entrega encontrada"
            emptySubtitle="As entregas aparecerão aqui conforme solicitações forem criadas."
            renderMobileCard={(r) => (
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-medium">{r.codigo}</span>
                  <StatusBadge status={r.rota.status} label={STATUS_ROTA_LABELS[r.rota.status]} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{getClienteNome(r.cliente_id)}</span>
                  <TipoOperacaoBadge tipoOperacao={r.tipo_operacao} />
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{r.bairro_nome}</span>
                  <span className="mx-1">•</span>
                  <span>{r.rota.responsavel || "—"}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{getEntregadorNome(r.entregador_id)}</span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums font-medium text-status-completed">{fmt(r.rota.taxa_resolvida)}</span>
                    {r.rota.receber_do_cliente && (
                      <span className="tabular-nums text-destructive">{fmt(r.rota.valor_a_receber)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-2">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {r.data_solicitacao ? fmtDate(r.data_solicitacao) : "—"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-primary hover:bg-primary/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewEntrega(r);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!viewEntrega} onOpenChange={(open) => !open && setViewEntrega(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Detalhes da Entrega
            </DialogTitle>
          <DialogDescription className="sr-only">.</DialogDescription>
          </DialogHeader>
          {viewEntrega && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm">{viewEntrega.codigo}</span>
                <StatusBadge
                  status={viewEntrega.rota.status}
                  label={STATUS_ROTA_LABELS[viewEntrega.rota.status]}
                />
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{getClienteNome(viewEntrega.cliente_id)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Entregador</p>
                  <p className="font-medium">{getEntregadorNome(viewEntrega.entregador_id)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Destino (Bairro)</p>
                  <p className="font-medium">{viewEntrega.bairro_nome}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Destinatário</p>
                  <p className="font-medium">{viewEntrega.rota.responsavel || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Telefone</p>
                  <p className="font-medium">{viewEntrega.rota.telefone || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tipo Operação</p>
                  <p className="font-medium">
                    {getTipoOperacaoLabel(viewEntrega.tipo_operacao)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Taxa</p>
                  <p className="font-medium tabular-nums">{fmt(viewEntrega.rota.taxa_resolvida)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor a Receber</p>
                  <p className="font-medium tabular-nums">
                    {viewEntrega.rota.receber_do_cliente
                      ? fmt(viewEntrega.rota.valor_a_receber)
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data Solicitação</p>
                  <p className="font-medium tabular-nums">
                    {viewEntrega.data_solicitacao ? fmtDate(viewEntrega.data_solicitacao) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data Conclusão</p>
                  <p className="font-medium tabular-nums">
                    {viewEntrega.data_conclusao ? fmtDate(viewEntrega.data_conclusao) : "—"}
                  </p>
                </div>
              </div>
              {viewEntrega.rota.observacoes && (
                <>
                  <Separator />
                  <div className="text-sm">
                    <p className="text-muted-foreground mb-1">Observações</p>
                    <p>{viewEntrega.rota.observacoes}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

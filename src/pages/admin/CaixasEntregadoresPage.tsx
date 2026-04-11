import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Wallet, ArrowDownUp, AlertTriangle, CheckCircle, Plus, Eye, Pencil, Lock, FileWarning, ChevronDown, Calendar } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PageContainer } from "@/components/shared/PageContainer";
import { MetricCard } from "@/components/shared/MetricCard";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DataTable } from "@/components/shared/DataTable";
import type { Column } from "@/components/shared/DataTable";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/formatters";
import type { CaixaEntregador } from "@/types/database";
import { useCaixaStore } from "@/contexts/CaixaStore";
import { AbrirCaixaDialog } from "./caixas/AbrirCaixaDialog";
import { FecharCaixaDialog } from "./caixas/FecharCaixaDialog";
import { EditarCaixaDialog } from "./caixas/EditarCaixaDialog";
import { JustificativaDivergenciaDialog } from "./caixas/JustificativaDivergenciaDialog";
import { CaixaDetailsModal } from "./caixas/CaixaDetailsModal";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export default function CaixasEntregadoresPage() {
  const { caixas, abrirCaixa, fecharCaixa, editarCaixa, justificarDivergencia } = useCaixaStore();
  const [abrirOpen, setAbrirOpen] = useState(false);
  const [fecharTarget, setFecharTarget] = useState<CaixaEntregador | null>(null);
  const [editarTarget, setEditarTarget] = useState<CaixaEntregador | null>(null);
  const [justificarTarget, setJustificarTarget] = useState<CaixaEntregador | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<CaixaEntregador | null>(null);

  const [activeTab, setActiveTab] = useState("hoje");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [entregadorFilter, setEntregadorFilter] = useState("todos");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const hoje = new Date().toISOString().split("T")[0];

  // --- Metrics ---
  const metrics = useMemo(() => {
    const abertos = caixas.filter((c) => c.status === "aberto");
    const divergentes = caixas.filter((c) => c.status === "divergente");
    const totalTroco = abertos.reduce((s, c) => s + c.troco_inicial, 0);
    const totalRecebidoHoje = caixas
      .filter((c) => c.data === hoje)
      .reduce((s, c) => s + c.total_recebido, 0);
    return { abertos: abertos.length, divergentes: divergentes.length, totalTroco, totalRecebidoHoje };
  }, [caixas, hoje]);

  const openEntregadorIds = caixas.filter((c) => c.status === "aberto" && c.data === hoje).map((c) => c.entregador_id);

  // --- Base data per tab ---
  const baseCaixas = useMemo(() => {
    if (activeTab === "hoje") {
      return caixas.filter((c) => c.data === hoje);
    }
    return caixas.filter((c) => c.status !== "aberto" || c.data !== hoje);
  }, [caixas, activeTab, hoje]);

  const uniqueEntregadores = useMemo(() => {
    const map = new Map<string, string>();
    baseCaixas.forEach((c) => map.set(c.entregador_id, c.entregador_nome));
    return Array.from(map, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [baseCaixas]);

  // --- Filtered data ---
  const filtered = useMemo(() => {
    return baseCaixas.filter((c) => {
      const matchSearch = c.entregador_nome.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "todos" || c.status === statusFilter;
      const matchEntregador = entregadorFilter === "todos" || c.entregador_id === entregadorFilter;

      let matchDate = true;
      if (activeTab === "historico" && dateRange?.from) {
        const caixaDate = new Date(c.data);
        matchDate = caixaDate >= dateRange.from;
        if (dateRange.to) {
          matchDate = matchDate && caixaDate <= dateRange.to;
        }
      }

      return matchSearch && matchStatus && matchEntregador && matchDate;
    });
  }, [baseCaixas, search, statusFilter, entregadorFilter, dateRange, activeTab]);

  // --- Group by date for histórico ---
  const groupedByDate = useMemo(() => {
    if (activeTab !== "historico") return [];
    const map = new Map<string, CaixaEntregador[]>();
    filtered.forEach((c) => {
      const group = map.get(c.data) || [];
      group.push(c);
      map.set(c.data, group);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered, activeTab]);

  // --- Handlers ---
  const handleAbrirCaixa = (entregadorId: string, trocoInicial: number) => {
    const success = abrirCaixa(entregadorId, trocoInicial);
    if (success) {
      toast.success("Caixa aberto com sucesso!");
    } else {
      toast.error("Este entregador já possui um caixa aberto hoje.");
    }
  };

  const handleFecharCaixa = (caixaId: string, valorDevolvido: number, observacoes: string) => {
    fecharCaixa(caixaId, valorDevolvido, observacoes);
    toast.success("Caixa fechado com sucesso");
  };

  const handleEditarCaixa = (caixaId: string, trocoInicial: number, observacoes: string) => {
    editarCaixa(caixaId, trocoInicial, observacoes);
    toast.success("Caixa atualizado com sucesso");
  };

  const handleJustificar = (caixaId: string, justificativa: string) => {
    justificarDivergencia(caixaId, justificativa);
    toast.success("Justificativa registrada com sucesso");
  };

  // --- Shared action buttons renderer ---
  const renderActions = (c: CaixaEntregador, includeEdit = true) => (
    <div className="flex items-center justify-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setDetailsTarget(c); }}><Eye className="h-4 w-4" /></Button>
        </TooltipTrigger>
        <TooltipContent>Ver detalhes</TooltipContent>
      </Tooltip>
      {includeEdit && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setEditarTarget(c); }}><Pencil className="h-4 w-4" /></Button>
          </TooltipTrigger>
          <TooltipContent>Editar caixa</TooltipContent>
        </Tooltip>
      )}
      {c.status === "aberto" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-status-pending hover:text-status-pending/80" onClick={(e) => { e.stopPropagation(); setFecharTarget(c); }}><Lock className="h-4 w-4" /></Button>
          </TooltipTrigger>
          <TooltipContent>Fechar caixa</TooltipContent>
        </Tooltip>
      )}
      {c.status === "divergente" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80" onClick={(e) => { e.stopPropagation(); setJustificarTarget(c); }}><FileWarning className="h-4 w-4" /></Button>
          </TooltipTrigger>
          <TooltipContent>Relatar motivo da falta</TooltipContent>
        </Tooltip>
      )}
    </div>
  );

  // --- Column definitions ---
  const hojeColumns: Column<CaixaEntregador>[] = [
    { key: "entregador_nome", header: "Entregador", sortable: true, cell: (c) => <span className="font-medium">{c.entregador_nome}</span> },
    { key: "troco_inicial", header: "Troco", sortable: true, cell: (c) => <span className="tabular-nums">{formatCurrency(c.troco_inicial)}</span> },
    { key: "recebimentos", header: "Entregas", cell: (c) => <span className="tabular-nums">{c.recebimentos.length}</span> },
    { key: "total_recebido", header: "Recebido", sortable: true, cell: (c) => <span className="tabular-nums">{formatCurrency(c.total_recebido)}</span> },
    { key: "total_esperado", header: "Esperado", sortable: true, cell: (c) => <span className="font-medium tabular-nums">{formatCurrency(c.total_esperado)}</span> },
    { key: "status", header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
    { key: "acoes", header: "Ações", className: "text-center", cell: (c) => renderActions(c, true) },
  ];

  const historicoColumns: Column<CaixaEntregador>[] = [
    { key: "entregador_nome", header: "Entregador", sortable: true, cell: (c) => <span className="font-medium">{c.entregador_nome}</span> },
    { key: "troco_inicial", header: "Troco", sortable: true, cell: (c) => <span className="tabular-nums">{formatCurrency(c.troco_inicial)}</span> },
    { key: "recebimentos", header: "Entregas", cell: (c) => <span className="tabular-nums">{c.recebimentos.length}</span> },
    { key: "total_recebido", header: "Recebido", sortable: true, cell: (c) => <span className="tabular-nums">{formatCurrency(c.total_recebido)}</span> },
    { key: "total_esperado", header: "Esperado", sortable: true, cell: (c) => <span className="font-medium tabular-nums">{formatCurrency(c.total_esperado)}</span> },
    { key: "valor_devolvido", header: "Devolvido", cell: (c) => <span className="tabular-nums">{c.valor_devolvido !== null ? formatCurrency(c.valor_devolvido) : "—"}</span> },
    {
      key: "diferenca", header: "Diferença", cell: (c) => (
        <span className={`font-medium tabular-nums ${c.diferenca === null ? "" : c.diferenca === 0 ? "text-status-completed" : "text-destructive"}`}>
          {c.diferenca !== null ? formatCurrency(c.diferenca) : "—"}
        </span>
      ),
    },
    { key: "status", header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
    { key: "acoes", header: "Ações", className: "text-center", cell: (c) => renderActions(c, true) },
  ];

  // --- Mobile card renderers ---
  const renderHojeMobileCard = (c: CaixaEntregador) => (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{c.entregador_nome}</span>
        <StatusBadge status={c.status} />
      </div>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Troco: {formatCurrency(c.troco_inicial)}</span>
        <span className="font-semibold tabular-nums text-foreground">{formatCurrency(c.total_esperado)}</span>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{c.recebimentos.length} entregas</span>
        <span>Recebido: {formatCurrency(c.total_recebido)}</span>
      </div>
      <div className="flex justify-end gap-1 pt-1">{renderActions(c, true)}</div>
    </Card>
  );

  const renderHistoricoMobileCard = (c: CaixaEntregador) => (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{c.entregador_nome}</span>
        <StatusBadge status={c.status} />
      </div>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Esperado: {formatCurrency(c.total_esperado)}</span>
        <span>Devolvido: {c.valor_devolvido !== null ? formatCurrency(c.valor_devolvido) : "—"}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Diferença:</span>
        <span className={`font-medium ${c.diferenca === null ? "text-muted-foreground" : c.diferenca === 0 ? "text-status-completed" : "text-destructive"}`}>
          {c.diferenca !== null ? formatCurrency(c.diferenca) : "—"}
        </span>
      </div>
      <div className="flex justify-end gap-1 pt-1">{renderActions(c, false)}</div>
    </Card>
  );

  // --- Filters (shared between tabs) ---
  const renderFilters = () => (
    <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
      <SearchInput value={search} onChange={setSearch} placeholder="Buscar por entregador..." className="flex-1 min-w-[200px]" />
      <Select value={entregadorFilter} onValueChange={setEntregadorFilter}>
        <SelectTrigger className="w-[180px]"><SelectValue placeholder="Entregador" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          {uniqueEntregadores.map((e) => (
            <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="aberto">Aberto</SelectItem>
          <SelectItem value="fechado">Fechado</SelectItem>
          <SelectItem value="divergente">Divergente</SelectItem>
        </SelectContent>
      </Select>
      {activeTab === "historico" && (
        <DatePickerWithRange value={dateRange} onChange={setDateRange} placeholder="Período" />
      )}
    </div>
  );

  return (
    <PageContainer
      title="Caixas Entregadores"
      subtitle="Controle de troco e recebimentos em dinheiro dos entregadores."
      actions={
        <Button onClick={() => setAbrirOpen(true)} size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Abrir Caixa
        </Button>
      }
    >
      {/* Metrics */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={fadeUp}>
          <MetricCard title="Caixas Abertos" value={metrics.abertos} icon={Wallet} subtitle="Hoje" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard title="Troco Distribuído" value={formatCurrency(metrics.totalTroco)} icon={ArrowDownUp} subtitle="Em aberto" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard title="Recebido Hoje" value={formatCurrency(metrics.totalRecebidoHoje)} icon={CheckCircle} subtitle="Em dinheiro" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard title="Divergências" value={metrics.divergentes} icon={AlertTriangle} subtitle="Necessitam atenção" className={metrics.divergentes > 0 ? "border-l-4 border-l-destructive" : ""} />
        </motion.div>
      </motion.div>

      {/* Tabs Card */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="hoje" className="gap-1.5">
                <Wallet className="h-4 w-4" /> Caixas do Dia
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-1.5">
                <Calendar className="h-4 w-4" /> Histórico
              </TabsTrigger>
            </TabsList>

            {/* Tab: Caixas do Dia */}
            <TabsContent value="hoje" className="mt-4 space-y-4">
              {renderFilters()}
              <DataTable
                data={filtered}
                columns={hojeColumns}
                pageSize={10}
                renderMobileCard={renderHojeMobileCard}
                emptyTitle="Nenhum caixa aberto hoje"
                emptySubtitle="Abra um novo caixa para iniciar o controle."
              />
            </TabsContent>

            {/* Tab: Histórico */}
            <TabsContent value="historico" className="mt-4 space-y-4">
              {renderFilters()}
              {groupedByDate.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">Nenhum caixa encontrado</p>
                  <p className="text-sm mt-1">Ajuste os filtros para encontrar caixas anteriores.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedByDate.map(([date, items]) => {
                    const totalRecebidoDia = items.reduce((s, c) => s + c.total_recebido, 0);
                    const divergentesDia = items.filter((c) => c.status === "divergente").length;
                    return (
                      <Collapsible key={date}>
                        <CollapsibleTrigger className="w-full group">
                          <div className="flex items-center justify-between py-3 px-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-semibold text-sm">
                                {new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "2-digit" })}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {items.length} {items.length === 1 ? "caixa" : "caixas"}
                              </Badge>
                              {divergentesDia > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {divergentesDia} {divergentesDia === 1 ? "divergência" : "divergências"}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground hidden sm:inline">
                                Recebido: <span className="font-semibold text-foreground">{formatCurrency(totalRecebidoDia)}</span>
                              </span>
                              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2">
                          <DataTable
                            data={items}
                            columns={historicoColumns}
                            pageSize={10}
                            renderMobileCard={renderHistoricoMobileCard}
                            emptyTitle="Nenhum registro"
                          />
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AbrirCaixaDialog open={abrirOpen} onOpenChange={setAbrirOpen} onConfirm={handleAbrirCaixa} existingEntregadorIds={openEntregadorIds} />
      <FecharCaixaDialog open={!!fecharTarget} onOpenChange={(o) => !o && setFecharTarget(null)} caixa={fecharTarget} onConfirm={handleFecharCaixa} />
      <EditarCaixaDialog open={!!editarTarget} onOpenChange={(o) => !o && setEditarTarget(null)} caixa={editarTarget} onConfirm={handleEditarCaixa} />
      <JustificativaDivergenciaDialog open={!!justificarTarget} onOpenChange={(o) => !o && setJustificarTarget(null)} caixa={justificarTarget} onConfirm={handleJustificar} />
      <CaixaDetailsModal open={!!detailsTarget} onOpenChange={(o) => !o && setDetailsTarget(null)} caixa={detailsTarget} />
    </PageContainer>
  );
}

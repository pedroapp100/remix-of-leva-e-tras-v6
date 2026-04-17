import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ClipboardList, FileText, DollarSign, Users, Truck, Settings, ShieldCheck,
  ChevronDown, ChevronUp, X, Search, Filter, Activity, CalendarDays, UserCheck,
} from "lucide-react";
import { PageContainer } from "@/components/shared/PageContainer";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/lib/supabase";
import { exportLogsCSV, exportLogsPDF } from "@/lib/exportLogs";
import { useQueryClient } from "@tanstack/react-query";
import { useLogsQuery, useLogsMetrics, type LogsFilter } from "@/hooks/useLogsQuery";
import type { LogCategoria, LogEntry } from "@/types/database";
import type { DateRange } from "react-day-picker";

const CATEGORIA_CONFIG: Record<LogCategoria, { label: string; icon: React.ElementType; color: string }> = {
  solicitacao:   { label: "Solicitação",  icon: ClipboardList, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  fatura:        { label: "Fatura",       icon: FileText,      color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
  financeiro:    { label: "Financeiro",   icon: DollarSign,    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  cliente:       { label: "Cliente",      icon: Users,         color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  entregador:    { label: "Entregador",   icon: Truck,         color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" },
  configuracao:  { label: "Configuração", icon: Settings,      color: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300" },
  autenticacao:  { label: "Autenticação", icon: ShieldCheck,   color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
};

function MetricCard({
  label, value, icon: Icon, loading,
}: { label: string; value: number; icon: React.ElementType; loading: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="rounded-lg bg-primary/10 p-2">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading
            ? <Skeleton className="h-6 w-16 mt-1" />
            : <p className="text-base sm:text-xl font-bold tabular-nums">{value.toLocaleString("pt-BR")}</p>
          }
        </div>
      </CardContent>
    </Card>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function LogsPage() {
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Debounce 300ms — query só dispara após parar de digitar
  const debouncedSearch = useDebounce(searchInput, 300);

  const filter: LogsFilter = useMemo(() => ({
    search: debouncedSearch || undefined,
    categoria: (categoriaFilter !== "all" ? categoriaFilter as LogCategoria : "all"),
    from: dateRange?.from,
    to: dateRange?.to,
  }), [debouncedSearch, categoriaFilter, dateRange]);

  const {
    data,
    isError,
    error,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    isFetching,
  } = useLogsQuery(filter);

  const { data: metrics, isLoading: metricsLoading } = useLogsMetrics();

  const allLogs: LogEntry[] = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data],
  );

  // Realtime: novo log aparece instantaneamente sem polling
  useEffect(() => {
    const channel = supabase
      .channel("logs_auditoria_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "logs_auditoria" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["logs_auditoria"] });
          void queryClient.invalidateQueries({ queryKey: ["logs_auditoria_metrics"] });
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [queryClient]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const hasFilters = searchInput || categoriaFilter !== "all" || dateRange?.from;

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setCategoriaFilter("all");
    setDateRange(undefined);
  }, []);

  const renderDiff = (detalhes: Record<string, unknown> | null) => {
    if (!detalhes) return <span className="text-muted-foreground text-xs">Sem detalhes</span>;
    const anterior = detalhes.anterior;
    const novo = detalhes.novo;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {anterior !== undefined && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <p className="text-xs font-semibold text-destructive mb-2">Anterior</p>
            <pre className="whitespace-pre-wrap text-xs text-foreground/80 font-mono">
              {typeof anterior === "object" && anterior !== null
                ? JSON.stringify(anterior, null, 2)
                : String(anterior ?? "—")}
            </pre>
          </div>
        )}
        {novo !== undefined && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">Novo</p>
            <pre className="whitespace-pre-wrap text-xs text-foreground/80 font-mono">
              {typeof novo === "object" && novo !== null
                ? JSON.stringify(novo, null, 2)
                : String(novo ?? "—")}
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <PageContainer
      title="Logs de Auditoria"
      subtitle="Rastreabilidade completa de ações no sistema"
      actions={<ExportDropdown onExportPDF={() => exportLogsPDF(allLogs)} onExportExcel={() => exportLogsCSV(allLogs)} />}
    >
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Total de Registros" value={metrics?.total ?? 0} icon={Activity} loading={metricsLoading} />
        <MetricCard label="Logs Hoje" value={metrics?.hoje ?? 0} icon={CalendarDays} loading={metricsLoading} />
        <MetricCard label="Usuários Ativos (7d)" value={metrics?.usuariosAtivos7d ?? 0} icon={UserCheck} loading={metricsLoading} />
      </div>

      {isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Falha ao carregar logs de auditoria: {error instanceof Error ? error.message : "erro desconhecido"}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="relative flex-1 min-w-0 w-full sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descrição, usuário, ação..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {Object.entries(CATEGORIA_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DatePickerWithRange value={dateRange} onChange={setDateRange} />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="h-4 w-4" /> Limpar filtros
          </Button>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {allLogs.length === 0 && !isFetching ? (
          <div className="text-center py-12 text-muted-foreground rounded-xl border bg-card">
            Nenhum log encontrado.
          </div>
        ) : (
          allLogs.map((log) => {
            const cfg = CATEGORIA_CONFIG[log.categoria];
            const Icon = cfg.icon;
            const isOpen = expandedId === log.id;
            return (
              <Collapsible key={log.id} open={isOpen} onOpenChange={() => setExpandedId(isOpen ? null : log.id)}>
                <CollapsibleTrigger asChild>
                  <div className="rounded-lg border border-border bg-card p-4 space-y-2 cursor-pointer hover:bg-muted/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className={`gap-1 ${cfg.color}`}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(log.timestamp), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{log.usuario_nome}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{log.acao.replace(/_/g, " ")}</span>
                      {isOpen
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{log.entidade_id}</code>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="rounded-b-lg border border-t-0 border-border bg-muted/30 px-4 py-3 -mt-1 space-y-2">
                    <p className="text-sm">{log.descricao}</p>
                    {renderDiff(log.detalhes)}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Data/Hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>Descrição</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allLogs.length === 0 && !isFetching ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Nenhum log encontrado.
                </TableCell>
              </TableRow>
            ) : (
              allLogs.map((log) => {
                const cfg = CATEGORIA_CONFIG[log.categoria];
                const Icon = cfg.icon;
                const isOpen = expandedId === log.id;
                return (
                  <Collapsible key={log.id} open={isOpen} onOpenChange={() => setExpandedId(isOpen ? null : log.id)} asChild>
                    <>
                      <CollapsibleTrigger asChild>
                        <TableRow className="cursor-pointer">
                          <TableCell className="w-10 text-center">
                            {isOpen
                              ? <ChevronUp className="h-4 w-4 text-muted-foreground inline" />
                              : <ChevronDown className="h-4 w-4 text-muted-foreground inline" />
                            }
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
                            {format(new Date(log.timestamp), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="font-medium text-sm">{log.usuario_nome}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`gap-1 ${cfg.color}`}>
                              <Icon className="h-3 w-3" />
                              {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{log.acao.replace(/_/g, " ")}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{log.entidade_id}</code>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[260px] truncate">
                            {log.descricao}
                          </TableCell>
                        </TableRow>
                      </CollapsibleTrigger>
                      <CollapsibleContent asChild>
                        <tr>
                          <td colSpan={7} className="bg-muted/30 px-6 py-4 border-b">
                            {renderDiff(log.detalhes)}
                          </td>
                        </tr>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                );
              })
            )}
            {isFetching && allLogs.length === 0 && Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                <TableCell><Skeleton className="h-4 w-4 mx-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Load more sentinel */}
      <div ref={loadMoreRef} className="flex justify-center py-4">
        {isFetchingNextPage && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Carregando mais...
          </div>
        )}
        {!hasNextPage && allLogs.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {allLogs.length.toLocaleString("pt-BR")} registro{allLogs.length !== 1 ? "s" : ""} exibido{allLogs.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>
    </PageContainer>
  );
}

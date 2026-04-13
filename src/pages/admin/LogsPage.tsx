import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ClipboardList, FileText, DollarSign, Users, Truck, Settings, ShieldCheck,
  ChevronDown, ChevronUp, X, Search, Filter,
} from "lucide-react";
import { PageContainer } from "@/components/shared/PageContainer";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/lib/supabase";
import { exportLogsCSV, exportLogsPDF } from "@/lib/exportLogs";
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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function LogsPage() {
  const { data: logs = [], isError, error } = useQuery<LogEntry[]>({
    queryKey: ["logs_auditoria"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logs_auditoria")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => ({
        id: r.id,
        timestamp: r.created_at,
        usuario_id: r.usuario_id ?? "system",
        usuario_nome: r.usuario_nome,
        categoria: r.categoria as LogCategoria,
        acao: r.acao,
        entidade_id: r.entidade_id,
        descricao: r.descricao,
        detalhes: r.detalhes as Record<string, unknown> | null,
      }));
    },
    refetchInterval: 30_000,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const hasFilters = searchTerm || categoriaFilter !== "all" || dateRange?.from;

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (
          !log.descricao.toLowerCase().includes(q) &&
          !log.entidade_id.toLowerCase().includes(q) &&
          !log.usuario_nome.toLowerCase().includes(q) &&
          !log.acao.toLowerCase().includes(q)
        ) return false;
      }
      if (categoriaFilter !== "all" && log.categoria !== categoriaFilter) return false;
      if (dateRange?.from) {
        const ts = new Date(log.timestamp);
        if (ts < dateRange.from) return false;
        if (dateRange.to && ts > new Date(dateRange.to.getTime() + 86400000)) return false;
      }
      return true;
    });
  }, [logs, searchTerm, categoriaFilter, dateRange]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const clearFilters = () => {
    setSearchTerm("");
    setCategoriaFilter("all");
    setDateRange(undefined);
    setPage(1);
  };

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
      actions={<ExportDropdown onExportPDF={() => exportLogsPDF(filtered)} onExportExcel={() => exportLogsCSV(filtered)} />}
    >
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
            placeholder="Buscar por descrição, ID, usuário..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-wrap">
          <Select value={categoriaFilter} onValueChange={(v) => { setCategoriaFilter(v); setPage(1); }}>
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
          <DatePickerWithRange value={dateRange} onChange={(d) => { setDateRange(d); setPage(1); }} />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
            <X className="h-4 w-4" /> Limpar filtros
          </Button>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {paginated.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground rounded-xl border bg-card">
            Nenhum log encontrado.
          </div>
        ) : (
          paginated.map((log) => {
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
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Nenhum log encontrado.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((log) => {
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
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="rounded-xl border bg-card">
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Exibindo</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>de {filtered.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <span className="text-sm px-2 text-muted-foreground">{page}/{totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Próximo
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

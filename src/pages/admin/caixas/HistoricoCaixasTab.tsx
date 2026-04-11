import { useMemo, useState } from "react";
import { Eye, Pencil, FileWarning, History } from "lucide-react";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/formatters";
import type { CaixaEntregador } from "@/types/database";
import type { DateRange } from "react-day-picker";

const STATUS_OPTIONS = [
  { value: "todos", label: "Todos os Status" },
  { value: "fechado", label: "Fechado" },
  { value: "divergente", label: "Divergente" },
];

interface HistoricoCaixasTabProps {
  caixas: CaixaEntregador[];
  onView: (c: CaixaEntregador) => void;
  onEdit: (c: CaixaEntregador) => void;
  onJustify: (c: CaixaEntregador) => void;
}

export function HistoricoCaixasTab({ caixas, onView, onEdit, onJustify }: HistoricoCaixasTabProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [entregadorFilter, setEntregadorFilter] = useState("todos");

  const hoje = new Date().toISOString().split("T")[0];

  // Only closed/divergent caixas (not today's open ones)
  const historicoCaixas = useMemo(() => {
    return caixas.filter((c) => c.status !== "aberto" || c.data !== hoje);
  }, [caixas, hoje]);

  const uniqueEntregadores = useMemo(() => {
    const map = new Map<string, string>();
    historicoCaixas.forEach((c) => map.set(c.entregador_id, c.entregador_nome));
    return Array.from(map, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [historicoCaixas]);

  const filtered = useMemo(() => {
    return historicoCaixas.filter((c) => {
      const matchSearch = c.entregador_nome.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "todos" || c.status === statusFilter;
      const matchEntregador = entregadorFilter === "todos" || c.entregador_id === entregadorFilter;

      let matchDate = true;
      if (dateRange?.from) {
        const caixaDate = new Date(c.data);
        matchDate = caixaDate >= dateRange.from;
        if (dateRange.to) {
          matchDate = matchDate && caixaDate <= dateRange.to;
        }
      }

      return matchSearch && matchStatus && matchEntregador && matchDate;
    });
  }, [historicoCaixas, search, statusFilter, entregadorFilter, dateRange]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 pb-2">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar por entregador..." />
            </div>
            <Select value={entregadorFilter} onValueChange={setEntregadorFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Entregadores</SelectItem>
                {uniqueEntregadores.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DatePickerWithRange value={dateRange} onChange={setDateRange} placeholder="Período" />
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={History} title="Nenhum registro encontrado" subtitle="Ajuste os filtros para encontrar caixas anteriores." />
      ) : (
        <Card>
          <div className="rounded-md border-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entregador</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Troco</TableHead>
                  <TableHead className="text-center">Entregas</TableHead>
                  <TableHead className="text-right">Recebido</TableHead>
                  <TableHead className="text-right">Esperado</TableHead>
                  <TableHead className="text-right">Devolvido</TableHead>
                  <TableHead className="text-right">Diferença</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.entregador_nome}</TableCell>
                    <TableCell className="tabular-nums">{new Date(c.data).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(c.troco_inicial)}</TableCell>
                    <TableCell className="text-center tabular-nums">{c.recebimentos.length}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(c.total_recebido)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatCurrency(c.total_esperado)}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.valor_devolvido !== null ? formatCurrency(c.valor_devolvido) : "—"}</TableCell>
                    <TableCell className={`text-right tabular-nums font-medium ${c.diferenca === null ? "" : c.diferenca === 0 ? "text-status-completed" : "text-destructive"}`}>
                      {c.diferenca !== null ? formatCurrency(c.diferenca) : "—"}
                    </TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(c)}><Eye className="h-4 w-4" /></Button>
                          </TooltipTrigger>
                          <TooltipContent>Ver detalhes</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(c)}><Pencil className="h-4 w-4" /></Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar caixa</TooltipContent>
                        </Tooltip>
                        {c.status === "divergente" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80" onClick={() => onJustify(c)}><FileWarning className="h-4 w-4" /></Button>
                            </TooltipTrigger>
                            <TooltipContent>Relatar motivo da falta</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

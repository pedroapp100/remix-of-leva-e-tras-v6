import { useMemo, useState } from "react";
import { Eye, Lock, Pencil, FileWarning } from "lucide-react";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import type { CaixaEntregador } from "@/data/mockCaixas";

interface CaixasDoDiaTabProps {
  caixas: CaixaEntregador[];
  onView: (c: CaixaEntregador) => void;
  onEdit: (c: CaixaEntregador) => void;
  onClose: (c: CaixaEntregador) => void;
  onJustify: (c: CaixaEntregador) => void;
}

export function CaixasDoDiaTab({ caixas, onView, onEdit, onClose, onJustify }: CaixasDoDiaTabProps) {
  const [search, setSearch] = useState("");
  const hoje = new Date().toISOString().split("T")[0];

  const filtered = useMemo(() => {
    return caixas
      .filter((c) => c.data === hoje)
      .filter((c) => c.entregador_nome.toLowerCase().includes(search.toLowerCase()));
  }, [caixas, search, hoje]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4 pb-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por entregador..." />
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={Wallet} title="Nenhum caixa aberto hoje" subtitle="Abra um novo caixa para um entregador." />
      ) : (
        <Card>
          <div className="rounded-md border-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entregador</TableHead>
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
                        {c.status === "aberto" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-status-pending hover:text-status-pending/80" onClick={() => onClose(c)}><Lock className="h-4 w-4" /></Button>
                            </TooltipTrigger>
                            <TooltipContent>Fechar caixa</TooltipContent>
                          </Tooltip>
                        )}
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

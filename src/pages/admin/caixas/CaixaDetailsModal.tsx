import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatters";
import { Trash2, RefreshCw } from "lucide-react";
import type { CaixaEntregador } from "@/types/database";
import { useCaixaStore } from "@/contexts/CaixaStore";

interface CaixaDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caixa: CaixaEntregador | null;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  aberto: { label: "Aberto", variant: "default" },
  fechado: { label: "Fechado", variant: "secondary" },
  divergente: { label: "Divergente", variant: "destructive" },
};

export function CaixaDetailsModal({ open, onOpenChange, caixa }: CaixaDetailsModalProps) {
  const { removeRecebimento, recalcularCaixa } = useCaixaStore();
  const [recalculando, setRecalculando] = useState(false);

  if (!caixa) return null;

  const st = statusMap[caixa.status] ?? statusMap.aberto;
  const podeEditar = caixa.status === "aberto";

  const handleRecalcular = async () => {
    setRecalculando(true);
    await recalcularCaixa(caixa.id);
    setRecalculando(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Caixa — {caixa.entregador_nome}
            <Badge variant={st.variant}>{st.label}</Badge>
          </DialogTitle>
        <DialogDescription className="sr-only">.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Data</span>
              <p className="font-medium">{new Date(caixa.data).toLocaleDateString("pt-BR")}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Troco Inicial</span>
              <p className="font-medium">{formatCurrency(caixa.troco_inicial)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total Recebido</span>
              <p className="font-medium">{formatCurrency(caixa.total_recebido)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total Esperado</span>
              <p className="font-bold text-primary">{formatCurrency(caixa.total_esperado)}</p>
            </div>
            {caixa.valor_devolvido !== null && (
              <>
                <div>
                  <span className="text-muted-foreground">Valor Devolvido</span>
                  <p className="font-medium">{formatCurrency(caixa.valor_devolvido)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Diferença</span>
                  <p className={`font-bold ${caixa.diferenca === 0 ? "text-status-completed" : "text-destructive"}`}>
                    {formatCurrency(caixa.diferenca ?? 0)}
                  </p>
                </div>
              </>
            )}
          </div>

          {caixa.observacoes && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <span className="font-medium">Obs:</span> {caixa.observacoes}
            </div>
          )}

          {/* Recebimentos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Recebimentos em Dinheiro ({caixa.recebimentos.length})</h4>
              {podeEditar && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRecalcular}
                  disabled={recalculando}
                  className="h-7 text-xs gap-1"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${recalculando ? "animate-spin" : ""}`} />
                  {recalculando ? "Recalculando..." : "Recalcular"}
                </Button>
              )}
            </div>
            {caixa.recebimentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum recebimento registrado.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hora</TableHead>
                      <TableHead>Solicitação</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      {podeEditar && <TableHead className="w-10" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {caixa.recebimentos.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="tabular-nums">{r.hora}</TableCell>
                        <TableCell className="font-mono text-xs">{r.solicitacao_codigo}</TableCell>
                        <TableCell>{r.cliente_nome}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatCurrency(r.valor_recebido)}</TableCell>
                        {podeEditar && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => removeRecebimento(caixa.id, r.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

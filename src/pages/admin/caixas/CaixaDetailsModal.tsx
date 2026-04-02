import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatters";
import type { CaixaEntregador } from "@/data/mockCaixas";

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
  if (!caixa) return null;

  const st = statusMap[caixa.status] ?? statusMap.aberto;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Caixa — {caixa.entregador_nome}
            <Badge variant={st.variant}>{st.label}</Badge>
          </DialogTitle>
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
            <h4 className="text-sm font-semibold mb-2">Recebimentos em Dinheiro ({caixa.recebimentos.length})</h4>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {caixa.recebimentos.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="tabular-nums">{r.hora}</TableCell>
                        <TableCell className="font-mono text-xs">{r.solicitacao_codigo}</TableCell>
                        <TableCell>{r.cliente_nome}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatCurrency(r.valor_recebido)}</TableCell>
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

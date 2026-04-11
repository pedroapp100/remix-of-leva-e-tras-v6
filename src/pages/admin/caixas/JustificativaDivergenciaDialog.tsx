import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import type { CaixaEntregador } from "@/types/database";

interface JustificativaDivergenciaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caixa: CaixaEntregador | null;
  onConfirm: (caixaId: string, justificativa: string) => void;
}

export function JustificativaDivergenciaDialog({ open, onOpenChange, caixa, onConfirm }: JustificativaDivergenciaDialogProps) {
  const [justificativa, setJustificativa] = useState("");

  useEffect(() => {
    if (caixa && open) {
      setJustificativa(caixa.observacoes ?? "");
    }
  }, [caixa, open]);

  if (!caixa) return null;

  const handleConfirm = () => {
    if (!justificativa.trim()) return;
    onConfirm(caixa.id, justificativa.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Justificativa da Divergência</DialogTitle>
        <DialogDescription className="sr-only">.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{caixa.entregador_nome}</span>
              <Badge variant="destructive">Divergente</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Esperado</span>
                <p className="font-medium tabular-nums">{formatCurrency(caixa.total_esperado)}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Devolvido</span>
                <p className="font-medium tabular-nums">{formatCurrency(caixa.valor_devolvido ?? 0)}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Diferença</span>
                <p className="font-bold text-destructive tabular-nums">{formatCurrency(caixa.diferenca ?? 0)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Motivo da falta / sobra *</Label>
            <Textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva o motivo da divergência no caixa..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Este registro ficará vinculado ao histórico do caixa e do entregador.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!justificativa.trim()}>Registrar Justificativa</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

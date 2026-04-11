import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { formatCurrency } from "@/lib/formatters";
import type { CaixaEntregador } from "@/types/database";

interface FecharCaixaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caixa: CaixaEntregador | null;
  onConfirm: (caixaId: string, valorDevolvido: number, observacoes: string) => void;
}

export function FecharCaixaDialog({ open, onOpenChange, caixa, onConfirm }: FecharCaixaDialogProps) {
  const [valorDevolvido, setValorDevolvido] = useState(0);
  const [observacoes, setObservacoes] = useState("");

  if (!caixa) return null;

  const diferenca = valorDevolvido - caixa.total_esperado;

  const handleConfirm = () => {
    onConfirm(caixa.id, valorDevolvido, observacoes);
    setValorDevolvido(0);
    setObservacoes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fechar Caixa — {caixa.entregador_nome}</DialogTitle>
        <DialogDescription className="sr-only">.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Troco Inicial</span>
              <p className="font-medium">{formatCurrency(caixa.troco_inicial)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total Recebido</span>
              <p className="font-medium">{formatCurrency(caixa.total_recebido)}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Total Esperado</span>
              <p className="text-base font-bold text-primary">{formatCurrency(caixa.total_esperado)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Valor Devolvido (R$)</Label>
            <CurrencyInput value={valorDevolvido} onChange={setValorDevolvido} placeholder="0,00" />
          </div>

          {valorDevolvido > 0 && (
            <div className={`rounded-lg p-3 text-sm font-medium ${diferenca === 0 ? "bg-status-completed/10 text-status-completed" : "bg-destructive/10 text-destructive"}`}>
              Diferença: {formatCurrency(diferenca)}
              {diferenca === 0 && " ✓ Caixa bateu!"}
              {diferenca < 0 && " — Faltando"}
              {diferenca > 0 && " — Sobrando"}
            </div>
          )}

          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Justificativa em caso de divergência..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={valorDevolvido <= 0}>Fechar Caixa</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

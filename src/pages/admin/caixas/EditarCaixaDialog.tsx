import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { formatCurrency } from "@/lib/formatters";
import type { CaixaEntregador } from "@/data/mockCaixas";

interface EditarCaixaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caixa: CaixaEntregador | null;
  onConfirm: (caixaId: string, trocoInicial: number, observacoes: string) => void;
}

export function EditarCaixaDialog({ open, onOpenChange, caixa, onConfirm }: EditarCaixaDialogProps) {
  const [troco, setTroco] = useState(0);
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (caixa && open) {
      setTroco(caixa.troco_inicial);
      setObservacoes(caixa.observacoes ?? "");
    }
  }, [caixa, open]);

  if (!caixa) return null;

  const handleConfirm = () => {
    onConfirm(caixa.id, troco, observacoes);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Caixa — {caixa.entregador_nome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Data</span>
              <p className="font-medium">{new Date(caixa.data).toLocaleDateString("pt-BR")}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <p className="font-medium capitalize">{caixa.status}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Troco Inicial (R$)</Label>
            <CurrencyInput value={troco} onChange={setTroco} placeholder="0,00" />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Observações sobre o caixa..." rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={troco <= 0}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

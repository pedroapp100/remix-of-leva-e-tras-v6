import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { MOCK_ENTREGADORES } from "@/data/mockEntregadores";

interface AbrirCaixaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (entregadorId: string, trocoInicial: number) => void;
  existingEntregadorIds: string[];
}

export function AbrirCaixaDialog({ open, onOpenChange, onConfirm, existingEntregadorIds }: AbrirCaixaDialogProps) {
  const [entregadorId, setEntregadorId] = useState("");
  const [troco, setTroco] = useState(0);

  const disponíveis = MOCK_ENTREGADORES.filter(
    (e) => e.status === "ativo" && !existingEntregadorIds.includes(e.id)
  );

  const handleConfirm = () => {
    if (!entregadorId || troco <= 0) return;
    onConfirm(entregadorId, troco);
    setEntregadorId("");
    setTroco(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Abrir Caixa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Entregador</Label>
            <Select value={entregadorId} onValueChange={setEntregadorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o entregador" />
              </SelectTrigger>
              <SelectContent>
                {disponíveis.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Troco Inicial (R$)</Label>
            <CurrencyInput value={troco} onChange={setTroco} placeholder="0,00" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!entregadorId || troco <= 0}>Abrir Caixa</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

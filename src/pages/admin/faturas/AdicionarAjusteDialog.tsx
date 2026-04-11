import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Fatura, TipoAjuste } from "@/types/database";
import { Pencil } from "lucide-react";
import { CurrencyInput } from "@/components/shared/CurrencyInput";

interface Props {
  fatura: Fatura;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (tipo: TipoAjuste, valor: number, motivo: string) => Promise<void> | void;
}

export function AdicionarAjusteDialog({ fatura, open, onOpenChange, onConfirm }: Props) {
  const [tipo, setTipo] = useState<TipoAjuste>("credito");
  const [valor, setValor] = useState(0);
  const [motivo, setMotivo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = valor > 0 && motivo.trim().length >= 10;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onConfirm(tipo, valor, motivo.trim());
      setTipo("credito");
      setValor(0);
      setMotivo("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Adicionar Ajuste
          </DialogTitle>
          <DialogDescription>
            Adicione um ajuste manual à fatura <strong>{fatura.numero}</strong> do cliente <strong>{fatura.cliente_nome}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAjuste)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credito">Crédito (a favor do cliente)</SelectItem>
                <SelectItem value="debito">Débito (a favor da operação)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor</Label>
            <CurrencyInput value={valor} onChange={setValor} />
          </div>
          <div className="space-y-2">
            <Label>Motivo (mín. 10 caracteres)</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descreva o motivo do ajuste..."
              rows={3}
            />
            {motivo.length > 0 && motivo.length < 10 && (
              <p className="text-xs text-destructive">Mínimo de 10 caracteres ({motivo.length}/10)</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? "Salvando..." : "Confirmar Ajuste"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

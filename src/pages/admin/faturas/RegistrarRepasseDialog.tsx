import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Fatura } from "@/types/database";
import { formatCurrency } from "@/lib/formatters";
import { ArrowUpRight } from "lucide-react";
import { CurrencyInput } from "@/components/shared/CurrencyInput";

interface Props {
  fatura: Fatura;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (valor: number, observacao: string) => Promise<void> | void;
}

export function RegistrarRepasseDialog({ fatura, open, onOpenChange, onConfirm }: Props) {
  const saldo = fatura.saldo_liquido ?? 0;
  const [valor, setValor] = useState(saldo > 0 ? saldo : 0);
  const [observacao, setObservacao] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (valor <= 0) return;
    setSubmitting(true);
    try {
      await onConfirm(valor, observacao);
      setValor(0);
      setObservacao("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5 text-primary" />
            Registrar Repasse
          </DialogTitle>
          <DialogDescription>
            Registre o repasse de valores para o cliente <strong>{fatura.cliente_nome}</strong>.
            Saldo atual: <strong>{formatCurrency(saldo)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Valor do Repasse</Label>
            <CurrencyInput value={valor} onChange={setValor} />
          </div>
          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Transferência via PIX..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={valor <= 0 || submitting}>
            {submitting ? "Registrando..." : "Confirmar Repasse"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

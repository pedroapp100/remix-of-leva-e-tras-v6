import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useCreateRecarga } from "@/hooks/useFinanceiro";
import { useClienteSaldoMap } from "@/hooks/useClientes";
import { useAuth } from "@/contexts/AuthContext";
import type { Cliente } from "@/types/database";

interface RecargaSaldoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: Cliente;
}

export function RecargaSaldoDialog({ open, onOpenChange, cliente }: RecargaSaldoDialogProps) {
  const { user } = useAuth();
  const createRecarga = useCreateRecarga();
  const { getClienteSaldo } = useClienteSaldoMap();
  const [valor, setValor] = useState(0);
  const [observacao, setObservacao] = useState("");

  const saldoAtual = getClienteSaldo(cliente.id);

  const handleSubmit = () => {
    if (valor <= 0) {
      toast.error("Informe um valor válido para a recarga.");
      return;
    }

    createRecarga.mutate({
      cliente_id: cliente.id,
      valor,
      observacao: observacao.trim() || "Recarga de saldo",
      registrado_por_id: user!.id,
    }, {
      onSuccess: () => {
        toast.success(`Recarga de R$ ${valor.toFixed(2).replace(".", ",")} adicionada ao saldo de ${cliente.nome}.`);
        setValor(0);
        setObservacao("");
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error(`Erro ao criar recarga: ${err.message}`);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Recarga de Saldo
          </DialogTitle>
          <DialogDescription>
            Adicionar crédito pré-pago para <strong>{cliente.nome}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted/50 p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Saldo atual</span>
            <span className="text-base sm:text-lg font-bold tabular-nums">
              {saldoAtual.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="valor-recarga">Valor da Recarga *</Label>
            <CurrencyInput
              value={valor}
              onChange={setValor}
              placeholder="R$ 0,00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="obs-recarga">Observação</Label>
            <Textarea
              id="obs-recarga"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Depósito via Pix, Pagamento em dinheiro..."
              rows={2}
            />
          </div>

          {valor > 0 && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center justify-between">
              <span className="text-sm font-medium">Novo saldo</span>
              <span className="text-base sm:text-lg font-bold tabular-nums text-primary">
                {(saldoAtual + valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={valor <= 0}>Confirmar Recarga</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

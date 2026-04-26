import { useState, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Fatura } from "@/types/database";
import { formatCurrency } from "@/lib/formatters";
import { Banknote, Upload, X, FileText } from "lucide-react";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { useFormasPagamento } from "@/hooks/useSettings";

interface Props {
  fatura: Fatura;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (valor: number, formaPagamento: string, observacao: string) => Promise<void> | void;
}

export function RegistrarPagamentoDialog({ fatura, open, onOpenChange, onConfirm }: Props) {
  const { data: formasPagamento = [] } = useFormasPagamento();
  const formasAtivas = formasPagamento.filter((f) => f.enabled);
  const saldo = fatura.saldo_liquido ?? 0;
  const valorSugerido = Math.abs(saldo);
  const [valor, setValor] = useState(valorSugerido > 0 ? valorSugerido : 0);
  const [formaPagamento, setFormaPagamento] = useState(formasAtivas[0]?.name ?? "");
  const [observacao, setObservacao] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [comprovantes, setComprovantes] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const direcao = saldo < 0 ? "Loja → Operação" : "Operação → Loja";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setComprovantes((prev) => [...prev, ...Array.from(files)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setComprovantes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (valor <= 0) return;
    setSubmitting(true);
    try {
      await onConfirm(valor, formaPagamento, observacao);
      setValor(0);
      setFormaPagamento(formasAtivas[0]?.name ?? "");
      setObservacao("");
      setComprovantes([]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            Registrar Pagamento
          </DialogTitle>
          <DialogDescription>
            Registre o pagamento recebido para a fatura <strong>{fatura.numero}</strong>.
            <br />
            Saldo pendente: <strong>{formatCurrency(Math.abs(saldo))}</strong> ({direcao})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Valor do Pagamento</Label>
            <CurrencyInput value={valor} onChange={setValor} />
          </div>
          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {formasAtivas.map((f) => (
                  <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Pagamento via PIX, comprovante #123..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Comprovante(s)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Anexar comprovante
            </Button>
            {comprovantes.length > 0 && (
              <div className="space-y-1.5">
                {comprovantes.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate flex-1">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={valor <= 0 || !formaPagamento || submitting}>
            {submitting ? "Registrando..." : "Confirmar Pagamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

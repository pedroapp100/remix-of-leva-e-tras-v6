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
import { ArrowUpRight, Upload, X, FileText, QrCode } from "lucide-react";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { useClienteById } from "@/hooks/useClientes";

const FORMAS_PAGAMENTO = ["PIX", "Dinheiro", "Transferência Bancária", "Boleto"];

interface Props {
  fatura: Fatura;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (valor: number, formaPagamento: string, observacao: string, comprovantes: File[]) => Promise<void> | void;
}

export function RegistrarRepasseDialog({ fatura, open, onOpenChange, onConfirm }: Props) {
  const { data: cliente } = useClienteById(fatura.cliente_id);
  const saldo = fatura.saldo_liquido ?? 0;
  const [valor, setValor] = useState(saldo > 0 ? saldo : 0);
  const [formaPagamento, setFormaPagamento] = useState("");
  const [observacao, setObservacao] = useState("");
  const [comprovantes, setComprovantes] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) setComprovantes((prev) => [...prev, ...Array.from(files)]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setComprovantes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (valor <= 0) return;
    setSubmitting(true);
    try {
      await onConfirm(valor, formaPagamento, observacao, comprovantes);
      setValor(0);
      setFormaPagamento("");
      setObservacao("");
      setComprovantes([]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
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
            <Label>Meio de Pagamento</Label>
            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {FORMAS_PAGAMENTO.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cliente?.chave_pix && (
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
                <QrCode className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <span className="block text-[10px] text-muted-foreground leading-none mb-0.5">Chave PIX do cliente</span>
                  <span className="block text-xs font-medium truncate select-all">{cliente.chave_pix}</span>
                </div>
              </div>
            )}
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
          <Button onClick={handleSubmit} disabled={valor <= 0 || submitting}>
            {submitting ? "Registrando..." : "Confirmar Repasse"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

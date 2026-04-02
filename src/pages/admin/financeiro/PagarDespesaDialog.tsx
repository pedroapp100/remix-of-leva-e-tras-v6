import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Despesa } from "@/types/database";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import { DollarSign, Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface PagarDespesaDialogProps {
  despesa: Despesa | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (despesa: Despesa, dados: { formaPagamento: string; dataPagamento: string; observacao: string; comprovantes: File[] }) => void;
}

export function PagarDespesaDialog({ despesa, open, onOpenChange, onConfirm }: PagarDespesaDialogProps) {
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split("T")[0]);
  const [observacao, setObservacao] = useState("");
  const [comprovantes, setComprovantes] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter((f) => {
      const isValid = f.type.startsWith("image/") || f.type === "application/pdf";
      const isSmall = f.size <= 5 * 1024 * 1024; // 5MB
      if (!isValid) toast.error(`"${f.name}" não é um formato válido. Use imagens ou PDF.`);
      if (!isSmall) toast.error(`"${f.name}" excede o limite de 5MB.`);
      return isValid && isSmall;
    });
    setComprovantes((prev) => [...prev, ...valid]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setComprovantes((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFormaPagamento("pix");
    setDataPagamento(new Date().toISOString().split("T")[0]);
    setObservacao("");
    setComprovantes([]);
  };

  const handleSubmit = () => {
    if (!despesa) return;
    onConfirm(despesa, { formaPagamento, dataPagamento, observacao, comprovantes });
    resetForm();
    onOpenChange(false);
  };

  if (!despesa) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Registrar Pagamento
          </DialogTitle>
          <DialogDescription>Confirme os dados do pagamento da despesa.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo da despesa */}
          <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
            <p className="font-medium text-sm">{despesa.descricao}</p>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{despesa.fornecedor}</span>
              <span className="font-semibold text-foreground">{formatCurrency(despesa.valor)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Vencimento: {formatDateBR(despesa.vencimento)}</p>
          </div>

          {/* Forma de pagamento */}
          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <Select value={formaPagamento} onValueChange={setFormaPagamento}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data do pagamento */}
          <div className="space-y-2">
            <Label>Data do Pagamento</Label>
            <Input
              type="date"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
            />
          </div>

          {/* Comprovante */}
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
            <div
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <p className="text-sm text-muted-foreground">
                Clique para anexar comprovantes
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Imagens ou PDF • Máx. 5MB por arquivo
              </p>
            </div>

            {/* Lista de arquivos */}
            {comprovantes.length > 0 && (
              <div className="space-y-2 mt-2">
                {comprovantes.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                    {file.type.startsWith("image/") ? (
                      <ImageIcon className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observação */}
          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Pagamento realizado via PIX..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancelar</Button>
          <Button onClick={handleSubmit}>Confirmar Pagamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

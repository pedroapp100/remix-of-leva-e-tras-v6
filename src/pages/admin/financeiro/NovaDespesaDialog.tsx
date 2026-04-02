import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/shared";
import type { Despesa } from "@/types/database";
import { toast } from "sonner";

const CATEGORIAS = [
  "Aluguel", "Combustível", "Manutenção", "Telecomunicações",
  "Seguros", "Materiais", "Serviços", "Software", "Utilidades", "Marketing", "Outros",
];

interface NovaDespesaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (despesa: Despesa) => void;
}

export function NovaDespesaDialog({ open, onOpenChange, onSave }: NovaDespesaDialogProps) {
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [valor, setValor] = useState(0);
  const [observacao, setObservacao] = useState("");

  const resetForm = () => {
    setDescricao("");
    setCategoria("");
    setFornecedor("");
    setVencimento("");
    setValor(0);
    setObservacao("");
  };

  const handleSave = () => {
    if (!descricao.trim() || !categoria || !fornecedor.trim() || !vencimento || valor <= 0) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    const now = new Date().toISOString();
    const newDespesa: Despesa = {
      id: `desp-${Date.now()}`,
      descricao: descricao.trim(),
      categoria,
      fornecedor: fornecedor.trim(),
      vencimento,
      valor,
      status: "Pendente",
      data_pagamento: null,
      usuario_pagou_id: null,
      observacao: observacao.trim() || null,
      created_at: now,
      updated_at: now,
    };

    onSave(newDespesa);
    toast.success("Despesa criada com sucesso!");
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Despesa</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="descricao">Descrição *</Label>
            <Input id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Aluguel do escritório" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Categoria *</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fornecedor">Fornecedor *</Label>
              <Input id="fornecedor" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Ex: Imobiliária" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="vencimento">Vencimento *</Label>
              <Input id="vencimento" type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Valor (R$) *</Label>
              <CurrencyInput value={valor} onChange={setValor} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="obs">Observação</Label>
            <Textarea id="obs" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Opcional" rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

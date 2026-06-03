import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/shared";
import type { Despesa } from "@/types/database";
import { useCategorias } from "@/hooks/useFinanceiro";
import { toast } from "sonner";

interface NovaDespesaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (despesa: Omit<Despesa, "id" | "created_at" | "updated_at">) => void;
  despesaEditar?: Despesa | null;
}

export function NovaDespesaDialog({ open, onOpenChange, onSave, despesaEditar }: NovaDespesaDialogProps) {
  const { data: categorias = [] } = useCategorias();
  const categsDespesa = categorias.filter((c) => c.tipo === "despesa" || c.tipo === "ambos");
  const [descricao, setDescricao] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [valor, setValor] = useState(0);
  const [observacao, setObservacao] = useState("");

  const isEditing = !!despesaEditar;

  useEffect(() => {
    if (despesaEditar) {
      setDescricao(despesaEditar.descricao);
      setCategoriaId(despesaEditar.categoria_id ?? "");
      setFornecedor(despesaEditar.fornecedor);
      setVencimento(despesaEditar.vencimento);
      setValor(despesaEditar.valor);
      setObservacao(despesaEditar.observacao ?? "");
    } else {
      resetForm();
    }
  }, [despesaEditar, open]);

  const resetForm = () => {
    setDescricao("");
    setCategoriaId("");
    setFornecedor("");
    setVencimento("");
    setValor(0);
    setObservacao("");
  };

  const handleSave = () => {
    if (!descricao.trim() || !categoriaId || !fornecedor.trim() || !vencimento || valor <= 0) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    onSave({
      descricao: descricao.trim(),
      categoria_id: categoriaId,
      fornecedor: fornecedor.trim(),
      vencimento,
      valor,
      status: despesaEditar?.status ?? "Pendente",
      data_pagamento: despesaEditar?.data_pagamento ?? null,
      usuario_pagou_id: despesaEditar?.usuario_pagou_id ?? null,
      observacao: observacao.trim() || null,
    });
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
          <DialogDescription className="sr-only">.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="descricao">Descrição *</Label>
            <Input id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Aluguel do escritório" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Categoria *</Label>
              <Select value={categoriaId} onValueChange={setCategoriaId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categsDespesa.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
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
          <Button onClick={handleSave}>{isEditing ? "Salvar alterações" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

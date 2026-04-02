import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Receita } from "@/types/database";

interface NovaReceitaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (receita: Receita) => void;
  editingReceita?: Receita | null;
}

const CATEGORIAS = [
  "Taxas de Entrega",
  "Taxas Express",
  "Taxa de Retorno",
  "Recebimento de Fatura",
  "Outros",
];

export function NovaReceitaDialog({ open, onOpenChange, onSave, editingReceita }: NovaReceitaDialogProps) {
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [valor, setValor] = useState("");
  const [dataRecebimento, setDataRecebimento] = useState("");
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    if (editingReceita) {
      setDescricao(editingReceita.descricao);
      setCategoria(editingReceita.categoria);
      setValor(String(editingReceita.valor));
      setDataRecebimento(editingReceita.data_recebimento);
      setObservacao(editingReceita.observacao || "");
    } else {
      setDescricao("");
      setCategoria("");
      setValor("");
      setDataRecebimento(new Date().toISOString().split("T")[0]);
      setObservacao("");
    }
  }, [editingReceita, open]);

  const handleSubmit = () => {
    if (!descricao || !categoria || !valor || !dataRecebimento) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    const parsedValor = parseFloat(valor);
    if (isNaN(parsedValor) || parsedValor <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    const receita: Receita = {
      id: editingReceita?.id || `rec-${Date.now()}`,
      descricao,
      categoria,
      valor: parsedValor,
      data_recebimento: dataRecebimento,
      observacao: observacao || null,
      cliente_id: editingReceita?.cliente_id || null,
      created_at: editingReceita?.created_at || new Date().toISOString(),
    };

    onSave(receita);
    toast.success(editingReceita ? "Receita atualizada com sucesso." : "Receita lançada com sucesso.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingReceita ? "Editar Receita" : "Nova Receita"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Recebimento fatura FAT-001" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Data de Recebimento *</Label>
            <Input type="date" value={dataRecebimento} onChange={(e) => setDataRecebimento(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Observação opcional..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>{editingReceita ? "Salvar" : "Lançar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

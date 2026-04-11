import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Receita } from "@/types/database";
import { useCategorias } from "@/hooks/useFinanceiro";

interface NovaReceitaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (receita: Receita) => void;
  editingReceita?: Receita | null;
}

export function NovaReceitaDialog({ open, onOpenChange, onSave, editingReceita }: NovaReceitaDialogProps) {
  const { data: allCategorias = [] } = useCategorias();
  const categsReceita = allCategorias.filter((c) => c.tipo === "receita" || c.tipo === "ambos");
  const [descricao, setDescricao] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [valor, setValor] = useState("");
  const [dataRecebimento, setDataRecebimento] = useState("");
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    if (editingReceita) {
      setDescricao(editingReceita.descricao);
      setCategoriaId(editingReceita.categoria_id ?? "");
      setValor(String(editingReceita.valor));
      setDataRecebimento(editingReceita.data_recebimento);
      setObservacao(editingReceita.observacao || "");
    } else {
      setDescricao("");
      setCategoriaId("");
      setValor("");
      setDataRecebimento(new Date().toISOString().split("T")[0]);
      setObservacao("");
    }
  }, [editingReceita, open]);

  const handleSubmit = () => {
    if (!descricao || !categoriaId || !valor || !dataRecebimento) {
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
      categoria_id: categoriaId,
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
        <DialogDescription className="sr-only">.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Recebimento fatura FAT-001" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={categoriaId} onValueChange={setCategoriaId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categsReceita.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
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

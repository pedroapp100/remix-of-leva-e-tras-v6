import { useState } from "react";
import type { Feriado } from "@/types/database";
import { useLogStore } from "@/contexts/LogStore";
import { useFeriados, useUpsertFeriado, useDeleteFeriado } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function FeriadosSection() {
  const { addLog } = useLogStore();
  const { data: feriados = [] } = useFeriados();
  const upsertFeriado = useUpsertFeriado();
  const deleteFeriado = useDeleteFeriado();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Feriado | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Feriado | null>(null);

  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [recorrente, setRecorrente] = useState(true);
  const [ativo, setAtivo] = useState(true);

  const openCreate = () => {
    setEditing(null); setNome(""); setData(""); setRecorrente(true); setAtivo(true);
    setDialogOpen(true);
  };

  const openEdit = (f: Feriado) => {
    setEditing(f); setNome(f.nome); setData(f.data);
    setRecorrente(f.recorrente); setAtivo(f.ativo);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim()) { toast.error("Nome é obrigatório."); return; }
    if (!data) { toast.error("Data é obrigatória."); return; }

    if (editing) {
      await upsertFeriado.mutateAsync({ id: editing.id, nome: nome.trim(), data, recorrente, ativo });
      addLog({ categoria: "configuracao", acao: "feriado_editado", entidade_id: editing.id, descricao: `Feriado "${nome}" atualizado (${formatDate(data)})`, detalhes: { nome, data, recorrente, ativo } });
      toast.success("Feriado atualizado!");
    } else {
      const inserted = await upsertFeriado.mutateAsync({ nome: nome.trim(), data, recorrente, ativo });
      addLog({ categoria: "configuracao", acao: "feriado_criado", entidade_id: inserted?.id ?? "new", descricao: `Feriado "${nome}" cadastrado (${formatDate(data)})`, detalhes: { nome, data, recorrente } });
      toast.success("Feriado cadastrado!");
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteFeriado.mutateAsync(deleteTarget.id);
    addLog({ categoria: "configuracao", acao: "feriado_removido", entidade_id: deleteTarget.id, descricao: `Feriado "${deleteTarget.nome}" removido`, detalhes: null });
    toast.success("Feriado removido!");
    setDeleteTarget(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5" /> Feriados
            </CardTitle>
            <CardDescription className="text-sm">Cadastre feriados nacionais e locais. Tipos de operação marcados como "feriado" serão aplicados nestas datas.</CardDescription>
          </div>
          <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-2" /> Novo Feriado</Button>
        </div>
      </CardHeader>
      <CardContent>
        {feriados.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="font-medium">Nenhum feriado cadastrado</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>Cadastrar primeiro feriado</Button>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {feriados.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-accent/50 transition-colors">
                <div className="space-y-0.5">
                  <p className="font-medium text-sm">{f.nome}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="tabular-nums">{formatDate(f.data)}</span>
                    {f.recorrente && <Badge variant="outline" className="text-xs py-0">Anual</Badge>}
                    {!f.ativo && <Badge variant="secondary" className="text-xs py-0">Inativo</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openEdit(f)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget(f)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Feriado" : "Novo Feriado"}</DialogTitle>
          <DialogDescription className="sr-only">.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Natal" />
            </div>
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={recorrente} onCheckedChange={setRecorrente} />
              <div>
                <Label className="text-sm font-medium">Recorrente (anual)</Label>
                <p className="text-xs text-muted-foreground">Repete automaticamente todos os anos</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={ativo} onCheckedChange={setAtivo} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir feriado"
        description={`Tem certeza que deseja excluir "${deleteTarget?.nome}"?`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </Card>
  );
}

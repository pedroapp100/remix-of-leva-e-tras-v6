import { useState } from "react";
import { DataTable, SearchInput, ConfirmDialog } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import type { Regiao } from "@/types/database";
import { useRegioes, useUpsertRegiao, useDeleteRegiao } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLogStore } from "@/contexts/LogStore";

export function RegioesTab() {
  const { addLog } = useLogStore();
  const { data: regioes = [] } = useRegioes();
  const upsertRegiao = useUpsertRegiao();
  const removeRegiao = useDeleteRegiao();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Regiao | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Regiao | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const filtered = regioes.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setEditing(null); setName(""); setDescription(""); setDialogOpen(true); };
  const openEdit = (r: Regiao) => { setEditing(r); setName(r.name); setDescription(r.description ?? ""); setDialogOpen(true); };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Nome é obrigatório."); return; }
    if (editing) {
      await upsertRegiao.mutateAsync({ id: editing.id, name, description: description || null });
      addLog({ categoria: "configuracao", acao: "regiao_editada", entidade_id: editing.id, descricao: `Região "${name}" atualizada`, detalhes: { nome: name } });
      toast.success("Região atualizada!");
    } else {
      await upsertRegiao.mutateAsync({ name, description: description || null });
      addLog({ categoria: "configuracao", acao: "regiao_criada", entidade_id: "new", descricao: `Região "${name}" criada`, detalhes: { nome: name } });
      toast.success("Região criada!");
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await removeRegiao.mutateAsync(deleteTarget.id);
    addLog({ categoria: "configuracao", acao: "regiao_removida", entidade_id: deleteTarget.id, descricao: `Região "${deleteTarget.name}" removida`, detalhes: null });
    toast.success("Região removida!");
    setDeleteTarget(null);
  };

  const columns: Column<Regiao>[] = [
    { key: "name", header: "Nome", sortable: true, cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "description", header: "Descrição", cell: (r) => <span className="text-muted-foreground">{r.description ?? "—"}</span> },
    {
      key: "actions", header: "Ações", className: "w-28 text-right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-200" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Pencil className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Editar região</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/30 transition-colors duration-200" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}><Trash2 className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Excluir região</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Regiões</CardTitle>
        <CardDescription className="text-sm">Agrupe bairros por região para facilitar a gestão de preços.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar região..." className="flex-1" />
          <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-2" /> Nova Região</Button>
        </div>
        <DataTable data={filtered} columns={columns} emptyTitle="Nenhuma região cadastrada" emptySubtitle="Cadastre a primeira região para agrupar bairros." emptyActionLabel="Cadastrar primeira região" onEmptyAction={openCreate}
          renderMobileCard={(r) => (
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{r.name}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
            </div>
          )}
        />
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar Região" : "Nova Região"}</DialogTitle><DialogDescription className="sr-only">.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Zona Norte" /></div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição opcional..." rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)} title="Excluir região" description={`Excluir "${deleteTarget?.name}"? Bairros vinculados ficarão sem região.`} confirmLabel="Excluir" variant="destructive" onConfirm={handleDelete} />
    </Card>
  );
}

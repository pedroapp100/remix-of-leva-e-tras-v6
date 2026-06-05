import { useState } from "react";
import { DataTable, SearchInput } from "@/components/shared";
import { useLogStore } from "@/contexts/LogStore";
import type { Column } from "@/components/shared/DataTable";
import type { CategoriaRow } from "@/services/financeiro";
import { useTodasCategorias, useCreateCategoria, useUpdateCategoria, useDeleteCategoria } from "@/hooks/useFinanceiro";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";

const TIPO_LABELS: Record<string, string> = {
  despesa: "Despesa",
  receita: "Receita",
  ambos: "Ambos",
};

const TIPO_VARIANTS: Record<string, "destructive" | "default" | "secondary"> = {
  despesa: "destructive",
  receita: "default",
  ambos: "secondary",
};

export function CategoriasFinanceirasTab() {
  const { addLog } = useLogStore();
  const { data: categorias = [] } = useTodasCategorias();
  const createCategoria = useCreateCategoria();
  const updateCategoria = useUpdateCategoria();
  const deleteCategoria = useDeleteCategoria();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoriaRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoriaRow | null>(null);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"despesa" | "receita" | "ambos">("despesa");

  const filtered = categorias.filter((c) =>
    c.nome.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setNome("");
    setTipo("despesa");
    setDialogOpen(true);
  };

  const openEdit = (c: CategoriaRow) => {
    setEditing(c);
    setNome(c.nome);
    setTipo(c.tipo as "despesa" | "receita" | "ambos");
    setDialogOpen(true);
  };

  const handleToggleAtivo = async (c: CategoriaRow) => {
    await updateCategoria.mutateAsync({ id: c.id, patch: { ativo: !c.ativo } });
    addLog({
      categoria: "configuracao",
      acao: "categoria_toggle",
      entidade_id: c.id,
      descricao: `Categoria "${c.nome}" ${!c.ativo ? "ativada" : "desativada"}`,
      detalhes: { ativo: !c.ativo },
    });
    toast.success("Status atualizado!");
  };

  const handleSave = async () => {
    if (!nome.trim()) { toast.error("Nome é obrigatório."); return; }

    if (editing) {
      await updateCategoria.mutateAsync({ id: editing.id, patch: { nome: nome.trim(), tipo } });
      addLog({
        categoria: "configuracao",
        acao: "categoria_editada",
        entidade_id: editing.id,
        descricao: `Categoria "${nome}" atualizada`,
        detalhes: { nome, tipo },
      });
      toast.success("Categoria atualizada!");
    } else {
      const inserted = await createCategoria.mutateAsync({ nome: nome.trim(), tipo, ativo: true });
      addLog({
        categoria: "configuracao",
        acao: "categoria_criada",
        entidade_id: inserted?.id ?? "new",
        descricao: `Categoria "${nome}" criada`,
        detalhes: { nome, tipo },
      });
      toast.success("Categoria criada!");
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCategoria.mutateAsync(deleteTarget.id);
      addLog({
        categoria: "configuracao",
        acao: "categoria_removida",
        entidade_id: deleteTarget.id,
        descricao: `Categoria "${deleteTarget.nome}" removida`,
        detalhes: null,
      });
      toast.success("Categoria removida!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover categoria.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns: Column<CategoriaRow>[] = [
    {
      key: "nome",
      header: "Nome",
      sortable: true,
      cell: (r) => <span className="font-medium">{r.nome}</span>,
    },
    {
      key: "tipo",
      header: "Tipo",
      cell: (r) => (
        <Badge variant={TIPO_VARIANTS[r.tipo] ?? "secondary"}>
          {TIPO_LABELS[r.tipo] ?? r.tipo}
        </Badge>
      ),
    },
    {
      key: "ativo",
      header: "Status",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Switch checked={r.ativo} onCheckedChange={() => handleToggleAtivo(r)} />
          <Badge variant={r.ativo ? "default" : "secondary"}>{r.ativo ? "Ativa" : "Inativa"}</Badge>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Ações",
      className: "w-24 text-right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-200"
                  onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar categoria</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/30 transition-colors duration-200"
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir categoria</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Categorias Financeiras</CardTitle>
        <CardDescription className="text-sm">
          Categorias usadas em despesas e receitas. Categorias em uso não podem ser excluídas — desative-as.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar categoria..." className="flex-1" />
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" /> Nova Categoria
          </Button>
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          emptyTitle="Nenhuma categoria"
          emptySubtitle="Cadastre as categorias para organizar despesas e receitas."
          emptyActionLabel="Cadastrar"
          onEmptyAction={openCreate}
          renderMobileCard={(r) => (
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{r.nome}</span>
                <Badge variant={TIPO_VARIANTS[r.tipo] ?? "secondary"}>
                  {TIPO_LABELS[r.tipo] ?? r.tipo}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch checked={r.ativo} onCheckedChange={() => handleToggleAtivo(r)} />
                  <Badge variant={r.ativo ? "default" : "secondary"}>{r.ativo ? "Ativa" : "Inativa"}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        />
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
            <DialogDescription className="sr-only">.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Combustível" />
            </div>
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as "despesa" | "receita" | "ambos")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="despesa">Despesa</SelectItem>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="ambos">Ambos</SelectItem>
                </SelectContent>
              </Select>
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
        title={`Excluir "${deleteTarget?.nome}"?`}
        description="Categorias vinculadas a despesas ou receitas não podem ser excluídas. Desative-as em vez disso."
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </Card>
  );
}

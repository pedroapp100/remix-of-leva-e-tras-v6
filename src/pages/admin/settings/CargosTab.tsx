import { useState } from "react";
import { DataTable, SearchInput, ConfirmDialog } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import type { Cargo } from "@/types/database";
import { MOCK_CARGOS, PERMISSION_MODULES } from "@/data/mockSettings";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { PermissionMatrix } from "@/components/shared/PermissionMatrix";

export function CargosTab() {
  const [cargos, setCargos] = useState<Cargo[]>(MOCK_CARGOS);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cargo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Cargo | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);

  const filtered = cargos.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setEditing(null); setName(""); setDescription(""); setPermissions([]); setDialogOpen(true); };
  const openEdit = (c: Cargo) => { setEditing(c); setName(c.name); setDescription(c.description ?? ""); setPermissions([...c.permissions]); setDialogOpen(true); };

  const togglePermission = (key: string) => setPermissions((prev) => prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]);
  const toggleModule = (modulePerms: string[]) => {
    const allSelected = modulePerms.every((p) => permissions.includes(p));
    setPermissions((prev) => allSelected ? prev.filter((p) => !modulePerms.includes(p)) : [...new Set([...prev, ...modulePerms])]);
  };

  const handleSave = () => {
    if (!name.trim()) { toast.error("Nome é obrigatório."); return; }
    if (permissions.length === 0) { toast.error("Selecione ao menos uma permissão."); return; }
    if (editing) {
      setCargos((prev) => prev.map((c) => c.id === editing.id ? { ...c, name, description: description || null, permissions } : c));
      toast.success("Cargo atualizado!");
    } else {
      setCargos((prev) => [...prev, { id: `cargo-${Date.now()}`, name, description: description || null, permissions }]);
      toast.success("Cargo criado!");
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.id === "cargo-1") { toast.error("Este cargo não pode ser excluído."); setDeleteTarget(null); return; }
    setCargos((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    toast.success("Cargo removido!");
    setDeleteTarget(null);
  };

  const columns: Column<Cargo>[] = [
    {
      key: "name", header: "Cargo", sortable: true,
      cell: (r) => (<div className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /><span className="font-medium">{r.name}</span></div>),
    },
    { key: "description", header: "Descrição", cell: (r) => <span className="text-muted-foreground">{r.description ?? "—"}</span> },
    { key: "permissions", header: "Permissões", cell: (r) => <Badge variant="secondary" className="tabular-nums">{r.permissions.length} permissões</Badge> },
    {
      key: "actions", header: "Ações", className: "w-28 text-right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-200" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Pencil className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Editar cargo</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/30 transition-colors duration-200" disabled={r.id === "cargo-1"} onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}><Trash2 className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Excluir cargo</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Visual Permission Matrix */}
      <PermissionMatrix cargos={cargos} />

      {/* Cargo Management Card */}
      <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cargos e Permissões</CardTitle>
        <CardDescription className="text-sm">Defina cargos e suas permissões de acesso ao sistema.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar cargo..." className="flex-1" />
          <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-2" /> Novo Cargo</Button>
        </div>
        <DataTable data={filtered} columns={columns} emptyTitle="Nenhum cargo cadastrado" emptySubtitle="Crie cargos para controlar permissões." emptyActionLabel="Criar primeiro cargo" onEmptyAction={openCreate}
          renderMobileCard={(r) => (
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-medium">{r.name}</span>
                </div>
                <Badge variant="secondary" className="tabular-nums">{r.permissions.length} permissões</Badge>
              </div>
              {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
              <div className="flex items-center justify-end gap-1 border-t border-border pt-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" disabled={r.id === "cargo-1"} onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        />
      </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh]">
          <DialogHeader><DialogTitle>{editing ? "Editar Cargo" : "Novo Cargo"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Operador" /></div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição do cargo..." rows={2} /></div>
            <div className="space-y-2">
              <Label>Permissões *</Label>
              <ScrollArea className="h-64 rounded-md border p-3">
                <div className="space-y-4">
                  {PERMISSION_MODULES.map((mod) => {
                    const modKeys = mod.permissions.map((p) => p.key);
                    const allSelected = modKeys.every((k) => permissions.includes(k));
                    const someSelected = modKeys.some((k) => permissions.includes(k));
                    return (
                      <div key={mod.module} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox checked={allSelected} onCheckedChange={() => toggleModule(modKeys)} className={someSelected && !allSelected ? "opacity-60" : ""} />
                          <span className="text-sm font-semibold">{mod.module}</span>
                        </div>
                        <div className="ml-6 grid grid-cols-2 gap-2">
                          {mod.permissions.map((perm) => (
                            <div key={perm.key} className="flex items-center gap-2">
                              <Checkbox checked={permissions.includes(perm.key)} onCheckedChange={() => togglePermission(perm.key)} />
                              <span className="text-sm text-muted-foreground">{perm.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">{permissions.length} permissões selecionadas</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)} title="Excluir cargo" description={`Excluir "${deleteTarget?.name}"? Usuários perderão suas permissões.`} confirmLabel="Excluir" variant="destructive" onConfirm={handleDelete} />
    </div>
  );
}

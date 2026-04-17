import { useState } from "react";
import { useAdminProfiles, useUpdateProfile, useDeactivateProfile } from "@/hooks/useUsers";
import { useCargos } from "@/hooks/useSettings";
import { supabase } from "@/lib/supabase";
import { DataTable, SearchInput, ConfirmDialog, StatusBadge, PermissionGuard } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, UserCog, X } from "lucide-react";
import { toast } from "sonner";
import type { UserStatus } from "@/types/database";
import type { ProfileRow } from "@/services/users";
import { maskDocumento } from "@/lib/formatters";

interface UserFormData {
  nome: string;
  email: string;
  password: string;
  cargo_id: string;
  status: UserStatus;
  documento: string;
}

const emptyForm: UserFormData = { nome: "", email: "", password: "", cargo_id: "", status: "ativo", documento: "" };

export function UsuariosTab() {
  const { data: adminUsers = [], refetch } = useAdminProfiles();
  const updateProfile = useUpdateProfile();
  const deactivateProfile = useDeactivateProfile();
  const { data: cargos = [] } = useCargos();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormData>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = adminUsers.filter((u) => {
    const matchSearch =
      u.nome.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const userStatus = u.ativo ? "ativo" : "inativo";
    const matchStatus = statusFilter === "todos" || userStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const getCargoName = (cargoId?: string | null) =>
    cargos.find((c) => c.id === cargoId)?.name ?? "—";

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(user: ProfileRow) {
    setEditingId(user.id);
    setForm({
      nome: user.nome,
      email: user.email ?? "",
      password: "",
      cargo_id: user.cargo_id ?? "",
      status: (user.ativo ? "ativo" : "inativo") as UserStatus,
      documento: user.documento ? maskDocumento(user.documento) : "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.nome.trim() || !form.email.trim()) {
      toast.error("Preencha nome e email.");
      return;
    }

    try {
      if (editingId) {
        await updateProfile.mutateAsync({
          id: editingId,
          patch: {
            nome: form.nome.trim(),
            cargo_id: form.cargo_id || null,
            ativo: form.status === "ativo",
            documento: form.documento.replace(/\D/g, "") || null,
          },
        });
        toast.success("Usuário atualizado com sucesso.");
      } else {
        if (!form.password.trim()) {
          toast.error("Defina uma senha para o novo usuário.");
          return;
        }
        if (form.password.trim().length < 6) {
          toast.error("A senha deve ter no mínimo 6 caracteres.");
          return;
        }
        const { data, error } = await supabase.functions.invoke("create-user", {
          body: {
            email: form.email.trim().toLowerCase(),
            password: form.password.trim(),
            nome: form.nome.trim(),
            role: "admin",
            documento: form.documento.replace(/\D/g, "") || undefined,
            cargo_id: form.cargo_id || undefined,
          },
        });
        if (error || data?.error) {
          toast.error(data?.error ?? error?.message ?? "Erro ao criar usuário.");
          return;
        }
        toast.success(`Usuário criado: ${form.email.trim().toLowerCase()}`);
        await refetch();
      }
      setDialogOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro inesperado ao salvar usuário.";
      toast.error(message);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    await deactivateProfile.mutateAsync(deleteId);
    toast.success("Usuário desativado.");
    setDeleteId(null);
  }

  const deleteTarget = adminUsers.find((u) => u.id === deleteId);

  const columns: Column<ProfileRow>[] = [
    {
      key: "nome",
      header: "Nome",
      sortable: true,
      cell: (r) => <span className="font-medium">{r.nome}</span>,
    },
    {
      key: "email",
      header: "Email",
      cell: (r) => <span className="text-muted-foreground">{r.email}</span>,
    },
    {
      key: "cargo",
      header: "Cargo",
      cell: (r) => (
        <Badge variant="outline" className="gap-1">
          <UserCog className="h-3 w-3" />
          {getCargoName(r.cargo_id)}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusBadge status={r.ativo ? "ativo" : "inativo"} />,
    },
    {
      key: "actions",
      header: "Ações",
      className: "w-28 text-right",
      cell: (r) => (
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center justify-end gap-1">
            <PermissionGuard permission="usuarios.edit">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 transition-colors"
                    onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar usuário</TooltipContent>
              </Tooltip>
            </PermissionGuard>
            <PermissionGuard permission="usuarios.delete">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/15 transition-colors"
                    onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Excluir usuário</TooltipContent>
              </Tooltip>
            </PermissionGuard>
          </div>
        </TooltipProvider>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header with action */}
      <div className="flex items-center justify-between">
        <div />
        <PermissionGuard permission="usuarios.create">
          <Button onClick={openCreate} size="sm">
            <Plus className="mr-2 h-4 w-4" /> Novo Usuário
          </Button>
        </PermissionGuard>
      </div>

      {/* Filters + Table Card */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nome ou email..."
              className="flex-1 min-w-[200px]"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
            {(search || statusFilter !== "todos") && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => { setSearch(""); setStatusFilter("todos"); }}
              >
                <X className="h-3.5 w-3.5" /> Limpar filtros
              </Button>
            )}
          </div>

          <DataTable
            data={filtered}
            columns={columns}
            emptyTitle="Nenhum usuário encontrado"
            emptySubtitle="Crie um novo usuário admin para começar."
            emptyActionLabel="Criar primeiro usuário"
            onEmptyAction={openCreate}
            renderMobileCard={(r) => (
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.nome}</p>
                    <p className="text-sm text-muted-foreground">{r.email}</p>
                  </div>
                  <StatusBadge status={r.ativo ? "ativo" : "inativo"} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <Badge variant="outline" className="gap-1">
                    <UserCog className="h-3 w-3" />
                    {getCargoName(r.cargo_id)}
                  </Badge>
                </div>
                <div className="flex items-center justify-end gap-1 border-t border-border pt-2">
                  <PermissionGuard permission="usuarios.edit">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </PermissionGuard>
                  <PermissionGuard permission="usuarios.delete">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/15" onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </PermissionGuard>
                </div>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Usuário" : "Novo Usuário Admin"}</DialogTitle>
          <DialogDescription className="sr-only">.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com" />
            </div>
            <div className="space-y-2">
              <Label>
                CPF / CNPJ{" "}
                <span className="text-xs text-muted-foreground">(opcional — permite login por documento)</span>
              </Label>
              <Input
                value={form.documento}
                onChange={(e) => setForm((f) => ({ ...f, documento: maskDocumento(e.target.value) }))}
                placeholder="000.000.000-00"
                maxLength={18}
              />
            </div>
            <div className="space-y-2">
              <Label>{editingId ? "Nova Senha (deixe em branco para manter)" : "Senha"}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
                className={form.password && form.password.length < 6 ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {form.password && form.password.length < 6 && (
                <p className="text-xs text-destructive">A senha deve ter no mínimo 6 caracteres.</p>
              )}
              {form.password && form.password.length >= 6 && (
                <p className="text-xs text-green-600 dark:text-green-400">✓ Senha válida</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select value={form.cargo_id} onValueChange={(v) => setForm((f) => ({ ...f, cargo_id: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {cargos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as UserStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSave}>{editingId ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir Usuário"
        description={`Excluir "${deleteTarget?.nome}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

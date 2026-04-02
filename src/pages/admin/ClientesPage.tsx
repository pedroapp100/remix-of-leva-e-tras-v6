import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageContainer, MetricCard, DataTable, SearchInput, ConfirmDialog, AvatarWithFallback, StatusBadge, PermissionGuard } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import type { Cliente } from "@/types/database";
import { MOCK_CLIENTES, MOCK_CLIENTES_METRICS } from "@/data/mockClientes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, UserCheck, CreditCard, Wallet, Pencil, Trash2, Eye, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useUserStore } from "@/data/mockUsers";
import { ClientFormDialog } from "./clientes/ClientFormDialog";
import { ClientProfileModal } from "./clientes/ClientProfileModal";

const MODALIDADE_LABELS: Record<string, string> = {
  pre_pago: "Pré-pago",
  faturado: "Faturado",
};

export default function ClientesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [clientes, setClientes] = useState<Cliente[]>(MOCK_CLIENTES);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") ?? "todos");
  const [modalidadeFilter, setModalidadeFilter] = useState<string>(searchParams.get("modalidade") ?? "todos");

  // Sync state → URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (statusFilter !== "todos") params.set("status", statusFilter);
    if (modalidadeFilter !== "todos") params.set("modalidade", modalidadeFilter);
    setSearchParams(params, { replace: true });
  }, [search, statusFilter, modalidadeFilter, setSearchParams]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [profileClient, setProfileClient] = useState<Cliente | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Cliente | null>(null);

  const filtered = clientes.filter((c) => {
    const matchSearch = c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || c.status === statusFilter;
    const matchModalidade = modalidadeFilter === "todos" || c.modalidade === modalidadeFilter;
    return matchSearch && matchStatus && matchModalidade;
  });

  const metrics = {
    total: clientes.length,
    ativos: clientes.filter((c) => c.status === "ativo").length,
    faturados: clientes.filter((c) => c.modalidade === "faturado").length,
    prePago: clientes.filter((c) => c.modalidade === "pre_pago").length,
  };

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (c: Cliente) => { setEditing(c); setFormOpen(true); };

  const { addUser, findByEmail } = useUserStore();

  const handleSave = (data: Cliente, senha?: string) => {
    if (editing) {
      setClientes((prev) => prev.map((c) => (c.id === editing.id ? { ...data, id: editing.id } : c)));
      toast.success("Cliente atualizado com sucesso!");
    } else {
      const newId = `cli-${Date.now()}`;
      setClientes((prev) => [...prev, { ...data, id: newId }]);

      // Auto-criar conta de acesso
      if (senha && !findByEmail(data.email)) {
        addUser({
          id: `user-${newId}`,
          email: data.email,
          password: senha,
          nome: data.nome,
          role: "cliente",
          cargo_id: null,
          status: "ativo",
          avatarUrl: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        toast.success(
          `Cliente cadastrado! Credenciais: Email: ${data.email} | Senha definida pelo admin`,
          { duration: 10000 }
        );
      } else {
        toast.success("Cliente cadastrado com sucesso!");
      }
    }
    setFormOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setClientes((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    toast.success("Cliente removido com sucesso!");
    setDeleteTarget(null);
  };

  const columns: Column<Cliente>[] = [
    {
      key: "nome", header: "Cliente", sortable: true,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <AvatarWithFallback name={r.nome} className="h-9 w-9" />
          <div>
            <p className="font-medium">{r.nome}</p>
            <p className="text-sm text-muted-foreground">{r.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "telefone", header: "Telefone",
      cell: (r) => <span className="tabular-nums">{r.telefone}</span>,
    },
    {
      key: "modalidade", header: "Modalidade",
      cell: (r) => (
        <Badge variant={r.modalidade === "faturado" ? "default" : "secondary"}>
          {MODALIDADE_LABELS[r.modalidade]}
        </Badge>
      ),
    },
    {
      key: "status", header: "Status",
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "actions", header: "Ações", className: "w-36 text-right",
      cell: (r) => (
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center justify-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 transition-colors" onClick={(e) => { e.stopPropagation(); setProfileClient(r); }}><Eye className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Visualizar cliente</TooltipContent>
            </Tooltip>
            <PermissionGuard permission="clientes.edit">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 transition-colors" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Pencil className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Editar cliente</TooltipContent>
            </Tooltip>
            </PermissionGuard>
            <PermissionGuard permission="clientes.delete">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/15 transition-colors" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}><Trash2 className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Excluir cliente</TooltipContent>
            </Tooltip>
            </PermissionGuard>
          </div>
        </TooltipProvider>
      ),
    },
  ];

  return (
    <PageContainer
      title="Clientes"
      subtitle="Gerencie os clientes cadastrados no sistema."
      actions={
        <PermissionGuard permission="clientes.create">
          <Button data-onboarding="add-client-btn" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Novo Cliente
          </Button>
        </PermissionGuard>
      }
    >
      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total de Clientes" value={metrics.total} icon={Users} />
        <MetricCard title="Clientes Ativos" value={metrics.ativos} icon={UserCheck} delta={12} deltaLabel="vs mês anterior" />
        <MetricCard title="Faturados" value={metrics.faturados} icon={CreditCard} />
        <MetricCard title="Pré-pago" value={metrics.prePago} icon={Wallet} />
      </div>

      {/* Filters + Table Card */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <div data-onboarding="client-search" className="flex-1 min-w-[200px]">
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome ou email..." className="w-full" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
                <SelectItem value="bloqueado">Bloqueados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={modalidadeFilter} onValueChange={setModalidadeFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Modalidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="pre_pago">Pré-pago</SelectItem>
                <SelectItem value="faturado">Faturado</SelectItem>
              </SelectContent>
            </Select>
            {(search || statusFilter !== "todos" || modalidadeFilter !== "todos") && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => { setSearch(""); setStatusFilter("todos"); setModalidadeFilter("todos"); }}>
                <X className="h-3.5 w-3.5" /> Limpar filtros
              </Button>
            )}
          </div>

          <DataTable
            data={filtered}
            columns={columns}
            onRowClick={(r) => setProfileClient(r)}
            emptyTitle="Nenhum cliente encontrado"
            emptySubtitle="Cadastre o primeiro cliente para começar."
            emptyActionLabel="Cadastrar primeiro cliente"
            onEmptyAction={openCreate}
            renderMobileCard={(r) => (
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AvatarWithFallback name={r.nome} className="h-10 w-10" />
                    <div>
                      <p className="font-medium">{r.nome}</p>
                      <p className="text-sm text-muted-foreground">{r.email}</p>
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground tabular-nums">{r.telefone}</span>
                  <Badge variant={r.modalidade === "faturado" ? "default" : "secondary"}>
                    {MODALIDADE_LABELS[r.modalidade]}
                  </Badge>
                </div>
                <div className="flex items-center justify-end gap-1 border-t border-border pt-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); setProfileClient(r); }}><Eye className="h-4 w-4" /></Button>
                  <PermissionGuard permission="clientes.edit">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Pencil className="h-4 w-4" /></Button>
                  </PermissionGuard>
                  <PermissionGuard permission="clientes.delete">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/15" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}><Trash2 className="h-4 w-4" /></Button>
                  </PermissionGuard>
                </div>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <ClientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSave={handleSave}
      />

      {/* Profile Modal */}
      <ClientProfileModal
        client={profileClient}
        onClose={() => setProfileClient(null)}
        onEdit={(c) => { setProfileClient(null); openEdit(c); }}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir cliente"
        description={`Excluir "${deleteTarget?.nome}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </PageContainer>
  );
}

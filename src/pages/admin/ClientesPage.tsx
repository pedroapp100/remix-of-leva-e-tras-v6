import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { PageContainer, MetricCard, DataTable, SearchInput, ConfirmDialog, AvatarWithFallback, StatusBadge, PermissionGuard } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import type { Cliente } from "@/types/database";
import type { ClienteInsert } from "@/services/clientes";
import { useClientes, useCreateCliente, useUpdateCliente, useDeleteCliente, useClienteSaldoMap } from "@/hooks/useClientes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, UserCheck, CreditCard, Wallet, Pencil, Trash2, Eye, X, AlertTriangle } from "lucide-react";
import { useSettingsStore } from "@/contexts/SettingsStore";
import { formatCurrency } from "@/lib/formatters";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { ClientFormDialog } from "./clientes/ClientFormDialog";
import { ClientProfileModal } from "./clientes/ClientProfileModal";

const MODALIDADE_LABELS: Record<string, string> = {
  pre_pago: "Pré-pago",
  faturado: "Faturado",
};

export default function ClientesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: clientes = [] } = useClientes();
  const createCliente = useCreateCliente();
  const updateClienteMutation = useUpdateCliente();
  const deleteClienteMutation = useDeleteCliente();
  const { getClienteSaldo } = useClienteSaldoMap();
  const limiteMinimo = useSettingsStore((s) => s.limite_saldo_pre_pago);
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

  const { filtered, metrics } = useMemo(() => {
    const matchList: Cliente[] = [];
    let ativos = 0, faturados = 0, prePago = 0;
    const lowerSearch = search.toLowerCase();

    for (const c of clientes) {
      if (c.status === "ativo") ativos++;
      if (c.modalidade === "faturado") faturados++;
      else if (c.modalidade === "pre_pago") prePago++;

      const matchSearch = c.nome.toLowerCase().includes(lowerSearch) || c.email.toLowerCase().includes(lowerSearch);
      const matchStatus = statusFilter === "todos" || c.status === statusFilter;
      const matchModalidade = modalidadeFilter === "todos" || c.modalidade === modalidadeFilter;
      if (matchSearch && matchStatus && matchModalidade) matchList.push(c);
    }

    return {
      filtered: matchList,
      metrics: { total: clientes.length, ativos, faturados, prePago },
    };
  }, [clientes, search, statusFilter, modalidadeFilter]);

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (c: Cliente) => { setEditing(c); setFormOpen(true); };

  const handleSave = async (data: Cliente, senha?: string) => {
    if (editing) {
      await updateClienteMutation.mutateAsync({ id: editing.id, patch: data });
      toast.success("Cliente atualizado com sucesso!");
    } else {
      const { id: _id, created_at: _ca, updated_at: _ua, ...insertData } = data;
      const payload = insertData as unknown as ClienteInsert;
      const created = await createCliente.mutateAsync({ ...payload, profile_id: null, documento: null });

      // Auto-criar conta de acesso via Admin API (Edge Function)
      if (senha) {
        const docDigits = data.documento?.replace(/\D/g, "") || undefined;
        const { data: fnData, error } = await supabase.functions.invoke("create-user", {
          body: { email: data.email, password: senha, nome: data.nome, role: "cliente", documento: docDigits },
        });
        if (error || fnData?.error) {
          let msg = fnData?.error ?? "Erro ao criar acesso.";
          if (!fnData?.error && error) {
            try {
              const ctx = (error as any)?.context;
              const body = ctx && typeof ctx.json === "function" ? await ctx.json() : null;
              msg = body?.error ?? error.message ?? msg;
            } catch { /* ignora */ }
          }
          toast.warning(`Cliente cadastrado, mas erro ao criar acesso: ${msg}`);
        } else {
          // Vincular o profile_id ao registro do cliente
          const profileId = (fnData as { user: { id: string; email: string } })?.user?.id;
          if (profileId) {
            try {
              await updateClienteMutation.mutateAsync({ id: created.id, patch: { profile_id: profileId } });
            } catch {
              toast.warning("Cliente criado, mas erro ao vincular perfil. Contate o suporte.");
            }
          }
          toast.success(`Cliente cadastrado! Acesso criado para ${data.email}`, { duration: 10000 });
        }
      } else {
        toast.success("Cliente cadastrado com sucesso!");
      }
    }
    setFormOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteClienteMutation.mutateAsync(deleteTarget.id);
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
      cell: (r) => {
        const isPrePago = r.modalidade === "pre_pago";
        const saldo = isPrePago ? getClienteSaldo(r.id) : null;
        const saldoBaixo = isPrePago && saldo !== null && saldo < limiteMinimo;
        return (
          <div className="flex items-center gap-2">
            <Badge variant={r.modalidade === "faturado" ? "default" : "secondary"}>
              {MODALIDADE_LABELS[r.modalidade]}
            </Badge>
            {saldoBaixo && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                      <AlertTriangle className="h-3 w-3" />
                      {formatCurrency(saldo!)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Saldo abaixo do limite mínimo de {formatCurrency(limiteMinimo)}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      },
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
                  <div className="flex items-center gap-2">
                    <Badge variant={r.modalidade === "faturado" ? "default" : "secondary"}>
                      {MODALIDADE_LABELS[r.modalidade]}
                    </Badge>
                    {r.modalidade === "pre_pago" && getClienteSaldo(r.id) < limiteMinimo && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        {formatCurrency(getClienteSaldo(r.id))}
                      </span>
                    )}
                  </div>
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

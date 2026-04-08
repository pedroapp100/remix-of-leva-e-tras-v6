import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageContainer, MetricCard, DataTable, SearchInput, ConfirmDialog, AvatarWithFallback, StatusBadge, PermissionGuard } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import type { Entregador } from "@/types/database";
import { TIPO_VEICULO_LABELS } from "@/types/database";
import { MOCK_ENTREGADORES } from "@/data/mockEntregadores";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Users, UserCheck, Package, Clock, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useUserStore } from "@/data/mockUsers";
import { useGlobalStore } from "@/contexts/GlobalStore";
import { EntregadorFormDialog } from "./entregadores/EntregadorFormDialog";

export default function EntregadoresPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [entregadores, setEntregadores] = useState<Entregador[]>(MOCK_ENTREGADORES);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") ?? "todos");
  const [veiculoFilter, setVeiculoFilter] = useState<string>(searchParams.get("veiculo") ?? "todos");

  // Sync state → URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (statusFilter !== "todos") params.set("status", statusFilter);
    if (veiculoFilter !== "todos") params.set("veiculo", veiculoFilter);
    setSearchParams(params, { replace: true });
  }, [search, statusFilter, veiculoFilter, setSearchParams]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Entregador | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Entregador | null>(null);

  const filtered = entregadores.filter((e) => {
    const matchSearch = e.nome.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || e.status === statusFilter;
    const matchVeiculo = veiculoFilter === "todos" || e.veiculo === veiculoFilter;
    return matchSearch && matchStatus && matchVeiculo;
  });

  const { solicitacoes } = useGlobalStore();
  const today = new Date().toISOString().slice(0, 10);

  const metrics = {
    total: entregadores.length,
    ativos: entregadores.filter((e) => e.status === "ativo").length,
    entregasHoje: solicitacoes.filter(
      (s) => s.status === "concluida" && s.data_conclusao?.slice(0, 10) === today && entregadores.some((e) => e.id === s.entregador_id)
    ).length,
    horasTrabalhadas: (() => {
      const hojeEntregas = solicitacoes.filter(
        (s) => ["em_andamento", "concluida"].includes(s.status) && entregadores.some((e) => e.id === s.entregador_id)
          && s.data_conclusao?.slice(0, 10) === today
      );
      const totalMinutes = hojeEntregas.reduce((sum, s) => {
        if (s.data_inicio && s.data_conclusao) {
          const diff = new Date(s.data_conclusao).getTime() - new Date(s.data_inicio).getTime();
          return sum + Math.max(0, diff / 60000);
        }
        return sum + 90; // fallback 1.5h if no timestamps
      }, 0);
      return Math.round(totalMinutes / 60 * 10) / 10;
    })(),
  };

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (e: Entregador) => { setEditing(e); setFormOpen(true); };

  const { addUser, findByEmail } = useUserStore();

  const handleSave = (data: Entregador, senha?: string) => {
    if (editing) {
      setEntregadores((prev) => prev.map((e) => (e.id === editing.id ? { ...data, id: editing.id } : e)));
      toast.success("Entregador atualizado com sucesso!");
    } else {
      const newId = `ent-${Date.now()}`;
      setEntregadores((prev) => [...prev, { ...data, id: newId }]);

      // Auto-criar conta de acesso
      if (senha && !findByEmail(data.email)) {
        addUser({
          id: `user-${newId}`,
          email: data.email,
          password: senha,
          nome: data.nome,
          role: "entregador",
          cargo_id: null,
          status: "ativo",
          avatarUrl: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        toast.success(
          `Entregador cadastrado! Credenciais: Email: ${data.email} | Senha definida pelo admin`,
          { duration: 10000 }
        );
      } else {
        toast.success("Entregador cadastrado com sucesso!");
      }
    }
    setFormOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setEntregadores((prev) => prev.filter((e) => e.id !== deleteTarget.id));
    toast.success("Entregador removido com sucesso!");
    setDeleteTarget(null);
  };

  const columns: Column<Entregador>[] = [
    {
      key: "nome", header: "Entregador", sortable: true,
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
      key: "veiculo", header: "Veículo",
      cell: (r) => <Badge variant="outline">{TIPO_VEICULO_LABELS[r.veiculo]}</Badge>,
    },
    {
      key: "comissao", header: "Comissão",
      cell: (r) => (
        <span className="tabular-nums font-medium">
          {r.tipo_comissao === "percentual"
            ? `${r.valor_comissao}%`
            : r.valor_comissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>
      ),
    },
    {
      key: "status", header: "Status",
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "actions", header: "Ações", className: "w-28 text-right",
      cell: (r) => (
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center justify-end gap-1">
            <PermissionGuard permission="entregadores.edit">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10 transition-colors" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Pencil className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Editar entregador</TooltipContent>
            </Tooltip>
            </PermissionGuard>
            <PermissionGuard permission="entregadores.delete">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/15 transition-colors" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}><Trash2 className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Excluir entregador</TooltipContent>
            </Tooltip>
            </PermissionGuard>
          </div>
        </TooltipProvider>
      ),
    },
  ];

  return (
    <PageContainer
      title="Entregadores"
      subtitle="Gerencie os entregadores cadastrados no sistema."
      actions={
        <PermissionGuard permission="entregadores.create">
          <Button data-onboarding="add-driver-btn" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Novo Entregador
          </Button>
        </PermissionGuard>
      }
    >
      {/* Metrics */}
      <div data-onboarding="driver-list" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total de Entregadores" value={metrics.total} icon={Users} />
        <MetricCard title="Entregadores Ativos" value={metrics.ativos} icon={UserCheck} delta={8} deltaLabel="vs mês anterior" />
        <MetricCard title="Entregas Hoje" value={metrics.entregasHoje} icon={Package} delta={5} deltaLabel="vs ontem" />
        <MetricCard title="Horas Trabalhadas" value={`${metrics.horasTrabalhadas}h`} icon={Clock} />
      </div>

      {/* Filters + Table Card */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome ou email..." className="flex-1 min-w-[200px]" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="inativo">Inativos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={veiculoFilter} onValueChange={setVeiculoFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Veículo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="moto">Moto</SelectItem>
                <SelectItem value="carro">Carro</SelectItem>
                <SelectItem value="bicicleta">Bicicleta</SelectItem>
                <SelectItem value="a_pe">A pé</SelectItem>
              </SelectContent>
            </Select>
            {(search || statusFilter !== "todos" || veiculoFilter !== "todos") && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => { setSearch(""); setStatusFilter("todos"); setVeiculoFilter("todos"); }}>
                <X className="h-3.5 w-3.5" /> Limpar filtros
              </Button>
            )}
          </div>

          <DataTable
            data={filtered}
            columns={columns}
            emptyTitle="Nenhum entregador encontrado"
            emptySubtitle="Cadastre o primeiro entregador para começar."
            emptyActionLabel="Cadastrar primeiro entregador"
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
                    <Badge variant="outline">{TIPO_VEICULO_LABELS[r.veiculo]}</Badge>
                    <span className="tabular-nums font-medium">
                      {r.tipo_comissao === "percentual" ? `${r.valor_comissao}%` : r.valor_comissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1 border-t border-border pt-2">
                  <PermissionGuard permission="entregadores.edit">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Pencil className="h-4 w-4" /></Button>
                  </PermissionGuard>
                  <PermissionGuard permission="entregadores.delete">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/15" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}><Trash2 className="h-4 w-4" /></Button>
                  </PermissionGuard>
                </div>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <EntregadorFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        onSave={handleSave}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir entregador"
        description={`Excluir "${deleteTarget?.nome}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </PageContainer>
  );
}

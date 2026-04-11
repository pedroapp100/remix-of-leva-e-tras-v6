import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, X, Webhook, Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";

/* ── Types ── */
type WebhookStatus = "ativo" | "inativo" | "erro";

interface WebhookEntry {
  id: string;
  nome: string;
  url: string;
  secret_hash: string | null;
  eventos: string[];
  status: WebhookStatus;
  ultimo_erro: string | null;
  created_at: string;
  updated_at: string;
}

const EVENTOS_DISPONIVEIS = [
  // ── Solicitação / Status ──
  { value: "solicitacao.criada", label: "Solicitação criada" },
  { value: "solicitacao.aceita", label: "Solicitação aceita" },
  { value: "solicitacao.rejeitada", label: "Solicitação rejeitada" },
  { value: "solicitacao.em_andamento", label: "Solicitação em andamento" },
  { value: "solicitacao.concluida", label: "Solicitação concluída" },
  { value: "solicitacao.cancelada", label: "Solicitação cancelada" },
  { value: "solicitacao.atualizada", label: "Solicitação atualizada" },
  // ── Entrega ──
  { value: "entrega.entregador_atribuido", label: "Entregador atribuído" },
  { value: "entrega.coletada", label: "Entrega coletada" },
  { value: "entrega.em_transito", label: "Entrega em trânsito" },
  { value: "entrega.chegou_destino", label: "Entrega chegou ao destino" },
  { value: "entrega.concluida", label: "Entrega concluída" },
  { value: "entrega.tentativa_falha", label: "Tentativa de entrega falhou" },
  // ── Financeiro ──
  { value: "fatura.gerada", label: "Fatura gerada" },
  { value: "fatura.paga", label: "Fatura paga" },
  { value: "fatura.vencida", label: "Fatura vencida" },
  { value: "pagamento.recebido", label: "Pagamento recebido" },
  { value: "saldo.recarga", label: "Recarga de saldo (pré-pago)" },
  // ── Cadastros ──
  { value: "cliente.criado", label: "Cliente criado" },
  { value: "cliente.atualizado", label: "Cliente atualizado" },
  { value: "entregador.criado", label: "Entregador criado" },
];

/* ── React Query hook ── */
function useWebhooks() {
  const qc = useQueryClient();

  const { data: webhooks = [] } = useQuery<WebhookEntry[]>({
    queryKey: ["webhooks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhooks")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as WebhookEntry[]) ?? [];
    },
  });

  const addMut = useMutation({
    mutationFn: async (w: Omit<WebhookEntry, "id" | "created_at" | "updated_at" | "ultimo_erro">) => {
      const { error } = await supabase.from("webhooks").insert({ ...w, ultimo_erro: null });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Omit<WebhookEntry, "id" | "created_at" | "updated_at">>) => {
      const { error } = await supabase.from("webhooks").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("webhooks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  return {
    webhooks,
    addWebhook: addMut.mutateAsync,
    updateWebhook: updateMut.mutateAsync,
    deleteWebhook: deleteMut.mutateAsync,
  };
}

/* ── Form ── */
interface WebhookFormData {
  nome: string;
  url: string;
  secret: string;
  eventos: string[];
  status: WebhookStatus;
}

const emptyForm: WebhookFormData = { nome: "", url: "", secret: "", eventos: [], status: "ativo" };

function generateSecret() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "whsec_";
  for (let i = 0; i < 24; i++) result += chars.charAt(bytes[i] % chars.length);
  return result;
}

/* ── Component ── */
export function WebhooksTab() {
  const { webhooks, addWebhook, updateWebhook, deleteWebhook } = useWebhooks();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<WebhookFormData>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const filtered = webhooks.filter((w) => {
    const matchSearch =
      w.nome.toLowerCase().includes(search.toLowerCase()) ||
      w.url.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || w.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, secret: generateSecret() });
    setShowSecret(false);
    setDialogOpen(true);
  }

  function openEdit(wh: WebhookEntry) {
    setEditingId(wh.id);
    setForm({
      nome: wh.nome,
      url: wh.url,
      secret: wh.secret_hash || "",
      eventos: [...wh.eventos],
      status: wh.status,
    });
    setShowSecret(false);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.nome.trim() || !form.url.trim()) {
      toast.error("Preencha o nome e a URL do webhook.");
      return;
    }
    try {
      new URL(form.url);
    } catch {
      toast.error("URL inválida. Insira uma URL válida (ex: https://...).");
      return;
    }
    if (form.eventos.length === 0) {
      toast.error("Selecione pelo menos um evento.");
      return;
    }

    try {
      if (editingId) {
        await updateWebhook({
          id: editingId,
          nome: form.nome.trim(),
          url: form.url.trim(),
          secret_hash: form.secret,
          eventos: form.eventos,
          status: form.status,
        });
        toast.success("Webhook atualizado com sucesso.");
      } else {
        await addWebhook({
          nome: form.nome.trim(),
          url: form.url.trim(),
          secret_hash: form.secret,
          eventos: form.eventos,
          status: form.status,
        });
        toast.success("Webhook criado com sucesso.");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Erro ao salvar webhook.");
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteWebhook(deleteId);
      toast.success("Webhook removido.");
    } catch {
      toast.error("Erro ao remover webhook.");
    }
    setDeleteId(null);
  }

  function toggleEvento(evento: string) {
    setForm((f) => ({
      ...f,
      eventos: f.eventos.includes(evento) ? f.eventos.filter((e) => e !== evento) : [...f.eventos, evento],
    }));
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência.");
  }

  const deleteTarget = webhooks.find((w) => w.id === deleteId);

  const columns: Column<WebhookEntry>[] = [
    {
      key: "nome",
      header: "Nome",
      sortable: true,
      cell: (r) => (
        <div>
          <span className="font-medium">{r.nome}</span>
          <p className="text-xs text-muted-foreground truncate max-w-[250px]">{r.url}</p>
        </div>
      ),
    },
    {
      key: "eventos",
      header: "Eventos",
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.eventos.slice(0, 2).map((ev) => (
            <Badge key={ev} variant="secondary" className="text-xs">
              {ev.split(".").pop()}
            </Badge>
          ))}
          {r.eventos.length > 2 && (
            <Badge variant="outline" className="text-xs">+{r.eventos.length - 2}</Badge>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "actions",
      header: "Ações",
      className: "w-28 text-right",
      cell: (r) => (
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center justify-end gap-1">
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
              <TooltipContent>Editar webhook</TooltipContent>
            </Tooltip>
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
              <TooltipContent>Excluir webhook</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Webhooks</h3>
          <p className="text-sm text-muted-foreground">Configure endpoints para receber notificações de eventos do sistema.</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Novo Webhook
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nome ou URL..."
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
            emptyTitle="Nenhum webhook cadastrado"
            emptySubtitle="Crie um webhook para receber notificações de eventos."
            emptyActionLabel="Criar primeiro webhook"
            onEmptyAction={openCreate}
            renderMobileCard={(r) => (
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.nome}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{r.url}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex flex-wrap gap-1">
                  {r.eventos.slice(0, 3).map((ev) => (
                    <Badge key={ev} variant="secondary" className="text-xs">{ev.split(".").pop()}</Badge>
                  ))}
                  {r.eventos.length > 3 && <Badge variant="outline" className="text-xs">+{r.eventos.length - 3}</Badge>}
                </div>
                <div className="flex items-center justify-end gap-1 border-t border-border pt-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/15" onClick={(e) => { e.stopPropagation(); setDeleteId(r.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              {editingId ? "Editar Webhook" : "Novo Webhook"}
            </DialogTitle>
          <DialogDescription className="sr-only">.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: ERP Integration" />
            </div>
            <div className="space-y-2">
              <Label>URL do Endpoint</Label>
              <Input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://api.example.com/webhook" />
            </div>
            <div className="space-y-2">
              <Label>Secret</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showSecret ? "text" : "password"}
                    value={form.secret}
                    onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
                    placeholder="whsec_..."
                    className="pr-20"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSecret(!showSecret)}>
                      {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(form.secret)}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <Button type="button" variant="outline" size="icon" onClick={() => setForm((f) => ({ ...f, secret: generateSecret() }))}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Usado para validar a assinatura das requisições.</p>
            </div>
            <div className="space-y-2">
              <Label>Eventos</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-md border border-border p-3 max-h-[200px] overflow-y-auto">
                {EVENTOS_DISPONIVEIS.map((ev) => (
                  <label key={ev.value} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                    <Checkbox
                      checked={form.eventos.includes(ev.value)}
                      onCheckedChange={() => toggleEvento(ev.value)}
                    />
                    {ev.label}
                  </label>
                ))}
              </div>
              {form.eventos.length === 0 && (
                <p className="text-xs text-destructive">Selecione pelo menos um evento.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as WebhookStatus }))}>
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
        title="Excluir Webhook"
        description={`Excluir "${deleteTarget?.nome}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

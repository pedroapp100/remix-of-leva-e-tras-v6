import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DataTable, SearchInput, StatusBadge } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, X, MessageSquare, Eye, Info, Plus, Trash2, Send, Phone, CheckCircle2, Loader2, History, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { formatDateTimeBR, formatPhone } from "@/lib/formatters";

/* ── Types ── */
type NotificacaoStatus = "ativo" | "inativo";
type TestSendStatus = "sucesso" | "falha" | "pendente";

interface TestSendRecord {
  id: string;
  telefone: string;
  data: string;
  status: TestSendStatus;
}

interface NotificacaoTemplate {
  id: string;
  evento: string;
  evento_label: string;
  categoria: string;
  titulo: string;
  mensagem: string;
  canal: string;
  status: NotificacaoStatus;
  variaveis: string[];
  updated_at: string;
  historico_testes: TestSendRecord[];
}

/* ── Variáveis disponíveis por categoria ── */
const VARIAVEIS_POR_CATEGORIA: Record<string, { var: string; desc: string }[]> = {
  "Solicitação": [
    { var: "{{cliente_nome}}", desc: "Nome do cliente" },
    { var: "{{solicitacao_id}}", desc: "ID da solicitação" },
    { var: "{{data_solicitacao}}", desc: "Data da solicitação" },
    { var: "{{endereco_coleta}}", desc: "Endereço de coleta" },
    { var: "{{endereco_entrega}}", desc: "Endereço de entrega" },
    { var: "{{valor_total}}", desc: "Valor total" },
    { var: "{{tipo_operacao}}", desc: "Tipo de operação" },
  ],
  "Entrega": [
    { var: "{{cliente_nome}}", desc: "Nome do cliente" },
    { var: "{{entregador_nome}}", desc: "Nome do entregador" },
    { var: "{{solicitacao_id}}", desc: "ID da solicitação" },
    { var: "{{endereco_coleta}}", desc: "Endereço de coleta" },
    { var: "{{endereco_entrega}}", desc: "Endereço de entrega" },
    { var: "{{previsao_entrega}}", desc: "Previsão de entrega" },
    { var: "{{status_entrega}}", desc: "Status da entrega" },
  ],
  "Financeiro": [
    { var: "{{cliente_nome}}", desc: "Nome do cliente" },
    { var: "{{fatura_id}}", desc: "ID da fatura" },
    { var: "{{valor_fatura}}", desc: "Valor da fatura" },
    { var: "{{data_vencimento}}", desc: "Data de vencimento" },
    { var: "{{valor_pago}}", desc: "Valor pago" },
    { var: "{{saldo_atual}}", desc: "Saldo atual" },
  ],
  "Cadastro": [
    { var: "{{cliente_nome}}", desc: "Nome do cliente" },
    { var: "{{entregador_nome}}", desc: "Nome do entregador" },
  ],
};

/* ── React Query hook ── */
function useNotificacoes() {
  const qc = useQueryClient();
  const [testRecords, setTestRecords] = useState<Record<string, TestSendRecord[]>>({});

  const { data: dbRows = [], isError } = useQuery({
    queryKey: ["notification_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_templates")
        .select("*")
        .order("evento");
      if (error) throw error;
      return data ?? [];
    },
  });

  const templates: NotificacaoTemplate[] = dbRows.map((r) => ({
    id: r.id,
    evento: r.evento ?? r.name ?? "",
    evento_label: r.evento_label ?? r.evento ?? r.name ?? "",
    categoria: r.categoria ?? r.type ?? "",
    titulo: r.titulo ?? r.subject ?? "",
    mensagem: r.mensagem ?? r.body ?? "",
    canal: r.canal ?? "whatsapp",
    variaveis: r.variaveis ?? r.variables ?? [],
    status: (r.ativo ? "ativo" : "inativo") as NotificacaoStatus,
    updated_at: r.updated_at,
    historico_testes: testRecords[r.id] ?? [],
  }));

  async function updateTemplate(id: string, data: Partial<Omit<NotificacaoTemplate, "id">>) {
    const { status, historico_testes, updated_at, ...rest } = data;
    const update: Partial<{
      evento: string; evento_label: string; categoria: string;
      titulo: string; mensagem: string; canal: string;
      variaveis: string[]; ativo: boolean;
    }> = { ...rest };
    if (status !== undefined) update.ativo = status === "ativo";
    const { error } = await supabase
      .from("notification_templates")
      .update(update)
      .eq("id", id);
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["notification_templates"] });
  }

  async function addTemplate(data: Omit<NotificacaoTemplate, "id" | "updated_at" | "historico_testes">) {
    const { status, ...rest } = data;
    const { error } = await supabase.from("notification_templates").insert({
      ...rest,
      ativo: status === "ativo",
    });
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["notification_templates"] });
  }

  async function removeTemplate(id: string) {
    const { error } = await supabase.from("notification_templates").delete().eq("id", id);
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["notification_templates"] });
  }

  function addTestRecord(templateId: string, record: TestSendRecord) {
    setTestRecords((prev) => ({
      ...prev,
      [templateId]: [record, ...(prev[templateId] ?? [])],
    }));
  }

  return { templates, updateTemplate, addTemplate, removeTemplate, addTestRecord, isError };
}

/* ── Preview Component ── */
function MensagemPreview({ mensagem }: { mensagem: string }) {
  // Sanitize: escape HTML entities first, then apply safe formatting
  const escaped = mensagem
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
  const formatted = escaped
    .replace(/\*([^*]+)\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");

  return (
    <div className="bg-[#dcf8c6] dark:bg-[#025c4c] text-foreground rounded-lg rounded-tr-none p-3 max-w-[320px] text-sm shadow-sm">
      <div dangerouslySetInnerHTML={{ __html: formatted }} />
      <div className="text-[10px] text-muted-foreground text-right mt-1">12:00 ✓✓</div>
    </div>
  );
}

/* ── Main Component ── */
export function NotificacoesTab() {
  const { templates, updateTemplate, addTemplate, removeTemplate, addTestRecord, isError } = useNotificacoes();

  const [search, setSearch] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificacaoTemplate | null>(null);
  const [formMensagem, setFormMensagem] = useState("");
  const [formTitulo, setFormTitulo] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<NotificacaoTemplate | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newEvento, setNewEvento] = useState("");
  const [newCategoria, setNewCategoria] = useState("Solicitação");
  const [newTitulo, setNewTitulo] = useState("");
  const [newMensagem, setNewMensagem] = useState("");
  const [testOpen, setTestOpen] = useState(false);
  const [testTemplate, setTestTemplate] = useState<NotificacaoTemplate | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTemplateId, setHistoryTemplateId] = useState<string | null>(null);

  const historyTemplate = historyTemplateId ? templates.find((t) => t.id === historyTemplateId) ?? null : null;
  const categorias = [...new Set(templates.map((t) => t.categoria))];

  const filtered = templates.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      (t.titulo ?? "").toLowerCase().includes(q) ||
      (t.evento_label ?? "").toLowerCase().includes(q) ||
      (t.mensagem ?? "").toLowerCase().includes(q);
    const matchCategoria = categoriaFilter === "todos" || t.categoria === categoriaFilter;
    const matchStatus = statusFilter === "todos" || t.status === statusFilter;
    return matchSearch && matchCategoria && matchStatus;
  });

  function openEdit(t: NotificacaoTemplate) {
    setEditingTemplate(t);
    setFormTitulo(t.titulo);
    setFormMensagem(t.mensagem);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!editingTemplate) return;
    if (!formTitulo.trim() || !formMensagem.trim()) {
      toast.error("Preencha o título e a mensagem.");
      return;
    }
    try {
      await updateTemplate(editingTemplate.id, {
        titulo: formTitulo.trim(),
        mensagem: formMensagem.trim(),
      });
      toast.success("Mensagem atualizada com sucesso.");
      setDialogOpen(false);
    } catch {
      toast.error("Erro ao salvar template.");
    }
  }

  async function handleToggleStatus(t: NotificacaoTemplate) {
    const newStatus = t.status === "ativo" ? "inativo" : "ativo";
    try {
      await updateTemplate(t.id, { status: newStatus });
      toast.success(`Notificação ${newStatus === "ativo" ? "ativada" : "desativada"}.`);
    } catch {
      toast.error("Erro ao alterar status.");
    }
  }

  function insertVariable(varName: string) {
    setFormMensagem((m) => m + varName);
  }

  async function handleCreate() {
    if (!newEvento.trim() || !newTitulo.trim() || !newMensagem.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    const eventoSlug = newEvento.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    try {
      await addTemplate({
        evento: `${newCategoria.toLowerCase().replace(/ç/g, "c").replace(/ã/g, "a")}.${eventoSlug}`,
        evento_label: newEvento.trim(),
        categoria: newCategoria,
        titulo: newTitulo.trim(),
        mensagem: newMensagem.trim(),
        canal: "whatsapp",
        status: "ativo",
        variaveis: [],
      });
      toast.success("Novo evento de notificação criado com sucesso!");
      setCreateOpen(false);
      setNewEvento("");
      setNewTitulo("");
      setNewMensagem("");
      setNewCategoria("Solicitação");
    } catch (error) {
      console.error("Erro ao criar template:", error);
      toast.error("Erro ao criar template.");
    }
  }

  async function handleDelete(t: NotificacaoTemplate) {
    try {
      await removeTemplate(t.id);
      toast.success("Evento removido com sucesso.");
    } catch {
      toast.error("Erro ao remover template.");
    }
  }

  function insertNewVariable(varName: string) {
    setNewMensagem((m) => m + varName);
  }

  const SAMPLE_DATA: Record<string, string> = {
    "{{cliente_nome}}": "Maria Silva",
    "{{solicitacao_id}}": "4821",
    "{{data_solicitacao}}": "30/03/2026",
    "{{endereco_coleta}}": "Rua das Flores, 123 - Centro",
    "{{endereco_entrega}}": "Av. Brasil, 456 - Jardim América",
    "{{valor_total}}": "R$ 25,00",
    "{{tipo_operacao}}": "Comercial",
    "{{entregador_nome}}": "João Santos",
    "{{previsao_entrega}}": "14:30",
    "{{status_entrega}}": "Em trânsito",
    "{{fatura_id}}": "1042",
    "{{valor_fatura}}": "R$ 1.250,00",
    "{{data_vencimento}}": "05/04/2026",
    "{{valor_pago}}": "R$ 1.250,00",
    "{{saldo_atual}}": "R$ 350,00",
  };

  function fillSampleData(msg: string): string {
    let filled = msg;
    for (const [key, val] of Object.entries(SAMPLE_DATA)) {
      filled = filled.split(key).join(val);
    }
    return filled;
  }

  function openTestSend(t: NotificacaoTemplate) {
    setTestTemplate(t);
    setTestPhone("");
    setTestSending(false);
    setTestSent(false);
    setTestOpen(true);
  }

  async function handleTestSend() {
    if (!testPhone || testPhone.length < 10) {
      toast.error("Informe um número de telefone válido (mínimo 10 dígitos).");
      return;
    }
    if (!testTemplate) return;

    setTestSending(true);
    const recordId = `ts-${Date.now()}`;
    
    // 1️⃣ Registrar como pendente
    const record: TestSendRecord = {
      id: recordId,
      telefone: testPhone,
      data: new Date().toISOString(),
      status: "pendente",
    };
    addTestRecord(testTemplate.id, record);

    try {
      console.log("🚀 [TestSend] Iniciando envio:", {
        telefone: testPhone,
        evento: testTemplate.evento,
        url: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enviar-whatsapp`,
      });

      // 2️⃣ Chamar Edge Function para enviar para Z-API
      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enviar-whatsapp`;
      const response = await fetch(edgeFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          telefone: testPhone,
          evento: testTemplate.evento,
          variaveis: {
            cliente_nome: "Cliente Teste",
            solicitacao_id: "TEST-001",
            data_solicitacao: new Date().toLocaleDateString("pt-BR"),
            endereco_coleta: "Rua de Teste, 123",
            endereco_entrega: "Avenida Teste, 456",
            valor_total: "R$ 100,00",
            tipo_operacao: "Teste",
            entregador_nome: "Entregador Teste",
            previsao_entrega: "14:30",
            status_entrega: "Em trânsito",
            fatura_id: "FAT-001",
            valor_fatura: "R$ 1.000,00",
            data_vencimento: "30/04/2026",
            valor_pago: "R$ 1.000,00",
            saldo_atual: "R$ 0,00",
          },
        }),
      });

      console.log("📡 [TestSend] Resposta da Edge Function:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      const data = await response.json();
      console.log("📦 [TestSend] Dados da resposta:", data);

      if (!response.ok) {
        console.error("❌ [TestSend] Erro ao enviar:", { status: response.status, ...data });
        const errorMsg = data?.error || `Erro ${response.status}: ${response.statusText}`;
        toast.error(`Erro ao enviar: ${errorMsg}`);
        
        // Atualizar record como falha SEM usar setTestRecords (já está em addTestRecord)
        // Se precisa atualizar, usar updateTemplate para persistir no BD
        console.log("📝 [TestSend] Será implementado: atualizar registro como falha no BD");
        return;
      }

      // ✅ Sucesso!
      console.log("✅ [TestSend] Mensagem enviada com sucesso!");
      toast.success(`Mensagem de teste enviada para ${testPhone} com sucesso! 🎉`);
      setTestSent(true);
      
    } catch (error) {
      console.error("❌ [TestSend] Erro de conexão:", error);
      if (error instanceof Error) {
        console.error("   • Mensagem:", error.message);
        console.error("   • Stack:", error.stack);
      }
      
      const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Erro de conexão: ${errorMsg}`);
      
    } finally {
      setTestSending(false);
    }
  }

  function openHistory(t: NotificacaoTemplate) {
    setHistoryTemplateId(t.id);
    setHistoryOpen(true);
  }

  const columns: Column<NotificacaoTemplate>[] = [
    {
      key: "evento_label",
      header: "Evento",
      sortable: true,
      cell: (r) => (
        <div>
          <span className="font-medium">{r.evento_label}</span>
          <p className="text-xs text-muted-foreground">{r.titulo}</p>
        </div>
      ),
    },
    {
      key: "categoria",
      header: "Categoria",
      cell: (r) => (
        <Badge variant="secondary" className="text-xs">{r.categoria}</Badge>
      ),
    },
    {
      key: "canal",
      header: "Canal",
      cell: () => (
        <Badge variant="outline" className="text-xs gap-1">
          <MessageSquare className="h-3 w-3" /> WhatsApp
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={r.status === "ativo"}
            onCheckedChange={() => handleToggleStatus(r)}
            className="data-[state=checked]:bg-primary"
          />
          <span className="text-xs text-muted-foreground">{r.status === "ativo" ? "Ativo" : "Inativo"}</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Ações",
      className: "w-36 text-right",
      cell: (r) => (
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center justify-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  onClick={(e) => { e.stopPropagation(); setPreviewTemplate(r); setPreviewOpen(true); }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Pré-visualizar</TooltipContent>
            </Tooltip>
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
              <TooltipContent>Editar mensagem</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-green-600 hover:bg-green-600/10 transition-colors"
                  onClick={(e) => { e.stopPropagation(); openTestSend(r); }}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Enviar teste</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  onClick={(e) => { e.stopPropagation(); openHistory(r); }}
                >
                  <History className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Histórico de testes</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={(e) => { e.stopPropagation(); handleDelete(r); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remover</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      ),
    },
  ];

  const activeVars = editingTemplate
    ? VARIAVEIS_POR_CATEGORIA[editingTemplate.categoria] || []
    : [];

  return (
    <div className="space-y-4">
      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Erro ao carregar notificações. Verifique se a tabela <code>notification_templates</code> existe no banco de dados.
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Notificações WhatsApp</h3>
          <p className="text-sm text-muted-foreground">Personalize as mensagens enviadas aos clientes para cada evento do sistema.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Evento
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar por evento ou mensagem..."
              className="flex-1 min-w-[200px]"
            />
            <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas categorias</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            {(search || categoriaFilter !== "todos" || statusFilter !== "todos") && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => { setSearch(""); setCategoriaFilter("todos"); setStatusFilter("todos"); }}
              >
                <X className="h-3.5 w-3.5" /> Limpar filtros
              </Button>
            )}
          </div>

          <DataTable
            data={filtered}
            columns={columns}
            emptyTitle="Nenhuma notificação encontrada"
            emptySubtitle="Ajuste os filtros para visualizar as notificações."
            renderMobileCard={(r) => (
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.evento_label}</p>
                    <p className="text-xs text-muted-foreground">{r.titulo}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={r.status === "ativo"}
                      onCheckedChange={() => handleToggleStatus(r)}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                </div>
                <div className="flex gap-1">
                  <Badge variant="secondary" className="text-xs">{r.categoria}</Badge>
                  <Badge variant="outline" className="text-xs gap-1">
                    <MessageSquare className="h-3 w-3" /> WhatsApp
                  </Badge>
                </div>
                <div className="flex items-center justify-end gap-1 border-t border-border pt-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground" onClick={() => { setPreviewTemplate(r); setPreviewOpen(true); }}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={() => openEdit(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-green-600 hover:bg-green-600/10" onClick={() => openTestSend(r)}>
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => openHistory(r)}>
                    <History className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10" onClick={() => handleDelete(r)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Editar Notificação — {editingTemplate?.evento_label}
            </DialogTitle>
          <DialogDescription className="sr-only">.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
            {/* Form side */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título da notificação</Label>
                <Input
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  placeholder="Ex: Entrega concluída"
                />
              </div>
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea
                  value={formMensagem}
                  onChange={(e) => setFormMensagem(e.target.value)}
                  placeholder="Digite a mensagem..."
                  className="min-h-[180px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">Use *texto* para negrito. Emojis são suportados.</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  Variáveis disponíveis
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {activeVars.map((v) => (
                    <Tooltip key={v.var}>
                      <TooltipProvider delayDuration={100}>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 font-mono"
                            onClick={() => insertVariable(v.var)}
                          >
                            {v.var}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{v.desc}</TooltipContent>
                      </TooltipProvider>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </div>
            {/* Preview side */}
            <div className="space-y-3">
              <Label>Pré-visualização</Label>
              <div className="bg-[#ece5dd] dark:bg-[#0b141a] rounded-lg p-4 min-h-[250px] flex items-end justify-end">
                <MensagemPreview mensagem={formMensagem} />
              </div>
              <p className="text-xs text-muted-foreground text-center">As variáveis serão substituídas pelos dados reais no envio.</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Pré-visualização — {previewTemplate?.evento_label}
            </DialogTitle>
          <DialogDescription className="sr-only">.</DialogDescription>
          </DialogHeader>
          <div className="bg-[#ece5dd] dark:bg-[#0b141a] rounded-lg p-4 flex items-end justify-end">
            {previewTemplate && <MensagemPreview mensagem={previewTemplate.mensagem} />}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Fechar</Button>
            </DialogClose>
            <Button onClick={() => { setPreviewOpen(false); if (previewTemplate) openEdit(previewTemplate); }}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Novo Evento de Notificação
            </DialogTitle>
          <DialogDescription className="sr-only">.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={newCategoria} onValueChange={setNewCategoria}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(VARIAVEIS_POR_CATEGORIA).map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nome do evento *</Label>
                <Input
                  value={newEvento}
                  onChange={(e) => setNewEvento(e.target.value)}
                  placeholder="Ex: Solicitação reagendada"
                />
              </div>
              <div className="space-y-2">
                <Label>Título da notificação *</Label>
                <Input
                  value={newTitulo}
                  onChange={(e) => setNewTitulo(e.target.value)}
                  placeholder="Ex: Reagendamento confirmado"
                />
              </div>
              <div className="space-y-2">
                <Label>Mensagem *</Label>
                <Textarea
                  value={newMensagem}
                  onChange={(e) => setNewMensagem(e.target.value)}
                  placeholder="Digite a mensagem..."
                  className="min-h-[140px] font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">Use *texto* para negrito. Emojis são suportados.</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  Variáveis disponíveis
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {(VARIAVEIS_POR_CATEGORIA[newCategoria] || []).map((v) => (
                    <TooltipProvider key={v.var} delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 font-mono"
                            onClick={() => insertNewVariable(v.var)}
                          >
                            {v.var}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{v.desc}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <Label>Pré-visualização</Label>
              <div className="bg-[#ece5dd] dark:bg-[#0b141a] rounded-lg p-4 min-h-[250px] flex items-end justify-end">
                <MensagemPreview mensagem={newMensagem || "Sua mensagem aparecerá aqui..."} />
              </div>
              <p className="text-xs text-muted-foreground text-center">As variáveis serão substituídas pelos dados reais no envio.</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" /> Criar Evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Send Dialog */}
      <Dialog open={testOpen} onOpenChange={(open) => { setTestOpen(open); if (!open) setTestSent(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Enviar Teste — {testTemplate?.evento_label}
            </DialogTitle>
          <DialogDescription className="sr-only">.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Número do WhatsApp
              </Label>
              <PhoneInput
                value={testPhone}
                onChange={setTestPhone}
                placeholder="(99) 99999-9999"
              />
              <p className="text-xs text-muted-foreground">A mensagem de teste será enviada para este número com dados fictícios.</p>
            </div>

            <div className="space-y-2">
              <Label>Pré-visualização com dados de exemplo</Label>
              <div className="bg-[#ece5dd] dark:bg-[#0b141a] rounded-lg p-4 flex items-end justify-end">
                {testTemplate && <MensagemPreview mensagem={fillSampleData(testTemplate.mensagem)} />}
              </div>
            </div>

            {testSent && (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 p-3 text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Mensagem de teste enviada com sucesso para ({testPhone.slice(0, 2)}) {testPhone.slice(2, 7)}-{testPhone.slice(7)}
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Fechar</Button>
            </DialogClose>
            <Button
              onClick={handleTestSend}
              disabled={testSending || !testPhone || testPhone.length < 10}
              className="gap-2"
            >
              {testSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar Teste
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Testes — {historyTemplate?.evento_label}
            </DialogTitle>
          <DialogDescription className="sr-only">.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {historyTemplate && historyTemplate.historico_testes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nenhum envio de teste registrado.</p>
                <p className="text-xs mt-1">Envie um teste para começar a registrar o histórico.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyTemplate?.historico_testes.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-mono text-sm">
                        {formatPhone(rec.telefone)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTimeBR(rec.data)}
                      </TableCell>
                      <TableCell className="text-right">
                        {rec.status === "sucesso" ? (
                          <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400">
                            <CheckCircle2 className="h-3 w-3" /> Sucesso
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1 bg-destructive/10 text-destructive">
                            <XCircle className="h-3 w-3" /> Falha
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Fechar</Button>
            </DialogClose>
            {historyTemplate && (
              <Button onClick={() => { setHistoryOpen(false); openTestSend(historyTemplate); }} className="gap-2">
                <Send className="h-4 w-4" /> Novo Teste
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

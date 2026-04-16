import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Send, AlertTriangle, CheckCircle2, Info, AlertCircle, Users, User, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { sendNotificationToUser, sendNotificationToRole } from "@/services/notifications";
import { useAllNotificationsAdmin, useProfilesForSelector } from "@/hooks/useSettings";

type NotifType = "info" | "success" | "warning" | "error";
type TargetMode = "all" | "admin" | "entregador" | "cliente" | "user";

const TYPE_CONFIG: Record<NotifType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  info: { label: "Informação", icon: Info, color: "text-primary", bg: "bg-primary/10" },
  success: { label: "Sucesso", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  warning: { label: "Aviso", icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
  error: { label: "Urgente", icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  entregador: "Entregador",
  cliente: "Cliente",
};

const ROLE_BADGE_VARIANT: Record<string, string> = {
  admin: "bg-purple-500/15 text-purple-600 border-purple-500/30",
  entregador: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  cliente: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
};

export function NotificacoesInternasTab() {
  const qc = useQueryClient();

  // ── Form state ──
  const [targetMode, setTargetMode] = useState<TargetMode>("admin");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [notifType, setNotifType] = useState<NotifType>("info");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);

  // ── History filters ──
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterRead, setFilterRead] = useState<string>("all");
  const [historyTab, setHistoryTab] = useState<"all" | "admin" | "entregador" | "cliente">("all");

  // ── Data ──
  const { data: allProfiles = [] } = useProfilesForSelector();

  // Filtros server-side passados para o hook (role resolvido via tab/filterRole)
  const activeRole = historyTab !== "all" ? historyTab : filterRole !== "all" ? filterRole : undefined;
  const activeType = filterType !== "all" ? filterType : undefined;
  const activeRead = filterRead === "lida" ? true : filterRead === "nao_lida" ? false : undefined;

  const {
    data: notifPages,
    isLoading: loadingHistory,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useAllNotificationsAdmin({
    role: activeRole,
    type: activeType,
    read: activeRead,
  });

  const filteredHistory = useMemo(() => (notifPages?.pages ?? []).flat(), [notifPages]);

  const filteredProfiles = useMemo(() => {
    const roleFilter = targetMode === "user" ? undefined : targetMode;
    const pool = roleFilter ? allProfiles.filter((p) => p.role === roleFilter) : allProfiles;
    if (!userSearch.trim()) return pool;
    const q = userSearch.toLowerCase();
    return pool.filter((p) => p.nome.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));
  }, [allProfiles, targetMode, userSearch]);

  const canSend =
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    (targetMode !== "user" || selectedUserId.length > 0);

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        type: notifType,
        link: link.trim() || undefined,
      };

      if (targetMode === "user") {
        await sendNotificationToUser(selectedUserId, payload);
        const recipientName = allProfiles.find((p) => p.id === selectedUserId)?.nome ?? "usuário";
        toast.success(`Notificação enviada para ${recipientName}!`);
      } else if (targetMode === "all") {
        await Promise.all([
          sendNotificationToRole("admin", payload),
          sendNotificationToRole("entregador", payload),
          sendNotificationToRole("cliente", payload),
        ]);
        toast.success("Notificação enviada para todos os usuários!");
      } else {
        await sendNotificationToRole(targetMode, payload);
        toast.success(`Notificação enviada para todos os ${ROLE_LABELS[targetMode].toLowerCase()}s!`);
      }

      setTitle("");
      setMessage("");
      setLink("");
      void qc.invalidateQueries({ queryKey: ["all-notifications-admin"] });
    } catch {
      toast.error("Erro ao enviar notificação.");
    } finally {
      setSending(false);
    }
  }

  const TypeIcon = TYPE_CONFIG[notifType].icon;

  return (
    <div className="space-y-6">
      {/* ── Send Form ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4" />
              Enviar Notificação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Target */}
            <div className="space-y-2">
              <Label>Destinatário</Label>
              <Select value={targetMode} onValueChange={(v) => { setTargetMode(v as TargetMode); setSelectedUserId(""); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Todos os usuários</span>
                  </SelectItem>
                  <SelectItem value="admin">Todos os admins</SelectItem>
                  <SelectItem value="entregador">Todos os entregadores</SelectItem>
                  <SelectItem value="cliente">Todos os clientes</SelectItem>
                  <SelectItem value="user">
                    <span className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> Usuário específico</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User search (when specific user selected) */}
            {targetMode === "user" && (
              <div className="space-y-2">
                <Label>Buscar usuário</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8"
                    placeholder="Nome ou e-mail..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-40 overflow-y-auto rounded-md border border-border divide-y divide-border">
                  {filteredProfiles.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">Nenhum usuário encontrado</p>
                  ) : filteredProfiles.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setSelectedUserId(p.id); setUserSearch(p.nome); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors ${selectedUserId === p.id ? "bg-primary/10" : ""}`}
                    >
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${ROLE_BADGE_VARIANT[p.role] ?? ""}`}>
                        {ROLE_LABELS[p.role] ?? p.role}
                      </span>
                      <span className="font-medium">{p.nome}</span>
                      <span className="text-xs text-muted-foreground truncate">{p.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Type */}
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="flex gap-2 flex-wrap">
                {(Object.entries(TYPE_CONFIG) as [NotifType, typeof TYPE_CONFIG[NotifType]][]).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setNotifType(key)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        notifType === key
                          ? `${cfg.bg} ${cfg.color} border-current`
                          : "border-border text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label>Título <span className="text-destructive">*</span></Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Manutenção programada"
                maxLength={80}
              />
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label>Mensagem <span className="text-destructive">*</span></Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descreva o conteúdo da notificação..."
                className="min-h-[80px] resize-none"
                maxLength={300}
              />
            </div>

            {/* Link */}
            <div className="space-y-2">
              <Label>Link <span className="text-xs text-muted-foreground">(opcional)</span></Label>
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="/admin/solicitacoes"
              />
            </div>

            <Button
              onClick={handleSend}
              disabled={!canSend || sending}
              className="w-full gap-2"
            >
              {sending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {sending ? "Enviando..." : "Enviar Notificação"}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Preview — como o usuário verá
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              {/* Simulated header */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
                <div>
                  <p className="text-sm font-semibold">Notificações</p>
                  <p className="text-xs text-muted-foreground">1 não lida</p>
                </div>
              </div>
              {/* Notification card */}
              <div className="flex items-start gap-3 rounded-lg bg-muted/30 px-3 py-3">
                <div className={`mt-0.5 h-8 w-8 rounded-lg ${TYPE_CONFIG[notifType].bg} flex items-center justify-center shrink-0`}>
                  <TypeIcon className={`h-4 w-4 ${TYPE_CONFIG[notifType].color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">
                      {title.trim() || <span className="text-muted-foreground italic">Título da notificação</span>}
                    </p>
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {message.trim() || <span className="italic">Mensagem da notificação aparecerá aqui...</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">agora mesmo</p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">Para:</span>
                {targetMode === "all" && "Todos os usuários (admin + entregadores + clientes)"}
                {targetMode === "admin" && "Todos os admins"}
                {targetMode === "entregador" && "Todos os entregadores"}
                {targetMode === "cliente" && "Todos os clientes"}
                {targetMode === "user" && (selectedUserId ? allProfiles.find((p) => p.id === selectedUserId)?.nome ?? "—" : "Nenhum usuário selecionado")}
              </div>
              {link.trim() && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Link:</span>
                  <code className="text-[10px] bg-muted px-1 rounded">{link}</code>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── History ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Histórico de Notificações
            </CardTitle>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => void refetch()}>
              <RefreshCw className={`h-3.5 w-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={historyTab} onValueChange={(v) => setHistoryTab(v as typeof historyTab)}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs px-2.5">Todos</TabsTrigger>
                <TabsTrigger value="admin" className="text-xs px-2.5">Admin</TabsTrigger>
                <TabsTrigger value="entregador" className="text-xs px-2.5">Entregadores</TabsTrigger>
                <TabsTrigger value="cliente" className="text-xs px-2.5">Clientes</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="info">Informação</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="warning">Aviso</SelectItem>
                <SelectItem value="error">Urgente</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterRead} onValueChange={setFilterRead}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Status leitura" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="nao_lida">Não lidas</SelectItem>
                <SelectItem value="lida">Lidas</SelectItem>
              </SelectContent>
            </Select>

            <span className="text-xs text-muted-foreground ml-auto">
              {filteredHistory.length} exibido{filteredHistory.length !== 1 ? "s" : ""}{hasNextPage ? " (mais disponíveis)" : ""}
            </span>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">Destinatário</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Título</TableHead>
                  <TableHead className="text-xs">Mensagem</TableHead>
                  <TableHead className="text-xs">Lida</TableHead>
                  <TableHead className="text-xs">Enviada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingHistory ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                      Nenhuma notificação encontrada
                    </TableCell>
                  </TableRow>
                ) : filteredHistory.map((n) => {
                  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.info;
                  const Icon = cfg.icon;
                  const role = n.profile?.role ?? "";
                  return (
                    <TableRow key={n.id} className={!n.read ? "bg-muted/20" : ""}>
                      <TableCell className="py-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium">{n.profile?.nome ?? "—"}</span>
                          <span className={`text-[10px] self-start px-1.5 py-0.5 rounded border ${ROLE_BADGE_VARIANT[role] ?? "bg-muted text-muted-foreground"}`}>
                            {ROLE_LABELS[role] ?? role}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.bg} ${cfg.color}`}>
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 text-sm font-medium max-w-[150px] truncate">{n.title}</TableCell>
                      <TableCell className="py-2 text-xs text-muted-foreground max-w-[200px] truncate">{n.message}</TableCell>
                      <TableCell className="py-2">
                        <Switch checked={n.read} disabled className="scale-75 origin-left" />
                      </TableCell>
                      <TableCell className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Load more */}
          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                {isFetchingNextPage ? "Carregando..." : "Carregar mais"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

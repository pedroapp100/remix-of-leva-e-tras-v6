import { useState, useMemo, useEffect } from "react";
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle2, CheckCheck, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { PageContainer } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotifications, type Notification } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";

const PAGE_SIZE = 15;

type FilterType = "all" | "info" | "success" | "warning" | "error";
type FilterRead = "all" | "unread" | "read";

const TYPE_CONFIG: Record<Notification["type"], { label: string; icon: React.ElementType; color: string; bg: string }> = {
  info: { label: "Informação", icon: Info, color: "text-primary", bg: "bg-primary/10" },
  success: { label: "Sucesso", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  warning: { label: "Aviso", icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10" },
  error: { label: "Urgente", icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
};

const ROLE_PREFIXES = ["/admin/", "/cliente/", "/entregador/"] as const;

function resolveNotifLink(link: string | undefined, role: string | undefined): string {
  const base = role ? `/${role}` : "/";
  if (!link) return `${base}/solicitacoes`;
  for (const prefix of ROLE_PREFIXES) {
    if (link.startsWith(prefix)) {
      const rest = link.slice(prefix.length);
      return `${base}/${rest}`;
    }
  }
  return link;
}

export default function NotificacoesPage() {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterRead, setFilterRead] = useState<FilterRead>("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (filterType !== "all" && n.type !== filterType) return false;
      if (filterRead === "unread" && n.read) return false;
      if (filterRead === "read" && !n.read) return false;
      return true;
    });
  }, [notifications, filterType, filterRead]);

  // Resetar página quando filtros mudarem
  useEffect(() => { setPage(0); }, [filterType, filterRead]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <PageContainer
      title="Notificações"
      subtitle={`${unreadCount} não lida${unreadCount !== 1 ? "s" : ""}`}
      icon={Bell}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
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
          <Select value={filterRead} onValueChange={(v) => setFilterRead(v as FilterRead)}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Leitura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="unread">Não lidas</SelectItem>
              <SelectItem value="read">Lidas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => void markAllAsRead()} className="h-8 gap-1.5 text-xs">
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Bell className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhuma notificação encontrada</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col divide-y divide-border rounded-xl border border-border overflow-hidden bg-card">
            {paginated.map((notif) => {
              const cfg = TYPE_CONFIG[notif.type];
              const IconComponent = cfg.icon;
              return (
                <button
                  key={notif.id}
                  onClick={() => {
                    void markAsRead(notif.id);
                    navigate(resolveNotifLink(notif.link, user?.role));
                  }}
                  className={`w-full flex items-start gap-4 px-4 py-3.5 transition-colors text-left hover:bg-muted/50 ${!notif.read ? "bg-muted/30" : ""}`}
                >
                  <div className={`mt-0.5 h-9 w-9 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                    <IconComponent className={`h-4 w-4 ${cfg.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm ${!notif.read ? "font-semibold" : "text-muted-foreground"}`}>
                        {notif.title}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 h-4 ${cfg.color} border-current/30`}
                      >
                        {cfg.label}
                      </Badge>
                      {!notif.read && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {formatDistanceToNow(notif.createdAt, { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  {!notif.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); void markAsRead(notif.id); }}
                      className="h-7 text-xs text-muted-foreground hover:text-foreground shrink-0"
                    >
                      Marcar lida
                    </Button>
                  )}
                </button>
              );
            })}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">
                {filtered.length} notificação{filtered.length !== 1 ? "s" : ""} — página {page + 1} de {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <Button
                    key={i}
                    variant={page === i ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0 text-xs"
                    onClick={() => setPage(i)}
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={page === totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}

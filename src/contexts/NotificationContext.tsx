import { createContext, useContext, ReactNode, useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "warning" | "error" | "info" | "success";
  read: boolean;
  createdAt: Date;
  link?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id" | "read" | "createdAt">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

function rowToNotification(row: {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  created_at: string;
}): Notification {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type as Notification["type"],
    read: row.read,
    link: row.link ?? undefined,
    createdAt: new Date(row.created_at),
  };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [effectiveUserId, setEffectiveUserId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  useEffect(() => {
    if (!user) {
      setEffectiveUserId(null);
      return;
    }

    if (isUuid(user.id)) {
      setEffectiveUserId(user.id);
      return;
    }

    console.warn("[NotificationContext] user.id inválido para UUID; tentando resolver via auth.getUser():", user.id);
    void supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.error("[NotificationContext] Falha ao resolver user id para notifications:", error.message);
        setEffectiveUserId(null);
        return;
      }
      const resolved = data?.user?.id;
      setEffectiveUserId(resolved && isUuid(resolved) ? resolved : null);
    });
  }, [user]);

  const loadNotifications = useCallback(async () => {
    if (!effectiveUserId) {
      setNotifications([]);
      return;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", effectiveUserId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[NotificationContext] Falha ao carregar notificações:", error.message);
      return;
    }

    setNotifications((data ?? []).map(rowToNotification));
  }, [effectiveUserId]);

  // Carrega notificações do banco quando o usuário estiver disponível
  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  // Fallback para ambientes sem realtime estável: sincroniza periodicamente.
  useEffect(() => {
    if (!effectiveUserId) return;
    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, 15_000);

    return () => window.clearInterval(intervalId);
  }, [effectiveUserId, loadNotifications]);

  // Subscrição realtime: recebe novas notificações e atualizações (mark as read)
  useEffect(() => {
    if (!effectiveUserId) return;

    // Remove canal anterior se existir
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`notifications:${effectiveUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${effectiveUserId}`,
        },
        (payload) => {
          const newNotif = rowToNotification(payload.new as Parameters<typeof rowToNotification>[0]);
          setNotifications((prev) => prev.some((n) => n.id === newNotif.id) ? prev : [newNotif, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${effectiveUserId}`,
        },
        (payload) => {
          const updated = rowToNotification(payload.new as Parameters<typeof rowToNotification>[0]);
          setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        }
      )
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") {
          console.warn("[NotificationContext] Canal realtime não está SUBSCRIBED:", status);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [effectiveUserId]);

  const addNotification = useCallback(
    async (notification: Omit<Notification, "id" | "read" | "createdAt">) => {
      if (!effectiveUserId) return;
      const { data, error } = await supabase.from("notifications").insert({
        user_id: effectiveUserId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: false,
        link: notification.link ?? null,
      }).select("*").single();

      if (error) {
        console.error("[NotificationContext] Falha ao inserir notificação:", error.message);
        return;
      }

      if (data) {
        const created = rowToNotification(data);
        setNotifications((prev) => prev.some((n) => n.id === created.id) ? prev : [created, ...prev]);
      }
    },
    [effectiveUserId]
  );

  const markAsRead = useCallback(
    async (id: string) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    if (!effectiveUserId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", effectiveUserId)
      .eq("read", false);
  }, [effectiveUserId]);

  // Ouve eventos customizados de saldo baixo e nova fatura
  useEffect(() => {
    const handleSaldoBaixo = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        message: string;
      };
      addNotification({
        title: "Saldo pré-pago baixo",
        message: detail.message,
        type: "warning",
        link: "/admin/clientes",
      });
    };

    const handleNovaFatura = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        message: string;
      };
      addNotification({
        title: "Nova fatura gerada",
        message: detail.message,
        type: "info",
        link: "/admin/faturas",
      });
    };

    const handleFaturaAutoFechada = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        message: string;
      };
      addNotification({
        title: "Fatura fechada automaticamente",
        message: detail.message,
        type: "success",
        link: "/admin/faturas",
      });
    };

    window.addEventListener("saldo-baixo-pre-pago", handleSaldoBaixo);
    window.addEventListener("nova-fatura-gerada", handleNovaFatura);
    window.addEventListener("fatura-auto-fechada", handleFaturaAutoFechada);
    return () => {
      window.removeEventListener("saldo-baixo-pre-pago", handleSaldoBaixo);
      window.removeEventListener("nova-fatura-gerada", handleNovaFatura);
      window.removeEventListener("fatura-auto-fechada", handleFaturaAutoFechada);
    };
  }, [addNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markAsRead, markAllAsRead, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications deve ser usado dentro de <NotificationProvider>");
  return ctx;
}

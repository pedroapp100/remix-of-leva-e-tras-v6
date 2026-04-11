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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Carrega notificações do banco quando o usuário estiver disponível
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setNotifications(data.map(rowToNotification));
      });
  }, [user]);

  // Subscrição realtime: recebe novas notificações e atualizações (mark as read)
  useEffect(() => {
    if (!user) return;

    // Remove canal anterior se existir
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = rowToNotification(payload.new as Parameters<typeof rowToNotification>[0]);
          setNotifications((prev) => [newNotif, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = rowToNotification(payload.new as Parameters<typeof rowToNotification>[0]);
          setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user]);

  const addNotification = useCallback(
    async (notification: Omit<Notification, "id" | "read" | "createdAt">) => {
      if (!user) return;
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: false,
        link: notification.link ?? null,
      });
      // O realtime INSERT listener atualiza o estado local automaticamente
    },
    [user]
  );

  const markAsRead = useCallback(
    async (id: string) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    },
    []
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
  }, [user]);

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

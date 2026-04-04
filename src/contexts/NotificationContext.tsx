import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from "react";

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

const STORAGE_KEY = "leva-traz-notifications";

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    title: "Solicitações pendentes",
    message: "12 solicitações aguardando aprovação",
    type: "warning",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5),
    link: "/admin/solicitacoes",
  },
  {
    id: "n2",
    title: "Faturas vencidas",
    message: "3 faturas com pagamento atrasado",
    type: "error",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
    link: "/admin/faturas",
  },
  {
    id: "n3",
    title: "Novo entregador cadastrado",
    message: "Carlos Silva foi adicionado à equipe",
    type: "info",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    link: "/admin/entregadores",
  },
  {
    id: "n4",
    title: "Pagamento confirmado",
    message: "Fatura #1042 paga por Empresa ABC",
    type: "success",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    link: "/admin/faturas",
  },
  {
    id: "n5",
    title: "Entrega concluída",
    message: "Entrega #3847 finalizada com sucesso",
    type: "success",
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
];

function loadFromStorage(): Notification[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Array<Notification & { createdAt: string }>;
    return parsed.map((n) => ({ ...n, createdAt: new Date(n.createdAt) }));
  } catch {
    return null;
  }
}

function saveToStorage(notifications: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    // quota exceeded — silently ignore
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(
    () => loadFromStorage() ?? MOCK_NOTIFICATIONS
  );

  // Persist on every change
  useEffect(() => {
    saveToStorage(notifications);
  }, [notifications]);

  const addNotification = useCallback((notification: Omit<Notification, "id" | "read" | "createdAt">) => {
    const newNotif: Notification = {
      ...notification,
      id: `n-${Date.now()}-${Math.random()}`,
      read: false,
      createdAt: new Date(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Listen for low prepaid balance events from GlobalStore
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        clienteNome: string;
        saldoApos: number;
        limite: number;
        message: string;
        clienteId: string;
      };
      addNotification({
        title: "Saldo pré-pago baixo",
        message: detail.message,
        type: "warning",
        link: "/admin/clientes",
      });
    };
    window.addEventListener("saldo-baixo-pre-pago", handler);
    return () => window.removeEventListener("saldo-baixo-pre-pago", handler);
  }, [addNotification]);

  // Listen for new invoice generation
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        faturaNumero: string;
        clienteNome: string;
        message: string;
      };
      addNotification({
        title: "Nova fatura gerada",
        message: detail.message,
        type: "info",
        link: "/admin/faturas",
      });
    };
    window.addEventListener("nova-fatura-gerada", handler);
    return () => window.removeEventListener("nova-fatura-gerada", handler);
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

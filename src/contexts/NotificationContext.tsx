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

interface NotificationBadges {
  solicitacoesPendentes: number;
  faturasVencidas: number;
  notificacoesGerais: number;
}

interface NotificationContextType {
  badges: NotificationBadges;
  setBadges: (badges: Partial<NotificationBadges>) => void;
  totalUnread: number;
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id" | "read" | "createdAt">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

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

const MOCK_BADGES: NotificationBadges = {
  solicitacoesPendentes: 12,
  faturasVencidas: 3,
  notificacoesGerais: 5,
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [badges, setBadgesState] = useState<NotificationBadges>(MOCK_BADGES);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  const setBadges = (partial: Partial<NotificationBadges>) => {
    setBadgesState((prev) => ({ ...prev, ...partial }));
  };

  const addNotification = useCallback((notification: Omit<Notification, "id" | "read" | "createdAt">) => {
    const newNotif: Notification = {
      ...notification,
      id: `n-${Date.now()}-${Math.random()}`,
      read: false,
      createdAt: new Date(),
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setBadgesState((prev) => ({ ...prev, notificacoesGerais: prev.notificacoesGerais + 1 }));
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setBadgesState({ solicitacoesPendentes: 0, faturasVencidas: 0, notificacoesGerais: 0 });
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const totalUnread = badges.solicitacoesPendentes + badges.faturasVencidas + badges.notificacoesGerais;

  return (
    <NotificationContext.Provider value={{ badges, setBadges, totalUnread, notifications, addNotification, markAsRead, markAllAsRead, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications deve ser usado dentro de <NotificationProvider>");
  return ctx;
}

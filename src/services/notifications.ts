import { supabase } from "@/lib/supabase";

export interface NotificationPayload {
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  link?: string;
}

export interface AdminNotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  link: string | null;
  created_at: string;
  profile?: {
    nome: string;
    email: string;
    role: string;
  } | null;
}

/**
 * Insere uma notificação interna para um usuário específico pelo profile_id.
 */
export async function sendNotificationToUser(
  targetUserId: string,
  payload: NotificationPayload
): Promise<void> {
  const { error } = await supabase.from("notifications").insert({
    user_id: targetUserId,
    title: payload.title,
    message: payload.message,
    type: payload.type,
    read: false,
    link: payload.link ?? null,
  });
  if (error) {
    console.error("[notifications] Falha ao enviar notificação:", error.message);
  }
}

/**
 * Envia notificação para todos os usuários com um role específico.
 * Usa a RPC notify_role (SECURITY DEFINER) para bypassar RLS em profiles —
 * sem isso um entregador não consegue ver os perfis admin e a notificação
 * nunca é criada (falha silenciosa).
 */
export async function sendNotificationToRole(
  role: "admin" | "entregador" | "cliente",
  payload: NotificationPayload
): Promise<void> {
  const { error } = await supabase.rpc("notify_role", {
    p_role: role,
    p_title: payload.title,
    p_message: payload.message,
    p_type: payload.type,
    p_link: payload.link ?? null,
  });
  if (error) {
    console.error("[notifications] Falha ao enviar notificação por role:", error.message);
  }
}

/**
 * Busca todas as notificações do sistema para o admin — com JOIN no profile do destinatário.
 * Usa cursor-based pagination (keyset) para performance O(1) em qualquer profundidade.
 */
export async function fetchAllNotificationsAdmin(filters?: {
  role?: string;
  type?: string;
  read?: boolean;
  from?: string;
  to?: string;
  limit?: number;
  /** Cursor para keyset pagination: último item da página anterior */
  cursor?: { created_at: string; id: string };
}): Promise<AdminNotificationRow[]> {
  const pageSize = filters?.limit ?? 20;

  // Filtro de role via profiles: usa subquery com .in() se role especificado
  let userIds: string[] | null = null;
  if (filters?.role) {
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", filters.role)
      .eq("ativo", true);
    userIds = (profileRows ?? []).map((p: { id: string }) => p.id);
    // Se não há usuários com esse role, retorna vazio imediatamente
    if (userIds.length === 0) return [];
  }

  let query = supabase
    .from("notifications")
    .select("*, profile:profiles!notifications_user_id_fkey(nome, email, role)")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize);

  if (userIds) query = query.in("user_id", userIds);
  if (filters?.type) query = query.eq("type", filters.type);
  if (filters?.read !== undefined) query = query.eq("read", filters.read);
  if (filters?.from) query = query.gte("created_at", filters.from);
  if (filters?.to) query = query.lte("created_at", filters.to);

  // Keyset cursor: busca registros após o último item da página anterior
  if (filters?.cursor) {
    query = query.or(
      `created_at.lt.${filters.cursor.created_at},and(created_at.eq.${filters.cursor.created_at},id.lt.${filters.cursor.id})`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("[notifications] Falha ao buscar todas as notificações:", error.message);
    return [];
  }

  return (data ?? []) as AdminNotificationRow[];
}

/**
 * Busca profiles ativos para o seletor de destinatário.
 */
export async function fetchProfilesForSelector(role?: "admin" | "entregador" | "cliente"): Promise<{
  id: string;
  nome: string;
  email: string;
  role: string;
}[]> {
  let query = supabase
    .from("profiles")
    .select("id, nome, email, role")
    .eq("ativo", true)
    .order("nome");

  if (role) query = query.eq("role", role);

  const { data, error } = await query;
  if (error) {
    console.error("[notifications] Falha ao buscar profiles:", error.message);
    return [];
  }
  return data ?? [];
}

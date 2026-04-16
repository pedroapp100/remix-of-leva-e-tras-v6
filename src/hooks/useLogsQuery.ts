import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { LogCategoria, LogEntry } from "@/types/database";

const PAGE_SIZE = 50;

export interface LogsFilter {
  search?: string;
  categoria?: LogCategoria | "all";
  from?: Date;
  to?: Date;
}

export interface LogsCursor {
  created_at: string;
  id: string;
}

export interface LogsPage {
  data: LogEntry[];
  nextCursor: LogsCursor | null;
  hasMore: boolean;
}

function mapRow(r: Record<string, unknown>): LogEntry {
  return {
    id: r.id as string,
    timestamp: r.created_at as string,
    usuario_id: (r.usuario_id as string | null) ?? "system",
    usuario_nome: r.usuario_nome as string,
    categoria: r.categoria as LogCategoria,
    acao: r.acao as string,
    entidade_id: r.entidade_id as string,
    descricao: r.descricao as string,
    detalhes: (r.detalhes as Record<string, unknown> | null) ?? null,
  };
}

async function fetchLogsPage(filter: LogsFilter, cursor?: LogsCursor): Promise<LogsPage> {
  let query = supabase
    .from("logs_auditoria")
    .select("id, created_at, usuario_id, usuario_nome, categoria, acao, entidade_id, descricao, detalhes")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1); // +1 para detectar hasMore

  // ── Full-text search server-side (tsvector GIN index — 100x mais rápido que LIKE) ──
  if (filter.search && filter.search.trim().length > 0) {
    // websearch: suporta "frase exata", OR, -exclusão naturalmente
    query = query.textSearch("search_vector", filter.search.trim(), { type: "websearch", config: "portuguese" });
  }

  // ── Filtro de categoria ───────────────────────────────────────────────────────
  if (filter.categoria && filter.categoria !== "all") {
    query = query.eq("categoria", filter.categoria);
  }

  // ── Filtro de data ────────────────────────────────────────────────────────────
  if (filter.from) {
    query = query.gte("created_at", filter.from.toISOString());
  }
  if (filter.to) {
    // Inclui o dia inteiro do "to"
    const endOfDay = new Date(filter.to);
    endOfDay.setHours(23, 59, 59, 999);
    query = query.lte("created_at", endOfDay.toISOString());
  }

  // ── Cursor-based pagination (O(1) — skill data-pagination.md) ────────────────
  // Ao invés de OFFSET que cresce linearmente, usamos (created_at, id) < cursor
  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Record<string, unknown>[];
  const hasMore = rows.length > PAGE_SIZE;
  const pageRows = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const lastRow = pageRows[pageRows.length - 1];

  return {
    data: pageRows.map(mapRow),
    nextCursor: hasMore && lastRow
      ? { created_at: lastRow.created_at as string, id: lastRow.id as string }
      : null,
    hasMore,
  };
}

/**
 * Hook principal para a LogsPage.
 * Usa cursor-based pagination com infinite query do React Query.
 * Suporta full-text search via tsvector (server-side).
 */
export function useLogsQuery(filter: LogsFilter) {
  return useInfiniteQuery<LogsPage, Error>({
    queryKey: ["logs_auditoria", filter],
    queryFn: ({ pageParam }) => fetchLogsPage(filter, pageParam as LogsCursor | undefined),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook para métricas do cabeçalho da LogsPage.
 * Separado do infinite query para não ser invalidado pelos filtros.
 */
export function useLogsMetrics() {
  return useQuery({
    queryKey: ["logs_auditoria_metrics"],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [totalResult, todayResult, usersResult] = await Promise.all([
        supabase.from("logs_auditoria").select("id", { count: "exact", head: true }),
        supabase
          .from("logs_auditoria")
          .select("id", { count: "exact", head: true })
          .gte("created_at", todayStart.toISOString()),
        supabase
          .from("logs_auditoria")
          .select("usuario_nome")
          .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);

      const uniqueUsers = usersResult.data
        ? new Set((usersResult.data as { usuario_nome: string }[]).map((r) => r.usuario_nome)).size
        : 0;

      return {
        total: totalResult.count ?? 0,
        hoje: todayResult.count ?? 0,
        usuariosAtivos7d: uniqueUsers,
      };
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}

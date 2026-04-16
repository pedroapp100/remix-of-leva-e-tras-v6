/**
 * hooks/useSolicitacoes.ts
 * React Query hooks para Solicitações, Rotas e Pagamentos.
 */
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { rowToSolicitacao, rowToRota, rowToPagamento } from "@/lib/mappers";
import {
  fetchSolicitacoes,
  fetchSolicitacoesPageable,
  fetchSolicitacoesByCliente,
  fetchSolicitacoesByEntregador,
  fetchSolicitacaoById,
  createSolicitacao,
  updateSolicitacao,
  fetchRotasBySolicitacao,
  fetchRotasBySolicitacaoIds,
  fetchRotasWindow,
  createRota,
  createRotas,
  updateRota,
  bulkUpdateRotasStatus,
  fetchPagamentosBySolicitacao,
  fetchAllPagamentos,
  createPagamentos,
  fetchHistoricoBySolicitacao,
  appendHistorico,
  type SolicitacaoRow,
  type SolicitacaoInsert,
  type SolicitacaoUpdate,
  type RotaInsert,
  type RotaUpdate,
  type SolicitacoesPageParams,
  type SolicitacoesPage,
  type PagamentoInsert,
  type HistoricoRow,
} from "@/services/solicitacoes";

/** Returns the ISO date string for N days ago (stable per calendar day — cache-friendly). */
function sinceNDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ── Solicitações ──────────────────────────────────────────────────────────────

/**
 * Default hook: fetches last 90 days. Covers all operational use cases.
 * Uses a stable date key so React Query doesn't re-fetch on every render.
 */
export function useSolicitacoes() {
  const since = sinceNDays(90);
  return useQuery({
    queryKey: ["solicitacoes", "windowed", since],
    queryFn: () => fetchSolicitacoes(since),
    select: (data) => data.map(rowToSolicitacao),
    staleTime: 2 * 60_000,
  });
}

/**
 * All-time version for reports and commission calculations.
 * Only used by useComissao, ClientesReportTab, ReceitasReportTab.
 */
export function useSolicitacoesAll() {
  return useQuery({
    queryKey: ["solicitacoes", "all"],
    queryFn: () => fetchSolicitacoes(undefined, true),
    select: (data) => data.map(rowToSolicitacao),
    staleTime: 5 * 60_000,
  });
}

/**
 * Scoped to a single cliente — returns Solicitacao[] (drop-in replacement).
 * Used by MinhasSolicitacoesPage, ClientProfileModal.
 */
export function useSolicitacoesByCliente(clienteId: string) {
  return useQuery({
    queryKey: ["solicitacoes", "cliente", clienteId],
    queryFn: () => fetchSolicitacoesByCliente(clienteId),
    select: (data: SolicitacaoRow[]) => data.map(rowToSolicitacao),
    enabled: Boolean(clienteId),
  });
}

/**
 * Scoped to a single entregador — returns Solicitacao[] (drop-in replacement).
 * Used by EntregadorSolicitacoesPage, EntregadorCorridasPage, EntregadorHistoricoPage.
 */
export function useSolicitacoesByEntregador(entregadorId: string) {
  return useQuery({
    queryKey: ["solicitacoes", "entregador", entregadorId],
    queryFn: () => fetchSolicitacoesByEntregador(entregadorId),
    select: (data: SolicitacaoRow[]) => data.map(rowToSolicitacao),
    enabled: Boolean(entregadorId),
  });
}

/**
 * Server-side paginated hook — used by SolicitacoesPage and EntregasPage.
 * - Filtering (status, date range, search) happens in Supabase, not in the browser.
 * - `keepPreviousData` prevents flicker when navigating pages.
 * - Returns { data: Solicitacao[], total, page, pageSize, pageCount }.
 */
export function useSolicitacoesPageable(params: SolicitacoesPageParams) {
  return useQuery({
    queryKey: ["solicitacoes", "paged", params],
    queryFn: () => fetchSolicitacoesPageable(params),
    placeholderData: keepPreviousData,
    select: (d): { data: import("@/types/database").Solicitacao[]; total: number; page: number; pageSize: number; pageCount: number } => ({
      data: d.data.map(rowToSolicitacao),
      total: d.total,
      page: d.page,
      pageSize: d.pageSize,
      pageCount: d.pageCount,
    }),
    staleTime: 60_000,
  });
}

export type { SolicitacoesPageParams, SolicitacoesPage };

export function useSolicitacaoById(id: string) {
  return useQuery<SolicitacaoRow>({
    queryKey: ["solicitacoes", id],
    queryFn: () => fetchSolicitacaoById(id),
    enabled: Boolean(id),
  });
}

export function useCreateSolicitacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SolicitacaoInsert) => createSolicitacao(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["solicitacoes"] }),
  });
}

export function useCreateSolicitacaoWithRotas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sol, rotas }: { sol: SolicitacaoInsert; rotas: RotaInsert[] }) => {
      const created = await createSolicitacao(sol);
      const createdRotas = await createRotas(
        rotas.map((r) => ({ ...r, solicitacao_id: created.id }))
      );
      return { sol: created, rotas: createdRotas };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitacoes"] });
      qc.invalidateQueries({ queryKey: ["rotas"] });
    },
  });
}

export function useUpdateSolicitacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: SolicitacaoUpdate }) =>
      updateSolicitacao(id, patch),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["solicitacoes"] });
      qc.invalidateQueries({ queryKey: ["solicitacoes", id] });
    },
  });
}

// ── Rotas ─────────────────────────────────────────────────────────────────────

/**
 * Scoped rotas by an array of solicitação IDs (uses idx_rotas_sol).
 * Ideal for pages that already have a scoped solicitações list.
 */
export function useRotasBySolicitacaoIds(solicitacaoIds: string[]) {
  return useQuery({
    queryKey: ["rotas", "by-ids", solicitacaoIds],
    queryFn: () => fetchRotasBySolicitacaoIds(solicitacaoIds),
    select: (data) => data.map(rowToRota),
    enabled: solicitacaoIds.length > 0,
    staleTime: 2 * 60_000,
  });
}

/**
 * Rotas within a time window (default 90 days). Uses idx_rotas_created.
 * Replaces useAllRotas for pages that only need recent rotas.
 */
export function useRotasWindow() {
  const since = sinceNDays(90);
  return useQuery({
    queryKey: ["rotas", "windowed", since],
    queryFn: () => fetchRotasWindow(since),
    select: (data) => data.map(rowToRota),
    staleTime: 2 * 60_000,
  });
}

export function useRotasBySolicitacao(solId: string) {
  return useQuery({
    queryKey: ["rotas", solId],
    queryFn: () => fetchRotasBySolicitacao(solId),
    select: (data) => data.map(rowToRota),
    enabled: Boolean(solId),
  });
}

export function useCreateRota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RotaInsert) => createRota(input),
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["rotas", data.solicitacao_id] }),
  });
}

export function useUpdateRota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: RotaUpdate }) =>
      updateRota(id, patch),
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["rotas", data.solicitacao_id] }),
  });
}

export function useUpdateRotasBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ solicitacaoId, status }: { solicitacaoId: string; status: "concluida" | "cancelada" }) =>
      bulkUpdateRotasStatus(solicitacaoId, status),
    onSuccess: (_, { solicitacaoId }) => {
      qc.invalidateQueries({ queryKey: ["rotas", solicitacaoId] });
      qc.invalidateQueries({ queryKey: ["rotas", "windowed"] });
      qc.invalidateQueries({ queryKey: ["rotas", "by-ids"] });
    },
  });
}

// ── Pagamentos ────────────────────────────────────────────────────────────────

export function useAllPagamentos() {
  return useQuery({
    queryKey: ["pagamentos"],
    queryFn: fetchAllPagamentos,
    select: (data) => data.map(rowToPagamento),
  });
}

export function usePagamentosBySolicitacao(solId: string) {
  return useQuery({
    queryKey: ["pagamentos", solId],
    queryFn: () => fetchPagamentosBySolicitacao(solId),
    select: (data) => data.map(rowToPagamento),
    enabled: Boolean(solId),
  });
}

export function useCreatePagamentos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pagamentos: PagamentoInsert[]) => createPagamentos(pagamentos),
    onSuccess: (data) => {
      if (data.length > 0) {
        qc.invalidateQueries({
          queryKey: ["pagamentos", data[0].solicitacao_id],
        });
      }
    },
  });
}

// ── Histórico ─────────────────────────────────────────────────────────────────

export function useHistoricoBySolicitacao(solId: string) {
  return useQuery<HistoricoRow[]>({
    queryKey: ["historico_sol", solId],
    queryFn: () => fetchHistoricoBySolicitacao(solId),
    enabled: Boolean(solId),
  });
}

export function useAppendHistorico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      solId,
      tipo,
      descricao,
      extra,
    }: {
      solId: string;
      tipo: string;
      descricao: string;
      extra?: Partial<HistoricoRow>;
    }) => appendHistorico(solId, tipo, descricao, extra),
    onSuccess: (_, { solId }) =>
      qc.invalidateQueries({ queryKey: ["historico_sol", solId] }),
  });
}

/**
 * hooks/useSolicitacoes.ts
 * React Query hooks para Solicitações, Rotas e Pagamentos.
 */
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
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
  deletePagamentosBySolicitacao,
  deletePagamentosByRota,
  fetchHistoricoBySolicitacao,
  appendHistorico,
  fetchTaxasExtrasByRotaIds,
  createRotaTaxasExtras,
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
 *
 * — Realtime subscription para atualizações instantâneas quando o BD muda.
 * — Polling a cada 30s como segurança para conexões instáveis (PWA).
 * — refetchOnWindowFocus: true para atualizar ao voltar ao app no celular.
 */
export function useSolicitacoesByEntregador(entregadorId: string) {
  const qc = useQueryClient();
  const queryKey = ["solicitacoes", "entregador", entregadorId];

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!entregadorId) return;

    const channel = supabase
      .channel(`solicitacoes-entregador-${entregadorId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "solicitacoes",
          filter: `entregador_id=eq.${entregadorId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey });
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entregadorId]);

  return useQuery({
    queryKey,
    queryFn: () => fetchSolicitacoesByEntregador(entregadorId),
    select: (data: SolicitacaoRow[]) => data.map(rowToSolicitacao),
    enabled: Boolean(entregadorId),
    staleTime: 20_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

/**
 * Server-side paginated hook — used by SolicitacoesPage.
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
    mutationFn: async ({
      sol,
      rotas,
      taxasExtrasPerRota,
    }: {
      sol: SolicitacaoInsert;
      rotas: RotaInsert[];
      taxasExtrasPerRota?: { rotaIndex: number; taxaExtraId: string; valor: number }[];
    }) => {
      const created = await createSolicitacao(sol);
      const createdRotas = await createRotas(
        rotas.map((r) => ({ ...r, solicitacao_id: created.id }))
      );
      if (taxasExtrasPerRota && taxasExtrasPerRota.length > 0) {
        await createRotaTaxasExtras(
          taxasExtrasPerRota.map(({ rotaIndex, taxaExtraId, valor }) => ({
            rota_id: createdRotas[rotaIndex].id,
            taxa_extra_id: taxaExtraId,
            valor,
          }))
        );
      }
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

export function useTaxasExtrasByRotaIds(rotaIds: string[]) {
  return useQuery({
    queryKey: ["taxas_extras_rotas", rotaIds],
    queryFn: () => fetchTaxasExtrasByRotaIds(rotaIds),
    enabled: rotaIds.length > 0,
  });
}

export function useCreateRota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RotaInsert) => createRota(input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["rotas", data.solicitacao_id] });
      qc.invalidateQueries({ queryKey: ["rotas", "by-ids"] });
    },
  });
}

export function useUpdateRota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: RotaUpdate }) =>
      updateRota(id, patch),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["rotas", data.solicitacao_id] });
      qc.invalidateQueries({ queryKey: ["rotas", "by-ids"] });
    },
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

export function useDeletePagamentosBySolicitacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (solId: string) => deletePagamentosBySolicitacao(solId),
    onSuccess: (_, solId) => qc.invalidateQueries({ queryKey: ["pagamentos", solId] }),
  });
}

export function useDeletePagamentosByRota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rotaId, solicitacaoId }: { rotaId: string; solicitacaoId: string }) =>
      deletePagamentosByRota(rotaId),
    onSuccess: (_data, { solicitacaoId }) =>
      qc.invalidateQueries({ queryKey: ["pagamentos", solicitacaoId] }),
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


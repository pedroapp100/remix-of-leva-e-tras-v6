/**
 * hooks/useFaturas.ts
 * React Query hooks para Faturas, Lançamentos e Ajustes.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Fatura, EntregaFatura, RotaEntregaFatura } from "@/types/database";
import { rowToFatura } from "@/lib/mappers";
import {
  fetchFaturas,
  fetchFaturasByCliente,
  fetchFaturaById,
  createFatura,
  updateFatura,
  fetchLancamentosByCliente,
  fetchLancamentosByFatura,
  createLancamento,
  fetchAjustesByFatura,
  createAjuste,
  fetchHistoricoFatura,
  createHistoricoFatura,
  concluirFaturaEntrega,
  type FaturaRow,
  type FaturaInsert,
  type FaturaUpdate,
  type LancamentoRow,
  type LancamentoInsert,
  type AjusteRow,
  type AjusteInsert,
  type HistoricoFaturaRow,
  type HistoricoFaturaInsert,
  type ConcluirFaturaEntregaParams,
  type ConcluirFaturaEntregaResult,
} from "@/services/faturas";
import {
  fetchSolicitacoesByIds,
  fetchRotasBySolicitacaoIds,
  type SolicitacaoRow,
  type RotaRow,
} from "@/services/solicitacoes";
import { fetchEntregadores } from "@/services/entregadores";
import { fetchBairros } from "@/services/settings";

export function useFaturas() {
  return useQuery({
    queryKey: ["faturas"],
    queryFn: fetchFaturas,
    select: (data) => data.map(rowToFatura),
  });
}

export function useFaturasByCliente(clienteId: string) {
  return useQuery<FaturaRow[]>({
    queryKey: ["faturas", "cliente", clienteId],
    queryFn: () => fetchFaturasByCliente(clienteId),
    enabled: Boolean(clienteId),
  });
}

export function useFaturaById(id: string) {
  return useQuery<FaturaRow>({
    queryKey: ["faturas", id],
    queryFn: () => fetchFaturaById(id),
    enabled: Boolean(id),
  });
}

export function useCreateFatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FaturaInsert) => createFatura(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["faturas"] }),
  });
}

export function useUpdateFatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: FaturaUpdate }) =>
      updateFatura(id, patch),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["faturas"] });
      qc.invalidateQueries({ queryKey: ["faturas", id] });
    },
  });
}

export function useLancamentosByCliente(clienteId: string) {
  return useQuery<LancamentoRow[]>({
    queryKey: ["lancamentos", "cliente", clienteId],
    queryFn: () => fetchLancamentosByCliente(clienteId),
    enabled: Boolean(clienteId),
  });
}

export function useLancamentosByFatura(faturaId: string) {
  return useQuery<LancamentoRow[]>({
    queryKey: ["lancamentos", "fatura", faturaId],
    queryFn: () => fetchLancamentosByFatura(faturaId),
    enabled: Boolean(faturaId),
  });
}

export function useCreateLancamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LancamentoInsert) => createLancamento(input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["lancamentos", "cliente", data.cliente_id] });
      if (data.fatura_id) {
        qc.invalidateQueries({ queryKey: ["lancamentos", "fatura", data.fatura_id] });
      }
      qc.invalidateQueries({ queryKey: ["saldo_pre_pago", data.cliente_id] });
    },
  });
}

export function useAjustesByFatura(faturaId: string) {
  return useQuery<AjusteRow[]>({
    queryKey: ["ajustes", faturaId],
    queryFn: () => fetchAjustesByFatura(faturaId),
    enabled: Boolean(faturaId),
  });
}

export function useCreateAjuste() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AjusteInsert) => createAjuste(input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["ajustes", data.fatura_id] });
      qc.invalidateQueries({ queryKey: ["faturas", data.fatura_id] });
    },
  });
}

export function useHistoricoFatura(faturaId: string) {
  return useQuery<HistoricoFaturaRow[]>({
    queryKey: ["historico_fat", faturaId],
    queryFn: () => fetchHistoricoFatura(faturaId),
    enabled: Boolean(faturaId),
  });
}

export function useCreateHistoricoFatura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: HistoricoFaturaInsert) => createHistoricoFatura(input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["historico_fat", data.fatura_id] });
    },
  });
}

export function useConcluirFaturaEntrega() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: ConcluirFaturaEntregaParams) => concluirFaturaEntrega(params),
    onSuccess: (result: ConcluirFaturaEntregaResult, params) => {
      qc.invalidateQueries({ queryKey: ["faturas"] });
      if (result.fatura_id) {
        qc.invalidateQueries({ queryKey: ["faturas", result.fatura_id] });
        qc.invalidateQueries({ queryKey: ["lancamentos", "fatura", result.fatura_id] });
        qc.invalidateQueries({ queryKey: ["historico_fat", result.fatura_id] });
        qc.invalidateQueries({ queryKey: ["entregas_fatura", result.fatura_id] });
      }
      qc.invalidateQueries({ queryKey: ["lancamentos", "cliente", params.p_cliente_id] });
      qc.invalidateQueries({ queryKey: ["saldo_pre_pago", params.p_cliente_id] });
      // Refresh solicitacoes table so admin_conciliada_at is always up-to-date after fatura creation
      qc.invalidateQueries({ queryKey: ["solicitacoes"] });
    },
  });
}

/**
 * Derives EntregaFatura[] from lancamentos_financeiros → solicitacoes → rotas.
 * Only fetches when there are lancamentos with solicitacao_id.
 */
export function useEntregasByFatura(faturaId: string) {
  return useQuery<EntregaFatura[]>({
    queryKey: ["entregas_fatura", faturaId],
    queryFn: async () => {
      // 1. Get lancamentos for this fatura
      const lancamentos = await fetchLancamentosByFatura(faturaId);
      const solIds = [
        ...new Set(
          lancamentos
            .map((l) => l.solicitacao_id)
            .filter((id): id is string => id != null)
        ),
      ];
      if (solIds.length === 0) return [];

      // 2. Fetch solicitacoes, rotas, entregadores, bairros in parallel
      const [sols, rotas, entregadores, bairros] = await Promise.all([
        fetchSolicitacoesByIds(solIds),
        fetchRotasBySolicitacaoIds(solIds),
        fetchEntregadores(),
        fetchBairros(),
      ]);

      const entregadorMap = new Map(entregadores.map((e) => [e.id, e.nome]));
      const bairroMap = new Map(bairros.map((b) => [b.id, b.nome]));
      const rotasBySol = new Map<string, RotaRow[]>();
      for (const r of rotas) {
        const arr = rotasBySol.get(r.solicitacao_id) ?? [];
        arr.push(r);
        rotasBySol.set(r.solicitacao_id, arr);
      }

      // 3. Map to EntregaFatura[]
      return sols.map((sol): EntregaFatura => {
        const solRotas = rotasBySol.get(sol.id) ?? [];
        const totalTaxas = solRotas.reduce((s, r) => s + (r.taxa_resolvida ?? 0), 0);
        const totalRecebido = solRotas
          .filter((r) => r.receber_do_cliente)
          .reduce((s, r) => s + (r.valor_a_receber ?? 0), 0);

        const mappedRotas: RotaEntregaFatura[] = solRotas.map((r) => ({
          bairro_destino: bairroMap.get(r.bairro_destino_id) ?? r.bairro_destino_id,
          responsavel: r.responsavel,
          telefone: r.telefone,
          taxa: r.taxa_resolvida ?? 0,
          valor_receber: r.receber_do_cliente ? (r.valor_a_receber ?? null) : null,
          status: r.status === "cancelada" ? "cancelada" : "concluida",
        }));

        return {
          solicitacao_id: sol.id,
          codigo: sol.codigo,
          entregador_nome: sol.entregador_id
            ? (entregadorMap.get(sol.entregador_id) ?? "—")
            : "—",
          data_conclusao: sol.data_conclusao ?? sol.updated_at,
          total_rotas: solRotas.length,
          valor_taxas: totalTaxas,
          valor_recebido_cliente: totalRecebido,
          status: sol.status === "cancelada" ? "cancelada" : "concluida",
          ponto_coleta: sol.ponto_coleta,
          rotas: mappedRotas,
        };
      });
    },
    enabled: Boolean(faturaId),
  });
}

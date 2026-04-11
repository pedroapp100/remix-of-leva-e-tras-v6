/**
 * hooks/useSettings.ts
 * React Query hooks para dados de configuração.
 * Stale time elevado — dados de lookup mudam raramente.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchRegioes, fetchBairros, fetchBairrosByRegiao, upsertBairro, deleteBairro,
  fetchFormasPagamento, updateFormaPagamento,
  fetchCargos, upsertCargo, deleteCargo,
  fetchTiposOperacao, upsertTipoOperacao,
  fetchTaxasExtras, upsertTaxaExtra,
  fetchFeriados, upsertFeriado, deleteFeriado,
} from "@/services/settings";
import type { Regiao, Bairro, FormaPagamento, Cargo, TipoOperacaoConfig, TaxaExtraConfig, Feriado } from "@/types/database";

const STALE_10MIN = 10 * 60 * 1000;

// ── Regiões ──────────────────────────────────────────────────────────────────

export function useRegioes() {
  return useQuery<Regiao[]>({
    queryKey: ["regioes"],
    queryFn: fetchRegioes,
    staleTime: STALE_10MIN,
  });
}

// ── Bairros ──────────────────────────────────────────────────────────────────

export function useBairros() {
  return useQuery<Bairro[]>({
    queryKey: ["bairros"],
    queryFn: fetchBairros,
    staleTime: STALE_10MIN,
  });
}

export function useBairrosByRegiao(regionId: string) {
  return useQuery<Bairro[]>({
    queryKey: ["bairros", "regiao", regionId],
    queryFn: () => fetchBairrosByRegiao(regionId),
    enabled: Boolean(regionId),
    staleTime: STALE_10MIN,
  });
}

export function useUpsertBairro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bairro: Omit<Bairro, "id"> & { id?: string }) => upsertBairro(bairro),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bairros"] }),
  });
}

export function useDeleteBairro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBairro(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bairros"] }),
  });
}

// ── Formas de Pagamento ───────────────────────────────────────────────────────

export function useFormasPagamento() {
  return useQuery<FormaPagamento[]>({
    queryKey: ["formas_pagamento"],
    queryFn: fetchFormasPagamento,
    staleTime: STALE_10MIN,
  });
}

export function useUpdateFormaPagamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Omit<FormaPagamento, "id">> }) =>
      updateFormaPagamento(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["formas_pagamento"] }),
  });
}

// ── Cargos ────────────────────────────────────────────────────────────────────

export function useCargos() {
  return useQuery<Cargo[]>({
    queryKey: ["cargos"],
    queryFn: fetchCargos,
    staleTime: STALE_10MIN,
  });
}

export function useUpsertCargo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cargo: Omit<Cargo, "id"> & { id?: string }) => upsertCargo(cargo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cargos"] }),
  });
}

export function useDeleteCargo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCargo(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cargos"] }),
  });
}

// ── Tipos de Operação ──────────────────────────────────────────────────────────

export function useTiposOperacao() {
  return useQuery<TipoOperacaoConfig[]>({
    queryKey: ["tipos_operacao"],
    queryFn: fetchTiposOperacao,
    staleTime: STALE_10MIN,
  });
}

export function useUpsertTipoOperacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tipo: Partial<TipoOperacaoConfig> & { id?: string }) => upsertTipoOperacao(tipo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tipos_operacao"] }),
  });
}

// ── Taxas Extras ──────────────────────────────────────────────────────────────

export function useTaxasExtras() {
  return useQuery<TaxaExtraConfig[]>({
    queryKey: ["taxas_extras"],
    queryFn: fetchTaxasExtras,
    staleTime: STALE_10MIN,
  });
}

export function useUpsertTaxaExtra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taxa: Partial<TaxaExtraConfig> & { id?: string }) => upsertTaxaExtra(taxa),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["taxas_extras"] }),
  });
}

// ── Feriados ──────────────────────────────────────────────────────────────────

export function useFeriados() {
  return useQuery<Feriado[]>({
    queryKey: ["feriados"],
    queryFn: fetchFeriados,
    staleTime: STALE_10MIN,
  });
}

export function useUpsertFeriado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (feriado: Partial<Feriado> & { id?: string }) => upsertFeriado(feriado),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feriados"] }),
  });
}

export function useDeleteFeriado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFeriado(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feriados"] }),
  });
}

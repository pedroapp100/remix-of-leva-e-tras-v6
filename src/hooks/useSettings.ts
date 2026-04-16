/**
 * hooks/useSettings.ts
 * React Query hooks para dados de configuração.
 * Stale time elevado — dados de lookup mudam raramente.
 */
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchRegioes, fetchBairros, fetchBairrosByRegiao, upsertBairro, deleteBairro,
  fetchFormasPagamento, updateFormaPagamento, createFormaPagamento,
  fetchCargos, upsertCargo, deleteCargo,
  fetchTiposOperacao, upsertTipoOperacao, deleteTipoOperacao,
  fetchTaxasExtras, upsertTaxaExtra, deleteTaxaExtra,
  fetchFeriados, upsertFeriado, deleteFeriado,
  upsertRegiao, deleteRegiao,
  fetchIntegracoes, createIntegracao, updateIntegracao, removeIntegracao,
  fetchNotificationTemplateRows, updateNotificationTemplate, createNotificationTemplate, deleteNotificationTemplate,
  fetchWebhooks, createWebhook, updateWebhook, removeWebhook,
  type IntegracaoEntry,
  type NotificationTemplateRow,
  type WebhookEntry,
} from "@/services/settings";
import type { Regiao, Bairro, FormaPagamento, Cargo, TipoOperacaoConfig, TaxaExtraConfig, Feriado } from "@/types/database";
import { fetchAllNotificationsAdmin, fetchProfilesForSelector, type AdminNotificationRow } from "@/services/notifications";

const STALE_10MIN = 10 * 60 * 1000;

// ── Regiões ──────────────────────────────────────────────────────────────────

export function useRegioes() {
  return useQuery<Regiao[]>({
    queryKey: ["regioes"],
    queryFn: fetchRegioes,
    staleTime: STALE_10MIN,
  });
}

export function useUpsertRegiao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (regiao: Omit<Regiao, "id"> & { id?: string }) => upsertRegiao(regiao),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["regioes"] }),
  });
}

export function useDeleteRegiao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRegiao(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["regioes"] });
      qc.invalidateQueries({ queryKey: ["bairros"] });
    },
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

export function useCreateFormaPagamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Pick<FormaPagamento, "name" | "description" | "enabled" | "order">) =>
      createFormaPagamento(payload),
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

export function useDeleteTipoOperacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTipoOperacao(id),
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

export function useDeleteTaxaExtra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTaxaExtra(id),
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

// ── Integrações / Notificações / Webhooks ───────────────────────────────────

export function useIntegracoesData() {
  const qc = useQueryClient();

  const { data: integracoes = [], isLoading, error: queryError } = useQuery<IntegracaoEntry[]>({
    queryKey: ["integracoes"],
    queryFn: fetchIntegracoes,
  });

  const createMut = useMutation({
    mutationFn: (entry: { nome: string; descricao: string; categoria: string; icone: string; config: Record<string, string> }) =>
      createIntegracao(entry),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integracoes"] }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...rest }: { id: string; api_key?: string; ativo?: boolean; status?: string; config?: Record<string, string> }) =>
      updateIntegracao({ id, ...rest }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integracoes"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => removeIntegracao(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integracoes"] }),
  });

  return {
    integracoes,
    isLoading,
    queryError,
    createIntegracao: createMut.mutateAsync,
    updateIntegracao: updateMut.mutateAsync,
    deleteIntegracao: deleteMut.mutateAsync,
  };
}

export function useNotificationTemplateRows() {
  const qc = useQueryClient();

  const { data: rows = [], isError } = useQuery<NotificationTemplateRow[]>({
    queryKey: ["notification_templates"],
    queryFn: fetchNotificationTemplateRows,
  });

  async function updateTemplate(
    id: string,
    data: Partial<{
      evento: string;
      evento_label: string;
      categoria: string;
      titulo: string;
      mensagem: string;
      canal: string;
      variaveis: string[];
      ativo: boolean;
    }>
  ) {
    await updateNotificationTemplate(id, data);
    await qc.invalidateQueries({ queryKey: ["notification_templates"] });
  }

  async function addTemplate(data: {
    evento: string;
    evento_label: string;
    categoria: string;
    titulo: string;
    mensagem: string;
    canal: string;
    ativo: boolean;
    variaveis: string[];
  }) {
    await createNotificationTemplate(data);
    await qc.invalidateQueries({ queryKey: ["notification_templates"] });
  }

  async function removeTemplate(id: string) {
    await deleteNotificationTemplate(id);
    await qc.invalidateQueries({ queryKey: ["notification_templates"] });
  }

  return { rows, isError, updateTemplate, addTemplate, removeTemplate };
}

export function useWebhooksData() {
  const qc = useQueryClient();

  const { data: webhooks = [] } = useQuery<WebhookEntry[]>({
    queryKey: ["webhooks"],
    queryFn: fetchWebhooks,
  });

  const addMut = useMutation({
    mutationFn: (w: Omit<WebhookEntry, "id" | "created_at" | "updated_at" | "ultimo_erro">) => createWebhook(w),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<Omit<WebhookEntry, "id" | "created_at" | "updated_at">>) =>
      updateWebhook(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => removeWebhook(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhooks"] }),
  });

  return {
    webhooks,
    addWebhook: addMut.mutateAsync,
    updateWebhook: updateMut.mutateAsync,
    deleteWebhook: deleteMut.mutateAsync,
  };
}

// ── Notificações Internas (Admin) ─────────────────────────────────────────────

type AdminNotifFilters = Omit<NonNullable<Parameters<typeof fetchAllNotificationsAdmin>[0]>, "cursor">;

export const ADMIN_NOTIF_PAGE_SIZE = 20;

export function useAllNotificationsAdmin(filters?: AdminNotifFilters) {
  return useInfiniteQuery<AdminNotificationRow[], Error, { pages: AdminNotificationRow[][] }, [string, AdminNotifFilters | undefined], { created_at: string; id: string } | undefined>({
    queryKey: ["all-notifications-admin", filters],
    queryFn: ({ pageParam }) =>
      fetchAllNotificationsAdmin({ ...filters, limit: ADMIN_NOTIF_PAGE_SIZE, cursor: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < ADMIN_NOTIF_PAGE_SIZE) return undefined;
      const last = lastPage[lastPage.length - 1];
      return last ? { created_at: last.created_at, id: last.id } : undefined;
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useProfilesForSelector(role?: "admin" | "entregador" | "cliente") {
  return useQuery({
    queryKey: ["profiles-selector", role ?? "all"],
    queryFn: () => fetchProfilesForSelector(role),
    staleTime: STALE_10MIN,
  });
}

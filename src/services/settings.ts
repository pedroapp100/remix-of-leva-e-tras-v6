/**
 * services/settings.ts
 * Funções puras para dados de configuração (tabelas de lookup).
 * Sem side-effects — apenas queries Supabase.
 */
import { supabase } from "@/lib/supabase";
import type { TableInsert } from "@/types/supabase";
import type { Regiao, Bairro, FormaPagamento, Cargo, TipoOperacaoConfig, TaxaExtraConfig, Feriado } from "@/types/database";
import type { Json } from "@/types/supabase";

// ── Regiões ──────────────────────────────────────────────────────────────────

export async function fetchRegioes(): Promise<Regiao[]> {
  const { data, error } = await supabase
    .from("regioes")
    .select("id, name, description")
    .order("name");
  if (error) throw new Error(error.message);
  return data as Regiao[];
}

export async function upsertRegiao(
  regiao: Omit<Regiao, "id"> & { id?: string }
): Promise<Regiao> {
  const { data, error } = await supabase
    .from("regioes")
    .upsert(regiao as TableInsert<"regioes">, { onConflict: "id" })
    .select("id, name, description");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Falha ao salvar região.");
  return data[0] as Regiao;
}

export async function deleteRegiao(id: string): Promise<void> {
  const { error } = await supabase.from("regioes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Bairros ──────────────────────────────────────────────────────────────────

export async function fetchBairros(): Promise<Bairro[]> {
  const { data, error } = await supabase
    .from("bairros")
    .select("id, nome, region_id, taxa_entrega")
    .order("nome");
  if (error) throw new Error(error.message);
  return data as Bairro[];
}

export async function fetchBairrosByRegiao(regionId: string): Promise<Bairro[]> {
  const { data, error } = await supabase
    .from("bairros")
    .select("id, nome, region_id, taxa_entrega")
    .eq("region_id", regionId)
    .order("nome");
  if (error) throw new Error(error.message);
  return data as Bairro[];
}

export async function upsertBairro(
  bairro: Omit<Bairro, "id"> & { id?: string }
): Promise<Bairro> {
  const { data, error } = await supabase
    .from("bairros")
    .upsert(bairro, { onConflict: "id" })
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Falha ao salvar bairro.");
  return data[0] as Bairro;
}

export async function deleteBairro(id: string): Promise<void> {
  const { error } = await supabase.from("bairros").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Formas de Pagamento ───────────────────────────────────────────────────────

export async function fetchFormasPagamento(): Promise<FormaPagamento[]> {
  const { data, error } = await supabase
    .from("formas_pagamento")
    .select("id, name, description, enabled, order")
    .order("order");
  if (error) throw new Error(error.message);
  return data as FormaPagamento[];
}

export async function updateFormaPagamento(
  id: string,
  patch: Partial<Omit<FormaPagamento, "id">>
): Promise<FormaPagamento> {
  const { data, error } = await supabase
    .from("formas_pagamento")
    .update(patch)
    .eq("id", id)
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Forma de pagamento não encontrada.");
  return data[0] as FormaPagamento;
}

export async function createFormaPagamento(
  payload: Pick<FormaPagamento, "name" | "description" | "enabled" | "order">
): Promise<FormaPagamento> {
  const { data, error } = await supabase
    .from("formas_pagamento")
    .insert(payload)
    .select("id, name, description, enabled, order");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Falha ao criar forma de pagamento.");
  return data[0] as FormaPagamento;
}

// ── Cargos ────────────────────────────────────────────────────────────────────

export async function fetchCargos(): Promise<Cargo[]> {
  const { data, error } = await supabase
    .from("cargos")
    .select("id, name, description, permissions")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((c) => ({
    ...c,
    permissions: Array.isArray(c.permissions) ? (c.permissions as string[]) : [],
  })) as Cargo[];
}

export async function upsertCargo(
  cargo: Omit<Cargo, "id"> & { id?: string }
): Promise<Cargo> {
  const { data, error } = await supabase
    .from("cargos")
    .upsert(cargo as TableInsert<"cargos">, { onConflict: "id" })
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Falha ao salvar cargo.");
  return data[0] as Cargo;
}

export async function deleteCargo(id: string): Promise<void> {
  const { error } = await supabase.from("cargos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Tipos de Operação ──────────────────────────────────────────────────────────

export async function fetchTiposOperacao(): Promise<TipoOperacaoConfig[]> {
  const { data, error } = await supabase
    .from("tipos_operacao_config")
    .select("*")
    .order("prioridade");
  if (error) throw new Error(error.message);
  return data as TipoOperacaoConfig[];
}

export async function upsertTipoOperacao(
  tipo: Partial<TipoOperacaoConfig> & { id?: string }
): Promise<TipoOperacaoConfig> {
  const { data, error } = await supabase
    .from("tipos_operacao_config")
    .upsert(tipo as TableInsert<"tipos_operacao_config">, { onConflict: "id" })
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Falha ao salvar tipo de operação.");
  return data[0] as TipoOperacaoConfig;
}

export async function deleteTipoOperacao(id: string): Promise<void> {
  const { error } = await supabase.from("tipos_operacao_config").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Taxas Extras ──────────────────────────────────────────────────────────────

export async function fetchTaxasExtras(): Promise<TaxaExtraConfig[]> {
  const { data, error } = await supabase
    .from("taxas_extras_config")
    .select("id, nome, valor_padrao, ativo")
    .order("nome");
  if (error) throw new Error(error.message);
  return data as TaxaExtraConfig[];
}

export async function upsertTaxaExtra(
  taxa: Partial<TaxaExtraConfig> & { id?: string }
): Promise<TaxaExtraConfig> {
  const { data, error } = await supabase
    .from("taxas_extras_config")
    .upsert(taxa as TableInsert<"taxas_extras_config">, { onConflict: "id" })
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Falha ao salvar taxa extra.");
  return data[0] as TaxaExtraConfig;
}

export async function deleteTaxaExtra(id: string): Promise<void> {
  const { error } = await supabase.from("taxas_extras_config").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Feriados ──────────────────────────────────────────────────────────────────

export async function fetchFeriados(): Promise<Feriado[]> {
  const { data, error } = await supabase
    .from("feriados")
    .select("id, nome, data, recorrente, ativo")
    .order("data");
  if (error) throw new Error(error.message);
  return data as Feriado[];
}

export async function upsertFeriado(
  feriado: Partial<Feriado> & { id?: string }
): Promise<Feriado> {
  const { data, error } = await supabase
    .from("feriados")
    .upsert(feriado as TableInsert<"feriados">, { onConflict: "id" })
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Falha ao salvar feriado.");
  return data[0] as Feriado;
}

export async function deleteFeriado(id: string): Promise<void> {
  const { error } = await supabase.from("feriados").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Integrações ──────────────────────────────────────────────────────────────

export type IntegracaoStatus = "conectado" | "desconectado" | "erro";
export type IntegracaoCategoria = "comunicacao" | "pagamento" | "mapa" | "notificacao" | "outro";

export interface IntegracaoEntry {
  id: string;
  nome: string;
  descricao: string;
  categoria: IntegracaoCategoria;
  icone: string;
  status: IntegracaoStatus;
  ativo: boolean;
  api_key?: string;
  config: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export async function fetchIntegracoes(): Promise<IntegracaoEntry[]> {
  const { data, error } = await supabase.from("integracoes").select("*").order("nome");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    ...r,
    descricao: r.descricao ?? "",
    icone: r.icone ?? "zap",
    categoria: r.categoria as IntegracaoCategoria,
    status: r.status as IntegracaoStatus,
    api_key: r.api_key ?? undefined,
    config: (r.config as Record<string, string>) ?? {},
  })) as IntegracaoEntry[];
}

export async function createIntegracao(input: {
  nome: string;
  descricao: string;
  categoria: string;
  icone: string;
  config: Record<string, string>;
}): Promise<void> {
  const { error } = await supabase.from("integracoes").insert({
    nome: input.nome,
    descricao: input.descricao,
    categoria: input.categoria,
    icone: input.icone,
    config: input.config as unknown as Json,
    status: "desconectado",
    ativo: false,
  });
  if (error) throw new Error(error.message);
}

export async function updateIntegracao(input: {
  id: string;
  api_key?: string;
  ativo?: boolean;
  status?: string;
  config?: Record<string, string>;
}): Promise<void> {
  const { id, config, ...rest } = input;
  const payload = config !== undefined ? { ...rest, config: config as unknown as Json } : rest;
  const { error } = await supabase.from("integracoes").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function removeIntegracao(id: string): Promise<void> {
  const { error } = await supabase.from("integracoes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Notification templates ───────────────────────────────────────────────────

export interface NotificationTemplateRow {
  id: string;
  evento: string;
  evento_label: string;
  categoria: string;
  titulo: string;
  mensagem: string;
  canal: string;
  ativo: boolean;
  variaveis: string[];
  updated_at: string;
}

export async function fetchNotificationTemplateRows(): Promise<NotificationTemplateRow[]> {
  const { data, error } = await supabase
    .from("notification_templates")
    .select("*")
    .order("evento");
  if (error) throw new Error(error.message);
  return (data ?? []) as NotificationTemplateRow[];
}

export async function updateNotificationTemplate(
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
): Promise<void> {
  const { error } = await supabase.from("notification_templates").update(data).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createNotificationTemplate(data: {
  evento: string;
  evento_label: string;
  categoria: string;
  titulo: string;
  mensagem: string;
  canal: string;
  ativo: boolean;
  variaveis: string[];
}): Promise<void> {
  const { error } = await supabase.from("notification_templates").insert(data);
  if (error) throw new Error(error.message);
}

export async function deleteNotificationTemplate(id: string): Promise<void> {
  const { error } = await supabase.from("notification_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Webhooks ─────────────────────────────────────────────────────────────────

export type WebhookStatus = "ativo" | "inativo" | "erro";

export interface WebhookEntry {
  id: string;
  nome: string;
  url: string;
  secret_hash: string | null;
  eventos: string[];
  status: WebhookStatus;
  ultimo_erro: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchWebhooks(): Promise<WebhookEntry[]> {
  const { data, error } = await supabase
    .from("webhooks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as WebhookEntry[];
}

export async function createWebhook(input: Omit<WebhookEntry, "id" | "created_at" | "updated_at" | "ultimo_erro">): Promise<void> {
  const { error } = await supabase.from("webhooks").insert({ ...input, ultimo_erro: null });
  if (error) throw new Error(error.message);
}

export async function updateWebhook(
  id: string,
  data: Partial<Omit<WebhookEntry, "id" | "created_at" | "updated_at">>
): Promise<void> {
  const { error } = await supabase.from("webhooks").update(data).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function removeWebhook(id: string): Promise<void> {
  const { error } = await supabase.from("webhooks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * services/settings.ts
 * Funções puras para dados de configuração (tabelas de lookup).
 * Sem side-effects — apenas queries Supabase.
 */
import { supabase } from "@/lib/supabase";
import type { TableInsert } from "@/types/supabase";
import type { Regiao, Bairro, FormaPagamento, Cargo, TipoOperacaoConfig, TaxaExtraConfig, Feriado } from "@/types/database";

// ── Regiões ──────────────────────────────────────────────────────────────────

export async function fetchRegioes(): Promise<Regiao[]> {
  const { data, error } = await supabase
    .from("regioes")
    .select("id, name, description")
    .order("name");
  if (error) throw new Error(error.message);
  return data as Regiao[];
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
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Bairro;
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
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as FormaPagamento;
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
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Cargo;
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
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as TipoOperacaoConfig;
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
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as TaxaExtraConfig;
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
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Feriado;
}

export async function deleteFeriado(id: string): Promise<void> {
  const { error } = await supabase.from("feriados").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

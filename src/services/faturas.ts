/**
 * services/faturas.ts
 * Funções puras Supabase para Faturas, Lançamentos e Ajustes.
 */
import { supabase } from "@/lib/supabase";
import type { TableRow, TableInsert, TableUpdate } from "@/types/supabase";

export type FaturaRow = TableRow<"faturas">;
export type FaturaInsert = TableInsert<"faturas">;
export type FaturaUpdate = TableUpdate<"faturas">;
export type LancamentoRow = TableRow<"lancamentos_financeiros">;
export type LancamentoInsert = TableInsert<"lancamentos_financeiros">;
export type AjusteRow = TableRow<"ajustes_financeiros">;
export type AjusteInsert = TableInsert<"ajustes_financeiros">;
export type HistoricoFaturaRow = TableRow<"historico_faturas">;
export type HistoricoFaturaInsert = TableInsert<"historico_faturas">;

// ── Faturas ───────────────────────────────────────────────────────────────────

export async function fetchFaturas(): Promise<FaturaRow[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - 12);
  const { data, error } = await supabase
    .from("faturas")
    .select("*")
    .gte("data_emissao", since.toISOString())
    .order("data_emissao", { ascending: false });
  if (error) throw new Error(error.message);
  return data as FaturaRow[];
}

/** Lightweight count: only fetches the count of overdue faturas */
export async function fetchFaturasVencidasCount(): Promise<number> {
  const { count, error } = await supabase
    .from("faturas")
    .select("*", { count: "exact", head: true })
    .eq("status_geral", "Vencida");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function fetchFaturasByCliente(
  clienteId: string
): Promise<FaturaRow[]> {
  const { data, error } = await supabase
    .from("faturas")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("data_emissao", { ascending: false });
  if (error) throw new Error(error.message);
  return data as FaturaRow[];
}

export async function fetchFaturaById(id: string): Promise<FaturaRow> {
  const { data, error } = await supabase
    .from("faturas")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as FaturaRow;
}

export async function createFatura(input: FaturaInsert): Promise<FaturaRow> {
  const { data, error } = await supabase
    .from("faturas")
    .insert(input)
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Falha ao criar fatura.");
  return data[0] as FaturaRow;
}

export async function updateFatura(
  id: string,
  patch: FaturaUpdate
): Promise<FaturaRow> {
  const { data, error } = await supabase
    .from("faturas")
    .update(patch)
    .eq("id", id)
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Fatura não encontrada ou sem permissão para atualizar.");
  return data[0] as FaturaRow;
}

// ── Lançamentos (imutável — sem Update) ───────────────────────────────────────

export async function fetchLancamentosByCliente(
  clienteId: string
): Promise<LancamentoRow[]> {
  const { data, error } = await supabase
    .from("lancamentos_financeiros")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as LancamentoRow[];
}

export async function fetchLancamentosByFatura(
  faturaId: string
): Promise<LancamentoRow[]> {
  const { data, error } = await supabase
    .from("lancamentos_financeiros")
    .select("*")
    .eq("fatura_id", faturaId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data as LancamentoRow[];
}

export async function createLancamento(
  input: LancamentoInsert
): Promise<LancamentoRow> {
  const { data, error } = await supabase
    .from("lancamentos_financeiros")
    .insert(input)
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Falha ao criar lançamento.");
  return data[0] as LancamentoRow;
}

// ── Ajustes ───────────────────────────────────────────────────────────────────

export async function fetchAjustesByFatura(
  faturaId: string
): Promise<AjusteRow[]> {
  const { data, error } = await supabase
    .from("ajustes_financeiros")
    .select("*")
    .eq("fatura_id", faturaId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data as AjusteRow[];
}

export async function createAjuste(input: AjusteInsert): Promise<AjusteRow> {
  const { data, error } = await supabase
    .from("ajustes_financeiros")
    .insert(input)
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Falha ao criar ajuste.");
  return data[0] as AjusteRow;
}

// ── Histórico de Fatura ───────────────────────────────────────────────────────

export async function fetchHistoricoFatura(
  faturaId: string
): Promise<HistoricoFaturaRow[]> {
  const { data, error } = await supabase
    .from("historico_faturas")
    .select("*")
    .eq("fatura_id", faturaId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data as HistoricoFaturaRow[];
}

export async function createHistoricoFatura(
  input: HistoricoFaturaInsert
): Promise<HistoricoFaturaRow> {
  const { data, error } = await supabase
    .from("historico_faturas")
    .insert(input)
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Falha ao criar histórico de fatura.");
  return data[0] as HistoricoFaturaRow;
}

// ── RPC: Atomic fatura + lançamentos + histórico ─────────────────────────────

export interface ConcluirFaturaEntregaParams {
  p_fatura_id: string | null;
  p_sol_id: string;
  p_cliente_id: string;
  p_cliente_nome: string;
  p_tipo_faturamento: string;
  p_total_taxas: number;
  p_total_recebido: number;
  p_sol_codigo: string;
  p_num_rotas: number;
}

export interface ConcluirFaturaEntregaResult {
  success: boolean;
  fatura_id?: string;
  fatura_numero?: string;
  auto_fechada?: boolean;
  total_entregas?: number;
  error?: string;
}

export async function concluirFaturaEntrega(
  params: ConcluirFaturaEntregaParams
): Promise<ConcluirFaturaEntregaResult> {
  const { data, error } = await supabase.rpc("concluir_fatura_entrega", params);
  if (error) throw new Error(error.message);
  return data as unknown as ConcluirFaturaEntregaResult;
}

/**
 * services/clientes.ts
 * Funções puras Supabase para a entidade Cliente.
 * Usa TableRow/Insert/Update do supabase.ts (tipos que espelham o DB real).
 */
import { supabase } from "@/lib/supabase";
import type { TableRow, TableInsert, TableUpdate } from "@/types/supabase";

export type ClienteRow = TableRow<"clientes">;
export type ClienteInsert = TableInsert<"clientes">;
export type ClienteUpdate = TableUpdate<"clientes">;
export type TabelaPrecoRow = TableRow<"tabela_precos_cliente">;
export type TabelaPrecoInsert = TableInsert<"tabela_precos_cliente">;

// ── Listagem ──────────────────────────────────────────────────────────────────

export async function fetchClientes(): Promise<ClienteRow[]> {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .order("nome");
  if (error) throw new Error(error.message);
  return data as ClienteRow[];
}

export async function fetchClienteById(id: string): Promise<ClienteRow> {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as ClienteRow;
}

// ── Criação / Edição ──────────────────────────────────────────────────────────

export async function createCliente(input: ClienteInsert): Promise<ClienteRow> {
  const { data, error } = await supabase
    .from("clientes")
    .insert(input)
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Falha ao criar cliente.");
  return data[0] as ClienteRow;
}

export async function updateCliente(
  id: string,
  patch: ClienteUpdate
): Promise<ClienteRow> {
  const { data, error } = await supabase
    .from("clientes")
    .update(patch)
    .eq("id", id)
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Cliente não encontrado ou sem permissão para atualizar.");
  return data[0] as ClienteRow;
}

export async function deleteCliente(id: string): Promise<void> {
  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Tabela de Preços ──────────────────────────────────────────────────────────

export async function fetchTabelaPrecosByCliente(
  clienteId: string
): Promise<TabelaPrecoRow[]> {
  const { data, error } = await supabase
    .from("tabela_precos_cliente")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("prioridade");
  if (error) throw new Error(error.message);
  return data as TabelaPrecoRow[];
}

export async function upsertTabelaPreco(
  tp: TabelaPrecoInsert & { id?: string }
): Promise<TabelaPrecoRow> {
  const { data, error } = await supabase
    .from("tabela_precos_cliente")
    .upsert(tp, { onConflict: "id" })
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Falha ao salvar tabela de preço.");
  return data[0] as TabelaPrecoRow;
}

export async function deleteTabelaPreco(id: string): Promise<void> {
  const { error } = await supabase
    .from("tabela_precos_cliente")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Saldo pré-pago ────────────────────────────────────────────────────────────

export async function fetchSaldoPrePago(clienteId: string): Promise<number> {
  const { data, error } = await supabase
    .from("lancamentos_financeiros")
    .select("valor, sinal")
    .eq("cliente_id", clienteId)
    .eq("status_liquidacao", "liquidado");
  if (error) throw new Error(error.message);
  return (data ?? []).reduce(
    (acc, l) => acc + (l.sinal === "credito" ? l.valor : -l.valor),
    0
  );
}

/** Batch fetch saldos for ALL clients (single query, grouped by cliente_id). */
export async function fetchAllSaldosPrePago(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("lancamentos_financeiros")
    .select("cliente_id, valor, sinal")
    .eq("status_liquidacao", "liquidado");
  if (error) throw new Error(error.message);
  const map: Record<string, number> = {};
  for (const l of data ?? []) {
    map[l.cliente_id] = (map[l.cliente_id] ?? 0) + (l.sinal === "credito" ? l.valor : -l.valor);
  }
  return map;
}



/**
 * services/clientes.ts
 * Funções puras Supabase para a entidade Cliente.
 * Usa TableRow/Insert/Update do supabase.ts (tipos que espelham o DB real).
 */
import { supabase } from "@/lib/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

export type ClienteRow = Tables<"clientes">;
export type ClienteInsert = TablesInsert<"clientes">;
export type ClienteUpdate = TablesUpdate<"clientes">;
export type TabelaPrecoRow = Tables<"tabela_precos_cliente">;
export type TabelaPrecoInsert = TablesInsert<"tabela_precos_cliente">;

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
  const updated = data[0] as ClienteRow;

  // Mantém o telefone de login (profiles.telefone) sincronizado com o telefone
  // de contato do cliente — mesmo padrão usado para profile_id/documento.
  if (patch.telefone !== undefined && updated.profile_id) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ telefone: patch.telefone })
      .eq("id", updated.profile_id);
    if (profileError) {
      if (profileError.code === "23505") {
        throw new Error("Este telefone já está em uso por outra conta. Use um número diferente.");
      }
      throw new Error(`Cliente atualizado, mas falha ao sincronizar telefone de acesso: ${profileError.message}`);
    }
  }

  return updated;
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
  const [recargasRes, debitosRes] = await Promise.all([
    supabase
      .from("recargas_pre_pago")
      .select("valor")
      .eq("cliente_id", clienteId),
    supabase
      .from("lancamentos_financeiros")
      .select("valor")
      .eq("cliente_id", clienteId)
      .eq("sinal", "debito")
      .eq("tipo", "debito_loja")
      .neq("status_liquidacao", "estornado"),
  ]);
  if (recargasRes.error) throw new Error(recargasRes.error.message);
  if (debitosRes.error) throw new Error(debitosRes.error.message);
  const totalRecargas = (recargasRes.data ?? []).reduce((acc, r) => acc + Number(r.valor), 0);
  const totalDebitos = (debitosRes.data ?? []).reduce((acc, l) => acc + Number(l.valor), 0);
  return totalRecargas - totalDebitos;
}

/** Batch fetch saldos for ALL clients (single query, grouped by cliente_id). */
export async function fetchAllSaldosPrePago(): Promise<Record<string, number>> {
  const [recargasRes, debitosRes] = await Promise.all([
    supabase
      .from("recargas_pre_pago")
      .select("cliente_id, valor"),
    supabase
      .from("lancamentos_financeiros")
      .select("cliente_id, valor")
      .eq("sinal", "debito")
      .eq("tipo", "debito_loja")
      .neq("status_liquidacao", "estornado"),
  ]);
  if (recargasRes.error) throw new Error(recargasRes.error.message);
  if (debitosRes.error) throw new Error(debitosRes.error.message);

  const map: Record<string, number> = {};
  for (const r of recargasRes.data ?? []) {
    map[r.cliente_id] = (map[r.cliente_id] ?? 0) + Number(r.valor);
  }
  for (const l of debitosRes.data ?? []) {
    map[l.cliente_id] = (map[l.cliente_id] ?? 0) - Number(l.valor);
  }
  return map;
}

/**
 * services/entregadores.ts
 * Funções puras Supabase para a entidade Entregador.
 */
import { supabase } from "@/lib/supabase";
import type { TableRow, TableInsert, TableUpdate } from "@/types/supabase";

export type EntregadorRow = TableRow<"entregadores">;
export type EntregadorInsert = TableInsert<"entregadores">;
export type EntregadorUpdate = TableUpdate<"entregadores">;

// ── Listagem ──────────────────────────────────────────────────────────────────

export async function fetchEntregadores(): Promise<EntregadorRow[]> {
  const { data, error } = await supabase
    .from("entregadores")
    .select("*")
    .order("nome");
  if (error) throw new Error(error.message);
  return data as EntregadorRow[];
}

export async function fetchEntregadoresAtivos(): Promise<EntregadorRow[]> {
  const { data, error } = await supabase
    .from("entregadores")
    .select("*")
    .eq("status", "ativo")
    .order("nome");
  if (error) throw new Error(error.message);
  return data as EntregadorRow[];
}

export async function fetchEntregadorById(id: string): Promise<EntregadorRow> {
  const { data, error } = await supabase
    .from("entregadores")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as EntregadorRow;
}

// ── Criação / Edição ──────────────────────────────────────────────────────────

export async function createEntregador(
  input: EntregadorInsert
): Promise<EntregadorRow> {
  const { data, error } = await supabase
    .from("entregadores")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as EntregadorRow;
}

export async function updateEntregador(
  id: string,
  patch: EntregadorUpdate
): Promise<EntregadorRow> {
  const { data, error } = await supabase
    .from("entregadores")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as EntregadorRow;
}

export async function deleteEntregador(id: string): Promise<void> {
  const { error } = await supabase.from("entregadores").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * services/users.ts
 * Funções puras Supabase para a tabela profiles (usuários admin).
 */
import { supabase } from "@/lib/supabase";
import type { TableRow, TableInsert, TableUpdate } from "@/types/supabase";

export type ProfileRow = TableRow<"profiles">;
export type ProfileInsert = TableInsert<"profiles">;
export type ProfileUpdate = TableUpdate<"profiles">;

// ── Listagem ──────────────────────────────────────────────────────────────────

export async function fetchProfiles(): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("nome");
  if (error) throw new Error(error.message);
  return data as ProfileRow[];
}

export async function fetchAdminProfiles(): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "admin")
    .order("nome");
  if (error) throw new Error(error.message);
  return data as ProfileRow[];
}

export async function fetchProfileById(id: string): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as ProfileRow;
}

// ── Edição ────────────────────────────────────────────────────────────────────

export async function updateProfile(id: string, patch: ProfileUpdate): Promise<ProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as ProfileRow;
}

// ── Desativar (soft delete) ───────────────────────────────────────────────────

export async function deactivateProfile(id: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ ativo: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

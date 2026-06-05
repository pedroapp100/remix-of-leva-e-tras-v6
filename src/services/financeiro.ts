/**
 * services/financeiro.ts
 * Funções puras Supabase para Despesas, Receitas e Caixas.
 */
import { supabase } from "@/lib/supabase";
import type { TableRow, TableInsert, TableUpdate } from "@/types/supabase";

export type DespesaRow = TableRow<"despesas">;
export type DespesaInsert = TableInsert<"despesas">;
export type DespesaUpdate = TableUpdate<"despesas">;
export type ReceitaRow = TableRow<"receitas">;
export type ReceitaInsert = TableInsert<"receitas">;
export type ReceitaUpdate = TableUpdate<"receitas">;
export type CategoriaRow = TableRow<"categorias_financeiras">;
export type CategoriaInsert = TableInsert<"categorias_financeiras">;
export type CategoriaUpdate = TableUpdate<"categorias_financeiras">;
export type RecargaRow = TableRow<"recargas_pre_pago">;
export type RecargaInsert = TableInsert<"recargas_pre_pago">;
export type DespesaRecorrenteRow = TableRow<"despesas_recorrentes">;
export type DespesaRecorrenteInsert = TableInsert<"despesas_recorrentes">;
export type DespesaRecorrenteUpdate = TableUpdate<"despesas_recorrentes">;

// ── Despesas ──────────────────────────────────────────────────────────────────

export async function fetchDespesas(): Promise<DespesaRow[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - 12);
  const { data, error } = await supabase
    .from("despesas")
    .select("*")
    .gte("vencimento", since.toISOString())
    .order("vencimento", { ascending: false });
  if (error) throw new Error(error.message);
  return data as DespesaRow[];
}

export async function createDespesa(input: DespesaInsert): Promise<DespesaRow> {
  const { data, error } = await supabase
    .from("despesas")
    .insert(input)
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Falha ao criar despesa.");
  return data[0] as DespesaRow;
}

export async function updateDespesa(
  id: string,
  patch: DespesaUpdate
): Promise<DespesaRow> {
  const { data, error } = await supabase
    .from("despesas")
    .update(patch)
    .eq("id", id)
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Despesa não encontrada ou sem permissão para atualizar.");
  return data[0] as DespesaRow;
}

export async function deleteDespesa(id: string): Promise<void> {
  const { error } = await supabase.from("despesas").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Receitas ──────────────────────────────────────────────────────────────────

export async function fetchReceitas(): Promise<ReceitaRow[]> {
  const since = new Date();
  since.setMonth(since.getMonth() - 12);
  const { data, error } = await supabase
    .from("receitas")
    .select("*")
    .gte("data_recebimento", since.toISOString())
    .order("data_recebimento", { ascending: false });
  if (error) throw new Error(error.message);
  return data as ReceitaRow[];
}

export async function createReceita(input: ReceitaInsert): Promise<ReceitaRow> {
  const { data, error } = await supabase
    .from("receitas")
    .insert(input)
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Falha ao criar receita.");
  return data[0] as ReceitaRow;
}

export async function updateReceita(
  id: string,
  patch: ReceitaUpdate
): Promise<ReceitaRow> {
  const { data, error } = await supabase
    .from("receitas")
    .update(patch)
    .eq("id", id)
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Receita não encontrada ou sem permissão para atualizar.");
  return data[0] as ReceitaRow;
}

export async function deleteReceita(id: string): Promise<void> {
  const { error } = await supabase.from("receitas").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Categorias financeiras ────────────────────────────────────────────────────

export async function fetchCategorias(): Promise<CategoriaRow[]> {
  const { data, error } = await supabase
    .from("categorias_financeiras")
    .select("*")
    .eq("ativo", true)
    .order("nome");
  if (error) throw new Error(error.message);
  return data as CategoriaRow[];
}

export async function fetchTodasCategorias(): Promise<CategoriaRow[]> {
  const { data, error } = await supabase
    .from("categorias_financeiras")
    .select("*")
    .order("nome");
  if (error) throw new Error(error.message);
  return data as CategoriaRow[];
}

export async function createCategoria(input: CategoriaInsert): Promise<CategoriaRow> {
  const { data, error } = await supabase
    .from("categorias_financeiras")
    .insert(input)
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Falha ao criar categoria.");
  return data[0] as CategoriaRow;
}

export async function updateCategoria(id: string, patch: CategoriaUpdate): Promise<CategoriaRow> {
  const { data, error } = await supabase
    .from("categorias_financeiras")
    .update(patch)
    .eq("id", id)
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Categoria não encontrada.");
  return data[0] as CategoriaRow;
}

export async function deleteCategoria(id: string): Promise<void> {
  const { error } = await supabase.from("categorias_financeiras").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") throw new Error("Categoria em uso por despesas ou receitas. Desative-a em vez de excluir.");
    throw new Error(error.message);
  }
}

// ── Recargas pré-pago ─────────────────────────────────────────────────────────

export async function fetchRecargasByCliente(
  clienteId: string
): Promise<RecargaRow[]> {
  const { data, error } = await supabase
    .from("recargas_pre_pago")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as RecargaRow[];
}

export async function createRecarga(input: RecargaInsert): Promise<RecargaRow> {
  const { data, error } = await supabase
    .from("recargas_pre_pago")
    .insert(input)
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Falha ao criar recarga.");
  return data[0] as RecargaRow;
}

/** Registra um débito de taxas no saldo pré-pago do cliente (sem criar fatura). */
export async function createLancamentoPrePago(params: {
  clienteId: string;
  solicitacaoId: string;
  solCodigo: string;
  totalTaxas: number;
  numRotas: number;
}): Promise<void> {
  const { clienteId, solicitacaoId, solCodigo, totalTaxas, numRotas } = params;
  if (totalTaxas <= 0) return;
  const { error } = await supabase.from("lancamentos_financeiros").insert({
    cliente_id: clienteId,
    solicitacao_id: solicitacaoId,
    tipo: "debito_loja",
    valor: totalTaxas,
    sinal: "debito",
    status_liquidacao: "pendente",
    descricao:
      "Taxas de entrega — " +
      solCodigo +
      " (" +
      numRotas +
      " rota" +
      (numRotas !== 1 ? "s" : "") +
      ")",
    referencia_origem: solCodigo,
  });
  if (error) throw new Error(error.message);
}

// ── Despesas Recorrentes ──────────────────────────────────────────────────────

export async function fetchDespesasRecorrentes(): Promise<DespesaRecorrenteRow[]> {
  const { data, error } = await supabase
    .from("despesas_recorrentes")
    .select("*")
    .order("proximo_vencimento");
  if (error) throw new Error(error.message);
  return data as DespesaRecorrenteRow[];
}

export async function createDespesaRecorrente(
  input: DespesaRecorrenteInsert
): Promise<DespesaRecorrenteRow> {
  const { data, error } = await supabase
    .from("despesas_recorrentes")
    .insert(input)
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Falha ao criar despesa recorrente.");
  return data[0] as DespesaRecorrenteRow;
}

export async function updateDespesaRecorrente(
  id: string,
  patch: DespesaRecorrenteUpdate
): Promise<DespesaRecorrenteRow> {
  const { data, error } = await supabase
    .from("despesas_recorrentes")
    .update(patch)
    .eq("id", id)
    .select();
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Despesa recorrente não encontrada ou sem permissão para atualizar.");
  return data[0] as DespesaRecorrenteRow;
}

export async function deleteDespesaRecorrente(id: string): Promise<void> {
  const { error } = await supabase.from("despesas_recorrentes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

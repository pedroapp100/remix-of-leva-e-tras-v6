/**
 * services/solicitacoes.ts
 * Funções puras Supabase para Solicitações, Rotas e Pagamentos.
 *
 * Nota: o campo `historico` do tipo frontend é derivado da tabela
 * `historico_solicitacoes` separada — fetchSolicitacaoCompleta faz o join.
 */
import { supabase } from "@/lib/supabase";
import type { TableRow, TableInsert, TableUpdate } from "@/types/supabase";

export type SolicitacaoRow = TableRow<"solicitacoes">;
export type SolicitacaoInsert = TableInsert<"solicitacoes">;
export type SolicitacaoUpdate = TableUpdate<"solicitacoes">;
export type RotaRow = TableRow<"rotas">;
export type RotaInsert = TableInsert<"rotas">;
export type RotaUpdate = TableUpdate<"rotas">;
export type PagamentoRow = TableRow<"pagamentos_solicitacao">;
export type PagamentoInsert = TableInsert<"pagamentos_solicitacao">;
export type HistoricoRow = TableRow<"historico_solicitacoes">;

// Tipo composto para uso no frontend (solicitação + rotas + histórico)
export type SolicitacaoComplexa = SolicitacaoRow & {
  rotas: RotaRow[];
  historico: HistoricoRow[];
  pagamentos: PagamentoRow[];
};

// ── Solicitações ──────────────────────────────────────────────────────────────

/**
 * Fetches solicitações ordered by date.
 * @param since ISO date string (e.g. "2026-01-10"). If omitted, returns last 90 days.
 * @param all Pass true to fetch all records (for reports/commissions that need full history).
 */
export async function fetchSolicitacoes(since?: string, all?: boolean): Promise<SolicitacaoRow[]> {
  const cutoff = since ?? (all ? undefined : (() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d.toISOString().slice(0, 10);
  })());

  let q = supabase
    .from("solicitacoes")
    .select("*")
    .order("data_solicitacao", { ascending: false });

  if (cutoff) q = q.gte("data_solicitacao", cutoff);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data as SolicitacaoRow[];
}

// ── Paginação server-side ─────────────────────────────────────────────────────

export interface SolicitacoesPageParams {
  page: number;       // 0-based
  pageSize: number;
  status?: string;    // status filter (or "todas")
  search?: string;    // matches codigo via ILIKE
  clienteIds?: string[]; // optional: match by cliente_id (combined with search via OR)
  dateFrom?: string;  // ISO date string "YYYY-MM-DD"
  dateTo?: string;    // ISO date string "YYYY-MM-DD"
}

export interface SolicitacoesPage {
  data: SolicitacaoRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export async function fetchSolicitacoesPageable(
  params: SolicitacoesPageParams
): Promise<SolicitacoesPage> {
  const { page, pageSize, status, search, clienteIds, dateFrom, dateTo } = params;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("solicitacoes")
    .select("*", { count: "exact" })
    .order("data_solicitacao", { ascending: false })
    .range(from, to);

  if (status && status !== "todas") q = q.eq("status", status);

  // Search: match by codigo ILIKE OR by any matched cliente_id
  if (search && clienteIds && clienteIds.length > 0) {
    q = q.or(`codigo.ilike.%${search}%,cliente_id.in.(${clienteIds.join(",")})`);
  } else if (search) {
    q = q.ilike("codigo", `%${search}%`);
  } else if (clienteIds && clienteIds.length > 0) {
    q = q.in("cliente_id", clienteIds);
  }

  if (dateFrom) q = q.gte("data_solicitacao", dateFrom);
  if (dateTo) {
    // Include the full last day
    q = q.lte("data_solicitacao", `${dateTo}T23:59:59.999Z`);
  }

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);

  const total = count ?? 0;
  return {
    data: (data ?? []) as SolicitacaoRow[],
    total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  };
}

/** Lightweight count: only fetches the count of pending solicitações */
export async function fetchSolicitacoesPendentesCount(): Promise<number> {
  const { count, error } = await supabase
    .from("solicitacoes")
    .select("*", { count: "exact", head: true })
    .eq("status", "pendente");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function fetchSolicitacoesByCliente(
  clienteId: string
): Promise<SolicitacaoRow[]> {
  const { data, error } = await supabase
    .from("solicitacoes")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("data_solicitacao", { ascending: false });
  if (error) throw new Error(error.message);
  return data as SolicitacaoRow[];
}

export async function fetchSolicitacoesByEntregador(
  entregadorId: string
): Promise<SolicitacaoRow[]> {
  const { data, error } = await supabase
    .from("solicitacoes")
    .select("*")
    .eq("entregador_id", entregadorId)
    .order("data_solicitacao", { ascending: false });
  if (error) throw new Error(error.message);
  return data as SolicitacaoRow[];
}

export async function fetchSolicitacaoById(id: string): Promise<SolicitacaoRow> {
  const { data, error } = await supabase
    .from("solicitacoes")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data as SolicitacaoRow;
}

export async function createSolicitacao(
  input: SolicitacaoInsert
): Promise<SolicitacaoRow> {
  const { data, error } = await supabase
    .from("solicitacoes")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as SolicitacaoRow;
}

export async function updateSolicitacao(
  id: string,
  patch: SolicitacaoUpdate
): Promise<SolicitacaoRow> {
  const { data, error } = await supabase
    .from("solicitacoes")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as SolicitacaoRow;
}

// ── Rotas ─────────────────────────────────────────────────────────────────────

export async function fetchSolicitacoesByIds(ids: string[]): Promise<SolicitacaoRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("solicitacoes")
    .select("*")
    .in("id", ids);
  if (error) throw new Error(error.message);
  return data as SolicitacaoRow[];
}

export async function fetchRotasBySolicitacaoIds(ids: string[]): Promise<RotaRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("rotas")
    .select("*")
    .in("solicitacao_id", ids);
  if (error) throw new Error(error.message);
  return data as RotaRow[];
}

/**
 * Fetches rotas created after a given date (time-window).
 * Used by EntregasPage to avoid loading ALL rotas forever.
 */
export async function fetchRotasWindow(since: string): Promise<RotaRow[]> {
  const { data, error } = await supabase
    .from("rotas")
    .select("*")
    .gte("created_at", since);
  if (error) throw new Error(error.message);
  return data as RotaRow[];
}

export async function fetchRotasBySolicitacao(solId: string): Promise<RotaRow[]> {
  const { data, error } = await supabase
    .from("rotas")
    .select("*")
    .eq("solicitacao_id", solId);
  if (error) throw new Error(error.message);
  return data as RotaRow[];
}

export async function createRota(input: RotaInsert): Promise<RotaRow> {
  const { data, error } = await supabase
    .from("rotas")
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RotaRow;
}

export async function createRotas(inputs: RotaInsert[]): Promise<RotaRow[]> {
  if (inputs.length === 0) return [];
  const { data, error } = await supabase
    .from("rotas")
    .insert(inputs)
    .select();
  if (error) throw new Error(error.message);
  return (data ?? []) as RotaRow[];
}

export async function updateRota(
  id: string,
  patch: RotaUpdate
): Promise<RotaRow> {
  const { data, error } = await supabase
    .from("rotas")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RotaRow;
}

// ── Pagamentos ────────────────────────────────────────────────────────────────

export async function fetchAllPagamentos(): Promise<PagamentoRow[]> {
  const { data, error } = await supabase.from("pagamentos_solicitacao").select("*");
  if (error) throw new Error(error.message);
  return data as PagamentoRow[];
}

export async function fetchPagamentosBySolicitacao(
  solId: string
): Promise<PagamentoRow[]> {
  const { data, error } = await supabase
    .from("pagamentos_solicitacao")
    .select("*")
    .eq("solicitacao_id", solId);
  if (error) throw new Error(error.message);
  return data as PagamentoRow[];
}

export async function createPagamentos(
  pagamentos: PagamentoInsert[]
): Promise<PagamentoRow[]> {
  const { data, error } = await supabase
    .from("pagamentos_solicitacao")
    .insert(pagamentos)
    .select();
  if (error) throw new Error(error.message);
  return data as PagamentoRow[];
}

// ── Histórico ─────────────────────────────────────────────────────────────────

export async function fetchHistoricoBySolicitacao(
  solId: string
): Promise<HistoricoRow[]> {
  const { data, error } = await supabase
    .from("historico_solicitacoes")
    .select("*")
    .eq("solicitacao_id", solId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return data as HistoricoRow[];
}

export async function appendHistorico(
  solId: string,
  tipo: string,
  descricao: string,
  extra?: Partial<HistoricoRow>
): Promise<void> {
  const { error } = await supabase.from("historico_solicitacoes").insert({
    solicitacao_id: solId,
    tipo,
    descricao,
    status_anterior: "",
    status_novo: "",
    usuario_id: "",
    metadata: {},
    ...extra,
  });
  if (error) throw new Error(error.message);
}

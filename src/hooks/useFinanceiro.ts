/**
 * hooks/useFinanceiro.ts
 * React Query hooks para Despesas, Receitas, Categorias e Recargas.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchDespesas,
  createDespesa,
  updateDespesa,
  deleteDespesa,
  fetchReceitas,
  createReceita,
  updateReceita,
  deleteReceita,
  fetchCategorias,
  fetchRecargasByCliente,
  createRecarga,
  fetchDespesasRecorrentes,
  createDespesaRecorrente,
  updateDespesaRecorrente,
  deleteDespesaRecorrente,
  type DespesaRow,
  type DespesaInsert,
  type DespesaUpdate,
  type ReceitaRow,
  type ReceitaInsert,
  type ReceitaUpdate,
  type CategoriaRow,
  type RecargaRow,
  type RecargaInsert,
  type DespesaRecorrenteRow,
  type DespesaRecorrenteInsert,
  type DespesaRecorrenteUpdate,
} from "@/services/financeiro";

// ── Despesas ──────────────────────────────────────────────────────────────────

export function useDespesas() {
  return useQuery<DespesaRow[]>({
    queryKey: ["despesas"],
    queryFn: fetchDespesas,
  });
}

export function useCreateDespesa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DespesaInsert) => createDespesa(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["despesas"] }),
  });
}

export function useUpdateDespesa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: DespesaUpdate }) =>
      updateDespesa(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["despesas"] }),
  });
}

export function useDeleteDespesa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDespesa(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["despesas"] }),
  });
}

// ── Receitas ──────────────────────────────────────────────────────────────────

export function useReceitas() {
  return useQuery<ReceitaRow[]>({
    queryKey: ["receitas"],
    queryFn: fetchReceitas,
  });
}

export function useCreateReceita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReceitaInsert) => createReceita(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["receitas"] }),
  });
}

export function useUpdateReceita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ReceitaUpdate }) =>
      updateReceita(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["receitas"] }),
  });
}

export function useDeleteReceita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReceita(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["receitas"] }),
  });
}

// ── Categorias ────────────────────────────────────────────────────────────────

export function useCategorias() {
  return useQuery<CategoriaRow[]>({
    queryKey: ["categorias"],
    queryFn: fetchCategorias,
    staleTime: 10 * 60 * 1000,
  });
}

// ── Recargas pré-pago ─────────────────────────────────────────────────────────

export function useRecargasByCliente(clienteId: string) {
  return useQuery<RecargaRow[]>({
    queryKey: ["recargas", clienteId],
    queryFn: () => fetchRecargasByCliente(clienteId),
    enabled: Boolean(clienteId),
  });
}

export function useCreateRecarga() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RecargaInsert) => createRecarga(input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["recargas", data.cliente_id] });
      qc.invalidateQueries({ queryKey: ["saldo_pre_pago", data.cliente_id] });
      qc.invalidateQueries({ queryKey: ["saldos_pre_pago_all"] });
    },
  });
}

// ── Despesas Recorrentes ──────────────────────────────────────────────────────

export function useDespesasRecorrentes() {
  return useQuery<DespesaRecorrenteRow[]>({
    queryKey: ["despesas_recorrentes"],
    queryFn: fetchDespesasRecorrentes,
  });
}

export function useCreateDespesaRecorrente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DespesaRecorrenteInsert) => createDespesaRecorrente(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["despesas_recorrentes"] }),
  });
}

export function useUpdateDespesaRecorrente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: DespesaRecorrenteUpdate }) =>
      updateDespesaRecorrente(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["despesas_recorrentes"] }),
  });
}

export function useDeleteDespesaRecorrente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDespesaRecorrente(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["despesas_recorrentes"] }),
  });
}

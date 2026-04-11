/**
 * hooks/useClientes.ts
 * React Query hooks para Clientes e Tabela de Preços.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  fetchClientes,
  fetchClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
  fetchTabelaPrecosByCliente,
  upsertTabelaPreco,
  deleteTabelaPreco,
  fetchSaldoPrePago,
  fetchAllSaldosPrePago,
  type ClienteRow,
  type ClienteInsert,
  type ClienteUpdate,
  type TabelaPrecoInsert,
} from "@/services/clientes";

// ── Listagem ──────────────────────────────────────────────────────────────────

export function useClientes() {
  return useQuery<ClienteRow[]>({
    queryKey: ["clientes"],
    queryFn: fetchClientes,
  });
}

export function useClienteById(id: string) {
  return useQuery<ClienteRow>({
    queryKey: ["clientes", id],
    queryFn: () => fetchClienteById(id),
    enabled: Boolean(id),
  });
}

// ── Mutações ──────────────────────────────────────────────────────────────────

export function useCreateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClienteInsert) => createCliente(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes"] }),
  });
}

export function useUpdateCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ClienteUpdate }) =>
      updateCliente(id, patch),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      qc.invalidateQueries({ queryKey: ["clientes", id] });
    },
  });
}

export function useDeleteCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCliente(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clientes"] }),
  });
}

// ── Tabela de Preços ──────────────────────────────────────────────────────────

export function useTabelaPrecos(clienteId: string) {
  return useQuery({
    queryKey: ["tabela_precos", clienteId],
    queryFn: () => fetchTabelaPrecosByCliente(clienteId),
    enabled: Boolean(clienteId),
  });
}

export function useUpsertTabelaPreco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tp: TabelaPrecoInsert & { id?: string }) => upsertTabelaPreco(tp),
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ["tabela_precos", data.cliente_id] }),
  });
}

export function useDeleteTabelaPreco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, clienteId }: { id: string; clienteId: string }) => deleteTabelaPreco(id),
    onSuccess: (_, { clienteId }) =>
      qc.invalidateQueries({ queryKey: ["tabela_precos", clienteId] }),
  });
}

// ── Saldo pré-pago ────────────────────────────────────────────────────────────

export function useSaldoPrePago(clienteId: string) {
  return useQuery<number>({
    queryKey: ["saldo_pre_pago", clienteId],
    queryFn: () => fetchSaldoPrePago(clienteId),
    enabled: Boolean(clienteId),
  });
}

/**
 * Returns a lookup function `getClienteSaldo(clienteId) => number`.
 * Single query fetches all saldos; works in loops/DataTable columns.
 */
export function useClienteSaldoMap() {
  const { data: saldoMap = {} } = useQuery<Record<string, number>>({
    queryKey: ["saldos_pre_pago_all"],
    queryFn: fetchAllSaldosPrePago,
  });

  const getClienteSaldo = useCallback(
    (clienteId: string) => saldoMap[clienteId] ?? 0,
    [saldoMap]
  );

  return { saldoMap, getClienteSaldo };
}

/**
 * hooks/useEntregadores.ts
 * React Query hooks para Entregadores.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEntregadores,
  fetchEntregadoresAtivos,
  fetchEntregadorById,
  createEntregador,
  updateEntregador,
  deleteEntregador,
  type EntregadorRow,
  type EntregadorInsert,
  type EntregadorUpdate,
} from "@/services/entregadores";

export function useEntregadores() {
  return useQuery<EntregadorRow[]>({
    queryKey: ["entregadores"],
    queryFn: fetchEntregadores,
  });
}

export function useEntregadoresAtivos() {
  return useQuery<EntregadorRow[]>({
    queryKey: ["entregadores", "ativos"],
    queryFn: fetchEntregadoresAtivos,
  });
}

export function useEntregadorById(id: string) {
  return useQuery<EntregadorRow | null>({
    queryKey: ["entregadores", id],
    queryFn: () => fetchEntregadorById(id),
    enabled: Boolean(id),
  });
}

export function useCreateEntregador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EntregadorInsert) => createEntregador(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregadores"] }),
  });
}

export function useUpdateEntregador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: EntregadorUpdate }) =>
      updateEntregador(id, patch),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["entregadores"] });
      qc.invalidateQueries({ queryKey: ["entregadores", id] });
    },
  });
}

export function useDeleteEntregador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteEntregador(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entregadores"] }),
  });
}

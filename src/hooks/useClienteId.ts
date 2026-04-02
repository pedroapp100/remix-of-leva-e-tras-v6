import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MOCK_CLIENTES } from "@/data/mockClientes";

/**
 * Maps the logged-in user to their corresponding cliente ID and data.
 * Mock mapping: auth user id → cliente id
 */
const USER_TO_CLIENTE_MAP: Record<string, string> = {
  "mock-cliente-001": "cli-001", // João Silva (pré-pago)
  "mock-cliente-002": "cli-002", // Padaria Pão Quente (faturado)
};

export function useClienteId() {
  const { user } = useAuth();

  const clienteId = useMemo(() => {
    if (!user) return "cli-001"; // fallback
    return USER_TO_CLIENTE_MAP[user.id] ?? "cli-001";
  }, [user]);

  const cliente = useMemo(() => MOCK_CLIENTES.find((c) => c.id === clienteId), [clienteId]);

  return { clienteId, cliente };
}

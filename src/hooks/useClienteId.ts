import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { ClienteRow } from "@/services/clientes";

/**
 * Returns the cliente record linked to the currently authenticated user
 * via the `profile_id` foreign key on the `clientes` table.
 */
export function useClienteId() {
  const { user } = useAuth();

  const { data: cliente = null } = useQuery<ClienteRow | null>({
    queryKey: ["cliente_by_profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("clientes")
        .select("*")
        .eq("profile_id", user!.id)
        .maybeSingle();
      return (data as ClienteRow) ?? null;
    },
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
  });

  return { clienteId: cliente?.id ?? null, cliente };
}

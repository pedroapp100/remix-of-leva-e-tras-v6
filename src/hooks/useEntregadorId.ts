import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { EntregadorRow } from "@/services/entregadores";

/**
 * Returns the entregador record linked to the currently authenticated user
 * via the `profile_id` foreign key on the `entregadores` table.
 */
export function useEntregadorId() {
  const { user } = useAuth();

  const { data: entregador = null } = useQuery<EntregadorRow | null>({
    queryKey: ["entregador_by_profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("entregadores")
        .select("*")
        .eq("profile_id", user!.id)
        .maybeSingle();
      return (data as EntregadorRow) ?? null;
    },
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
  });

  return { entregadorId: entregador?.id ?? null, entregador };
}

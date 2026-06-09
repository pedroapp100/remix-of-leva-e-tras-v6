import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import type { EntregadorRow } from "@/services/entregadores";

/**
 * Returns the entregador record linked to the currently authenticated user
 * via the `profile_id` foreign key on the `entregadores` table.
 */
export function useEntregadorId() {
  const { user, impersonation } = useAuth();
  const effectiveProfileId = impersonation?.role === "entregador" ? impersonation.profileId : user?.id;

  const { data: entregador = null } = useQuery<EntregadorRow | null>({
    queryKey: ["entregador_by_profile", effectiveProfileId],
    queryFn: async () => {
      const { data } = await supabase
        .from("entregadores")
        .select("*")
        .eq("profile_id", effectiveProfileId!)
        .maybeSingle();
      return (data as EntregadorRow) ?? null;
    },
    enabled: Boolean(effectiveProfileId),
    staleTime: 5 * 60_000,
  });

  return { entregadorId: entregador?.id ?? null, entregador };
}

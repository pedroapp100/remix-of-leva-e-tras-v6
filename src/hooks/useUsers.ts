/**
 * hooks/useUsers.ts
 * React Query hooks para Usuários (profiles).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchProfiles,
  fetchAdminProfiles,
  fetchProfileById,
  updateProfile,
  deactivateProfile,
  type ProfileRow,
  type ProfileUpdate,
} from "@/services/users";

export function useProfiles() {
  return useQuery<ProfileRow[]>({
    queryKey: ["profiles"],
    queryFn: fetchProfiles,
  });
}

export function useAdminProfiles() {
  return useQuery<ProfileRow[]>({
    queryKey: ["profiles", "admin"],
    queryFn: fetchAdminProfiles,
  });
}

export function useProfileById(id: string) {
  return useQuery<ProfileRow>({
    queryKey: ["profiles", id],
    queryFn: () => fetchProfileById(id),
    enabled: Boolean(id),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ProfileUpdate }) =>
      updateProfile(id, patch),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
      qc.invalidateQueries({ queryKey: ["profiles", id] });
    },
  });
}

export function useDeactivateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateProfile(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
  });
}

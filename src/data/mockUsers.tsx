import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import type { UserAccount, Role } from "@/types/database";

// ── Seed data — maps to future auth.users + profiles ──
const INITIAL_USERS: UserAccount[] = [
  {
    id: "mock-admin-001",
    email: "admin@levaetraz.com",
    password: "admin123",
    nome: "Admin Leva e Traz",
    role: "admin",
    cargo_id: "cargo-1",
    status: "ativo",
    avatarUrl: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "mock-admin-002",
    email: "operador@levaetraz.com",
    password: "operador123",
    nome: "Maria Operadora",
    role: "admin",
    cargo_id: "cargo-2",
    status: "ativo",
    avatarUrl: null,
    created_at: "2025-01-15T00:00:00Z",
    updated_at: "2025-01-15T00:00:00Z",
  },
  {
    id: "mock-admin-003",
    email: "financeiro@levaetraz.com",
    password: "financeiro123",
    nome: "Pedro Financeiro",
    role: "admin",
    cargo_id: "cargo-3",
    status: "ativo",
    avatarUrl: null,
    created_at: "2025-02-01T00:00:00Z",
    updated_at: "2025-02-01T00:00:00Z",
  },
  {
    id: "mock-cliente-001",
    email: "cliente@levaetraz.com",
    password: "cliente123",
    nome: "João Silva",
    role: "cliente",
    cargo_id: null,
    status: "ativo",
    avatarUrl: null,
    created_at: "2025-01-10T00:00:00Z",
    updated_at: "2025-01-10T00:00:00Z",
  },
  {
    id: "mock-cliente-002",
    email: "faturado@levaetraz.com",
    password: "faturado123",
    nome: "Padaria Pão Quente",
    role: "cliente",
    cargo_id: null,
    status: "ativo",
    avatarUrl: null,
    created_at: "2025-02-01T00:00:00Z",
    updated_at: "2025-02-01T00:00:00Z",
  },
  {
    id: "mock-entregador-001",
    email: "entregador@levaetraz.com",
    password: "entregador123",
    nome: "Carlos Souza",
    role: "entregador",
    cargo_id: null,
    status: "ativo",
    avatarUrl: null,
    created_at: "2025-01-12T00:00:00Z",
    updated_at: "2025-01-12T00:00:00Z",
  },
];

// ── Context ──
interface UserStoreContextType {
  users: UserAccount[];
  addUser: (user: UserAccount) => void;
  updateUser: (id: string, data: Partial<Omit<UserAccount, "id">>) => void;
  deleteUser: (id: string) => void;
  findByEmail: (email: string) => UserAccount | undefined;
  getAdminUsers: () => UserAccount[];
}

const UserStoreContext = createContext<UserStoreContextType | null>(null);

export function UserStoreProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS);

  const addUser = useCallback((user: UserAccount) => {
    setUsers((prev) => [user, ...prev]);
  }, []);

  const updateUser = useCallback((id: string, data: Partial<Omit<UserAccount, "id">>) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, ...data, updated_at: new Date().toISOString() } : u
      )
    );
  }, []);

  const deleteUser = useCallback((id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const findByEmail = useCallback(
    (email: string) => users.find((u) => u.email.toLowerCase() === email.toLowerCase()),
    [users]
  );

  const getAdminUsers = useCallback(
    () => users.filter((u) => u.role === "admin"),
    [users]
  );

  const value = useMemo<UserStoreContextType>(
    () => ({ users, addUser, updateUser, deleteUser, findByEmail, getAdminUsers }),
    [users, addUser, updateUser, deleteUser, findByEmail, getAdminUsers]
  );

  return <UserStoreContext.Provider value={value}>{children}</UserStoreContext.Provider>;
}

export function useUserStore(): UserStoreContextType {
  const ctx = useContext(UserStoreContext);
  if (!ctx) throw new Error("useUserStore must be used within UserStoreProvider");
  return ctx;
}

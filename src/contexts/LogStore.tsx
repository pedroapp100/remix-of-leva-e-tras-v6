import { createContext, useContext, useCallback, useMemo, type ReactNode } from "react";
import type { LogEntry } from "@/types/database";
import type { Json } from "@/types/supabase";
import { supabase } from "@/lib/supabase";

type LogInput = Omit<LogEntry, "id" | "timestamp" | "usuario_id" | "usuario_nome">;

interface LogStoreContextType {
  addLog: (entry: LogInput) => void;
}

const LogStoreContext = createContext<LogStoreContextType | null>(null);

/** Resolve o ID do usuário via localStorage (Fix #13 — sem getSession() para evitar SDK hang). */
function resolveUserIdFromLocalStorage(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith("sb-") || !key.endsWith("-auth-token")) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { user?: { id?: string } };
      return parsed?.user?.id ?? null;
    }
  } catch {
    // localStorage indisponível ou JSON inválido
  }
  return null;
}

export function LogStoreProvider({ children }: { children: ReactNode }) {
  const addLog = useCallback((entry: LogInput) => {
    // Fire-and-forget insert — non-blocking, no state to manage
    void (async () => {
      try {
        // Lê ID do localStorage (0ms, sem lock do SDK — Fix #13)
        const userId = resolveUserIdFromLocalStorage();

        // Busca nome real do perfil (não email) para consistência com triggers do banco
        let usuarioNome = "Sistema";
        if (userId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("nome")
            .eq("id", userId)
            .single();
          if (profile?.nome) usuarioNome = profile.nome;
        }

        if (!userId) {
          console.warn("[LogStore] Usuário não resolvido; gravando log com fallback 'Sistema'.", {
            categoria: entry.categoria,
            acao: entry.acao,
            entidade_id: entry.entidade_id,
          });
        }

        const payload = {
          categoria: entry.categoria,
          acao: entry.acao,
          entidade_id: entry.entidade_id,
          descricao: entry.descricao,
          detalhes: (entry.detalhes as Json) ?? null,
          usuario_id: userId,
          usuario_nome: usuarioNome,
        };

        const { error: insertError } = await supabase.from("logs_auditoria").insert(payload);
        if (insertError) {
          console.error("[LogStore] Falha ao inserir log de auditoria:", {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
            payload,
          });
        }
      } catch (err) {
        console.error("[LogStore] Erro inesperado ao registrar log:", err, {
          categoria: entry.categoria,
          acao: entry.acao,
          entidade_id: entry.entidade_id,
        });
      }
    })();
  }, []);

  const value = useMemo(() => ({ addLog }), [addLog]);

  return <LogStoreContext.Provider value={value}>{children}</LogStoreContext.Provider>;
}

export function useLogStore(): LogStoreContextType {
  const ctx = useContext(LogStoreContext);
  if (!ctx) throw new Error("useLogStore must be used within LogStoreProvider");
  return ctx;
}

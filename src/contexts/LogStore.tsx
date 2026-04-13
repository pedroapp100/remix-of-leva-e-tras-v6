import { createContext, useContext, useCallback, useMemo, type ReactNode } from "react";
import type { LogEntry } from "@/types/database";
import type { Json } from "@/types/supabase";
import { supabase } from "@/lib/supabase";

type LogInput = Omit<LogEntry, "id" | "timestamp" | "usuario_id" | "usuario_nome">;

interface LogStoreContextType {
  addLog: (entry: LogInput) => void;
}

const LogStoreContext = createContext<LogStoreContextType | null>(null);

export function LogStoreProvider({ children }: { children: ReactNode }) {
  const addLog = useCallback((entry: LogInput) => {
    // Fire-and-forget insert — non-blocking, no state to manage
    void (async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("[LogStore] Falha ao obter sessão:", sessionError.message);
        }

        let user = sessionData?.session?.user ?? null;
        if (!user) {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError) {
            console.error("[LogStore] Falha ao resolver usuário autenticado:", userError.message);
          }
          user = userData?.user ?? null;
        }

        if (!user?.id) {
          console.warn("[LogStore] Usuário não resolvido via auth SDK; tentando gravar log com fallback 'Sistema'.", {
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
          usuario_id: user?.id ?? null,
          usuario_nome: user?.email ?? "Sistema",
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

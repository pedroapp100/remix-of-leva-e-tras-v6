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
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      await supabase.from("logs_auditoria").insert({
        categoria: entry.categoria,
        acao: entry.acao,
        entidade_id: entry.entidade_id,
        descricao: entry.descricao,
        detalhes: (entry.detalhes as Json) ?? null,
        usuario_id: user?.id ?? null,
        usuario_nome: user?.email ?? "Sistema",
      });
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

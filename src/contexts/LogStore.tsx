import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import type { LogEntry, LogCategoria } from "@/types/database";
import { mockLogs } from "@/data/mockLogs";

interface LogStoreContextType {
  logs: LogEntry[];
  addLog: (entry: Omit<LogEntry, "id" | "timestamp" | "usuario_id" | "usuario_nome">) => void;
}

const LogStoreContext = createContext<LogStoreContextType | null>(null);

export function LogStoreProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>(mockLogs);

  const addLog = useCallback(
    (entry: Omit<LogEntry, "id" | "timestamp" | "usuario_id" | "usuario_nome">) => {
      const newLog: LogEntry = {
        ...entry,
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        // TODO: replace with real auth user when Lovable Cloud is connected
        usuario_id: "admin-001",
        usuario_nome: "Carlos Admin",
      };
      setLogs((prev) => [newLog, ...prev]);
    },
    []
  );

  const value = useMemo(() => ({ logs, addLog }), [logs, addLog]);

  return <LogStoreContext.Provider value={value}>{children}</LogStoreContext.Provider>;
}

export function useLogStore(): LogStoreContextType {
  const ctx = useContext(LogStoreContext);
  if (!ctx) throw new Error("useLogStore must be used within LogStoreProvider");
  return ctx;
}

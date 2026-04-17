import { useEffect, useRef, useState, useCallback } from "react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff, Wifi } from "lucide-react";

/** Exibe `true` por `duration`ms após ser ativado, depois volta a `false`. */
function useTransientState(duration: number): [boolean, () => void] {
  const [active, setActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activate = useCallback(() => {
    setActive(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setActive(false), duration);
  }, [duration]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return [active, activate];
}

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const prevOnline = useRef(isOnline);
  const [showReconnected, activateReconnected] = useTransientState(3000);

  useEffect(() => {
    if (!prevOnline.current && isOnline) {
      activateReconnected();
    }
    prevOnline.current = isOnline;
  }, [isOnline, activateReconnected]);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-xs
                  rounded-xl px-4 py-3 shadow-xl flex items-center gap-3 text-sm font-medium
                  ${!isOnline
                    ? "bg-red-900/90 border border-red-700 text-red-100"
                    : "bg-emerald-900/90 border border-emerald-700 text-emerald-100"
                  }`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="size-4 shrink-0" aria-hidden="true" />
          <span>Sem conexão. Operando em modo offline.</span>
        </>
      ) : (
        <>
          <Wifi className="size-4 shrink-0" aria-hidden="true" />
          <span>Conexão restaurada.</span>
        </>
      )}
    </div>
  );
}

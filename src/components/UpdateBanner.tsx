import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X } from "lucide-react";

export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between gap-3
                 px-4 py-3 bg-primary text-primary-foreground text-sm font-medium shadow-lg"
    >
      <div className="flex items-center gap-2 min-w-0">
        <RefreshCw className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">
          Nova versão disponível! Clique para atualizar e ter a melhor experiência.
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => updateServiceWorker(true)}
          className="rounded-md bg-white/20 hover:bg-white/30 active:bg-white/40
                     px-3 py-1.5 text-xs font-semibold transition-colors"
        >
          Atualizar agora
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          aria-label="Fechar aviso de atualização"
          className="rounded p-1 hover:bg-white/20 active:bg-white/30 transition-colors"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

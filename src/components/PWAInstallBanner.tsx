import { useState } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { X, Download } from "lucide-react";

export function PWAInstallBanner() {
  const { canInstall, installApp } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div
      role="banner"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm
                 bg-slate-800 border border-slate-700 rounded-xl shadow-xl
                 flex items-center gap-3 px-4 py-3 text-sm text-slate-200"
    >
      <Download className="size-5 shrink-0 text-blue-400" aria-hidden="true" />
      <p className="flex-1 leading-snug">
        Instale o app para acesso rápido, mesmo sem internet.
      </p>
      <button
        onClick={installApp}
        className="shrink-0 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700
                   px-3 py-1.5 font-semibold text-white transition-colors"
      >
        Instalar
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Fechar"
        className="shrink-0 text-slate-400 hover:text-slate-200 transition-colors"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

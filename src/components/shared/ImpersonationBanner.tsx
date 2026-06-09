import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const ROLE_LABELS: Record<string, string> = {
  cliente: "Cliente",
  entregador: "Entregador",
};

export function ImpersonationBanner() {
  const { impersonation, stopImpersonation } = useAuth();
  const navigate = useNavigate();

  if (!impersonation) return null;

  const handleExit = () => {
    stopImpersonation();
    navigate("/admin");
  };

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-amber-950 shadow-md">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span>
          Visualizando como {ROLE_LABELS[impersonation.role] ?? impersonation.role}:{" "}
          <strong>{impersonation.nome}</strong>
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExit}
        className="h-7 gap-1.5 rounded-full bg-amber-950/10 px-3 text-amber-950 hover:bg-amber-950/20 hover:text-amber-950"
      >
        <X className="h-3.5 w-3.5" />
        Sair da visualização
      </Button>
    </div>
  );
}

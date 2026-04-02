import { useNavigate } from "react-router-dom";
import logoLevaTraz from "@/assets/logo-leva-e-traz.png";
import { Button } from "@/components/ui/button";

export function LandingNav() {
  const navigate = useNavigate();

  return (
    <nav className="relative z-20 border-b border-border/30 backdrop-blur-md bg-background/60">
      <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3">
          <img
            src={logoLevaTraz}
            alt="Leva e Traz"
            className="h-10 w-10 rounded-full object-contain ring-2 ring-primary/20"
          />
          <div>
            <span className="text-sm font-bold tracking-tight block">Leva e Traz</span>
            <span className="text-[10px] text-muted-foreground hidden sm:block uppercase tracking-widest">
              Entregas para o seu negócio
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="rounded-full text-xs px-4 hidden sm:inline-flex"
            size="sm"
            onClick={() => navigate("/login")}
          >
            Entrar
          </Button>
          <Button
            className="rounded-full text-xs px-5 shadow-lg shadow-primary/20"
            size="sm"
            onClick={() => navigate("/login")}
          >
            Solicitar Entrega
          </Button>
        </div>
      </div>
    </nav>
  );
}

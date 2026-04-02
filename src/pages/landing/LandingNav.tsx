import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const navLinks = [
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Segmentos", href: "#segmentos" },
];

export function LandingNav() {
  const navigate = useNavigate();

  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border/30 backdrop-blur-md bg-background/80">
      <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3">
          <img
            src="/45b310cd-c7a9-4a8e-90e6-79884be4ceb3.png"
            alt="Leva e Traz"
            className="h-20 w-20 rounded-full object-contain cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          />
        </div>

        {/* Nav links - hidden on mobile */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-accent"
            >
              {link.label}
            </button>
          ))}
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

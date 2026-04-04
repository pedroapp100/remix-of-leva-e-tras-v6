import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Funcionalidades", href: "#funcionalidades" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Depoimentos", href: "#depoimentos" },
  { label: "Segmentos", href: "#segmentos" },
];

export function LandingNav() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-border/20 backdrop-blur-xl bg-background/70">
        <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 h-16">
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <img
              src="/45b310cd-c7a9-4a8e-90e6-79884be4ceb3.png"
              alt="Leva e Traz"
              className="h-12 w-auto object-contain"
            />
            <span className="text-lg font-bold tracking-tight hidden sm:inline">
              Leva e Traz
            </span>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="relative px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300 rounded-lg group"
              >
                {link.label}
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-primary rounded-full group-hover:w-6 transition-all duration-300" />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              className="rounded-lg text-sm px-4 hidden sm:inline-flex font-medium"
              size="sm"
              onClick={() => navigate("/login")}
            >
              Entrar
            </Button>
            <Button
              className="rounded-lg text-sm px-5 shadow-lg shadow-primary/20 font-semibold"
              size="sm"
              onClick={() => navigate("/login")}
            >
              Solicitar Entrega
            </Button>
            <button
              className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 border-b border-border/20 bg-background/95 backdrop-blur-xl md:hidden"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="text-left px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

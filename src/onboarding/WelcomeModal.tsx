import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnboarding } from "./OnboardingContext";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Truck, Users, Package, Sparkles, X } from "lucide-react";

const WELCOME_KEY = "leva-traz-welcome-seen";

const portals = [
  {
    icon: Users,
    title: "Administrativo",
    desc: "Gerencie solicitações, clientes, entregadores, faturas e relatórios financeiros.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Package,
    title: "Cliente",
    desc: "Acompanhe suas entregas, saldos e histórico de solicitações.",
    color: "text-chart-3",
    bg: "bg-chart-3/10",
  },
  {
    icon: Truck,
    title: "Entregador",
    desc: "Veja suas corridas, comissões do dia e histórico de entregas.",
    color: "text-chart-4",
    bg: "bg-chart-4/10",
  },
];

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const { startTour, role } = useOnboarding();
  const location = useLocation();

  useEffect(() => {
    // Only show on portal root pages and if not seen before
    const isPortalRoot = ["/admin", "/cliente", "/entregador"].includes(location.pathname);
    if (!isPortalRoot) return;

    const seen = localStorage.getItem(WELCOME_KEY);
    if (!seen) {
      const timer = setTimeout(() => setOpen(true), 400);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  const handleStartTour = () => {
    localStorage.setItem(WELCOME_KEY, "true");
    setOpen(false);
    // Small delay so modal exit animation completes before tour starts
    setTimeout(() => startTour(), 450);
  };

  const handleSkip = () => {
    localStorage.setItem(WELCOME_KEY, "true");
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={handleSkip}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-lg rounded-2xl border bg-popover text-popover-foreground shadow-2xl shadow-black/30 overflow-hidden"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 350, damping: 30, mass: 0.8 }}
          >
            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-3 right-3 z-10 h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header gradient bar */}
            <div className="h-1.5 bg-gradient-to-r from-primary via-chart-3 to-chart-4" />

            {/* Content */}
            <div className="px-6 pt-6 pb-2">
              <motion.div
                className="flex items-center gap-2.5 mb-3"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.3 }}
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold leading-tight">Bem-vindo ao Leva e Traz!</h2>
                  <p className="text-xs text-muted-foreground">Sistema de gestão logística de entregas</p>
                </div>
              </motion.div>

              <motion.p
                className="text-sm text-muted-foreground leading-relaxed mb-5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                O Leva e Traz centraliza toda a operação de entregas — da solicitação ao faturamento.
                O sistema possui 3 portais especializados:
              </motion.p>

              {/* Portal cards */}
              <div className="space-y-2.5 mb-5">
                {portals.map((portal, i) => (
                  <motion.div
                    key={portal.title}
                    className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 p-3"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.08, duration: 0.3 }}
                  >
                    <div className={`h-9 w-9 shrink-0 rounded-lg ${portal.bg} flex items-center justify-center`}>
                      <portal.icon className={`h-4.5 w-4.5 ${portal.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{portal.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{portal.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 pb-5 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-xs text-muted-foreground"
              >
                Explorar sozinho
              </Button>
              <Button
                size="sm"
                onClick={handleStartTour}
                className="gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Iniciar tour guiado
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

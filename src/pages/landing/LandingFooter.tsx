import logoLevaTraz from "@/assets/logo-leva-e-traz.png";

export function LandingFooter() {
  return (
    <footer className="relative z-10 border-t border-border/30 py-10 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={logoLevaTraz} alt="Leva e Traz" className="h-16 w-16 rounded-full object-contain" />
          <div>
            <span className="font-semibold text-xl">Leva e Traz</span>
            <span className="text-muted-foreground block text-sm">
              Onde e quando você precisar!
            </span>
          </div>
        </div>
        <p className="text-muted-foreground text-base">
          © {new Date().getFullYear()} Leva e Traz — Entregas para o varejo
        </p>
      </div>
    </footer>
  );
}

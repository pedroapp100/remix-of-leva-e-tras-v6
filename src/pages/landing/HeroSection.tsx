import { useNavigate } from "react-router-dom";
import { ArrowRight, Zap, Store, Shield } from "lucide-react";
import heroDelivery from "@/assets/hero-delivery.jpg";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[88vh] sm:min-h-[92vh] flex items-center overflow-hidden">
      {/* Background image with cinematic overlay */}
      <div className="absolute inset-0">
        <img
          src={heroDelivery}
          alt="Entregador Leva e Traz em ação"
          className="w-full h-full object-cover object-center"
          width={1920}
          height={1080}
        />
        {/* Deep cinematic gradient from left */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <motion.div initial="hidden" animate="visible" className="max-w-2xl">
          {/* Pill badge */}
          <motion.div variants={fadeUp} custom={0}>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 backdrop-blur-md px-4 py-1.5 mb-8">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[11px] font-semibold tracking-[0.12em] uppercase text-primary">
                Entregas B2B para o varejo
              </span>
            </div>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-4xl sm:text-5xl lg:text-[3.5rem] xl:text-[4rem] font-bold tracking-tight leading-[1.06]"
          >
            Sua loja vende,{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-primary via-primary/85 to-primary/60 bg-clip-text text-transparent">
                a gente entrega.
              </span>
              {/* Underline accent */}
              <svg className="absolute -bottom-2 left-0 w-full h-3" viewBox="0 0 200 12" fill="none">
                <path d="M2 8 C50 2, 120 2, 198 8" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
              </svg>
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="mt-7 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg"
          >
            Somos o parceiro logístico de mais de{" "}
            <span className="text-foreground font-semibold">130 lojas</span> em Anápolis e região.
            Entregas rápidas, rastreamento em tempo real e controle total pelo painel.
          </motion.p>

          {/* CTA buttons */}
          <motion.div variants={fadeUp} custom={3} className="mt-10 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="rounded-xl gap-2.5 px-8 shadow-2xl shadow-primary/25 hover:shadow-primary/40 transition-all duration-500 font-semibold text-sm h-12"
              onClick={() => navigate("/login")}
            >
              Solicitar Entrega
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-xl font-semibold text-sm border-border/40 bg-card/20 backdrop-blur-md hover:bg-card/40 px-7 h-12"
              onClick={() => {
                const el = document.getElementById("como-funciona");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Como funciona
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div variants={fadeUp} custom={4} className="mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2.5">
                {["R", "C", "M", "S", "A"].map((letter, i) => (
                  <div
                    key={i}
                    className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/50 to-primary/20 border-2 border-background flex items-center justify-center text-[10px] font-bold text-primary-foreground shadow-sm"
                  >
                    {letter}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">+130</span> lojas confiam
              </p>
            </div>

            <div className="hidden sm:block h-8 w-px bg-border/50" />

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span>Entregas seguras</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span>Mesmo dia</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Floating card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-24 right-8 lg:right-20 z-10 hidden lg:flex items-center gap-4 bg-card/60 backdrop-blur-2xl rounded-2xl p-5 pr-7 border border-border/30 shadow-2xl shadow-black/10"
      >
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
          <Store className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold">Entregas super rápidas</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Seu cliente recebe no mesmo dia
          </p>
        </div>
      </motion.div>
    </section>
  );
}

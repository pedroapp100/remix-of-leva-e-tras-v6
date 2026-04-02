import { useNavigate } from "react-router-dom";
import { ArrowRight, Zap, Store } from "lucide-react";
import heroDelivery from "@/assets/hero-delivery.jpg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative z-10 min-h-[85vh] sm:min-h-[90vh] flex items-center overflow-hidden">
      {/* Full background image */}
      <div className="absolute inset-0">
        <img
          src={heroDelivery}
          alt="Entregador Leva e Traz em ação"
          className="w-full h-full object-cover object-center"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <motion.div initial="hidden" animate="visible" className="max-w-xl">
          <motion.div variants={fadeUp} custom={0}>
            <Badge
              variant="secondary"
              className="mb-6 rounded-full px-4 py-1.5 text-[10px] font-semibold tracking-[0.15em] uppercase border border-primary/30 bg-primary/10 text-primary backdrop-blur-sm"
            >
              <Store className="mr-1.5 h-3 w-3" />
              Entregas B2B para o varejo
            </Badge>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08]"
          >
            Sua loja vende,{" "}
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              a gente entrega.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-md"
          >
            Somos o parceiro logístico de mais de 130 lojas em Anápolis e região.
            Entregas rápidas, rastreamento em tempo real e controle total pelo app.
          </motion.p>

          <motion.div variants={fadeUp} custom={3} className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="rounded-full gap-2 px-8 shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 font-semibold text-sm"
              onClick={() => navigate("/login")}
            >
              Solicitar Entrega
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full font-semibold text-sm border-border/50 bg-background/20 backdrop-blur-sm hover:bg-background/40 px-6"
              onClick={() => {
                const el = document.getElementById("como-funciona");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Como funciona
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div variants={fadeUp} custom={4} className="mt-10 flex items-center gap-6">
            <div className="flex -space-x-2">
              {["R", "C", "M", "S"].map((letter, i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 border-2 border-background flex items-center justify-center text-[9px] font-bold text-primary-foreground"
                >
                  {letter}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">+130</span> lojas confiam na Leva e Traz
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Floating badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="absolute bottom-20 right-8 lg:right-16 z-10 hidden sm:flex items-center gap-3 bg-card/70 backdrop-blur-xl rounded-2xl p-4 pr-6 border border-border/30 shadow-2xl shadow-primary/10"
      >
        <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs font-semibold">Entregas super rápidas</p>
          <p className="text-[10px] text-muted-foreground">Seu cliente recebe no mesmo dia</p>
        </div>
      </motion.div>
    </section>
  );
}

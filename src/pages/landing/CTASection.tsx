import { useNavigate } from "react-router-dom";
import { ArrowRight, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="relative z-10 container mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card/60 to-primary/4 backdrop-blur-sm p-12 sm:p-16 text-center overflow-hidden"
      >
        <div className="absolute top-[-60px] right-[-60px] w-[200px] h-[200px] bg-primary/8 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-40px] left-[-40px] w-[150px] h-[150px] bg-primary/6 rounded-full blur-[60px]" />

        <div className="relative z-10">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary/30">
            <Store className="h-8 w-8 text-primary-foreground" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            Sua loja merece entregas de confiança
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-8">
            Junte-se a mais de 130 lojistas que já contam com a Leva e Traz para entregar rápido e com segurança.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              className="rounded-full gap-2 px-10 shadow-xl shadow-primary/25 font-semibold text-sm"
              onClick={() => navigate("/login")}
            >
              Começar agora
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full font-semibold text-sm px-8 border-primary/30"
              onClick={() => window.open("https://wa.me/5562999999999", "_blank")}
            >
              Falar no WhatsApp
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

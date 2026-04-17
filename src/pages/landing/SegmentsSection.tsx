import { Shirt, ShoppingBag, Gem, Gift, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const segments = [
  { icon: Shirt, label: "Roupas" },
  { icon: ShoppingBag, label: "Calçados" },
  { icon: Gem, label: "Acessórios" },
  { icon: Gift, label: "Presentes" },
  { icon: Package, label: "E-commerce" },
];

export function SegmentsSection() {
  return (
    <section id="segmentos" className="relative z-10 py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <Badge
            variant="secondary"
            className="mb-4 rounded-full px-4 py-1 text-[10px] uppercase tracking-[0.15em] border border-border/50"
          >
            Segmentos
          </Badge>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Quem atendemos
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
            Especialistas em entregas para o varejo de moda e acessórios em Anápolis.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-4"
        >
          {segments.map((seg) => (
            <div
              key={seg.label}
              className="flex items-center gap-3 rounded-full border border-white/20 bg-white/10 backdrop-blur-xl px-6 py-3 hover:border-primary/50 hover:bg-white/15 hover:shadow-lg hover:shadow-primary/15 transition-all duration-300 shadow-md shadow-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),inset_0_0_0_1px_rgba(255,255,255,0.05)] cursor-default"
            >
              <seg.icon className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{seg.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

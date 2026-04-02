import { Store, MapPin, Clock, Star } from "lucide-react";
import { motion } from "framer-motion";

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: 0.3 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const stats = [
  { label: "Lojas atendidas", value: "+130", icon: Store },
  { label: "Cidades cobertas", value: "Anápolis e Região", icon: MapPin },
  { label: "Entrega média", value: "45min", icon: Clock },
  { label: "Satisfação", value: "98%", icon: Star },
];

export function StatsSection() {
  return (
    <section className="relative z-10 py-2">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={scaleIn}
              custom={i}
              className="group rounded-xl border border-border/30 bg-card/40 backdrop-blur-sm px-5 py-6 text-center hover:border-primary/30 hover:bg-card/60 transition-all duration-300"
            >
              <div className="mx-auto mb-3 h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                <stat.icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {stat.value}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

import { Store, MapPin, Clock, Star } from "lucide-react";
import { motion } from "framer-motion";

const scaleIn = {
  hidden: { opacity: 0, scale: 0.88, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { delay: 0.2 + i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
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
    <section className="relative z-10 py-6">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={scaleIn}
              custom={i}
              className="group relative rounded-2xl border border-border/20 bg-card/30 backdrop-blur-md px-6 py-8 text-center overflow-hidden transition-all duration-500 hover:border-primary/40 hover:bg-card/50 hover:shadow-2xl hover:shadow-primary/10"
            >
              {/* Ambient glow on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-primary/8 rounded-full blur-[60px]" />
              </div>

              {/* Decorative line accent */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative">
                <div className="mx-auto mb-4 h-11 w-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center text-primary group-hover:from-primary group-hover:to-primary/80 group-hover:text-primary-foreground transition-all duration-500 group-hover:shadow-lg group-hover:shadow-primary/25 group-hover:scale-110">
                  <stat.icon className="h-[18px] w-[18px]" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight text-foreground">
                  {stat.value}
                </p>
                <p className="mt-1.5 text-[10px] text-muted-foreground/70 uppercase tracking-[0.2em] font-medium">
                  {stat.label}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

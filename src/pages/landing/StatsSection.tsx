import { Store, MapPin, Clock, Star } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

const stats = [
  { label: "Lojas atendidas", value: 130, prefix: "+", suffix: "", icon: Store },
  { label: "Cidades cobertas", value: null, display: "Anápolis e Região", icon: MapPin },
  { label: "Entrega média", value: 20, prefix: "", suffix: " min", icon: Clock },
  { label: "Satisfação", value: 98, prefix: "", suffix: "%", icon: Star },
];

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 1200;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [isInView, value]);

  return <span ref={ref}>{prefix}{display}{suffix}</span>;
}

export function StatsSection() {
  return (
    <section className="relative py-8 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="group relative rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-6 sm:p-8 text-center overflow-hidden transition-all duration-500 hover:border-primary/50 hover:bg-white/15 hover:shadow-2xl hover:shadow-primary/15 shadow-lg shadow-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),inset_0_0_0_1px_rgba(255,255,255,0.05)]"
            >
              {/* Glow effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/10 rounded-full blur-[50px]" />
              </div>

              {/* Top accent line */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[2px] rounded-full bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative">
                <div className="mx-auto mb-4 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-primary/25">
                  <stat.icon className="h-[18px] w-[18px]" />
                </div>
                <p className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight text-foreground">
                  {stat.value !== null ? (
                    <AnimatedNumber value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                  ) : (
                    stat.display
                  )}
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

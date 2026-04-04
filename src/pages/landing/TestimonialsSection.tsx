import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Carla Santos",
    role: "Dona da Boutique Essência",
    text: "Desde que contratamos a Leva e Traz, nossas entregas ficaram muito mais rápidas. Os clientes elogiam o tempo de entrega e o rastreamento em tempo real.",
    rating: 5,
  },
  {
    name: "Roberto Mendes",
    role: "Gerente da Calçados Prime",
    text: "A conciliação financeira é impecável. Todo mês recebo o relatório detalhado e não preciso me preocupar com nada. Recomendo para todo lojista.",
    rating: 5,
  },
  {
    name: "Ana Paula Oliveira",
    role: "Proprietária da Moda & Cia",
    text: "O suporte é muito atencioso. Qualquer problema é resolvido rapidamente. Já testei outros serviços e nenhum chega perto da Leva e Traz.",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section id="depoimentos" className="relative container mx-auto px-4 sm:px-6 py-16 sm:py-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-14"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-border/30 bg-muted/30 backdrop-blur-md px-4 py-1.5 mb-6">
          <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground">
            Depoimentos
          </span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          O que nossos clientes dizem
        </h2>
        <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
          Mais de 130 lojistas confiam na Leva e Traz para suas entregas diárias.
        </p>
      </motion.div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="group relative rounded-2xl border border-border/15 bg-card/20 backdrop-blur-md p-7 overflow-hidden transition-all duration-500 hover:border-primary/20 hover:bg-card/40 hover:shadow-xl hover:shadow-primary/5"
          >
            {/* Quote icon */}
            <Quote className="absolute top-5 right-5 h-8 w-8 text-primary/10 group-hover:text-primary/20 transition-colors duration-500" />

            {/* Stars */}
            <div className="flex gap-0.5 mb-4">
              {Array.from({ length: t.rating }).map((_, j) => (
                <Star key={j} className="h-3.5 w-3.5 fill-primary text-primary" />
              ))}
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed mb-6 relative z-10">
              "{t.text}"
            </p>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/40 to-primary/15 flex items-center justify-center text-xs font-bold text-primary-foreground border border-primary/20">
                {t.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <p className="text-sm font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

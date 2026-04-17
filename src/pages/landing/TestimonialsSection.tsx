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
    <section id="depoimentos" className="relative z-10 w-full bg-slate-100 py-16 sm:py-24">
      <div className="relative container mx-auto px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-14"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-4 py-1.5 mb-6">
          <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-500">
            Depoimentos
          </span>
        </div>
        <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900">
          O que nossos clientes dizem
        </h2>
        <p className="mt-4 text-sm sm:text-base text-slate-500 max-w-md mx-auto leading-relaxed">
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
            className="group relative rounded-2xl border border-slate-200 bg-white p-7 overflow-hidden transition-all duration-500 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 shadow-sm"
          >
            {/* Quote icon */}
            <Quote className="absolute top-5 right-5 h-8 w-8 text-slate-200 group-hover:text-slate-300 transition-colors duration-500" />

            {/* Stars */}
            <div className="flex gap-0.5 mb-4">
              {Array.from({ length: t.rating }).map((_, j) => (
                <Star key={j} className="h-3.5 w-3.5 fill-primary text-primary" />
              ))}
            </div>

            <p className="text-sm text-slate-600 leading-relaxed mb-6 relative z-10">
              "{t.text}"
            </p>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/40 to-primary/15 flex items-center justify-center text-xs font-bold text-white border border-primary/20">
                {t.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                <p className="text-xs text-slate-500">{t.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      </div>
    </section>
  );
}

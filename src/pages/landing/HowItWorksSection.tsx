import { UserPlus, Smartphone, Bike, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Cadastre sua loja",
    desc: "Faça o cadastro rápido e receba acesso ao painel do cliente.",
  },
  {
    icon: Smartphone,
    step: "02",
    title: "Solicite a entrega",
    desc: "Informe o destino e detalhes do pedido direto pelo app ou painel.",
  },
  {
    icon: Bike,
    step: "03",
    title: "Entregador a caminho",
    desc: "Nosso entregador coleta na sua loja e sai para a entrega. Acompanhe em tempo real.",
  },
  {
    icon: CheckCircle,
    step: "04",
    title: "Entrega confirmada",
    desc: "Cliente recebe e você é notificado na hora. Tudo registrado no sistema.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="relative z-10 container mx-auto px-4 sm:px-6 py-16 sm:py-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-14"
      >
        <Badge
          variant="secondary"
          className="mb-4 rounded-full px-4 py-1 text-[10px] uppercase tracking-[0.15em] border border-border/50"
        >
          Passo a passo
        </Badge>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Como funciona
        </h2>
        <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
          Em 4 passos simples sua loja já está entregando com a Leva e Traz.
        </p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        {steps.map((s, i) => (
          <motion.div
            key={s.step}
            variants={fadeUp}
            custom={i}
            className="relative text-center group"
          >
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-primary/30 to-transparent" />
            )}

            <div className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center group-hover:from-primary group-hover:to-primary/80 transition-all duration-500">
              <s.icon className="h-8 w-8 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
            </div>

            <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">
              Passo {s.step}
            </span>
            <h3 className="mt-2 text-sm font-semibold tracking-tight">{s.title}</h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed max-w-[220px] mx-auto">
              {s.desc}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

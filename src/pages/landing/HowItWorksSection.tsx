import { UserPlus, Smartphone, Bike, CheckCircle } from "lucide-react";
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

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="relative container mx-auto px-4 sm:px-6 py-20 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-border/30 bg-muted/30 backdrop-blur-md px-4 py-1.5 mb-6">
          <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground">
            Passo a passo
          </span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Como funciona
        </h2>
        <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
          Em 4 passos simples sua loja já está entregando com a Leva e Traz.
        </p>
      </motion.div>

      <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {/* Connector line (desktop) */}
        <div className="hidden lg:block absolute top-[52px] left-[12%] right-[12%] h-px bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20" />

        {steps.map((s, i) => (
          <motion.div
            key={s.step}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative text-center group"
          >
            {/* Step number circle */}
            <div className="relative mx-auto mb-5">
              <div className="h-[88px] w-[88px] mx-auto rounded-2xl bg-gradient-to-br from-card/80 to-card/40 border border-border/20 backdrop-blur-md flex items-center justify-center group-hover:border-primary/30 group-hover:shadow-xl group-hover:shadow-primary/10 transition-all duration-500">
                <s.icon className="h-8 w-8 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
              {/* Step number badge */}
              <div className="absolute -top-2 -right-2 h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shadow-lg shadow-primary/30">
                {s.step}
              </div>
            </div>

            <h3 className="text-sm font-semibold tracking-tight">{s.title}</h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed max-w-[200px] mx-auto">
              {s.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

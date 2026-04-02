import { Smartphone, Bell, MapPin, Receipt, Clock, Headphones } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const features = [
  {
    icon: Smartphone,
    title: "Solicite pelo App",
    desc: "Faça pedidos de entrega em segundos direto pelo painel do cliente. Sem ligações, sem complicação.",
    accent: "from-primary/20 to-primary/5",
  },
  {
    icon: Bell,
    title: "Notificações em Tempo Real",
    desc: "Receba alertas a cada etapa: coleta, em trânsito e entrega confirmada. Seu cliente sempre informado.",
    accent: "from-primary/15 to-primary/5",
  },
  {
    icon: MapPin,
    title: "Rastreamento ao Vivo",
    desc: "Acompanhe a localização exata do entregador no mapa em tempo real.",
    accent: "from-primary/20 to-primary/5",
  },
  {
    icon: Receipt,
    title: "Faturamento Transparente",
    desc: "Controle financeiro completo com faturas detalhadas, histórico e extrato mensal.",
    accent: "from-primary/15 to-primary/5",
  },
  {
    icon: Clock,
    title: "Entregas no Mesmo Dia",
    desc: "Agilidade que faz diferença. Seu cliente recebe o pedido em até 45 minutos na cidade.",
    accent: "from-primary/20 to-primary/5",
  },
  {
    icon: Headphones,
    title: "Suporte Dedicado",
    desc: "Equipe pronta para resolver qualquer imprevisto. Atendimento rápido e humanizado.",
    accent: "from-primary/15 to-primary/5",
  },
];

export function FeaturesSection() {
  return (
    <section className="relative z-10 container mx-auto px-4 sm:px-6 py-20 sm:py-28">
      {/* Section ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/4 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative text-center mb-16"
      >
        <Badge
          variant="secondary"
          className="mb-5 rounded-full px-5 py-1.5 text-[10px] uppercase tracking-[0.18em] border border-primary/20 bg-primary/8 text-primary font-semibold backdrop-blur-sm"
        >
          Para lojistas
        </Badge>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Tudo que sua loja precisa
        </h2>
        <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Ferramentas pensadas para o dia a dia do varejo. Solicite, acompanhe e controle suas entregas em um só lugar.
        </p>
        {/* Decorative line */}
        <div className="mx-auto mt-8 w-16 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {features.map((feat, i) => (
          <motion.div
            key={feat.title}
            variants={fadeUp}
            custom={i}
            className="group relative rounded-2xl border border-border/20 bg-card/25 backdrop-blur-md p-8 overflow-hidden transition-all duration-500 hover:border-primary/30 hover:bg-card/50 hover:shadow-2xl hover:shadow-primary/8 hover:-translate-y-1"
          >
            {/* Corner accent glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/0 group-hover:bg-primary/8 rounded-full blur-[50px] transition-all duration-700" />

            {/* Bottom edge glow */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/0 to-transparent group-hover:via-primary/30 transition-all duration-700" />

            <div className="relative">
              <div className={`mb-5 inline-flex rounded-xl bg-gradient-to-br ${feat.accent} p-3.5 text-primary border border-primary/10 group-hover:border-primary/30 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 group-hover:shadow-xl group-hover:shadow-primary/25 group-hover:scale-110`}>
                <feat.icon className="h-5 w-5" />
              </div>
              <h3 className="text-[15px] font-semibold tracking-tight">{feat.title}</h3>
              <p className="mt-2.5 text-[13px] text-muted-foreground/80 leading-relaxed">{feat.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

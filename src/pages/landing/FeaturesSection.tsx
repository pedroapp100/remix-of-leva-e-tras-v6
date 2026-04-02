import { Smartphone, Bell, MapPin, Receipt, Clock, Headphones } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const features = [
  {
    icon: Smartphone,
    title: "Solicite pelo App",
    desc: "Faça pedidos de entrega em segundos direto pelo painel do cliente. Sem ligações, sem complicação.",
  },
  {
    icon: Bell,
    title: "Notificações em Tempo Real",
    desc: "Receba alertas a cada etapa: coleta, em trânsito e entrega confirmada. Seu cliente sempre informado.",
  },
  {
    icon: MapPin,
    title: "Rastreamento ao Vivo",
    desc: "Acompanhe a localização exata do entregador no mapa em tempo real.",
  },
  {
    icon: Receipt,
    title: "Faturamento Transparente",
    desc: "Controle financeiro completo com faturas detalhadas, histórico e extrato mensal.",
  },
  {
    icon: Clock,
    title: "Entregas no Mesmo Dia",
    desc: "Agilidade que faz diferença. Seu cliente recebe o pedido em até 45 minutos na cidade.",
  },
  {
    icon: Headphones,
    title: "Suporte Dedicado",
    desc: "Equipe pronta para resolver qualquer imprevisto. Atendimento rápido e humanizado.",
  },
];

export function FeaturesSection() {
  return (
    <section className="relative z-10 container mx-auto px-4 sm:px-6 py-16 sm:py-24">
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
          Para lojistas
        </Badge>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Tudo que sua loja precisa
        </h2>
        <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
          Ferramentas pensadas para o dia a dia do varejo. Solicite, acompanhe e controle suas entregas em um só lugar.
        </p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {features.map((feat, i) => (
          <motion.div
            key={feat.title}
            variants={fadeUp}
            custom={i}
            className="group relative rounded-2xl border border-border/30 bg-card/30 backdrop-blur-sm p-7 hover:border-primary/30 hover:bg-card/60 transition-all duration-500 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/0 group-hover:bg-primary/5 rounded-full blur-2xl transition-all duration-500 -translate-y-1/2 translate-x-1/2" />

            <div className="relative">
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/20">
                <feat.icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold tracking-tight">{feat.title}</h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

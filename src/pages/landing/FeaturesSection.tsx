import { Smartphone, Bell, MapPin, Receipt, Clock, Headphones } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Smartphone,
    title: "Solicite pelo App",
    desc: "Faça pedidos de entrega em segundos direto pelo painel do cliente. Sem ligações, sem complicação.",
    gradient: "from-primary/20 via-primary/10 to-transparent",
  },
  {
    icon: Bell,
    title: "Notificações em Tempo Real",
    desc: "Receba alertas a cada etapa: coleta, em trânsito e entrega confirmada. Seu cliente sempre informado.",
    gradient: "from-primary/15 via-primary/8 to-transparent",
  },
  {
    icon: MapPin,
    title: "Rastreamento ao Vivo",
    desc: "Acompanhe a localização exata do entregador no mapa em tempo real.",
    gradient: "from-primary/20 via-primary/10 to-transparent",
  },
  {
    icon: Receipt,
    title: "Faturamento Transparente",
    desc: "Controle financeiro completo com faturas detalhadas, histórico e extrato mensal.",
    gradient: "from-primary/15 via-primary/8 to-transparent",
  },
  {
    icon: Clock,
    title: "Entregas no Mesmo Dia",
    desc: "Agilidade que faz diferença. Seu cliente recebe o pedido em até 45 minutos na cidade.",
    gradient: "from-primary/20 via-primary/10 to-transparent",
  },
  {
    icon: Headphones,
    title: "Suporte Dedicado",
    desc: "Equipe pronta para resolver qualquer imprevisto. Atendimento rápido e humanizado.",
    gradient: "from-primary/15 via-primary/8 to-transparent",
  },
];

export function FeaturesSection() {
  return (
    <section id="funcionalidades" className="relative z-10 w-full bg-slate-100 py-20 sm:py-28">
      <div className="relative container mx-auto px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative text-center mb-16"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 backdrop-blur-md px-4 py-1.5 mb-6">
          <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-primary">
            Para lojistas
          </span>
        </div>
        <h2 className="text-xl sm:text-3xl font-bold tracking-tight" style={{ color: '#141729' }}>
          Tudo que sua loja precisa
        </h2>
        <p className="mt-4 text-sm sm:text-base text-slate-500 max-w-lg mx-auto leading-relaxed">
          Ferramentas pensadas para o dia a dia do varejo. Solicite, acompanhe e controle suas entregas em um só lugar.
        </p>
        <div className="mx-auto mt-8 w-20 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      </motion.div>

      <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feat, i) => (
          <motion.div
            key={feat.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="group relative rounded-2xl border border-slate-200 bg-white p-7 sm:p-8 overflow-hidden transition-all duration-500 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5 shadow-sm"
          >
            {/* Corner glow on hover */}
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full blur-[60px] bg-primary/0 group-hover:bg-primary/8 transition-all duration-700 pointer-events-none" />

            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent group-hover:via-primary/25 transition-all duration-700" />

            <div className="relative">
              <div className={`mb-5 inline-flex rounded-xl bg-gradient-to-br ${feat.gradient} p-3.5 text-primary border border-primary/10 group-hover:border-primary/25 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 group-hover:shadow-xl group-hover:shadow-primary/20 group-hover:scale-110`}>
                <feat.icon className="h-5 w-5" />
              </div>
              <h3 className="text-[15px] font-semibold tracking-tight" style={{ color: '#141729' }}>{feat.title}</h3>
              <p className="mt-2.5 text-[13px] text-slate-500 leading-relaxed">{feat.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
      </div>
    </section>
  );
}

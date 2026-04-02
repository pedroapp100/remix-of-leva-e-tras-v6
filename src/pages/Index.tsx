import { useNavigate } from "react-router-dom";
import { Package, Truck, BarChart3, Shield, Zap, ArrowRight, MapPin, Users, Clock } from "lucide-react";
import logoLevaTraz from "@/assets/logo-leva-e-traz.png";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const features = [
  { icon: Package, title: "Gestão de Entregas", desc: "Controle total do pedido à conciliação financeira" },
  { icon: Truck, title: "Frota & Rotas", desc: "Atribua entregadores e acompanhe rotas em tempo real" },
  { icon: BarChart3, title: "Financeiro", desc: "Faturamento automático e lançamentos imutáveis" },
  { icon: Shield, title: "Controle de Acesso", desc: "Permissões granulares por módulo e perfil" },
  { icon: MapPin, title: "Rastreamento", desc: "Acompanhe cada entrega com precisão geográfica" },
  { icon: Users, title: "Multi-perfil", desc: "Painéis exclusivos para admin, cliente e entregador" },
];

const stats = [
  { label: "Entregas/mês", value: "12.480" },
  { label: "Clientes ativos", value: "347" },
  { label: "Tempo médio", value: "42min" },
  { label: "Conciliação", value: "99.8%" },
];

const Index = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-primary/8 rounded-full blur-[100px] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src={logoLevaTraz} alt="Leva e Traz" className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl object-contain" />
            <div>
              <span className="text-sm font-bold tracking-tight block">Leva e Traz</span>
              <span className="text-xs text-muted-foreground hidden sm:block">Plataforma Logística</span>
            </div>
          </div>
          <Button
            variant="outline"
            className="rounded-xl text-sm"
            size="sm"
            onClick={() => navigate("/login")}
          >
            Entrar
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10">
        <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-20 lg:py-28">
          <motion.div
            initial="hidden"
            animate="visible"
            className="max-w-3xl mx-auto text-center"
          >
            <motion.div variants={fadeUp} custom={0}>
              <Badge variant="secondary" className="mb-6 rounded-full px-4 py-1.5 text-xs font-medium tracking-wide uppercase border border-primary/20 bg-primary/5">
                <Zap className="mr-1.5 h-3 w-3 text-primary" />
                Leva e Traz v2.0
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl font-bold tracking-tight sm:text-5xl"
            >
              Logística last-mile{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                inteligente
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-6 max-w-xl mx-auto text-base text-muted-foreground leading-relaxed"
            >
              Plataforma completa para operações de entrega. Solicitações, 
              tarifação por cliente, conciliação financeira e controle de frota 
              em um único sistema.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <Button
                size="lg"
                className="rounded-xl gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all font-semibold"
                onClick={() => navigate("/login")}
              >
                Acessar Painel
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="rounded-xl font-semibold">
                Documentação
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 border-y border-border/50">
        <div className="container mx-auto grid grid-cols-2 lg:grid-cols-4 gap-px">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="bg-card/50 backdrop-blur-sm px-6 py-8 text-center group hover:bg-card/80 transition-all"
            >
              <p className="text-2xl font-bold tabular-nums tracking-tight text-primary">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 container mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl font-bold tracking-tight">
            Tudo que você precisa
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            Ferramentas completas para gerenciar sua operação logística de ponta a ponta
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              variants={fadeUp}
              custom={i}
              className="group rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm p-6 hover:border-primary/30 hover:bg-card/80 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
            >
              <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2.5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                <feat.icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold tracking-tight">{feat.title}</h3>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                {feat.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="relative z-10 container mx-auto px-4 sm:px-6 pb-12 sm:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/50 to-primary/5 backdrop-blur-sm p-10 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-[60px]" />
          <div className="relative z-10">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-primary/30">
              <Clock className="h-7 w-7 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-2">
              Comece agora mesmo
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
              Acesse a plataforma e otimize suas operações de entrega em minutos.
            </p>
            <Button
              size="lg"
              className="rounded-xl gap-2 shadow-lg shadow-primary/20 font-semibold"
              onClick={() => navigate("/login")}
            >
              Começar gratuitamente
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-8 text-center text-xs text-muted-foreground backdrop-blur-sm">
        Leva e Traz v2.0 — Sistema de Gestão Logística
      </footer>
    </div>
  );
};

export default Index;

import { useNavigate } from "react-router-dom";
import {
  Package,
  BarChart3,
  Shield,
  Zap,
  ArrowRight,
  MapPin,
  Users,
  Clock,
  Bike,
} from "lucide-react";
import logoLevaTraz from "@/assets/logo-leva-e-traz.png";
import heroDelivery from "@/assets/hero-delivery.jpg";
import footerDelivery from "@/assets/footer-delivery.jpg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

/* ── Animation variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: 0.3 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/* ── Data ── */
const features = [
  { icon: Package, title: "Gestão de Entregas", desc: "Controle total do pedido à conciliação financeira" },
  { icon: Bike, title: "Frota & Rotas", desc: "Atribua entregadores e acompanhe rotas em tempo real" },
  { icon: BarChart3, title: "Financeiro", desc: "Faturamento automático e lançamentos imutáveis" },
  { icon: Shield, title: "Controle de Acesso", desc: "Permissões granulares por módulo e perfil" },
  { icon: MapPin, title: "Rastreamento", desc: "Acompanhe cada entrega com precisão geográfica" },
  { icon: Users, title: "Multi-perfil", desc: "Painéis exclusivos para admin, cliente e entregador" },
];

const stats = [
  { label: "Entregas/mês", value: "12.480", icon: Package },
  { label: "Clientes ativos", value: "347", icon: Users },
  { label: "Tempo médio", value: "42min", icon: Clock },
  { label: "Conciliação", value: "99.8%", icon: Shield },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* ── Ambient background effects ── */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/6 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-primary/4 rounded-full blur-[120px] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 0.5px, transparent 0)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* ── Nav ── */}
      <nav className="relative z-20 border-b border-border/30 backdrop-blur-md bg-background/60">
        <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <img
              src={logoLevaTraz}
              alt="Leva e Traz"
              className="h-10 w-10 rounded-full object-contain ring-2 ring-primary/20"
            />
            <div>
              <span className="text-sm font-bold tracking-tight block">Leva e Traz</span>
              <span className="text-[10px] text-muted-foreground hidden sm:block uppercase tracking-widest">
                Plataforma Logística
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            className="rounded-full text-xs px-5 border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
            size="sm"
            onClick={() => navigate("/login")}
          >
            Entrar
          </Button>
        </div>
      </nav>

      {/* ── Hero — Full-width immersive ── */}
      <section className="relative z-10 min-h-[85vh] sm:min-h-[90vh] flex items-center overflow-hidden">
        {/* Full background image */}
        <div className="absolute inset-0">
          <img
            src={heroDelivery}
            alt="Entregador Leva e Traz em ação"
            className="w-full h-full object-cover object-center"
            width={1920}
            height={1080}
          />
          {/* Cinematic overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/40" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </div>

        {/* Content overlay */}
        <div className="relative z-10 container mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <motion.div initial="hidden" animate="visible" className="max-w-xl">
            <motion.div variants={fadeUp} custom={0}>
              <Badge
                variant="secondary"
                className="mb-6 rounded-full px-4 py-1.5 text-[10px] font-semibold tracking-[0.15em] uppercase border border-primary/30 bg-primary/10 text-primary backdrop-blur-sm"
              >
                <Zap className="mr-1.5 h-3 w-3" />
                Leva e Traz v2.0
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08]"
            >
              Logística last-mile{" "}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                inteligente
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-md"
            >
              Plataforma completa para operações de entrega. Solicitações,
              tarifação por cliente, conciliação financeira e controle de frota
              em um único sistema.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="rounded-full gap-2 px-8 shadow-2xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 font-semibold text-sm"
                onClick={() => navigate("/login")}
              >
                Acessar Painel
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full font-semibold text-sm border-border/50 bg-background/20 backdrop-blur-sm hover:bg-background/40 px-6"
              >
                Documentação
              </Button>
            </motion.div>

            {/* Trust indicators */}
            <motion.div variants={fadeUp} custom={4} className="mt-10 flex items-center gap-6">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 border-2 border-background flex items-center justify-center text-[9px] font-bold text-primary-foreground"
                  >
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">+340</span> empresas confiam
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* Floating badge — bottom right over image */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="absolute bottom-20 right-8 lg:right-16 z-10 hidden sm:flex items-center gap-3 bg-card/70 backdrop-blur-xl rounded-2xl p-4 pr-6 border border-border/30 shadow-2xl shadow-primary/10"
        >
          <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold">Entregas em tempo real</p>
            <p className="text-[10px] text-muted-foreground">Rastreamento completo do pedido à entrega</p>
          </div>
        </motion.div>
      </section>

      {/* ── Stats ── */}
      <section className="relative z-10 py-2">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={scaleIn}
                custom={i}
                className="group rounded-xl border border-border/30 bg-card/40 backdrop-blur-sm px-5 py-6 text-center hover:border-primary/30 hover:bg-card/60 transition-all duration-300"
              >
                <div className="mx-auto mb-3 h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <stat.icon className="h-4 w-4" />
                </div>
                <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground uppercase tracking-wider">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 container mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <Badge variant="secondary" className="mb-4 rounded-full px-4 py-1 text-[10px] uppercase tracking-[0.15em] border border-border/50">
            Funcionalidades
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Tudo que você precisa
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
            Ferramentas completas para gerenciar sua operação logística de ponta a ponta
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
              {/* Hover glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/0 group-hover:bg-primary/5 rounded-full blur-2xl transition-all duration-500 -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative">
                <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/20">
                  <feat.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold tracking-tight">{feat.title}</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  {feat.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 container mx-auto px-4 sm:px-6 pb-16 sm:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card/60 to-primary/4 backdrop-blur-sm p-12 sm:p-16 text-center overflow-hidden"
        >
          {/* Decorative circles */}
          <div className="absolute top-[-60px] right-[-60px] w-[200px] h-[200px] bg-primary/8 rounded-full blur-[80px]" />
          <div className="absolute bottom-[-40px] left-[-40px] w-[150px] h-[150px] bg-primary/6 rounded-full blur-[60px]" />

          <div className="relative z-10">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-primary/30">
              <Clock className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Comece agora mesmo
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-8">
              Acesse a plataforma e otimize suas operações de entrega em minutos.
            </p>
            <Button
              size="lg"
              className="rounded-full gap-2 px-10 shadow-xl shadow-primary/25 font-semibold text-sm"
              onClick={() => navigate("/login")}
            >
              Começar gratuitamente
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* ── Footer Image Banner ── */}
      <section className="relative z-10 w-full h-[550px] sm:h-[700px] overflow-hidden">
        <img
          src={footerDelivery}
          alt="Entregador Leva e Traz"
          className="w-full h-full object-cover object-center"
          loading="lazy"
          width={1920}
          height={640}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/70 to-transparent h-[40%]" />
        <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-background via-background/60 to-transparent" />
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-border/30 py-10 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoLevaTraz} alt="Leva e Traz" className="h-8 w-8 rounded-full object-contain" />
            <div>
              <span className="text-xs font-semibold">Leva e Traz</span>
              <span className="text-[10px] text-muted-foreground block">
                Onde e quando você precisar!
              </span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            v2.0 — Sistema de Gestão Logística
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

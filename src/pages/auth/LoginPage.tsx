import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { useAuth, ROLE_REDIRECTS } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, AlertCircle, Package, MapPin, BarChart3, Shield, Sun, Moon } from "lucide-react";
import { ButtonSpinner } from "@/components/shared/BrandedLoader";
import { MotoIcon } from "@/components/shared/MotoIcon";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

const MAX_ATTEMPTS_DISPLAY = 5;

const features = [
  { icon: Package, title: "Gestão de Entregas", desc: "Controle total das suas operações last-mile" },
  { icon: MapPin, title: "Rastreamento em Tempo Real", desc: "Acompanhe cada entrega com precisão" },
  { icon: BarChart3, title: "Relatórios Inteligentes", desc: "Dados e insights para decisões estratégicas" },
  { icon: Shield, title: "Segurança Avançada", desc: "Seus dados protegidos com criptografia" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, isBlocked, remainingAttempts } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const showDevHint = import.meta.env.DEV;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    const normalizedEmail = email.trim().toLowerCase();
    const result = loginSchema.safeParse({ email: normalizedEmail, password });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        errors[issue.path[0] as string] = issue.message;
      });
      setFieldErrors(errors);
      return;
    }

    try {
      const loginPromise = login(normalizedEmail, password, rememberMe);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 30000)
      );
      const { success, user, error: loginError } = await Promise.race([loginPromise, timeoutPromise]);
      if (success && user) {
        navigate(ROLE_REDIRECTS[user.role] || "/admin", { replace: true });
      } else {
        setError(loginError || "Erro desconhecido");
      }
    } catch (err) {
      console.error("[Login] handleSubmit error:", err);
      setError(err instanceof Error && err.message === "timeout"
        ? "Servidor demorou para responder. Verifique sua conexão."
        : "Erro inesperado ao fazer login.");
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1.2fr] bg-background">
      {/* ── Coluna Formulário ── */}
      <div className="flex items-center justify-center p-4 sm:p-6 md:p-12 relative bg-surface-sunken dark:bg-[hsl(230_40%_8%)]">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="absolute top-4 right-4 z-20 p-2.5 rounded-xl border border-border/50 bg-card/80 dark:bg-[hsl(230_30%_14%)] hover:bg-accent transition-colors"
          aria-label="Alternar tema"
        >
          {resolvedTheme === "dark" ? <Sun className="h-5 w-5 text-foreground" /> : <Moon className="h-5 w-5 text-foreground" />}
        </button>
        {/* Subtle glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/8 dark:bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-md space-y-8 relative z-10"
        >
          {/* Logo */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex items-center gap-3"
            >
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/25">
                <MotoIcon className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight block">Leva e Traz</span>
                <span className="text-sm text-muted-foreground">Plataforma Logística</span>
              </div>
            </motion.div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                Bem-vindo de volta
              </h1>
              <p className="text-base text-muted-foreground">
                Acesse sua conta para gerenciar suas operações
              </p>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-base text-destructive"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-base font-medium">Email</Label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 text-base rounded-xl border-border/60 bg-muted/40 dark:bg-[hsl(230_30%_8%)] dark:border-[hsl(230_25%_16%)] focus:bg-background dark:focus:bg-[hsl(230_30%_10%)] focus:border-primary/50 transition-all"
                  disabled={isBlocked}
                />
              </div>
              {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-base font-medium">Senha</Label>
                <Link to="/login/reset" className="text-sm text-primary hover:text-primary/80 transition-colors font-medium">
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 h-12 text-base rounded-xl border-border/60 bg-muted/40 dark:bg-[hsl(230_30%_8%)] dark:border-[hsl(230_25%_16%)] focus:bg-background dark:focus:bg-[hsl(230_30%_10%)] focus:border-primary/50 transition-all"
                  disabled={isBlocked}
                />
              </div>
              {fieldErrors.password && <p className="text-sm text-destructive">{fieldErrors.password}</p>}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="remember" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked === true)} />
              <Label htmlFor="remember" className="text-base font-normal cursor-pointer text-muted-foreground">
                Manter conectado
              </Label>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              disabled={loading || isBlocked}
            >
              {loading ? (
                <ButtonSpinner />
              ) : (
                "Entrar na plataforma"
              )}
            </Button>

            {isBlocked && (
              <p className="text-sm text-center text-destructive font-medium">
                Conta bloqueada temporariamente. Tente novamente em 5 minutos.
              </p>
            )}
            {!isBlocked && remainingAttempts < MAX_ATTEMPTS_DISPLAY && (
              <p className="text-sm text-center text-muted-foreground">
                {remainingAttempts} tentativa{remainingAttempts !== 1 ? "s" : ""} restante{remainingAttempts !== 1 ? "s" : ""}
              </p>
            )}
          </form>

          {/* Development hint (sem credenciais hardcoded) */}
          {showDevHint && (
            <div className="rounded-xl border border-border/50 bg-muted/20 dark:bg-[hsl(230_30%_12%)] dark:border-[hsl(230_25%_20%)] p-4 space-y-2">
              <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Ambiente de desenvolvimento
              </p>
              <p className="text-sm text-muted-foreground">
                Use credenciais de teste configuradas localmente (não exibidas na interface).
              </p>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Coluna Branding Premium ── */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 dark:from-primary/15 dark:via-[hsl(230_35%_10%)] dark:to-primary/5 border-l border-border">
        {/* Animated gradient orbs */}
        <div className="absolute top-20 right-20 h-72 w-72 rounded-full bg-primary/10 blur-[80px] animate-pulse" />
        <div className="absolute bottom-20 left-20 h-56 w-56 rounded-full bg-primary/8 blur-[60px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-primary/5 blur-[120px]" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-center space-y-10 max-w-lg"
          >
            {/* Hero icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4, type: "spring", stiffness: 200 }}
              className="mx-auto"
            >
              <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto shadow-2xl shadow-primary/30 rotate-3 hover:rotate-0 transition-transform duration-500">
                <MotoIcon className="h-12 w-12 text-primary-foreground" />
              </div>
            </motion.div>

            <div className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tight leading-tight">
                Logística last-mile{" "}
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  inteligente
                </span>
              </h2>
              <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
                Gerencie entregas, motoristas e clientes com uma plataforma completa e moderna.
              </p>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-2 gap-3">
              {features.map((feat, i) => (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
                  className="group rounded-xl border border-border/40 bg-card/50 dark:bg-[hsl(230_30%_14%)]/60 backdrop-blur-sm p-4 text-left hover:border-primary/30 hover:bg-card/80 dark:hover:bg-[hsl(230_30%_16%)]/80 transition-all duration-300"
                >
                  <feat.icon className="h-5 w-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-semibold mb-0.5">{feat.title}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{feat.desc}</p>
                </motion.div>
              ))}
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="flex items-center justify-center gap-8 pt-4"
            >
              {[
                { value: "1.2k+", label: "Entregas/mês" },
                { value: "99.9%", label: "Uptime" },
                { value: "340+", label: "Clientes ativos" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-xl font-bold text-primary tabular-nums">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

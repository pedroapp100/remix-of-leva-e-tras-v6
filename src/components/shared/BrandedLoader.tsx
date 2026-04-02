import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Package } from "lucide-react";
import { MotoIcon } from "@/components/shared/MotoIcon";

interface BrandedLoaderProps {
  /** Full-page centered loader */
  fullPage?: boolean;
  /** Show text below the spinner */
  text?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Loader animado "Leva e Traz" — motocicleta percorrendo uma estrada com pacotes.
 */
export function BrandedLoader({
  fullPage = false,
  text = "Carregando...",
  size = "md",
  className,
}: BrandedLoaderProps) {
  const sizeConfig = {
    sm: { width: "w-48", moto: 18, pkg: 10, roadH: "h-0.5", textSize: "text-xs", gap: "gap-2", dotSize: "h-1 w-1" },
    md: { width: "w-64", moto: 28, pkg: 14, roadH: "h-0.5", textSize: "text-sm", gap: "gap-3", dotSize: "h-1.5 w-1.5" },
    lg: { width: "w-80", moto: 36, pkg: 18, roadH: "h-1", textSize: "text-base", gap: "gap-4", dotSize: "h-2 w-2" },
  };

  const s = sizeConfig[size];

  const loader = (
    <div className={cn("flex flex-col items-center", s.gap, className)}>
      {/* Animation container */}
      <div className={cn("relative", s.width)}>
        {/* Floating packages behind the motorcycle */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute bottom-3"
            initial={{ opacity: 0, x: -10, y: 0 }}
            animate={{
              opacity: [0, 0.7, 0.7, 0],
              x: ["0%", "100%"],
              y: [0, -8, -4, 0],
            }}
            transition={{
              duration: 2.5,
              delay: i * 0.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Package
              size={s.pkg}
              className="text-primary/40"
            />
          </motion.div>
        ))}

        {/* Motorcycle driving across */}
        <motion.div
          className="relative z-10"
          animate={{
            x: ["0%", "85%", "0%"],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: [0.45, 0.05, 0.55, 0.95],
          }}
        >
          {/* Motorcycle body bounce */}
          <motion.div
            animate={{ y: [0, -2, 0, -1, 0], rotate: [0, -1.5, 0, 1.5, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="inline-flex items-center justify-center rounded-lg bg-primary p-1.5 shadow-lg shadow-primary/30">
              <MotoIcon
                className="text-primary-foreground"
                style={{ width: s.moto, height: s.moto }}
              />
            </div>
          </motion.div>

          {/* Exhaust particles */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={`smoke-${i}`}
              className={cn("absolute rounded-full bg-muted-foreground/20", s.dotSize)}
              style={{ bottom: "20%", left: -4 - i * 3 }}
              animate={{
                opacity: [0.4, 0],
                scale: [0.5, 1.5],
                x: [-2, -12],
                y: [0, -6],
              }}
              transition={{
                duration: 0.8,
                delay: i * 0.2,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          ))}
        </motion.div>

        {/* Road */}
        <div className={cn("w-full rounded-full bg-border mt-1", s.roadH)} />

        {/* Road dashes */}
        <div className="relative w-full mt-0.5 overflow-hidden h-px">
          <motion.div
            className="flex gap-2 absolute"
            animate={{ x: [0, -20] }}
            transition={{ duration: 0.4, repeat: Infinity, ease: "linear" }}
          >
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="h-px w-2 bg-muted-foreground/30 shrink-0" />
            ))}
          </motion.div>
        </div>
      </div>

      {/* Animated text with dots */}
      {text && (
        <div className={cn("flex items-center", s.gap)}>
          <span className={cn(s.textSize, "text-muted-foreground font-medium")}>
            {text}
          </span>
          <span className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className={cn("rounded-full bg-primary", s.dotSize)}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{
                  duration: 1,
                  delay: i * 0.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </span>
        </div>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.18 }}
        >
          {loader}
        </motion.div>
      </div>
    );
  }

  return loader;
}

/**
 * Spinner inline para botões (ex: botão de login).
 */
export function ButtonSpinner({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn("flex items-center gap-2", className)}
      initial={{ opacity: 0, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        animate={{
          x: [0, 2, 0, -2, 0],
          y: [0, -1, 0, -1, 0],
          rotate: [0, -4, 0, 4, 0],
        }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <MotoIcon className="h-[18px] w-[18px] text-primary-foreground" />
      </motion.div>
      <motion.span
        className="text-primary-foreground text-sm font-medium"
        animate={{ opacity: [1, 0.65, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        Entrando...
      </motion.span>
    </motion.div>
  );
}

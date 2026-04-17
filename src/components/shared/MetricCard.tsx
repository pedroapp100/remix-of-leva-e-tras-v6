import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  delta?: number;
  deltaLabel?: string;
  loading?: boolean;
  className?: string;
  valueColor?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  delta,
  deltaLabel,
  loading = false,
  className,
  valueColor,
}: MetricCardProps) {
  const safeValue = value === undefined || value === null || (typeof value === "number" && isNaN(value)) ? "0" : value;
  const safeDelta = delta !== undefined && !isNaN(delta) ? delta : undefined;

  if (loading) {
    return (
      <div className={cn("rounded-lg border border-border bg-card p-5 shadow-sm", className)}>
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
        </div>
        <div className="h-8 w-20 rounded bg-muted animate-pulse mb-1" />
        <div className="h-3 w-32 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn("rounded-lg border border-border bg-card p-5 shadow-sm", className)}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {Icon && (
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4.5 w-4.5 text-primary" />
          </div>
        )}
      </div>
      <p className={cn("text-xl sm:text-2xl font-bold tracking-tight tabular-nums", valueColor)}>{safeValue}</p>
      <div className="flex items-center gap-2 mt-1">
        {safeDelta !== undefined && (
          <span
            className={cn(
              "text-xs font-medium tabular-nums",
              safeDelta > 0 ? "text-emerald-600 dark:text-emerald-400" : safeDelta < 0 ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {safeDelta > 0 ? "+" : ""}
            {safeDelta}%
          </span>
        )}
        {(subtitle || deltaLabel) && (
          <span className="text-xs text-muted-foreground">{deltaLabel || subtitle}</span>
        )}
      </div>
    </motion.div>
  );
}

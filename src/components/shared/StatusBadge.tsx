import { cn } from "@/lib/utils";
import { StatusSolicitacao, StatusGeral, StatusDespesa } from "@/types/database";

type StatusType = StatusSolicitacao | StatusGeral | StatusDespesa | string;

const statusConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  // Solicitação
  pendente: { bg: "bg-status-pending/10", text: "text-status-pending", border: "border-status-pending/25", dot: "bg-status-pending" },
  aceita: { bg: "bg-status-accepted/10", text: "text-status-accepted", border: "border-status-accepted/25", dot: "bg-status-accepted" },
  em_andamento: { bg: "bg-status-in-progress/10", text: "text-status-in-progress", border: "border-status-in-progress/25", dot: "bg-status-in-progress" },
  concluida: { bg: "bg-status-completed/10", text: "text-status-completed", border: "border-status-completed/25", dot: "bg-status-completed" },
  cancelada: { bg: "bg-status-cancelled/10", text: "text-status-cancelled", border: "border-status-cancelled/25", dot: "bg-status-cancelled" },
  rejeitada: { bg: "bg-status-rejected/10", text: "text-status-rejected", border: "border-status-rejected/25", dot: "bg-status-rejected" },
  // Geral
  Aberta: { bg: "bg-status-pending/10", text: "text-status-pending", border: "border-status-pending/25", dot: "bg-status-pending" },
  Fechada: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", dot: "bg-muted-foreground" },
  Paga: { bg: "bg-status-completed/10", text: "text-status-completed", border: "border-status-completed/25", dot: "bg-status-completed" },
  Finalizada: { bg: "bg-status-completed/10", text: "text-status-completed", border: "border-status-completed/25", dot: "bg-status-completed" },
  Vencida: { bg: "bg-status-overdue/10", text: "text-status-overdue", border: "border-status-overdue/25", dot: "bg-status-overdue" },
  // Despesa
  Pendente: { bg: "bg-status-pending/10", text: "text-status-pending", border: "border-status-pending/25", dot: "bg-status-pending" },
  Atrasado: { bg: "bg-status-overdue/10", text: "text-status-overdue", border: "border-status-overdue/25", dot: "bg-status-overdue" },
  Pago: { bg: "bg-status-completed/10", text: "text-status-completed", border: "border-status-completed/25", dot: "bg-status-completed" },
  // Generic
  ativo: { bg: "bg-status-completed/10", text: "text-status-completed", border: "border-status-completed/25", dot: "bg-status-completed" },
  inativo: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", dot: "bg-muted-foreground" },
  bloqueado: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/25", dot: "bg-destructive" },
  // Caixa entregador
  aberto: { bg: "bg-status-in-progress/10", text: "text-status-in-progress", border: "border-status-in-progress/25", dot: "bg-status-in-progress" },
  fechado: { bg: "bg-status-completed/10", text: "text-status-completed", border: "border-status-completed/25", dot: "bg-status-completed" },
  divergente: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/25", dot: "bg-destructive" },
};

const fallbackConfig = { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", dot: "bg-muted-foreground" };

const statusLabelMap: Record<string, string> = {
  pendente: "Pendente",
  aceita: "Aceita",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
  rejeitada: "Rejeitada",
  ativo: "Ativo",
  inativo: "Inativo",
  bloqueado: "Bloqueado",
  aberto: "Aberto",
  fechado: "Fechado",
  divergente: "Divergente",
};

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status] || fallbackConfig;
  const displayLabel = label || statusLabelMap[status] || status;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dot)} />
      {displayLabel}
    </span>
  );
}

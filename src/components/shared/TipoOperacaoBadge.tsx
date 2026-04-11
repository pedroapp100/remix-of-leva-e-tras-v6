import { Badge } from "@/components/ui/badge";
import { useTiposOperacao } from "@/hooks/useSettings";
import type { TipoOperacaoConfig } from "@/types/database";

// Fallback helpers when called outside React (e.g. in column definitions — prefer using the component)
export function getTipoOperacaoLabel(id: string): string { return id; }
export function getTipoOperacaoCor(id: string): string { return "#6b7280"; }

interface TipoOperacaoBadgeProps {
  tipoOperacao: string;
  className?: string;
}

export function TipoOperacaoBadge({ tipoOperacao, className }: TipoOperacaoBadgeProps) {
  const { data: tipos = [] } = useTiposOperacao();
  const tipo = tipos.find((t) => t.id === tipoOperacao);
  const cor = tipo?.cor ?? "#6b7280";
  const label = tipo?.nome ?? tipoOperacao;

  return (
    <Badge
      variant="outline"
      className={className}
      style={{
        backgroundColor: `${cor}15`,
        color: cor,
        borderColor: `${cor}40`,
      }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full mr-1.5 shrink-0"
        style={{ backgroundColor: cor }}
      />
      {label}
    </Badge>
  );
}

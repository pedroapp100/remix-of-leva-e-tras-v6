import { Badge } from "@/components/ui/badge";
import { MOCK_TIPOS_OPERACAO } from "@/data/mockSettings";
import type { TipoOperacaoConfig } from "@/types/database";

const tipoMap = new Map<string, TipoOperacaoConfig>(
  MOCK_TIPOS_OPERACAO.map((t) => [t.id, t])
);

export function getTipoOperacaoConfig(id: string): TipoOperacaoConfig | undefined {
  return tipoMap.get(id);
}

export function getTipoOperacaoLabel(id: string): string {
  return tipoMap.get(id)?.nome ?? id;
}

export function getTipoOperacaoCor(id: string): string {
  return tipoMap.get(id)?.cor ?? "#6b7280";
}

interface TipoOperacaoBadgeProps {
  tipoOperacao: string;
  className?: string;
}

export function TipoOperacaoBadge({ tipoOperacao, className }: TipoOperacaoBadgeProps) {
  const cor = getTipoOperacaoCor(tipoOperacao);
  const label = getTipoOperacaoLabel(tipoOperacao);

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

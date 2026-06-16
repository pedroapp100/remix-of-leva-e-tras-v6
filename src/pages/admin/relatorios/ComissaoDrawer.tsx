import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ComissaoCalculada } from "@/hooks/useComissao";
import {
  calcularProgressoFaixa,
  useComissaoFaixas,
} from "@/hooks/useComissaoFaixas";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import type { ComissaoFaixa } from "@/types/database";
import { Check, TrendingUp } from "lucide-react";
import type { DateRange } from "react-day-picker";

interface ComissaoDrawerProps {
  comissao: ComissaoCalculada | null;
  open: boolean;
  onClose: () => void;
  dateRange?: DateRange;
}

function getInitials(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function getTipoLabel(comissao: ComissaoCalculada): string {
  if (comissao.tipo_comissao === "percentual") return `${comissao.taxa}% sobre receita`;
  if (comissao.tipo_comissao === "fixo") return `R$ ${comissao.taxa}/entrega`;
  return comissao.meta_modo_calculo === "escalonado" ? "Meta Escalonada" : "Meta por Faixa Máxima";
}

function getPeriodLabel(dateRange?: DateRange): string {
  if (!dateRange?.from) return "Mês atual";
  const from = formatDateBR(dateRange.from);
  const to = dateRange.to ? formatDateBR(dateRange.to) : "...";
  return `${from} — ${to}`;
}

function faixaRange(de: number, ate: number): string {
  return ate >= 9999 ? `${de}+` : `${de} – ${ate}`;
}

interface MetaFaixasSectionProps {
  entregadorId: string;
  totalEntregas: number;
}

function MetaFaixasSection({ entregadorId, totalEntregas }: MetaFaixasSectionProps) {
  const { data: faixas = [], isLoading } = useComissaoFaixas(entregadorId);

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-lg bg-muted" />;
  }

  if (faixas.length === 0) return null;

  const { faixaAtual, proximaFaixa, entregasFaltam, percentualProxima } =
    calcularProgressoFaixa(totalEntregas, faixas);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Faixas de Meta</p>
      <div className="rounded-lg border divide-y divide-border overflow-hidden">
        {faixas.map((faixa: ComissaoFaixa) => {
          const isAtual = faixaAtual?.id === faixa.id;
          return (
            <div
              key={`${faixa.entregador_id}-${faixa.de}`}
              className={`flex items-center justify-between px-3 py-2.5 text-sm transition-colors ${
                isAtual ? "bg-primary/10" : ""
              }`}
            >
              <span className={isAtual ? "text-primary font-medium" : "text-muted-foreground"}>
                {faixaRange(faixa.de, faixa.ate)} entregas
              </span>
              <div className="flex items-center gap-2">
                <span className={`tabular-nums ${isAtual ? "text-primary font-semibold" : ""}`}>
                  {formatCurrency(faixa.valor_por_entrega)}/ent.
                </span>
                {isAtual && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
              </div>
            </div>
          );
        })}
      </div>

      {proximaFaixa ? (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso para próxima faixa</span>
            <span className="tabular-nums font-medium">{entregasFaltam} entregas restantes</span>
          </div>
          <Progress value={percentualProxima} className="h-2" />
        </div>
      ) : (
        <p className="text-xs text-primary font-medium text-center py-1">
          ✓ Faixa máxima atingida
        </p>
      )}
    </div>
  );
}

export function ComissaoDrawer({ comissao, open, onClose, dateRange }: ComissaoDrawerProps) {
  if (!comissao) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent className="w-full sm:w-[420px] overflow-y-auto flex flex-col gap-0 p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle>Detalhes da Comissão</SheetTitle>
        </SheetHeader>

        <div className="px-6 pb-6 space-y-5">
          {/* Avatar + nome + tipo */}
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary/20 text-primary font-semibold text-base">
                {getInitials(comissao.nome)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-base leading-tight truncate">{comissao.nome}</p>
              <Badge variant="outline" className="mt-1.5 text-xs">
                {comissao.tipo_comissao === "percentual"
                  ? `${comissao.taxa}%`
                  : comissao.tipo_comissao === "fixo"
                  ? `R$ ${comissao.taxa}/entrega`
                  : comissao.meta_modo_calculo === "escalonado"
                  ? "Meta (Esc.)"
                  : "Meta (Fx.)"}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Métricas */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold tabular-nums">{comissao.entregas}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Entregas</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-sm font-bold tabular-nums leading-tight">{formatCurrency(comissao.valor_gerado)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Val. Gerado</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-sm font-bold tabular-nums text-emerald-500 leading-tight">{formatCurrency(comissao.comissao)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Comissão</p>
            </div>
          </div>

          <Separator />

          {/* Faixas de meta ou taxa simples */}
          {comissao.tipo_comissao === "meta" ? (
            <MetaFaixasSection
              entregadorId={comissao.entregador_id}
              totalEntregas={comissao.entregas}
            />
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">Taxa de Comissão</p>
              <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
                <TrendingUp className="h-4 w-4 text-primary shrink-0" />
                <span className="text-base font-semibold">{getTipoLabel(comissao)}</span>
              </div>
            </div>
          )}

          <Separator />

          {/* Período */}
          <p className="text-xs text-muted-foreground text-center">
            Período:{" "}
            <span className="font-medium text-foreground">{getPeriodLabel(dateRange)}</span>
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

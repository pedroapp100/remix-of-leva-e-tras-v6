import { useMemo, useState } from "react";
import { isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/shared/DatePickerWithRange";
import type { Fatura, EntregaFatura } from "@/types/database";
import { formatCurrency } from "@/lib/formatters";
import { CalendarRange, ArrowRight } from "lucide-react";

interface Props {
  fatura: Fatura;
  entregas: EntregaFatura[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (dataInicio: Date, dataFim: Date) => Promise<void> | void;
  loading?: boolean;
}

export function FecharFaturaPeriodoDialog({ fatura, entregas, open, onOpenChange, onConfirm, loading }: Props) {
  const [range, setRange] = useState<DateRange | undefined>();

  const { dentro, fora } = useMemo(() => {
    if (!range?.from || !range?.to) {
      return { dentro: [] as EntregaFatura[], fora: entregas };
    }
    const inicio = startOfDay(range.from);
    const fim = endOfDay(range.to);
    const dentro: EntregaFatura[] = [];
    const fora: EntregaFatura[] = [];
    for (const entrega of entregas) {
      const data = parseISO(entrega.data_conclusao);
      if (isWithinInterval(data, { start: inicio, end: fim })) {
        dentro.push(entrega);
      } else {
        fora.push(entrega);
      }
    }
    return { dentro, fora };
  }, [entregas, range]);

  const valorDentro = dentro.reduce((s, e) => s + e.valor_taxas - e.valor_recebido_cliente, 0);
  const valorFora = fora.reduce((s, e) => s + e.valor_taxas - e.valor_recebido_cliente, 0);
  const canSubmit = Boolean(range?.from && range?.to) && dentro.length > 0 && !loading;

  const handleSubmit = async () => {
    if (!range?.from || !range?.to || dentro.length === 0) return;
    await onConfirm(range.from, range.to);
    setRange(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" />
            Fechar por Período
          </DialogTitle>
          <DialogDescription>
            Selecione o intervalo de datas das solicitações concluídas que devem ser fechadas agora.
            As demais continuam na fatura <strong>{fatura.numero}</strong>, ainda aberta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <DatePickerWithRange value={range} onChange={setRange} className="w-full" />

          {range?.from && range?.to && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {dentro.length} solicitaç{dentro.length === 1 ? "ão" : "ões"} serão transferidas
                  </p>
                  <p className="text-xs text-muted-foreground">Vão para uma fatura nova, já fechada, aguardando pagamento</p>
                </div>
                <p className="text-sm font-semibold tabular-nums">{formatCurrency(valorDentro)}</p>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {fora.length} solicitaç{fora.length === 1 ? "ão" : "ões"} continuam na fatura {fatura.numero}
                  </p>
                  <p className="text-xs text-muted-foreground">Fatura permanece aberta, recebendo novas entregas</p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-muted-foreground">{formatCurrency(valorFora)}</p>
              </div>
              {dentro.length === 0 && (
                <p className="text-xs text-destructive">Nenhuma solicitação concluída nesse período.</p>
              )}
              <p className="text-xs text-muted-foreground">
                Os números finais são recalculados no servidor ao confirmar.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {loading ? (
              "Fechando..."
            ) : (
              <>
                Confirmar fechamento de {dentro.length}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useMemo, lazy, Suspense } from "react";
import { DataTable } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import type { Fatura, Receita } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import { FileText, Eye } from "lucide-react";
const FaturaDetailsModal = lazy(() => import("@/pages/admin/faturas/FaturaDetailsModal").then(m => ({ default: m.FaturaDetailsModal })));

interface ReceitasTabProps {
  faturas: Fatura[];
  receitas: Receita[];
}

export function ReceitasTab({ faturas = [], receitas = [] }: ReceitasTabProps) {
  const [viewingFatura, setViewingFatura] = useState<Fatura | null>(null);

  const faturasRecebidas = faturas.filter(
    (f) => f.status_geral === "Paga" || f.status_geral === "Finalizada",
  );

  // Set de números de faturas que já têm receita lançada manualmente
  const faturasLancadas = useMemo(() => {
    const set = new Set<string>();
    for (const r of receitas) {
      if (r.observacao) {
        const match = r.observacao.match(/^Fatura (FAT-[\w-]+)/);
        if (match) set.add(match[1]);
      }
    }
    return set;
  }, [receitas]);

  const totalFaturasRecebidas = faturasRecebidas
    .filter((f) => faturasLancadas.has(f.numero))
    .reduce((s, f) => s + (f.total_debitos_loja || 0), 0);

  const faturaColumns: Column<Fatura>[] = [
    {
      key: "numero",
      header: "Nº Fatura",
      sortable: true,
      cell: (f) => <span className="font-medium text-sm">{f.numero}</span>,
    },
    {
      key: "cliente_nome",
      header: "Cliente",
      sortable: true,
      cell: (f) => <span className="text-sm">{f.cliente_nome}</span>,
    },
    {
      key: "data_emissao",
      header: "Emissão",
      cell: (f) => <span className="text-sm">{formatDateBR(f.data_emissao)}</span>,
    },
    {
      key: "total_debitos_loja",
      header: "Valor Recebido",
      sortable: true,
      cell: (f) => (
        <span className="font-semibold tabular-nums text-emerald-500">
          {formatCurrency(f.total_debitos_loja || 0)}
        </span>
      ),
    },
    {
      key: "status_geral",
      header: "Status",
      cell: (f) => {
        const lancada = faturasLancadas.has(f.numero);
        return lancada ? (
          <Badge variant="default">Finalizada</Badge>
        ) : (
          <Badge className="bg-amber-500/15 text-amber-600 border border-amber-500/30 text-xs">
            Aguardando Lançamento
          </Badge>
        );
      },
    },
    {
      key: "acoes",
      header: "Ações",
      className: "text-center",
      cell: (f) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-primary hover:bg-primary/10"
          onClick={(e) => { e.stopPropagation(); setViewingFatura(f); }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Faturas Lançadas</p>
              <p className="text-base sm:text-xl font-bold tabular-nums">
                {formatCurrency(totalFaturasRecebidas)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Faturas Recebidas
        </h3>
        <DataTable
          data={faturasRecebidas}
          columns={faturaColumns}
          pageSize={10}
          emptyTitle="Nenhuma fatura recebida"
          emptySubtitle="Faturas pagas aparecerão aqui."
        />
      </div>

      <Suspense fallback={null}>
        {viewingFatura && (
          <FaturaDetailsModal
            fatura={viewingFatura}
            open={!!viewingFatura}
            onOpenChange={(open) => !open && setViewingFatura(null)}
          />
        )}
      </Suspense>
    </div>
  );
}
import { useState, useMemo, lazy, Suspense } from "react";
import { DataTable } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import type { Fatura } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import { ArrowUpRight, CheckCircle2, Clock, Eye } from "lucide-react";

const FaturaDetailsModal = lazy(() =>
  import("@/pages/admin/faturas/FaturaDetailsModal").then((m) => ({ default: m.FaturaDetailsModal }))
);

interface RepassesTabProps {
  faturas: Fatura[];
}

export function RepassesTab({ faturas }: RepassesTabProps) {
  const [viewingFatura, setViewingFatura] = useState<Fatura | null>(null);
  const [actionFatura, setActionFatura] = useState<Fatura | null>(null);

  const faturasAguardando = useMemo(
    () =>
      faturas.filter(
        (f) => f.status_repasse === "Pendente" && (f.saldo_liquido ?? 0) > 0,
      ),
    [faturas],
  );

  const faturasRepassadas = useMemo(
    () => faturas.filter((f) => f.status_repasse === "Repassado"),
    [faturas],
  );

  const totalPendente = faturasAguardando.reduce(
    (s, f) => s + (f.saldo_liquido ?? 0),
    0,
  );

  const totalRepassado = faturasRepassadas.reduce(
    (s, f) => s + (f.valor_repasse ?? 0),
    0,
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const columnsAguardando: Column<Fatura>[] = [
    {
      key: "cliente_nome",
      header: "Cliente",
      sortable: true,
      cell: (f) => <span className="font-medium">{f.cliente_nome}</span>,
    },
    {
      key: "numero",
      header: "Fatura",
      sortable: true,
      cell: (f) => <span className="text-sm font-mono">{f.numero}</span>,
    },
    {
      key: "status_geral",
      header: "Status",
      cell: (f) => (
        <Badge variant="outline" className="text-xs">
          {f.status_geral}
        </Badge>
      ),
    },
    {
      key: "data_vencimento",
      header: "Vencimento",
      sortable: true,
      cell: (f) => {
        const dt = new Date(f.data_vencimento);
        const vencida = dt < today;
        return (
          <span className={vencida ? "text-destructive font-medium" : "text-sm"}>
            {formatDateBR(f.data_vencimento)}
          </span>
        );
      },
    },
    {
      key: "saldo_liquido",
      header: "Valor a Repassar",
      sortable: true,
      cell: (f) => (
        <span className="font-semibold tabular-nums text-amber-500">
          {formatCurrency(f.saldo_liquido ?? 0)}
        </span>
      ),
    },
    {
      key: "acoes",
      header: "Ações",
      className: "text-center",
      cell: (f) => (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={(e) => {
            e.stopPropagation();
            setActionFatura(f);
          }}
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          Registrar Repasse
        </Button>
      ),
    },
  ];

  const columnsRepassadas: Column<Fatura>[] = [
    {
      key: "cliente_nome",
      header: "Cliente",
      sortable: true,
      cell: (f) => <span className="font-medium">{f.cliente_nome}</span>,
    },
    {
      key: "numero",
      header: "Fatura",
      sortable: true,
      cell: (f) => <span className="text-sm font-mono">{f.numero}</span>,
    },
    {
      key: "valor_repasse",
      header: "Valor Repassado",
      sortable: true,
      cell: (f) => (
        <span className="font-semibold tabular-nums text-emerald-500">
          {formatCurrency(f.valor_repasse ?? 0)}
        </span>
      ),
    },
    {
      key: "historico",
      header: "Data do Repasse",
      cell: (f) => {
        const evento = f.historico?.find((h) => h.tipo === "repasse");
        const data = evento?.timestamp ?? f.updated_at;
        return <span className="text-sm">{formatDateBR(data)}</span>;
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
          onClick={(e) => {
            e.stopPropagation();
            setViewingFatura(f);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-amber-500/10 p-2.5">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Pendente</p>
              <p className="text-base sm:text-xl font-bold tabular-nums">
                {formatCurrency(totalPendente)}
              </p>
              <p className="text-xs text-muted-foreground">
                {faturasAguardando.length} fatura
                {faturasAguardando.length !== 1 ? "s" : ""} aguardando
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-emerald-500/10 p-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Repassado</p>
              <p className="text-base sm:text-xl font-bold tabular-nums">
                {formatCurrency(totalRepassado)}
              </p>
              <p className="text-xs text-muted-foreground">
                {faturasRepassadas.length} fatura
                {faturasRepassadas.length !== 1 ? "s" : ""} concluída
                {faturasRepassadas.length !== 1 ? "s" : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aguardando repasse */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Aguardando Repasse
        </h3>
        <DataTable
          data={faturasAguardando}
          columns={columnsAguardando}
          pageSize={10}
          emptyTitle="Nenhum repasse pendente"
          emptySubtitle="Todas as faturas com saldo positivo já foram repassadas."
        />
      </div>

      {/* Repasses realizados */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Repasses Realizados
        </h3>
        <DataTable
          data={faturasRepassadas}
          columns={columnsRepassadas}
          pageSize={10}
          emptyTitle="Nenhum repasse registrado"
          emptySubtitle="Os repasses realizados aparecerão aqui."
        />
      </div>

      {/* Modals */}
      <Suspense fallback={null}>
        {actionFatura && (
          <FaturaDetailsModal
            fatura={actionFatura}
            open={!!actionFatura}
            onOpenChange={(open) => !open && setActionFatura(null)}
          />
        )}
        {viewingFatura && (
          <FaturaDetailsModal
            fatura={viewingFatura}
            open={!!viewingFatura}
            onOpenChange={(open) => !open && setViewingFatura(null)}
            viewOnly
          />
        )}
      </Suspense>
    </div>
  );
}

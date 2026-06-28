import { useMemo } from "react";
import type { DateRange } from "react-day-picker";
import { DataTable } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import { Card } from "@/components/ui/card";
import { useAllComissoes, type ComissaoCalculada } from "@/hooks/useComissao";
import { formatDateBR } from "@/lib/formatters";

interface EntregaRow {
  entregador_id: string;
  nome: string;
  solicitacoes: number;
  rotas: number;
  media: string;
}

interface EntregasTabProps {
  dateRange?: DateRange;
}

export function EntregasTab({ dateRange }: EntregasTabProps) {
  const comissoes = useAllComissoes(dateRange);

  const rows: EntregaRow[] = useMemo(
    () =>
      comissoes.map((c) => ({
        entregador_id: c.entregador_id,
        nome: c.nome,
        solicitacoes: c.solicitacoes_count,
        rotas: c.entregas,
        media:
          c.solicitacoes_count > 0
            ? (c.entregas / c.solicitacoes_count).toFixed(1)
            : "—",
      })),
    [comissoes]
  );

  const totalSolicitacoes = rows.reduce((s, r) => s + r.solicitacoes, 0);
  const totalRotas = rows.reduce((s, r) => s + r.rotas, 0);
  const mediaGeral =
    totalSolicitacoes > 0
      ? (totalRotas / totalSolicitacoes).toFixed(1)
      : "—";

  const columns: Column<EntregaRow>[] = [
    {
      key: "nome",
      header: "Entregador",
      sortable: true,
      cell: (r) => <span className="font-medium">{r.nome}</span>,
    },
    {
      key: "solicitacoes",
      header: "Solicitações",
      sortable: true,
      cell: (r) => <span className="tabular-nums">{r.solicitacoes}</span>,
    },
    {
      key: "rotas",
      header: "Rotas (Entregas reais)",
      sortable: true,
      cell: (r) => (
        <span className="tabular-nums font-semibold text-foreground">
          {r.rotas}
        </span>
      ),
    },
    {
      key: "media",
      header: "Média rotas/sol.",
      sortable: false,
      cell: (r) => (
        <span className="tabular-nums text-muted-foreground">{r.media}</span>
      ),
    },
  ];

  const renderMobileCard = (r: EntregaRow) => (
    <Card className="p-4 space-y-2">
      <span className="font-medium text-sm">{r.nome}</span>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{r.solicitacoes} solicitações</span>
        <span className="font-semibold text-foreground">{r.rotas} rotas</span>
      </div>
      <div className="text-xs text-muted-foreground">
        Média: {r.media} rotas/solicitação
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span>
          Total de solicitações:{" "}
          <strong className="text-foreground">{totalSolicitacoes}</strong>
        </span>
        <span>
          Total de rotas:{" "}
          <strong className="text-foreground">{totalRotas}</strong>
        </span>
        <span>
          Média geral:{" "}
          <strong className="text-foreground">{mediaGeral} rotas/sol.</strong>
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        ℹ️ Período:{" "}
        {dateRange?.from
          ? `${formatDateBR(dateRange.from)} até ${formatDateBR(dateRange.to ?? dateRange.from)}`
          : "mês corrente"}
        . Contagem baseada em rotas com status{" "}
        <code className="bg-muted px-1 rounded">concluída</code> dentro de
        solicitações concluídas.
      </p>
      <DataTable
        data={rows}
        columns={columns}
        pageSize={10}
        renderMobileCard={renderMobileCard}
        emptyTitle="Nenhuma entrega encontrada"
        emptySubtitle="Entregas aparecem após solicitações serem concluídas no mês atual."
      />
    </div>
  );
}

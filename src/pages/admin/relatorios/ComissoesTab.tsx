import { DataTable } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { useAllComissoes, type ComissaoCalculada } from "@/hooks/useComissao";

type Comissao = ComissaoCalculada;

export function ComissoesTab() {
  const comissoes = useAllComissoes();
  const totalComissao = comissoes.reduce((s, c) => s + c.comissao, 0);
  const totalEntregas = comissoes.reduce((s, c) => s + c.entregas, 0);

  const columns: Column<Comissao>[] = [
    { key: "nome", header: "Entregador", sortable: true, cell: (c) => <span className="font-medium">{c.nome}</span> },
    { key: "entregas", header: "Nº Entregas", sortable: true, cell: (c) => <span className="tabular-nums">{c.entregas}</span> },
    { key: "valor_gerado", header: "Valor Gerado", sortable: true, cell: (c) => <span className="tabular-nums">{formatCurrency(c.valor_gerado)}</span> },
    {
      key: "tipo_comissao", header: "Tipo",
      cell: (c) => (
        <Badge variant="outline" className="text-xs">
          {c.tipo_comissao === "percentual" ? `${c.taxa}%` : `R$ ${c.taxa}/entrega`}
        </Badge>
      ),
    },
    {
      key: "comissao", header: "Comissão", sortable: true,
      cell: (c) => <span className="font-semibold tabular-nums text-emerald-500">{formatCurrency(c.comissao)}</span>,
    },
  ];

  const renderMobileCard = (c: Comissao) => (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium">{c.nome}</span>
        <span className="font-semibold tabular-nums text-emerald-500">{formatCurrency(c.comissao)}</span>
      </div>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{c.entregas} entregas</span>
        <Badge variant="outline" className="text-xs">{c.tipo_comissao === "percentual" ? `${c.taxa}%` : `R$ ${c.taxa}/ent.`}</Badge>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Total de entregas: <strong className="text-foreground">{totalEntregas}</strong></span>
        <span>Total de comissões: <strong className="text-emerald-500">{formatCurrency(totalComissao)}</strong></span>
      </div>
      <p className="text-xs text-muted-foreground">⚠️ Comissões calculadas SOMENTE sobre <code className="bg-muted px-1 rounded">receita_operacao</code>, excluindo créditos de loja.</p>
      <DataTable
        data={comissoes}
        columns={columns}
        pageSize={10}
        renderMobileCard={renderMobileCard}
        emptyTitle="Nenhuma comissão encontrada"
        emptySubtitle="Comissões são calculadas a partir das entregas concluídas."
      />
    </div>
  );
}

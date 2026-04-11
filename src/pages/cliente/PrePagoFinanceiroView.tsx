import { useMemo } from "react";
import { motion } from "framer-motion";
import { FileText, DollarSign, Info, Calendar, ArrowDownCircle, TrendingDown, ArrowUpCircle } from "lucide-react";
import { PageContainer } from "@/components/shared/PageContainer";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { exportCSV, exportPDF } from "@/lib/exportTable";
import { MetricCard } from "@/components/shared/MetricCard";
import { DataTable } from "@/components/shared/DataTable";
import type { Column } from "@/components/shared/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import { useSolicitacoesByCliente, useRotasBySolicitacaoIds } from "@/hooks/useSolicitacoes";
import { useClienteSaldoMap } from "@/hooks/useClientes";
import { useRecargasByCliente } from "@/hooks/useFinanceiro";
import { cn } from "@/lib/utils";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

interface ExtratoItem {
  id: string;
  codigo: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: "debito" | "credito";
  saldoApos: number;
}

interface PrePagoFinanceiroViewProps {
  clienteId: string;
}

export function PrePagoFinanceiroView({ clienteId }: PrePagoFinanceiroViewProps) {
  const { data: solicitacoes = [] } = useSolicitacoesByCliente(clienteId);
  const solIds = useMemo(() => solicitacoes.map((s) => s.id), [solicitacoes]);
  const { data: rotas = [] } = useRotasBySolicitacaoIds(solIds);
  const { getClienteSaldo } = useClienteSaldoMap();
  const { data: recargas = [] } = useRecargasByCliente(clienteId);

  const saldo = getClienteSaldo(clienteId);
  const BASE_DEPOSIT = 600;

  // Build unified history from completed solicitações + recargas
  const extrato = useMemo(() => {

    // Debits from concluded solicitations
    const concluidas = solicitacoes
      .filter((s) => s.status === "concluida")
      .map((s): ExtratoItem & { _ts: number } => {
        const rotasSol = rotas.filter((r) => r.solicitacao_id === s.id);
        const numRotas = rotasSol.length;
        const ts = new Date(s.data_conclusao ?? s.updated_at).getTime();
        return {
          id: s.id,
          codigo: s.codigo,
          data: s.data_conclusao ?? s.updated_at,
          descricao: `${numRotas} entrega${numRotas !== 1 ? "s" : ""} — ${s.ponto_coleta.split(",")[0]}`,
          valor: s.valor_total_taxas ?? 0,
          tipo: "debito",
          saldoApos: 0, // calculated below
          _ts: ts,
        };
      });

    // Credits from recargas
    const creditItems = recargas.map((r): ExtratoItem & { _ts: number } => ({
      id: r.id,
      codigo: "RECARGA",
      data: r.created_at,
      descricao: r.observacao || "Recarga de saldo",
      valor: r.valor,
      tipo: "credito",
      saldoApos: 0,
      _ts: new Date(r.created_at).getTime(),
    }));

    // Sort chronologically to calculate running balance
    const all = [...concluidas, ...creditItems].sort((a, b) => a._ts - b._ts);
    let saldoCorrente = BASE_DEPOSIT;
    for (const item of all) {
      if (item.tipo === "credito") {
        saldoCorrente += item.valor;
      } else {
        saldoCorrente -= item.valor;
      }
      item.saldoApos = saldoCorrente;
    }

    // Return most recent first (without _ts)
    return all.reverse().map(({ _ts, ...rest }) => rest);
  }, [solicitacoes, rotas, recargas]);

  const totalRecargas = extrato.filter((e) => e.tipo === "credito").reduce((s, e) => s + e.valor, 0);
  const taxasConsumidas = extrato.filter((e) => e.tipo === "debito").reduce((s, e) => s + e.valor, 0);
  const totalDebitos = extrato.filter((e) => e.tipo === "debito").length;

  const columns: Column<ExtratoItem>[] = [
    {
      key: "data",
      header: "Data",
      sortable: true,
      cell: (d) => <span className="text-sm">{formatDateBR(d.data)}</span>,
    },
    {
      key: "codigo",
      header: "Referência",
      sortable: true,
      cell: (d) => (
        <span className={cn("text-sm font-medium", d.tipo === "credito" && "text-primary")}>
          {d.codigo}
        </span>
      ),
    },
    {
      key: "descricao",
      header: "Descrição",
      cell: (d) => <span className="text-sm text-muted-foreground">{d.descricao}</span>,
    },
    {
      key: "valor",
      header: "Valor",
      sortable: true,
      cell: (d) => (
        <span className={cn("text-sm font-semibold tabular-nums", d.tipo === "credito" ? "text-primary" : "text-destructive")}>
          {d.tipo === "credito" ? "+ " : "- "}{formatCurrency(d.valor)}
        </span>
      ),
    },
    {
      key: "saldoApos",
      header: "Saldo Após",
      sortable: true,
      cell: (d) => (
        <span className={cn("text-sm font-medium tabular-nums", d.saldoApos <= 100 ? "text-destructive" : "text-foreground")}>
          {formatCurrency(d.saldoApos)}
        </span>
      ),
    },
  ];

  const renderMobileCard = (d: ExtratoItem) => (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {d.tipo === "credito" ? (
              <ArrowUpCircle className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <ArrowDownCircle className="h-4 w-4 text-destructive shrink-0" />
            )}
            <span className="text-sm font-semibold">{d.codigo}</span>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>{formatDateBR(d.data)}</span>
            </div>
            <p className="text-xs text-muted-foreground">{d.descricao}</p>
          </div>
        </div>
        <div className="text-right shrink-0 space-y-1">
          <span className={cn("block text-sm font-bold tabular-nums", d.tipo === "credito" ? "text-primary" : "text-destructive")}>
            {d.tipo === "credito" ? "+ " : "- "}{formatCurrency(d.valor)}
          </span>
          <span className={cn("block text-xs tabular-nums", d.saldoApos <= 100 ? "text-destructive" : "text-muted-foreground")}>
            Saldo: {formatCurrency(d.saldoApos)}
          </span>
        </div>
      </div>
    </Card>
  );

  const exportConfig = useMemo(() => {
    const headers = ["Data", "Referência", "Descrição", "Valor", "Saldo Após"];
    const summaryRows = [
      ["", "", "Depósito Inicial", formatCurrency(BASE_DEPOSIT), formatCurrency(BASE_DEPOSIT)],
    ];
    const dataRows = [...extrato].reverse().map((d) => [
      formatDateBR(d.data),
      d.codigo,
      d.descricao,
      `${d.tipo === "credito" ? "+ " : "- "}${formatCurrency(d.valor)}`,
      formatCurrency(d.saldoApos),
    ]);
    const footerRows = [
      ["", "", "Total Recargas", `+ ${formatCurrency(totalRecargas)}`, ""],
      ["", "", "Total Consumido", `- ${formatCurrency(taxasConsumidas)}`, ""],
      ["", "", "Saldo Atual", formatCurrency(saldo), ""],
    ];
    return {
      title: "Extrato Pré-Pago",
      subtitle: `${extrato.length} movimentações registradas`,
      headers,
      rows: [...summaryRows, ...dataRows, ...footerRows],
      filename: "extrato-pre-pago",
    };
  }, [extrato, saldo, taxasConsumidas, totalRecargas]);

  return (
    <PageContainer
      title="Meu Financeiro"
      subtitle="Informações financeiras da sua conta."
      actions={
        <ExportDropdown
          onExportPDF={() => exportPDF(exportConfig)}
          onExportExcel={() => exportCSV(exportConfig)}
        />
      }
    >
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={fadeUp}>
          <MetricCard
            title="Saldo Pré-Pago"
            value={formatCurrency(saldo)}
            icon={DollarSign}
            subtitle="Crédito disponível"
            className={saldo <= 100 ? "border-l-4 border-l-destructive" : "border-l-4 border-l-primary"}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard
            title="Total Recargas"
            value={formatCurrency(totalRecargas)}
            icon={ArrowUpCircle}
            subtitle="Créditos adicionados"
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard
            title="Taxas Consumidas"
            value={formatCurrency(taxasConsumidas)}
            icon={TrendingDown}
            subtitle="Total debitado do saldo"
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard
            title="Entregas Realizadas"
            value={totalDebitos}
            icon={ArrowDownCircle}
            subtitle="Débitos no extrato"
          />
        </motion.div>
      </motion.div>

      <Alert className="mt-4">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Sua conta é <strong>pré-paga</strong>. O pagamento das taxas de entrega é debitado automaticamente do seu saldo a cada solicitação concluída.
        </AlertDescription>
      </Alert>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Extrato de Movimentações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={extrato}
            columns={columns}
            pageSize={10}
            renderMobileCard={renderMobileCard}
            emptyTitle="Sem movimentações"
            emptySubtitle="Nenhuma movimentação registrada ainda."
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}

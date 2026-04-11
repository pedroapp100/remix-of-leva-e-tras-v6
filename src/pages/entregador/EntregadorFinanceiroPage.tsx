import { useMemo } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Hash } from "lucide-react";
import { PageContainer } from "@/components/shared/PageContainer";
import { MetricCard } from "@/components/shared/MetricCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { exportCSV, exportPDF } from "@/lib/exportTable";
import { useComissao } from "@/hooks/useComissao";
import { useEntregadorId } from "@/hooks/useEntregadorId";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function EntregadorFinanceiroPage() {
  const { entregadorId: ENTREGADOR_ID } = useEntregadorId();
  const comissao = useComissao(ENTREGADOR_ID);

  const exportConfig = useMemo(() => {
    if (!comissao) return null;
    return {
      title: "Minha Comissão",
      headers: ["Item", "Valor"],
      rows: [
        ["Tipo de Comissão", comissao.tipo_comissao === "percentual" ? "Percentual" : "Valor Fixo"],
        ["Taxa", comissao.tipo_comissao === "percentual" ? `${comissao.taxa}%` : formatCurrency(comissao.taxa)],
        ["Base de Cálculo", formatCurrency(comissao.valor_gerado)],
        ["Total de Entregas", String(comissao.entregas)],
        ["Comissão Total", formatCurrency(comissao.comissao)],
      ],
      filename: "minha-comissao",
    };
  }, [comissao]);

  if (!comissao) {
    return (
      <PageContainer title="Meu Financeiro" subtitle="Extrato de comissões.">
        <EmptyState icon={DollarSign} title="Sem dados de comissão" subtitle="Nenhuma comissão registrada para o período." />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Meu Financeiro"
      subtitle="Extrato de comissões sobre receita operacional."
      actions={
        exportConfig && (
          <ExportDropdown
            onExportPDF={() => exportPDF(exportConfig)}
            onExportExcel={() => exportCSV(exportConfig)}
          />
        )
      }
    >
      <motion.div data-onboarding="driver-earnings" variants={stagger} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-3">
        <motion.div variants={fadeUp}>
          <MetricCard title="Entregas Realizadas" value={comissao.entregas} icon={Hash} subtitle="No período" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard title="Valor Gerado" value={formatCurrency(comissao.valor_gerado)} icon={TrendingUp} subtitle="Receita operacional" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard title="Minha Comissão" value={formatCurrency(comissao.comissao)} icon={DollarSign} subtitle={`${comissao.tipo_comissao === "percentual" ? `${comissao.taxa}%` : `R$ ${comissao.taxa}/entrega`}`} className="border-l-4 border-l-primary" />
        </motion.div>
      </motion.div>

      <Card data-onboarding="driver-payouts" className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Detalhes da Comissão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Tipo de Comissão</span>
              <Badge variant="secondary">{comissao.tipo_comissao === "percentual" ? "Percentual" : "Valor Fixo"}</Badge>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Taxa</span>
              <span className="text-sm font-medium">{comissao.tipo_comissao === "percentual" ? `${comissao.taxa}%` : formatCurrency(comissao.taxa)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Base de Cálculo</span>
              <span className="text-sm font-medium">{formatCurrency(comissao.valor_gerado)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Total de Entregas</span>
              <span className="text-sm font-medium tabular-nums">{comissao.entregas}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-semibold">Comissão Total</span>
              <span className="text-base font-bold text-primary tabular-nums">{formatCurrency(comissao.comissao)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            * Comissão calculada exclusivamente sobre receita operacional (taxas de entrega). Créditos de loja não são incluídos.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

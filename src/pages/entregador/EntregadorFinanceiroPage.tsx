import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, Hash, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { PageContainer } from "@/components/shared/PageContainer";
import { MetricCard } from "@/components/shared/MetricCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/formatters";
import { exportCSV, exportPDF } from "@/lib/exportTable";
import { useComissao } from "@/hooks/useComissao";
import { useEntregadorId } from "@/hooks/useEntregadorId";
import { useCiclosComissaoMeta, calcularProgressoFaixa } from "@/hooks/useComissaoFaixas";
import type { CicloComissaoMeta } from "@/types/database";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

function fmtMesReferencia(mes: string): string {
  const [ano, m] = mes.split("-");
  const nomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${nomes[parseInt(m, 10) - 1]}/${ano}`;
}

function CicloAccordionItem({ ciclo }: { ciclo: CicloComissaoMeta }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium">{fmtMesReferencia(ciclo.mes_referencia)}</span>
          <Badge variant="outline" className="text-xs">
            {ciclo.meta_modo_calculo === "escalonado" ? "Escalonado" : "Faixa Máx."}
          </Badge>
          {ciclo.criado_por === "manual" && (
            <Badge variant="secondary" className="text-xs">Manual</Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold tabular-nums text-emerald-500">{formatCurrency(ciclo.comissao_calculada)}</span>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 border-t border-border bg-muted/20 space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Entregas no mês</span>
            <span className="tabular-nums font-medium text-foreground">{ciclo.total_entregas}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Comissão calculada</span>
            <span className="tabular-nums font-semibold text-emerald-500">{formatCurrency(ciclo.comissao_calculada)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Fechado em</span>
            <span className="tabular-nums">{new Date(ciclo.fechado_em).toLocaleDateString("pt-BR")}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EntregadorFinanceiroPage() {
  const { entregadorId: ENTREGADOR_ID } = useEntregadorId();
  const comissao = useComissao(ENTREGADOR_ID);
  const { data: ciclos = [] } = useCiclosComissaoMeta(
    comissao?.tipo_comissao === "meta" ? ENTREGADOR_ID : null
  );

  const progresso = useMemo(() => {
    if (comissao?.tipo_comissao !== "meta" || !comissao.faixas?.length) return null;
    return calcularProgressoFaixa(comissao.entregas, comissao.faixas);
  }, [comissao]);

  const exportConfig = useMemo(() => {
    if (!comissao) return null;
    return {
      title: "Minha Comissão",
      headers: ["Item", "Valor"],
      rows: [
        ["Tipo de Comissão", comissao.tipo_comissao === "percentual" ? "Percentual" : comissao.tipo_comissao === "fixo" ? "Valor Fixo" : "Por Meta"],
        ["Taxa", comissao.tipo_comissao === "percentual" ? `${comissao.taxa}%` : comissao.tipo_comissao === "fixo" ? formatCurrency(comissao.taxa) : comissao.meta_modo_calculo === "escalonado" ? "Escalonado" : "Faixa Máxima"],
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

  const tipoLabel =
    comissao.tipo_comissao === "percentual"
      ? "Percentual"
      : comissao.tipo_comissao === "fixo"
      ? "Valor Fixo"
      : comissao.meta_modo_calculo === "escalonado"
      ? "Meta — Escalonado"
      : "Meta — Faixa Máxima";

  const taxaSubtitle =
    comissao.tipo_comissao === "percentual"
      ? `${comissao.taxa}%`
      : comissao.tipo_comissao === "fixo"
      ? `R$ ${comissao.taxa}/entrega`
      : tipoLabel;

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
          <MetricCard title="Entregas Realizadas" value={comissao.entregas} icon={Hash} subtitle="Este mês" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard title="Valor Gerado" value={formatCurrency(comissao.valor_gerado)} icon={TrendingUp} subtitle="Receita operacional" />
        </motion.div>
        <motion.div variants={fadeUp}>
          <MetricCard title="Minha Comissão" value={formatCurrency(comissao.comissao)} icon={DollarSign} subtitle={taxaSubtitle} className="border-l-4 border-l-primary" />
        </motion.div>
      </motion.div>

      {/* Progresso de faixa — apenas tipo meta */}
      {comissao.tipo_comissao === "meta" && progresso && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Progresso do Mês</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Faixa atual</span>
                {progresso.faixaAtual ? (
                  <Badge variant="secondary" className="tabular-nums">
                    {formatCurrency(progresso.faixaAtual.valor_por_entrega)}/entrega
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">Abaixo da 1ª faixa</span>
                )}
              </div>

              {progresso.proximaFaixa && (
                <>
                  <Progress value={progresso.percentualProxima} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{comissao.entregas} entregas</span>
                    <span className="text-primary font-medium">
                      Faltam {progresso.entregasFaltam} para {formatCurrency(progresso.proximaFaixa.valor_por_entrega)}/entrega
                    </span>
                  </div>
                </>
              )}

              {!progresso.proximaFaixa && progresso.faixaAtual && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Você está na faixa máxima configurada!
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Card data-onboarding="driver-payouts" className="mt-6">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Detalhes da Comissão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Tipo de Comissão</span>
              <Badge variant="secondary">{tipoLabel}</Badge>
            </div>
            {comissao.tipo_comissao !== "meta" && (
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Taxa</span>
                <span className="text-sm font-medium">{comissao.tipo_comissao === "percentual" ? `${comissao.taxa}%` : formatCurrency(comissao.taxa)}</span>
              </div>
            )}
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

      {/* Histórico de ciclos — apenas tipo meta */}
      {comissao.tipo_comissao === "meta" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Histórico de Ciclos</CardTitle>
            </CardHeader>
            <CardContent>
              {ciclos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum ciclo fechado ainda. O primeiro será gerado ao final deste mês.
                </p>
              ) : (
                <div className="space-y-2">
                  {ciclos.map((ciclo) => (
                    <CicloAccordionItem key={ciclo.id} ciclo={ciclo} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </PageContainer>
  );
}

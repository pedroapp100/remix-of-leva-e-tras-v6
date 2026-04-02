import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, ArrowDownUp, Hash, Eye } from "lucide-react";
import { PageContainer } from "@/components/shared/PageContainer";
import { MetricCard } from "@/components/shared/MetricCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import type { CaixaEntregador } from "@/data/mockCaixas";
import { useCaixaStore } from "@/contexts/CaixaStore";
import { CaixaDetailsModal } from "@/pages/admin/caixas/CaixaDetailsModal";

const ENTREGADOR_ID = "ent-001";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export default function EntregadorCaixaPage() {
  const { getCaixasByEntregador, getCaixaAberto } = useCaixaStore();
  const [detailsCaixa, setDetailsCaixa] = useState<CaixaEntregador | null>(null);

  const meusCaixas = getCaixasByEntregador(ENTREGADOR_ID);
  const caixaAberto = getCaixaAberto(ENTREGADOR_ID) ?? null;

  const metrics = useMemo(() => {
    const totalRecebidoHoje = caixaAberto?.total_recebido ?? 0;
    const trocoAtual = caixaAberto?.troco_inicial ?? 0;
    const totalEntregas = caixaAberto?.recebimentos.length ?? 0;
    return { totalRecebidoHoje, trocoAtual, totalEntregas };
  }, [caixaAberto]);

  if (meusCaixas.length === 0) {
    return (
      <PageContainer title="Meu Caixa" subtitle="Controle de troco e recebimentos.">
        <EmptyState icon={Wallet} title="Nenhum caixa encontrado" subtitle="Você ainda não teve nenhum caixa aberto." />
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Meu Caixa" subtitle="Controle de troco e recebimentos em dinheiro.">
      {caixaAberto && (
        <>
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-3">
            <motion.div variants={fadeUp}>
              <MetricCard title="Troco Inicial" value={formatCurrency(metrics.trocoAtual)} icon={Wallet} subtitle="Hoje" />
            </motion.div>
            <motion.div variants={fadeUp}>
              <MetricCard title="Recebido em Dinheiro" value={formatCurrency(metrics.totalRecebidoHoje)} icon={ArrowDownUp} subtitle={`${metrics.totalEntregas} entrega(s)`} />
            </motion.div>
            <motion.div variants={fadeUp}>
              <MetricCard title="Total a Devolver" value={formatCurrency(caixaAberto.total_esperado)} icon={Hash} subtitle="Troco + recebidos" className="border-l-4 border-l-primary" />
            </motion.div>
          </motion.div>

          {caixaAberto.recebimentos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  Recebimentos de Hoje
                  <Badge variant="secondary">{caixaAberto.recebimentos.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hora</TableHead>
                      <TableHead>Solicitação</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {caixaAberto.recebimentos.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="tabular-nums">{r.hora}</TableCell>
                        <TableCell className="font-mono text-xs">{r.solicitacao_codigo}</TableCell>
                        <TableCell>{r.cliente_nome}</TableCell>
                        <TableCell className="text-right font-medium tabular-nums">{formatCurrency(r.valor_recebido)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Histórico de Caixas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Troco</TableHead>
                <TableHead className="text-center">Entregas</TableHead>
                <TableHead className="text-right">Recebido</TableHead>
                <TableHead className="text-right">Devolvido</TableHead>
                <TableHead className="text-right">Diferença</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meusCaixas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="tabular-nums">{new Date(c.data).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(c.troco_inicial)}</TableCell>
                  <TableCell className="text-center tabular-nums">{c.recebimentos.length}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(c.total_recebido)}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.valor_devolvido !== null ? formatCurrency(c.valor_devolvido) : "—"}</TableCell>
                  <TableCell className={`text-right tabular-nums font-medium ${c.diferenca === null ? "" : c.diferenca === 0 ? "text-status-completed" : "text-destructive"}`}>
                    {c.diferenca !== null ? formatCurrency(c.diferenca) : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailsCaixa(c)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ver detalhes</TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CaixaDetailsModal open={!!detailsCaixa} onOpenChange={(o) => !o && setDetailsCaixa(null)} caixa={detailsCaixa} />
    </PageContainer>
  );
}

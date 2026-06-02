import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/formatters";
import { Trash2, RefreshCw, Eye, Loader2, CheckCircle2, MinusCircle } from "lucide-react";
import type { CaixaEntregador, Rota } from "@/types/database";
import { useCaixaStore } from "@/contexts/CaixaStore";
import { fetchRotasBySolicitacao } from "@/services/solicitacoes";
import { rowToRota } from "@/lib/mappers";
import { isRotaDinheiroNoCaixa, calcTotalDinheiroNoCaixa } from "@/lib/rotasHelpers";
import { supabase } from "@/lib/supabase";

// ── Labels ──────────────────────────────────────────────────────────────────

const pagamentoLabel: Record<string, string> = {
  pago_na_hora: "Pago na hora",
  faturar: "Faturar",
  descontar_saldo: "Descontar saldo",
};

const meioCobrancaLabel: Record<string, string> = {
  dinheiro: "Dinheiro",
  maquina_loja: "Máquina da loja",
  pix_loja: "Pix da loja",
  pix_empresa: "Pix da empresa",
};

const destinoLabel: Record<string, string> = {
  repassar_empresa: "Repassar à empresa",
  devolver_loja: "Devolver à loja",
};

// ── RotasRecebimentoDialog ───────────────────────────────────────────────────

interface RotasRecebimentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitacaoId: string;
  solicitacaoCodigo: string;
  clienteNome: string;
}

function RotasRecebimentoDialog({
  open,
  onOpenChange,
  solicitacaoId,
  solicitacaoCodigo,
  clienteNome,
}: RotasRecebimentoDialogProps) {
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [dinheiroPagamentoIds, setDinheiroPagamentoIds] = useState<Set<string>>(new Set());
  const [formasPagamentoNomes, setFormasPagamentoNomes] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setRotas([]);

    void Promise.all([
      fetchRotasBySolicitacao(solicitacaoId),
      supabase.from("formas_pagamento").select("id, name"),
    ]).then(([rawRotas, { data: formasPagamento }]) => {
      setRotas(rawRotas.map(rowToRota));
      const allForms = (formasPagamento ?? []) as { id: string; name: string }[];
      setDinheiroPagamentoIds(
        new Set(allForms.filter((f) => f.name.toLowerCase().includes("dinheiro")).map((f) => f.id))
      );
      setFormasPagamentoNomes(new Map(allForms.map((f) => [f.id, f.name])));
      setLoading(false);
    });
  }, [open, solicitacaoId]);

  const totalCaixa = calcTotalDinheiroNoCaixa(rotas, dinheiroPagamentoIds);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">{solicitacaoCodigo}</DialogTitle>
          <DialogDescription className="text-xs">{clienteNome} — rotas que compõem o recebimento no caixa</DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando rotas...
          </div>
        )}

        {!loading && rotas.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma rota encontrada.</p>
        )}

        {!loading && rotas.length > 0 && (
          <div className="space-y-3">
            <div className="divide-y rounded-md border overflow-hidden">
              {rotas.map((rota, idx) => {
                const geraCaixa = isRotaDinheiroNoCaixa(rota, dinheiroPagamentoIds);

                const taxaEmDinheiro =
                  rota.pagamento_operacao === "pago_na_hora" &&
                  (rota.taxa_resolvida ?? 0) > 0 &&
                  rota.meios_pagamento_operacao?.some((id) => dinheiroPagamentoIds.has(id));
                const taxa = taxaEmDinheiro ? (rota.taxa_resolvida ?? 0) : 0;

                const lojaEmDinheiro =
                  rota.receber_do_cliente &&
                  (rota.valor_a_receber ?? 0) > 0 &&
                  rota.meio_cobranca_destino === "dinheiro" &&
                  rota.destino_dinheiro === "repassar_empresa";
                const loja = lojaEmDinheiro ? (rota.valor_a_receber ?? 0) : 0;

                const valorCaixa = taxa + loja;

                return (
                  <div
                    key={rota.id}
                    className={`p-3 text-sm ${geraCaixa ? "bg-emerald-950/20" : "bg-muted/30"}`}
                  >
                    {/* Cabeçalho da rota */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-medium text-xs text-muted-foreground">
                        Rota {idx + 1}
                        {rota.responsavel && (
                          <span className="text-foreground font-normal">· {rota.responsavel}</span>
                        )}
                      </div>
                      {geraCaixa ? (
                        <div className="flex items-center gap-1 text-emerald-400 text-xs font-medium shrink-0">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {formatCurrency(valorCaixa)}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-muted-foreground text-xs shrink-0">
                          <MinusCircle className="h-3.5 w-3.5" />
                          Não entra no caixa
                        </div>
                      )}
                    </div>

                    {/* Linha 1: taxa de operação */}
                    {(rota.taxa_resolvida ?? 0) > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                          {pagamentoLabel[rota.pagamento_operacao] ?? rota.pagamento_operacao}
                        </Badge>
                        <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                          Taxa {formatCurrency(rota.taxa_resolvida ?? 0)}
                        </Badge>
                        {/* Formas de pagamento da taxa (meios_pagamento_operacao) */}
                        {rota.meios_pagamento_operacao?.length > 0
                          ? rota.meios_pagamento_operacao.map((id) => (
                              <Badge
                                key={id}
                                variant="outline"
                                className={`text-xs px-1.5 py-0 h-5 ${
                                  dinheiroPagamentoIds.has(id)
                                    ? "border-emerald-700/60 text-emerald-400"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {formasPagamentoNomes.get(id) ?? id}
                              </Badge>
                            ))
                          : rota.pagamento_operacao === "pago_na_hora" && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 text-amber-500 border-amber-700/40">
                                Sem forma definida
                              </Badge>
                            )}
                      </div>
                    )}

                    {/* Linha 2: cobrança da loja */}
                    {rota.receber_do_cliente && (rota.valor_a_receber ?? 0) > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                          Loja {formatCurrency(rota.valor_a_receber ?? 0)}
                        </Badge>
                        {rota.meio_cobranca_destino && (
                          <Badge
                            variant="outline"
                            className={`text-xs px-1.5 py-0 h-5 ${
                              rota.meio_cobranca_destino === "dinheiro"
                                ? "border-emerald-700/60 text-emerald-400"
                                : "text-muted-foreground"
                            }`}
                          >
                            {meioCobrancaLabel[rota.meio_cobranca_destino] ?? rota.meio_cobranca_destino}
                          </Badge>
                        )}
                        {rota.destino_dinheiro && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                            {destinoLabel[rota.destino_dinheiro] ?? rota.destino_dinheiro}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between rounded-md bg-emerald-950/30 border border-emerald-800/40 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Total no caixa</span>
              <span className="font-bold text-emerald-400">{formatCurrency(totalCaixa)}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── CaixaDetailsModal ────────────────────────────────────────────────────────

interface CaixaDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caixa: CaixaEntregador | null;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  aberto: { label: "Aberto", variant: "default" },
  fechado: { label: "Fechado", variant: "secondary" },
  divergente: { label: "Divergente", variant: "destructive" },
};

export function CaixaDetailsModal({ open, onOpenChange, caixa }: CaixaDetailsModalProps) {
  const { removeRecebimento, recalcularCaixa } = useCaixaStore();
  const [recalculando, setRecalculando] = useState(false);
  const [rotasView, setRotasView] = useState<{
    solicitacaoId: string;
    solicitacaoCodigo: string;
    clienteNome: string;
  } | null>(null);

  if (!caixa) return null;

  const st = statusMap[caixa.status] ?? statusMap.aberto;
  const podeEditar = caixa.status === "aberto";

  const handleRecalcular = async () => {
    setRecalculando(true);
    await recalcularCaixa(caixa.id);
    setRecalculando(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Caixa — {caixa.entregador_nome}
              <Badge variant={st.variant}>{st.label}</Badge>
            </DialogTitle>
            <DialogDescription className="sr-only">.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Data</span>
                <p className="font-medium">{new Date(caixa.data).toLocaleDateString("pt-BR")}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Troco Inicial</span>
                <p className="font-medium">{formatCurrency(caixa.troco_inicial)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Recebido</span>
                <p className="font-medium">{formatCurrency(caixa.total_recebido)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Esperado</span>
                <p className="font-bold text-primary">{formatCurrency(caixa.total_esperado)}</p>
              </div>
              {caixa.valor_devolvido !== null && (
                <>
                  <div>
                    <span className="text-muted-foreground">Valor Devolvido</span>
                    <p className="font-medium">{formatCurrency(caixa.valor_devolvido)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Diferença</span>
                    <p className={`font-bold ${caixa.diferenca === 0 ? "text-status-completed" : "text-destructive"}`}>
                      {formatCurrency(caixa.diferenca ?? 0)}
                    </p>
                  </div>
                </>
              )}
            </div>

            {caixa.observacoes && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <span className="font-medium">Obs:</span> {caixa.observacoes}
              </div>
            )}

            {/* Recebimentos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Recebimentos em Dinheiro ({caixa.recebimentos.length})</h4>
                {podeEditar && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRecalcular}
                    disabled={recalculando}
                    className="h-7 text-xs gap-1"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${recalculando ? "animate-spin" : ""}`} />
                    {recalculando ? "Recalculando..." : "Recalcular"}
                  </Button>
                )}
              </div>
              {caixa.recebimentos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum recebimento registrado.</p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hora</TableHead>
                        <TableHead>Solicitação</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="w-16" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {caixa.recebimentos.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="tabular-nums">{r.hora}</TableCell>
                          <TableCell className="font-mono text-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {r.solicitacao_codigo || "—"}
                              {r.observacao?.startsWith("Sincronizado automaticamente") && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1 py-0 border-emerald-500/50 text-emerald-600 bg-emerald-500/5"
                                  title="Registrado automaticamente via pagamento da solicitação"
                                >
                                  auto-sync
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{r.cliente_nome}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatCurrency(r.valor_recebido)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                title="Ver rotas desta solicitação"
                                disabled={!r.solicitacao_id}
                                onClick={() => {
                                  if (r.solicitacao_id) {
                                    setRotasView({
                                      solicitacaoId: r.solicitacao_id,
                                      solicitacaoCodigo: r.solicitacao_codigo,
                                      clienteNome: r.cliente_nome,
                                    });
                                  }
                                }}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {podeEditar && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => removeRecebimento(caixa.id, r.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {rotasView && (
        <RotasRecebimentoDialog
          open={!!rotasView}
          onOpenChange={(v) => { if (!v) setRotasView(null); }}
          solicitacaoId={rotasView.solicitacaoId}
          solicitacaoCodigo={rotasView.solicitacaoCodigo}
          clienteNome={rotasView.clienteNome}
        />
      )}
    </>
  );
}

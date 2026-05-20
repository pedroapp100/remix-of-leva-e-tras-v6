import { useState, useMemo, useEffect, useRef } from "react";
import type { Rota, PagamentoSolicitacao } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";
import { useFormasPagamento, useBairros } from "@/hooks/useSettings";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { Plus, Trash2, AlertTriangle, CheckCircle, Info, Store, User } from "lucide-react";
import { toast } from "sonner";
import { useCreatePagamentos, useAppendHistorico, useDeletePagamentosByRota, useTaxasExtrasByRotaIds } from "@/hooks/useSolicitacoes";
import { useClienteSaldoMap, useClientes } from "@/hooks/useClientes";

interface PagamentoLinha {
  id: string;
  forma_pagamento_id: string;
  valor: number;
  pertence_a: "operacao" | "loja";
}

const FATURAR_ID = "__faturar__";
const DEVOLVER_LOJA_ID = "__devolver_loja__";

interface ConciliacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rotas: Rota[];
  onConcluir: () => void;
  clienteId?: string;
  solicitacaoId?: string;
  isEditing?: boolean;
  isConcluding?: boolean;
  isDriverView?: boolean;
  existingPagamentos?: PagamentoSolicitacao[];
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ConciliacaoDialog({ open, onOpenChange, rotas, onConcluir, clienteId, solicitacaoId, isEditing = false, isConcluding = false, isDriverView = false, existingPagamentos = [] }: ConciliacaoDialogProps) {
  const { user } = useAuth();
  const createPagamentosMut = useCreatePagamentos();
  const deletePagamentosByRotaMut = useDeletePagamentosByRota();
  const appendHistoricoMut = useAppendHistorico();
  const { getClienteSaldo } = useClienteSaldoMap();
  const { data: clientes = [] } = useClientes();
  const { data: formasPagamento = [] } = useFormasPagamento();
  const { data: bairros = [] } = useBairros();
  const rotaIds = useMemo(() => rotas.map((r) => r.id), [rotas]);
  const { data: taxasExtrasMap = new Map() } = useTaxasExtrasByRotaIds(rotaIds);
  const getBairroName = (id: string) => bairros.find((b) => b.id === id)?.nome ?? id;
  const getExtrasForRota = (rotaId: string) =>
    (taxasExtrasMap.get(rotaId) ?? []).reduce((s: number, e: { valor: number }) => s + e.valor, 0);
  const formasAtivas = formasPagamento.filter((f) => f.enabled);

  // Determines if a route requires physical cash handling by the driver.
  // maquina_loja / pix_loja / pix_empresa / devolver_loja → never touch the driver's pocket.
  const isDriverCashRoute = (r: Rota): boolean =>
    (r.pagamento_operacao === "pago_na_hora" && (r.taxa_resolvida ?? 0) > 0) ||
    (r.receber_do_cliente === true &&
      r.meio_cobranca_destino === "dinheiro" &&
      r.destino_dinheiro === "repassar_empresa");

  // Helper to find a forma de pagamento by keyword(s) in its name
  const findFormaByKeyword = (...keywords: string[]) => {
    const lower = keywords.map((k) => k.toLowerCase());
    return (
      formasAtivas.find((f) => lower.some((k) => f.name.toLowerCase().includes(k)))?.id ??
      formasAtivas[0]?.id ??
      ""
    );
  };

  const cliente = useMemo(() => clienteId ? clientes.find((c) => c.id === clienteId) : null, [clienteId, clientes]);
  const isPrePago = cliente?.modalidade === "pre_pago";
  const isFaturado = cliente?.modalidade === "faturado";

  // Saldo pré-pago e suficiência
  const saldoPrePago = useMemo(() => {
    if (!isPrePago || !clienteId) return null;
    const saldo = getClienteSaldo(clienteId);
    // pago_na_hora routes are collected in cash — exclude from balance deduction
    const totalTaxas = rotas
      .filter((r) => r.pagamento_operacao !== "pago_na_hora")
      .reduce((s, r) => s + (r.taxa_resolvida ?? 0), 0);
    return { saldo, totalTaxas, suficiente: saldo >= totalTaxas, diferenca: totalTaxas - saldo };
  }, [isPrePago, clienteId, getClienteSaldo, rotas]);
  const [pagamentosPorRota, setPagamentosPorRota] = useState<Record<string, PagamentoLinha[]>>(() => {
    const initial: Record<string, PagamentoLinha[]> = {};
    rotas.forEach((r) => {
      const existing = existingPagamentos.filter((p) => p.rota_id === r.id);
      initial[r.id] = existing.length > 0
        ? existing.map((p) => ({
            id: p.id,
            forma_pagamento_id: p.forma_pagamento_id,
            valor: p.valor,
            pertence_a: p.pertence_a,
          }))
        : [];
    });
    return initial;
  });

  // Auto-fill payment lines based on rota configuration (runs when formasAtivas loads)
  const hasAutoFilledRef = useRef(false);
  useEffect(() => {
    if (!open) { hasAutoFilledRef.current = false; return; }
    if (hasAutoFilledRef.current || formasAtivas.length === 0) return;
    hasAutoFilledRef.current = true;
    setPagamentosPorRota((prev) => {
      const updated = { ...prev };
      rotas.forEach((r) => {
        if ((prev[r.id] ?? []).length > 0) return; // already has lines — skip
        const lines: PagamentoLinha[] = [];
        // Operation fee paid in cash at origin
        if (r.pagamento_operacao === "pago_na_hora" && (r.taxa_resolvida ?? 0) > 0) {
          lines.push({
            id: crypto.randomUUID(),
            forma_pagamento_id: r.meios_pagamento_operacao?.[0] ?? findFormaByKeyword("dinheiro"),
            valor: r.taxa_resolvida ?? 0,
            pertence_a: "operacao",
          });
        }
        // Destination collection
        if (r.receber_do_cliente && (r.valor_a_receber ?? 0) > 0) {
          const dest = r.meio_cobranca_destino;
          if (dest === "maquina_loja") {
            lines.push({
              id: crypto.randomUUID(),
              forma_pagamento_id: findFormaByKeyword("máquina", "maquina"),
              valor: r.valor_a_receber ?? 0,
              pertence_a: "loja",
            });
          } else if (dest === "pix_loja") {
            lines.push({
              id: crypto.randomUUID(),
              forma_pagamento_id: findFormaByKeyword("pix"),
              valor: r.valor_a_receber ?? 0,
              pertence_a: "loja",
            });
          } else if (dest === "pix_empresa") {
            lines.push({
              id: crypto.randomUUID(),
              forma_pagamento_id: findFormaByKeyword("pix"),
              valor: r.valor_a_receber ?? 0,
              pertence_a: "operacao",
            });
          } else if (dest === "dinheiro" && r.destino_dinheiro === "devolver_loja") {
            lines.push({
              id: crypto.randomUUID(),
              forma_pagamento_id: DEVOLVER_LOJA_ID,
              valor: r.valor_a_receber ?? 0,
              pertence_a: "loja",
            });
          } else if (dest === "dinheiro" && r.destino_dinheiro === "repassar_empresa") {
            lines.push({
              id: crypto.randomUUID(),
              forma_pagamento_id: findFormaByKeyword("dinheiro"),
              valor: r.valor_a_receber ?? 0,
              pertence_a: "operacao",
            });
          }
        }
        if (lines.length > 0) updated[r.id] = lines;
      });
      return updated;
    });
  }, [open, formasAtivas, rotas]); // eslint-disable-line react-hooks/exhaustive-deps

  const addPagamento = (rotaId: string) => {
    setPagamentosPorRota((prev) => ({
      ...prev,
      [rotaId]: [...(prev[rotaId] || []), { id: crypto.randomUUID(), forma_pagamento_id: formasAtivas[0]?.id ?? "", valor: 0, pertence_a: "operacao" }],
    }));
  };

  const removePagamento = (rotaId: string, pagId: string) => {
    setPagamentosPorRota((prev) => ({
      ...prev,
      [rotaId]: (prev[rotaId] || []).filter((p) => p.id !== pagId),
    }));
  };

  const updatePagamento = (rotaId: string, pagId: string, field: keyof PagamentoLinha, value: string | number) => {
    setPagamentosPorRota((prev) => ({
      ...prev,
      [rotaId]: (prev[rotaId] || []).map((p) => {
        if (p.id !== pagId) return p;
        const updated = { ...p, [field]: value };
        if (field === "forma_pagamento_id" && value === DEVOLVER_LOJA_ID) {
          updated.pertence_a = "loja";
        }
        // In driver view, lock pertence_a to "loja" for destination-collection routes
        if (isDriverView && field === "pertence_a") {
          const rota = rotas.find((r) => r.id === rotaId);
          if (
            rota?.receber_do_cliente &&
            (rota.meio_cobranca_destino === "maquina_loja" ||
              rota.meio_cobranca_destino === "pix_loja" ||
              (rota.meio_cobranca_destino === "dinheiro" && rota.destino_dinheiro === "devolver_loja"))
          ) {
            updated.pertence_a = "loja";
          }
        }
        return updated;
      }),
    }));
  };

  // Resumo — use integer cents to avoid floating-point issues
  const allPagamentos = Object.values(pagamentosPorRota).flat();
  // In driver view: only cash routes are shown/counted — non-cash are auto-saved silently
  const driverCashPagamentos = isDriverView
    ? Object.entries(pagamentosPorRota)
        .filter(([rotaId]) => rotas.some((r) => r.id === rotaId && isDriverCashRoute(r)))
        .flatMap(([, pags]) => pags)
    : allPagamentos;
  const totalFaturarCents = allPagamentos.filter((p) => p.forma_pagamento_id === FATURAR_ID && p.pertence_a === "operacao").reduce((s, p) => s + Math.round(p.valor * 100), 0);
  const totalOperacaoCents = allPagamentos.filter((p) => p.pertence_a === "operacao").reduce((s, p) => s + Math.round(p.valor * 100), 0);
  const totalDevolvidoCents = allPagamentos.filter((p) => p.forma_pagamento_id === DEVOLVER_LOJA_ID).reduce((s, p) => s + Math.round(p.valor * 100), 0);
  const totalCreditoLojaCents = allPagamentos.filter((p) => p.pertence_a === "loja" && p.forma_pagamento_id !== DEVOLVER_LOJA_ID).reduce((s, p) => s + Math.round(p.valor * 100), 0);
  const totalLojaCents = totalCreditoLojaCents + totalDevolvidoCents;
  // Only faturar routes generate an expected taxa; pago_na_hora is collected in cash at destination
  const totalEsperadoTaxasCents = rotas
    .filter((r) => r.pagamento_operacao === "faturar")
    .reduce(
      (s, r) => s + Math.round((r.taxa_resolvida ?? 0) * 100) + Math.round(getExtrasForRota(r.id) * 100),
      0
    );
  const totalEsperadoReceberCents = rotas.filter((r) => r.receber_do_cliente).reduce((s, r) => s + Math.round((r.valor_a_receber ?? 0) * 100), 0);
  // For pago_na_hora routes on faturado clients the driver also collects the operation fee
  const totalEsperadoPagoNaHoraCents = rotas
    .filter((r) => r.pagamento_operacao === "pago_na_hora")
    .reduce(
      (s, r) => s + Math.round((r.taxa_resolvida ?? 0) * 100) + Math.round(getExtrasForRota(r.id) * 100),
      0
    );
  
  const diffOperacaoCents = totalOperacaoCents - totalEsperadoTaxasCents;
  const diffLojaCents = totalLojaCents - totalEsperadoReceberCents;
  // Faturado: skip faturar taxa balance (not cash), but require pago_na_hora taxa balance
  // Pre-pago: all operation fees are always required
  const isBalanced = (
    isPrePago ? diffOperacaoCents === 0
    : isFaturado ? totalEsperadoPagoNaHoraCents === 0 || (totalOperacaoCents - totalEsperadoPagoNaHoraCents) >= 0
    : diffOperacaoCents === 0
  ) && diffLojaCents === 0;

  const totalOperacao = totalOperacaoCents / 100;
  const totalLoja = totalLojaCents / 100;
  const totalCreditoLoja = totalCreditoLojaCents / 100;
  const totalDevolvido = totalDevolvidoCents / 100;
  const totalFaturar = totalFaturarCents / 100;
  const totalEsperadoTaxas = totalEsperadoTaxasCents / 100;
  const totalEsperadoReceber = totalEsperadoReceberCents / 100;
  const diffOperacao = diffOperacaoCents / 100;
  const diffLoja = diffLojaCents / 100;

  const handleConcluir = async () => {
    // Pre-pago com saldo suficiente não exige pagamentos em dinheiro
    const isPagoViaSaldo = isPrePago && saldoPrePago?.suficiente;
    if (!isDriverView && !isPagoViaSaldo && allPagamentos.length === 0) { toast.error("Registre ao menos um pagamento."); return; }
    if (allPagamentos.some((p) => p.valor <= 0)) { toast.error("Todos os pagamentos devem ter valor positivo."); return; }
    if (!isDriverView && !isPagoViaSaldo && !isBalanced) { toast.error("Os valores não estão balanceados. Verifique os pagamentos."); return; }

    // Persist payments to DB
    if (solicitacaoId) {
      const persistedPagamentos = allPagamentos
        .filter((pag) => pag.forma_pagamento_id !== FATURAR_ID && pag.forma_pagamento_id !== DEVOLVER_LOJA_ID)
        .map((pag) => ({
          solicitacao_id: solicitacaoId,
          rota_id: Object.entries(pagamentosPorRota).find(([, pags]) => pags.some((p) => p.id === pag.id))?.[0] ?? "",
          forma_pagamento_id: pag.forma_pagamento_id,
          valor: pag.valor,
          pertence_a: pag.pertence_a,
          observacao: null as string | null,
          created_by: null as string | null,
        }));
      if (persistedPagamentos.length > 0 || isEditing) {
        try {
          // When editing, delete existing pagamentos for each affected rota before re-inserting
          if (isEditing) {
            const affectedRotaIds = [...new Set(persistedPagamentos.map((p) => p.rota_id).filter(Boolean))];
            // Also delete for rotas that had existing pagamentos (even if user cleared them)
            const rotasWithExisting = rotas
              .filter((r) => existingPagamentos.some((p) => p.rota_id === r.id))
              .map((r) => r.id);
            const allRotaIdsToDelete = [...new Set([...affectedRotaIds, ...rotasWithExisting])];
            await Promise.all(
              allRotaIdsToDelete.map((rotaId) =>
                deletePagamentosByRotaMut.mutateAsync({ rotaId, solicitacaoId })
              )
            );
          }
          if (persistedPagamentos.length > 0) {
            await createPagamentosMut.mutateAsync(persistedPagamentos);
          }
        } catch {
          toast.error("Erro ao salvar pagamentos. Tente novamente.");
          return;
        }
      }
    }

    onConcluir();
    onOpenChange(false);
    if (solicitacaoId) {
      appendHistoricoMut.mutate({ solId: solicitacaoId, tipo: "conciliacao", descricao: "Pagamentos registrados pelo entregador", extra: { usuario_id: user?.id ?? null } });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDriverView ? "Registro de Recebimentos" : "Conciliação de Pagamentos"}
            {isEditing && <Badge variant="outline" className="text-xs">Editando</Badge>}
          </DialogTitle>
        <DialogDescription className="sr-only">.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Info do Cliente */}
          {cliente && !isDriverView && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {cliente.tipo === "pessoa_juridica" ? <Store className="h-4 w-4 text-muted-foreground" /> : <User className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-sm font-semibold">{cliente.nome}</span>
                </div>
                <Badge variant={isFaturado ? "default" : "secondary"} className="text-xs">
                  {isFaturado ? "Faturado" : "Pré-pago"}
                </Badge>
              </div>
              {isPrePago && (
                <Alert className="border-status-pending/30 bg-status-pending/5">
                  <Info className="h-4 w-4 text-status-pending" />
                  <AlertDescription className="text-xs">
                    Cliente <strong>pré-pago</strong> — o pagamento das taxas deve ser cobrado no ato da entrega. Registre os pagamentos recebidos abaixo.
                  </AlertDescription>
                </Alert>
              )}
              {isPrePago && saldoPrePago && (
                <Alert className={saldoPrePago.suficiente ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}>
                  {saldoPrePago.suficiente ? (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                  <AlertDescription className="text-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span>
                        Saldo atual: <strong className={saldoPrePago.suficiente ? "text-primary" : "text-destructive"}>{fmt(saldoPrePago.saldo)}</strong>
                        {" · "}Taxas desta solicitação: <strong>{fmt(saldoPrePago.totalTaxas)}</strong>
                      </span>
                      {!saldoPrePago.suficiente && (
                        <Badge variant="destructive" className="text-xs shrink-0">
                          Faltam {fmt(saldoPrePago.diferenca)}
                        </Badge>
                      )}
                    </div>
                    {!saldoPrePago.suficiente && (
                      <p className="mt-1 text-destructive font-medium">
                        Saldo insuficiente — a conclusão será bloqueada. Solicite uma recarga ao administrador.
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              {isFaturado && (
                <Alert className="border-primary/30 bg-primary/5">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-xs">
                    Cliente <strong>faturado</strong> — as taxas serão incluídas no próximo fechamento. Registre apenas os valores recebidos em mãos (loja).
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {isDriverView && (
            <Alert className="border-primary/30 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs">
                Registre os valores que você recebeu em cada rota, separando por meio de pagamento (Dinheiro, PIX, Cartão).
              </AlertDescription>
            </Alert>
          )}

          {(isDriverView ? rotas.filter(isDriverCashRoute) : rotas).map((rota, i) => {
            const MEIO_COBRANCA_LABELS: Record<string, string> = {
              dinheiro: "Dinheiro",
              maquina_loja: "Máquina da Loja",
              pix_loja: "PIX da Loja",
              pix_empresa: "PIX da Empresa",
            };
            const totalAReceber =
              (rota.pagamento_operacao === "pago_na_hora" ? (rota.taxa_resolvida ?? 0) : 0)
              + (rota.receber_do_cliente ? (rota.valor_a_receber ?? 0) : 0);
            const meiosNomes = [
              ...(rota.meios_pagamento_operacao ?? [])
                .map((id) => formasAtivas.find((f) => f.id === id)?.name)
                .filter(Boolean),
              ...(rota.receber_do_cliente && rota.meio_cobranca_destino
                ? [MEIO_COBRANCA_LABELS[rota.meio_cobranca_destino] ?? rota.meio_cobranca_destino]
                : []),
            ] as string[];
            const mostrarReferencia = isDriverView &&
              (rota.pagamento_operacao === "pago_na_hora" || rota.receber_do_cliente);
            const isRotaFaturada = isDriverView && rota.pagamento_operacao === "faturar";
            const podeRegistrarPagamento = !isRotaFaturada || !!rota.receber_do_cliente;

            // Per-route validation
            const pagRotaOperacaoTotal = (pagamentosPorRota[rota.id] || [])
              .filter((p) => p.pertence_a === "operacao")
              .reduce((s, p) => s + p.valor, 0);
            const pagRotaLojaTotal = (pagamentosPorRota[rota.id] || [])
              .filter((p) => p.pertence_a === "loja" && p.forma_pagamento_id !== DEVOLVER_LOJA_ID)
              .reduce((s, p) => s + p.valor, 0);
            const expectedOperacao = rota.taxa_resolvida != null ? rota.taxa_resolvida : null;
            const expectedLoja = rota.receber_do_cliente ? (rota.valor_a_receber ?? 0) : null;
            const operacaoErro = !isDriverView && expectedOperacao !== null &&
              Math.round(pagRotaOperacaoTotal * 100) !== Math.round(expectedOperacao * 100);
            const lojaErro = !isDriverView && expectedLoja !== null &&
              Math.round(pagRotaLojaTotal * 100) !== Math.round(expectedLoja * 100);

            return (
            <div key={rota.id} className={`rounded-lg border p-4 space-y-3 transition-colors ${
              (operacaoErro || lojaErro) ? "border-amber-500/60 bg-amber-500/5" : "border-border bg-muted/20"
            }`}>
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  {(operacaoErro || lojaErro) && (
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  )}
                  Rota {i + 1} — {getBairroName(rota.bairro_destino_id)}
                </h4>
                {isRotaFaturada && (
                  <Badge variant="default" className="text-xs">Faturado</Badge>
                )}
                {!isDriverView && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Taxa: {fmt(rota.taxa_resolvida ?? 0)}</span>
                    {rota.receber_do_cliente && <span>| Receber: {fmt(rota.valor_a_receber ?? 0)}</span>}
                  </div>
                )}
              </div>

              {(operacaoErro || lojaErro) && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-xs space-y-0.5">
                    {operacaoErro && (
                      <p className="text-amber-700 dark:text-amber-400">
                        <strong>Operação:</strong> registrado <strong>{fmt(pagRotaOperacaoTotal)}</strong>, esperado <strong>{fmt(expectedOperacao!)}</strong>
                      </p>
                    )}
                    {lojaErro && (
                      <p className="text-amber-700 dark:text-amber-400">
                        <strong>Loja:</strong> registrado <strong>{fmt(pagRotaLojaTotal)}</strong>, esperado <strong>{fmt(expectedLoja!)}</strong>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {mostrarReferencia && (
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="text-sm font-semibold tabular-nums text-primary">
                      Receber {fmt(totalAReceber)}
                    </span>
                    {meiosNomes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {meiosNomes.map((nome, idx) => (
                          <Badge key={idx} variant="secondary" className="text-[11px] px-2 py-0.5">
                            {nome}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {meiosNomes.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">Meio de pagamento não especificado.</p>
                  )}
                </div>
              )}

              {!isDriverView && rota.pagamento_operacao === "pago_na_hora" && (
                <Alert className="border-emerald-500/30 bg-emerald-500/5">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <AlertDescription className="text-xs">
                    O cliente do lojista já efetuou o pagamento da taxa de operação no valor de{" "}
                    <strong>{fmt(rota.taxa_resolvida ?? 0)}</strong>. Por isso esta taxa{" "}
                    <strong>não será faturada</strong>.
                  </AlertDescription>
                </Alert>
              )}

              {isRotaFaturada && !rota.receber_do_cliente && (
                <p className="text-xs text-muted-foreground italic">
                  Esta entrega será incluída no faturamento — nenhum valor a receber aqui.
                </p>
              )}

              {podeRegistrarPagamento && (
              <>
              <div className="space-y-2">
                {(pagamentosPorRota[rota.id] || []).map((pag) => (
                  isDriverView ? (
                    <div key={pag.id} className="grid grid-cols-[1fr_100px_auto_auto] gap-2 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">Meio</Label>
                        <Select value={pag.forma_pagamento_id} onValueChange={(v) => updatePagamento(rota.id, pag.id, "forma_pagamento_id", v)}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {formasAtivas.map((f) => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor</Label>
                        <CurrencyInput value={pag.valor} onChange={(v) => updatePagamento(rota.id, pag.id, "valor", v)} />
                      </div>
                      <div className="flex items-end pb-0.5">
                        <Badge
                          variant={pag.pertence_a === "loja" ? "secondary" : "outline"}
                          className="text-[10px] h-9 px-2 rounded-md"
                        >
                          {pag.pertence_a === "loja" ? "Loja" : "Operação"}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removePagamento(rota.id, pag.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div key={pag.id} className="grid grid-cols-[1fr_100px_120px_auto] gap-2 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs">Meio</Label>
                        <Select value={pag.forma_pagamento_id} onValueChange={(v) => updatePagamento(rota.id, pag.id, "forma_pagamento_id", v)}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {formasAtivas.map((f) => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}
                            {isFaturado && <SelectItem value={FATURAR_ID}>Faturar</SelectItem>}
                            <SelectItem value={DEVOLVER_LOJA_ID}>Dinheiro Devolvido à Loja</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor</Label>
                        <CurrencyInput value={pag.valor} onChange={(v) => updatePagamento(rota.id, pag.id, "valor", v)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Pertence a</Label>
                        <Select value={pag.pertence_a} onValueChange={(v) => updatePagamento(rota.id, pag.id, "pertence_a", v)} disabled={pag.forma_pagamento_id === DEVOLVER_LOJA_ID}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="operacao">Operação</SelectItem>
                            <SelectItem value="loja">Loja</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removePagamento(rota.id, pag.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                ))}
              </div>

              <Button variant="outline" size="sm" onClick={() => addPagamento(rota.id)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar pagamento
              </Button>
              </>
              )}
            </div>
            );
          })}

          {/* Resumo */}
          {isDriverView ? (
            <div className="rounded-lg border border-border p-4 space-y-2">
              <h4 className="text-sm font-semibold">Resumo dos Recebimentos</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Total Recebido</span>
                <span className="tabular-nums text-right font-medium">{fmt(driverCashPagamentos.reduce((s, p) => s + p.valor, 0))}</span>
              </div>
              {driverCashPagamentos.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  Nenhum valor recebido — clique em Registrar para confirmar.
                </div>
              ) : (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <CheckCircle className="h-4 w-4" />
                    {driverCashPagamentos.length} pagamento(s) registrado(s)
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-border p-4 space-y-2">
              <h4 className="text-sm font-semibold">Resumo</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Receita Operação</span>
                <span className="tabular-nums text-right">{fmt(totalOperacao)} <span className="text-xs text-muted-foreground">/ {fmt(totalEsperadoTaxas)}</span></span>
                {isFaturado && totalFaturar > 0 && (
                  <>
                    <span className="text-muted-foreground">A Faturar</span>
                    <span className="tabular-nums text-right">{fmt(totalFaturar)}</span>
                  </>
                )}
                <span className="text-muted-foreground">Crédito Loja</span>
                <span className="tabular-nums text-right">{fmt(totalCreditoLoja)} <span className="text-xs text-muted-foreground">/ {fmt(totalEsperadoReceber)}</span></span>
                {totalDevolvido > 0 && (
                  <>
                    <span className="text-muted-foreground pl-4">↳ Devolvido à Loja</span>
                    <span className="tabular-nums text-right">{fmt(totalDevolvido)}</span>
                  </>
                )}
              </div>
              <Separator />
              <div className={`flex items-center gap-2 text-sm font-medium ${isBalanced ? "text-emerald-500" : "text-amber-500"}`}>
                {isBalanced ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {isBalanced ? "Valores balanceados" : `Diferença: Operação ${fmt(diffOperacao)} | Loja ${fmt(diffLoja)}`}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConcluir} disabled={!isDriverView && !isBalanced}>
            {isDriverView
              ? "Registrar Recebimentos"
              : isConcluding ? "Concluir e Conciliar" : isEditing ? "Salvar Alterações" : "Concluir Conciliação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

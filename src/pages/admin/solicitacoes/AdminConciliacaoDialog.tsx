import { useState, useMemo, useEffect, useRef } from "react";
import type { Rota, PagamentoSolicitacao, Solicitacao } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";
import { useFormasPagamento, useBairros } from "@/hooks/useSettings";
import { useRotasBySolicitacao, usePagamentosBySolicitacao, useCreatePagamentos, useUpdateSolicitacao, useAppendHistorico } from "@/hooks/useSolicitacoes";
import { useClientes } from "@/hooks/useClientes";
import { useEntregadores } from "@/hooks/useEntregadores";
import { useConcluirComCaixa } from "@/hooks/useConcluirComCaixa";
import { useFaturas, useConcluirFaturaEntrega } from "@/hooks/useFaturas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import {
  Plus, Trash2, AlertTriangle, CheckCircle, Info,
  Store, Building2, User, MapPin, Truck, ArrowRight, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

interface PagamentoLinha {
  id: string;
  forma_pagamento_id: string;
  valor: number;
  pertence_a: "operacao" | "loja";
}

const FATURAR_ID = "__faturar__";

interface AdminConciliacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solicitacao: Solicitacao;
  onConfirm: () => void;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function AdminConciliacaoDialog({
  open,
  onOpenChange,
  solicitacao,
  onConfirm,
}: AdminConciliacaoDialogProps) {
  const { user } = useAuth();
  const { data: rotas = [] } = useRotasBySolicitacao(solicitacao.id);
  const { data: driverPagamentos = [], isLoading: isLoadingPagamentos } = usePagamentosBySolicitacao(solicitacao.id);
  const createPagamentosMut = useCreatePagamentos();
  const { data: clientes = [] } = useClientes();
  const { data: entregadores = [] } = useEntregadores();
  const concluirComCaixa = useConcluirComCaixa();
  const { data: faturas = [] } = useFaturas();
  const concluirFaturaMut = useConcluirFaturaEntrega();
  const updateSolMut = useUpdateSolicitacao();
  const appendHistoricoMut = useAppendHistorico();
  const { data: formasPagamento = [] } = useFormasPagamento();
  const { data: bairros = [] } = useBairros();

  const getBairroName = (id: string) => bairros.find((b) => b.id === id)?.nome ?? id;
  const formasAtivas = formasPagamento.filter((f) => f.enabled);

  const cliente = useMemo(
    () => clientes.find((c) => c.id === solicitacao.cliente_id) ?? null,
    [solicitacao.cliente_id, clientes]
  );
  const isFaturado = cliente?.modalidade === "faturado";
  const isPrePago = cliente?.modalidade === "pre_pago";

  // Driver totals
  const driverTotal = useMemo(
    () => driverPagamentos.reduce((s, p) => s + p.valor, 0),
    [driverPagamentos]
  );

  // Group driver payments by rota
  const driverByRota = useMemo(() => {
    const map: Record<string, PagamentoSolicitacao[]> = {};
    rotas.forEach((r) => { map[r.id] = []; });
    driverPagamentos.forEach((p) => {
      if (map[p.rota_id]) map[p.rota_id].push(p);
    });
    return map;
  }, [driverPagamentos, rotas]);

  // Controle de expansão do painel de configuração original por rota
  const [expandedRotas, setExpandedRotas] = useState<Set<string>>(new Set());

  // Admin pagamentos state — synced from driver data when queries resolve
  const [pagamentosPorRota, setPagamentosPorRota] = useState<Record<string, PagamentoLinha[]>>({});
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (hasSyncedRef.current || rotas.length === 0) return;
    hasSyncedRef.current = true;
    const initial: Record<string, PagamentoLinha[]> = {};
    rotas.forEach((r) => {
      const driverPags = driverByRota[r.id] || [];
      if (driverPags.length > 0) {
        initial[r.id] = driverPags.map((dp) => ({
          id: `admin-${dp.id}`,
          forma_pagamento_id: dp.forma_pagamento_id,
          valor: dp.valor,
          pertence_a: dp.pertence_a ?? "operacao",
        }));
      } else {
        initial[r.id] = [];
      }
    });
    setPagamentosPorRota(initial);
  }, [rotas, driverByRota]);

  const addPagamento = (rotaId: string) => {
    setPagamentosPorRota((prev) => ({
      ...prev,
      [rotaId]: [
        ...(prev[rotaId] || []),
        {
          id: crypto.randomUUID(),
          forma_pagamento_id: formasAtivas[0]?.id ?? "",
          valor: 0,
          pertence_a: "operacao",
        },
      ],
    }));
  };

  const removePagamento = (rotaId: string, pagId: string) => {
    setPagamentosPorRota((prev) => ({
      ...prev,
      [rotaId]: (prev[rotaId] || []).filter((p) => p.id !== pagId),
    }));
  };

  const updatePagamento = (
    rotaId: string,
    pagId: string,
    field: keyof PagamentoLinha,
    value: string | number
  ) => {
    setPagamentosPorRota((prev) => ({
      ...prev,
      [rotaId]: (prev[rotaId] || []).map((p) =>
        p.id === pagId ? { ...p, [field]: value } : p
      ),
    }));
  };

  // Calculations with integer cents
  const allPagamentos = Object.values(pagamentosPorRota).flat();
  const totalOperacaoCents = allPagamentos
    .filter((p) => p.pertence_a === "operacao")
    .reduce((s, p) => s + Math.round(p.valor * 100), 0);
  const totalLojaCents = allPagamentos
    .filter((p) => p.pertence_a === "loja")
    .reduce((s, p) => s + Math.round(p.valor * 100), 0);
  const totalFaturarCents = allPagamentos
    .filter((p) => p.forma_pagamento_id === FATURAR_ID && p.pertence_a === "operacao")
    .reduce((s, p) => s + Math.round(p.valor * 100), 0);
  // Only faturar routes generate an expected taxa; pago_na_hora is collected in cash at destination
  const totalEsperadoTaxasCents = rotas
    .filter((r) => r.pagamento_operacao === "faturar")
    .reduce((s, r) => s + Math.round((r.taxa_resolvida ?? 0) * 100), 0);
  // For pago_na_hora routes on faturado clients the driver also collects the operation fee
  const totalEsperadoPagoNaHoraCents = rotas
    .filter((r) => r.pagamento_operacao === "pago_na_hora")
    .reduce((s, r) => s + Math.round((r.taxa_resolvida ?? 0) * 100), 0);
  const totalEsperadoReceberCents = rotas
    .filter((r) => r.receber_do_cliente)
    .reduce((s, r) => s + Math.round((r.valor_a_receber ?? 0) * 100), 0);

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
  const totalFaturar = totalFaturarCents / 100;
  const totalEsperadoTaxas = totalEsperadoTaxasCents / 100;
  const totalEsperadoReceber = totalEsperadoReceberCents / 100;
  const diffOperacao = diffOperacaoCents / 100;
  const diffLoja = diffLojaCents / 100;
  const totalAdmin = (totalOperacaoCents + totalLojaCents) / 100;

  const handleConfirm = async () => {
    if (allPagamentos.length === 0) {
      toast.error("Registre ao menos um pagamento.");
      return;
    }
    if (allPagamentos.some((p) => p.valor <= 0)) {
      toast.error("Todos os pagamentos devem ter valor positivo.");
      return;
    }
    if (!isBalanced) {
      toast.error("Os valores não estão balanceados. Verifique os pagamentos.");
      return;
    }

    // Save admin-validated payments (exclude FATURAR_ID sentinel — handled by the fatura system)
    const persistedPagamentos = allPagamentos
      .filter((pag) => pag.forma_pagamento_id !== FATURAR_ID)
      .map((pag) => ({
      solicitacao_id: solicitacao.id,
      rota_id:
        Object.entries(pagamentosPorRota).find(([, pags]) =>
          pags.some((p) => p.id === pag.id)
        )?.[0] ?? "",
      forma_pagamento_id: pag.forma_pagamento_id,
      valor: pag.valor,
      pertence_a: pag.pertence_a,
      observacao: "Conferido pelo ADM" as string | null,
      created_by: user?.id ?? null,
    }));
    if (persistedPagamentos.length > 0) {
      createPagamentosMut.mutate(persistedPagamentos);
    }

    // Generate invoice / conclude delivery
    let faturaNumero: string | undefined;
    let faturaId: string | undefined;
    let autoFechada = false;

    if (solicitacao.status === "em_andamento") {
      // em_andamento: conclude delivery + create fatura atomically via useConcluirComCaixa
      const result = await concluirComCaixa(solicitacao.id);
      if (!result.success) {
        toast.error(result.error ?? "Erro ao concluir solicitação.");
        return;
      }
    } else if (solicitacao.status === "concluida" && cliente?.modalidade === "faturado") {
      // Already concluded + faturado client: call fatura RPC directly (avoid double-caixa)
      const totalTaxas = rotas
        .filter((r) => r.pagamento_operacao === "faturar")
        .reduce((s, r) => s + (r.taxa_resolvida ?? 0), 0);
      const totalRecebido = rotas
        .filter((r) => r.receber_do_cliente)
        .reduce((s, r) => s + (r.valor_a_receber ?? 0), 0);
      const activeFatura = faturas.find(
        (f) => f.cliente_id === solicitacao.cliente_id && f.status_geral === "Aberta"
      );
      try {
        const result = await concluirFaturaMut.mutateAsync({
          p_fatura_id: activeFatura?.id ?? null,
          p_sol_id: solicitacao.id,
          p_cliente_id: solicitacao.cliente_id,
          p_cliente_nome: cliente.nome,
          p_tipo_faturamento: (cliente.frequencia_faturamento as string) ?? "manual",
          p_total_taxas: totalTaxas,
          p_total_recebido: totalRecebido,
          p_sol_codigo: solicitacao.codigo,
          p_num_rotas: rotas.filter((r) => r.pagamento_operacao === "faturar").length,
        });
        if (!result.success) {
          toast.error(result.error ?? "Erro ao gerar/atualizar fatura.");
          return;
        }
        faturaNumero = result.fatura_numero;
        faturaId = result.fatura_id;
        autoFechada = result.auto_fechada ?? false;
      } catch (e) {
        toast.error("Erro ao gerar fatura: " + (e instanceof Error ? e.message : String(e)));
        return;
      }
    }

    // Persist admin_conciliada_at synchronously here — after all fatura mutations and
    // before onConfirm fires — so cache invalidations from concluirFaturaMut cannot
    // trigger a refetch that arrives before this write completes (race condition fix).
    try {
      await updateSolMut.mutateAsync({
        id: solicitacao.id,
        patch: { admin_conciliada_at: new Date().toISOString() },
      });
    } catch {
      // Non-fatal: fatura was created successfully.
      // The solicitacoes cache will self-correct on the next refetch.
    }
    onConfirm();
    onOpenChange(false);
    const descHistorico = faturaNumero
      ? `Fatura ${faturaNumero} gerada${autoFechada ? " — fechada automaticamente" : ""}`
      : "Conciliação administrativa realizada";
    appendHistoricoMut.mutate({
      solId: solicitacao.id,
      tipo: "conciliacao_admin",
      descricao: descHistorico,
      extra: {
        usuario_id: user?.id ?? null,
        metadata: faturaId ? { fatura_id: faturaId, fatura_numero: faturaNumero } : null,
      },
    });
    toast.success("Conciliação conferida e fatura gerada! ✅");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Conciliação Administrativa
            <Badge variant="outline" className="text-xs">
              {solicitacao.codigo}
            </Badge>
          </DialogTitle>
        <DialogDescription className="sr-only">.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Cabeçalho — Solicitação + Cliente + Entregador */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Cliente</span>
                <p className="font-medium flex items-center gap-1.5">
                  {cliente?.nome ?? solicitacao.cliente_id}
                  {isFaturado && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">
                      Faturado
                    </Badge>
                  )}
                  {isPrePago && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      Pré-pago
                    </Badge>
                  )}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Entregador</span>
                <p className="font-medium flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                  {entregadores.find((e) => e.id === solicitacao.entregador_id)?.nome ?? solicitacao.entregador_id}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Taxas Esperadas</span>
                <p className="font-semibold tabular-nums">{fmt(totalEsperadoTaxas)}</p>
              </div>
            </div>

            {/* Driver report summary */}
            {driverPagamentos.length > 0 && (
              <Alert className="border-chart-3/30 bg-chart-3/5">
                <Truck className="h-4 w-4 text-chart-3" />
                <AlertDescription className="text-xs">
                  O entregador registrou <strong>{driverPagamentos.length} recebimento(s)</strong>{" "}
                  totalizando <strong>{fmt(driverTotal)}</strong>. Confira e classifique abaixo como{" "}
                  <em>Operação</em> ou <em>Loja</em>.
                </AlertDescription>
              </Alert>
            )}

            {!isLoadingPagamentos && driverPagamentos.length === 0 && (
              <Alert className="border-amber-500/30 bg-amber-500/5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-xs">
                  O entregador <strong>ainda não registrou</strong> recebimentos para esta solicitação.
                  Cadastre manualmente os pagamentos abaixo.
                </AlertDescription>
              </Alert>
            )}

            {isFaturado && (
              <Alert className="border-primary/30 bg-primary/5">
                <Info className="h-4 w-4 text-primary" />
                <AlertDescription className="text-xs">
                  Cliente <strong>faturado</strong> — as taxas de operação serão incluídas no
                  fechamento. Marque como "Faturar" quando a taxa for cobrada via fatura.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Rotas com pagamentos */}
          {rotas.map((rota, i) => {
            const driverRotaPags = driverByRota[rota.id] || [];
            const driverRotaTotal = driverRotaPags.reduce((s, p) => s + p.valor, 0);
            const isExpanded = expandedRotas.has(rota.id);

            return (
              <div key={rota.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    Rota {i + 1} — {getBairroName(rota.bairro_destino_id)}
                    <span className="text-muted-foreground font-normal">
                      ({rota.responsavel})
                    </span>
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      Taxa: {fmt(rota.taxa_resolvida ?? 0)}
                    </span>
                    {rota.receber_do_cliente && (
                      <span className="flex items-center gap-1">
                        <Store className="h-3 w-3" />
                        Loja: {fmt(rota.valor_a_receber ?? 0)}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Configuração original da rota (colapsável) ── */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedRotas((prev) => {
                      const next = new Set(prev);
                      if (next.has(rota.id)) next.delete(rota.id);
                      else next.add(rota.id);
                      return next;
                    })
                  }
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                >
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                  />
                  {isExpanded ? "Ocultar dados de faturamento" : "Dados de faturamento da solicitação"}
                </button>

                {isExpanded && (
                  <div className="rounded-md border border-border/50 bg-muted/10 p-2.5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div className="space-y-1.5">
                      <span className="flex items-center gap-1 font-semibold text-primary uppercase tracking-wide text-[10px]">
                        <Building2 className="h-3 w-3" />
                        Receita da Operação
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Taxa:</span>
                        <span className="tabular-nums font-medium">{fmt(rota.taxa_resolvida ?? 0)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-muted-foreground">Cobrança:</span>
                        <Badge
                          variant={rota.pagamento_operacao === "faturar" ? "default" : "secondary"}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {rota.pagamento_operacao === "faturar"
                            ? "Faturar"
                            : rota.pagamento_operacao === "pago_na_hora"
                            ? "Pago na hora"
                            : "Descontar saldo"}
                        </Badge>
                      </div>
                      {rota.pagamento_operacao === "pago_na_hora" && rota.meios_pagamento_operacao.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-muted-foreground">Meios aceitos:</span>
                          {rota.meios_pagamento_operacao.map((id) => {
                            const forma = formasPagamento.find((f) => f.id === id);
                            return (
                              <Badge key={id} variant="outline" className="text-[10px] px-1.5 py-0">
                                {forma?.name ?? id}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <span className="flex items-center gap-1 font-semibold text-amber-600 uppercase tracking-wide text-[10px]">
                        <Store className="h-3 w-3" />
                        Cobrança para a Loja
                      </span>
                      {rota.receber_do_cliente ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Cobrar no destino:</span>
                          <span className="tabular-nums font-medium">{fmt(rota.valor_a_receber ?? 0)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Não cobrar do destinatário</span>
                      )}
                    </div>
                  </div>
                )}

                {/* What driver reported */}
                {driverRotaPags.length > 0 && (
                  <div className="rounded-md border border-border/60 bg-muted/20 p-2.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Registrado pelo entregador
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {driverRotaPags.map((dp) => {
                        const forma = formasPagamento.find(
                          (f) => f.id === dp.forma_pagamento_id
                        );
                        return (
                          <Badge
                            key={dp.id}
                            variant="secondary"
                            className="text-xs tabular-nums"
                          >
                            {forma?.name ?? dp.forma_pagamento_id}: {fmt(dp.valor)}
                          </Badge>
                        );
                      })}
                      <Badge variant="outline" className="text-xs tabular-nums font-semibold">
                        Total: {fmt(driverRotaTotal)}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Admin payment rows */}
                <div className="space-y-2">
                  {(pagamentosPorRota[rota.id] || []).map((pag) => (
                    <div
                      key={pag.id}
                      className="grid grid-cols-[1fr_100px_120px_auto] gap-2 items-end"
                    >
                      <div className="space-y-1">
                        <Label className="text-xs">Meio de Pagamento</Label>
                        <Select
                          value={pag.forma_pagamento_id}
                          onValueChange={(v) =>
                            updatePagamento(rota.id, pag.id, "forma_pagamento_id", v)
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {formasAtivas.map((f) => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.name}
                              </SelectItem>
                            ))}
                            {isFaturado && (
                              <SelectItem value={FATURAR_ID}>Faturar</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor</Label>
                        <CurrencyInput
                          value={pag.valor}
                          onChange={(v) =>
                            updatePagamento(rota.id, pag.id, "valor", v)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Pertence a</Label>
                        <Select
                          value={pag.pertence_a}
                          onValueChange={(v) =>
                            updatePagamento(rota.id, pag.id, "pertence_a", v)
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="operacao">Operação</SelectItem>
                            <SelectItem value="loja">Loja</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive"
                        onClick={() => removePagamento(rota.id, pag.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addPagamento(rota.id)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar pagamento
                </Button>

                {i < rotas.length - 1 && <Separator />}
              </div>
            );
          })}

          {/* Resumo Comparativo */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <h4 className="text-sm font-semibold">Resumo Comparativo</h4>

            {/* Comparação entregador vs admin */}
            {driverPagamentos.length > 0 && (
              <div className="grid grid-cols-3 gap-3 text-sm rounded-md bg-muted/30 p-3">
                <div className="text-center">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                    Entregador
                  </span>
                  <span className="tabular-nums font-semibold">{fmt(driverTotal)}</span>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                    ADM Conferido
                  </span>
                  <span className="tabular-nums font-semibold">{fmt(totalAdmin)}</span>
                </div>
              </div>
            )}

            {/* Breakdown */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Receita Operação
              </span>
              <span className="tabular-nums text-right">
                {fmt(totalOperacao)}{" "}
                <span className="text-xs text-muted-foreground">
                  / {fmt(totalEsperadoTaxas)}
                </span>
              </span>

              {isFaturado && totalFaturar > 0 && (
                <>
                  <span className="text-muted-foreground pl-5">↳ A Faturar</span>
                  <span className="tabular-nums text-right">{fmt(totalFaturar)}</span>
                </>
              )}

              <span className="text-muted-foreground flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5" />
                Crédito Loja
              </span>
              <span className="tabular-nums text-right">
                {fmt(totalLoja)}{" "}
                <span className="text-xs text-muted-foreground">
                  / {fmt(totalEsperadoReceber)}
                </span>
              </span>
            </div>

            <Separator />
            <div
              className={`flex items-center gap-2 text-sm font-medium ${
                isBalanced ? "text-emerald-500" : "text-amber-500"
              }`}
            >
              {isBalanced ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {isBalanced
                ? "Valores balanceados — pronto para gerar fatura"
                : `Diferença: Operação ${fmt(diffOperacao)} | Loja ${fmt(diffLoja)}`}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!isBalanced}>
            <CheckCircle className="h-4 w-4 mr-1.5" />
            Conferir e Gerar Fatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

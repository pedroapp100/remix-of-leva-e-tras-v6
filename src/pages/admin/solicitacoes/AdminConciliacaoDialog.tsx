import { useState, useMemo, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Rota, Solicitacao } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useFormasPagamento, useBairros } from "@/hooks/useSettings";
import { useRotasBySolicitacao, useUpdateSolicitacao, useAppendHistorico, useTaxasExtrasByRotaIds } from "@/hooks/useSolicitacoes";
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
  Store, Building2, MapPin, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

interface PagamentoLinha {
  id: string;
  forma_pagamento_id: string;
  valor: number;
  pertence_a: "operacao" | "loja";
}

const FATURAR_ID = "__faturar__";
const DEVOLVER_LOJA_ID = "__devolver_loja__";

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
  const rotaIds = useMemo(() => rotas.map((r) => r.id), [rotas]);
  const { data: taxasExtrasMap = new Map() } = useTaxasExtrasByRotaIds(rotaIds);
  const getExtrasForRota = (rotaId: string): number =>
    (taxasExtrasMap.get(rotaId) ?? []).reduce((s: number, e: { valor: number }) => s + e.valor, 0);
  const queryClient = useQueryClient();
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

  const [expandedRotas, setExpandedRotas] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isConciliada = solicitacao.admin_conciliada_at != null;

  const [pagamentosPorRota, setPagamentosPorRota] = useState<Record<string, PagamentoLinha[]>>({});
  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (hasSyncedRef.current || rotas.length === 0) return;
    hasSyncedRef.current = true;
    const initial: Record<string, PagamentoLinha[]> = {};
    rotas.forEach((r) => {
      const linhas: PagamentoLinha[] = [];
      if (r.pagamento_operacao === "faturar") {
        linhas.push({
          id: crypto.randomUUID(),
          forma_pagamento_id: FATURAR_ID,
          valor: 0,
          pertence_a: "operacao",
        });
      } else if (r.pagamento_operacao === "pago_na_hora") {
        const meioId = r.meios_pagamento_operacao?.[0] ?? formasAtivas[0]?.id ?? "";
        linhas.push({
          id: crypto.randomUUID(),
          forma_pagamento_id: meioId,
          valor: 0,
          pertence_a: "operacao",
        });
      }
      initial[r.id] = linhas;
    });
    setPagamentosPorRota(initial);
  }, [rotas, formasAtivas]);

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
      [rotaId]: (prev[rotaId] || []).map((p) => {
        if (p.id !== pagId) return p;
        const updated = { ...p, [field]: value };
        if (field === "forma_pagamento_id") {
          if (value === DEVOLVER_LOJA_ID) {
            updated.pertence_a = "loja";
          } else if (p.forma_pagamento_id === DEVOLVER_LOJA_ID) {
            updated.pertence_a = "operacao";
          }
        }
        return updated;
      }),
    }));
  };

  // Calculations with integer cents
  const allPagamentos = Object.values(pagamentosPorRota).flat();
  const totalOperacaoCents = allPagamentos
    .filter((p) => p.pertence_a === "operacao")
    .reduce((s, p) => s + Math.round(p.valor * 100), 0);
  const totalDevolvidoCents = allPagamentos
    .filter((p) => p.forma_pagamento_id === DEVOLVER_LOJA_ID)
    .reduce((s, p) => s + Math.round(p.valor * 100), 0);
  const totalCreditoLojaCents = allPagamentos
    .filter((p) => p.pertence_a === "loja" && p.forma_pagamento_id !== DEVOLVER_LOJA_ID)
    .reduce((s, p) => s + Math.round(p.valor * 100), 0);
  const totalLojaCents = totalCreditoLojaCents + totalDevolvidoCents;
  const totalFaturarCents = allPagamentos
    .filter((p) => p.forma_pagamento_id === FATURAR_ID && p.pertence_a === "operacao")
    .reduce((s, p) => s + Math.round(p.valor * 100), 0);
  const totalEsperadoTaxasCents = rotas
    .filter((r) => r.status !== "cancelada" && r.pagamento_operacao === "faturar")
    .reduce((s, r) => s + Math.round((r.taxa_resolvida ?? 0) * 100) + Math.round(getExtrasForRota(r.id) * 100), 0);
  const totalEsperadoPagoNaHoraCents = rotas
    .filter((r) => r.status !== "cancelada" && r.pagamento_operacao === "pago_na_hora")
    .reduce((s, r) => s + Math.round((r.taxa_resolvida ?? 0) * 100) + Math.round(getExtrasForRota(r.id) * 100), 0);
  const lojaRecebeuDireto = (r: Rota) =>
    r.meio_cobranca_destino === "maquina_loja" ||
    r.meio_cobranca_destino === "pix_loja" ||
    (r.meio_cobranca_destino === "dinheiro" && r.destino_dinheiro === "devolver_loja");

  const totalEsperadoReceberCents = rotas
    .filter((r) => r.status !== "cancelada" && r.receber_do_cliente && !lojaRecebeuDireto(r))
    .reduce((s, r) => s + Math.round((r.valor_a_receber ?? 0) * 100), 0);

  const diffOperacaoCents = totalOperacaoCents - totalEsperadoTaxasCents;
  const diffLojaCents = totalLojaCents - totalEsperadoReceberCents;
  const diffFaturarCents = totalFaturarCents - totalEsperadoTaxasCents;

  const isFaturadoNormalBalanced = totalFaturarCents === totalEsperadoTaxasCents &&
    (totalEsperadoPagoNaHoraCents === 0 || (totalOperacaoCents - totalEsperadoPagoNaHoraCents) >= 0);

  const isBalanced = (
    isPrePago
      ? diffOperacaoCents === 0
      : isFaturado
        ? isFaturadoNormalBalanced
        : diffOperacaoCents === 0
  ) && diffLojaCents === 0;

  const totalOperacao = totalOperacaoCents / 100;
  const totalCreditoLoja = totalCreditoLojaCents / 100;
  const totalDevolvido = totalDevolvidoCents / 100;
  const totalFaturar = totalFaturarCents / 100;
  const totalEsperadoTaxas = totalEsperadoTaxasCents / 100;
  const totalEsperadoOperacao = (totalEsperadoTaxasCents + totalEsperadoPagoNaHoraCents) / 100;
  const totalEsperadoReceber = totalEsperadoReceberCents / 100;
  const diffOperacao = diffOperacaoCents / 100;
  const diffLoja = diffLojaCents / 100;
  const diffFaturar = diffFaturarCents / 100;

  const handleConfirm = async () => {
    if (isSubmitting) return;
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
    setIsSubmitting(true);
    try {

    const persistedPagamentos = allPagamentos
      .filter((pag) => pag.forma_pagamento_id !== FATURAR_ID && pag.forma_pagamento_id !== DEVOLVER_LOJA_ID)
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
      const { error: upsertError } = await supabase.rpc('admin_upsert_pagamentos_solicitacao', {
        p_sol_id: solicitacao.id,
        p_pagamentos: JSON.stringify(persistedPagamentos),
        p_usuario_id: user?.id ?? null,
      });
      if (upsertError) throw new Error(upsertError.message);
      queryClient.invalidateQueries({ queryKey: ['pagamentos', solicitacao.id] });
    }

    let faturaNumero: string | undefined;
    let faturaId: string | undefined;
    let autoFechada = false;

    if (solicitacao.status === "em_andamento") {
      // skipFatura=true para clientes faturados: fatura gerada abaixo com base no conciliado.
      // skipCaixa=true sempre: o trigger fn_sync_pagamento_to_caixa cuida da sincronização
      // com o caixa via INSERT em pagamentos_solicitacao feito pela RPC acima.
      const result = await concluirComCaixa(solicitacao.id, {
        skipFatura: isFaturado,
        skipCaixa: true,
      });
      if (!result.success) {
        toast.error(result.error ?? "Erro ao concluir solicitação.");
        return;
      }
      if (result.error) {
        toast.warning(result.error);
      }
    }

    // Fatura para clientes faturados: fonte da verdade é o que o admin conciliou (totalFaturarCents),
    // não a config original da rota. Roda para "em_andamento" recém-concluído e "concluida".
    if (isFaturado && totalFaturarCents > 0) {
      const maquinaLojaId = formasPagamento.find(
        (f) => f.name.toLowerCase().includes("máquina") || f.name.toLowerCase().includes("maquina")
      )?.id;
      const isFaturavelRota = (r: (typeof rotas)[0]) => {
        if (r.status === "cancelada") return false;
        return (
          r.pagamento_operacao === "faturar" ||
          (r.pagamento_operacao === "pago_na_hora" &&
            !!maquinaLojaId &&
            r.meios_pagamento_operacao?.includes(maquinaLojaId))
        );
      };
      const totalRecebido = rotas
        .filter((r) => {
          if (!r.receber_do_cliente) return false;
          if (r.meio_cobranca_destino === "pix_empresa") return true;
          if (r.meio_cobranca_destino === "dinheiro" && r.destino_dinheiro === "repassar_empresa") return true;
          return false;
        })
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
          p_total_taxas: totalFaturarCents / 100,
          p_total_recebido: totalRecebido,
          p_sol_codigo: solicitacao.codigo,
          p_num_rotas: rotas.filter(isFaturavelRota).length,
        });
        if (!result.success) {
          toast.error(result.error ?? "Erro ao gerar/atualizar fatura.");
          return;
        }
        if (result.already_processed) {
          toast.info(
            result.fatura_numero
              ? `Entrega já registrada na fatura ${result.fatura_numero}.`
              : "Entrega já registrada anteriormente."
          );
        }
        faturaNumero = result.fatura_numero;
        faturaId = result.fatura_id;
        autoFechada = result.auto_fechada ?? false;
      } catch (e) {
        toast.error("Erro ao gerar fatura: " + (e instanceof Error ? e.message : String(e)));
        return;
      }
    }

    try {
      await updateSolMut.mutateAsync({
        id: solicitacao.id,
        patch: { admin_conciliada_at: new Date().toISOString() },
      });
    } catch {
      // Non-fatal: fatura was created successfully.
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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col p-0 gap-0 sm:max-w-3xl w-full max-h-[95dvh] sm:max-h-[90vh] overflow-hidden">
        <DialogHeader className="shrink-0 px-4 pt-4 pb-3 sm:px-6 sm:pt-6 border-b">
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            Conciliação Administrativa
            <Badge variant="outline" className="text-xs font-mono">
              {solicitacao.codigo}
            </Badge>
          </DialogTitle>
          <DialogDescription className="sr-only">.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 space-y-6">
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
                <p className="font-medium">
                  {entregadores.find((e) => e.id === solicitacao.entregador_id)?.nome ?? solicitacao.entregador_id}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Total Esperado Operação</span>
                <p className="font-semibold tabular-nums">{fmt(totalEsperadoOperacao)}</p>
                {totalEsperadoTaxasCents > 0 && totalEsperadoPagoNaHoraCents > 0 && (
                  <div className="mt-1 space-y-0.5">
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      Via fatura: {fmt(totalEsperadoTaxas)}
                    </p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      Pago na hora: {fmt(totalEsperadoPagoNaHoraCents / 100)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {!isFaturado ? null : (
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
            const isExpanded = expandedRotas.has(rota.id);

            const taxaLabel =
              rota.pagamento_operacao === "faturar"
                ? "Faturado"
                : rota.pagamento_operacao === "descontar_saldo"
                ? "Saldo Pré-pago"
                : rota.meios_pagamento_operacao.length > 0
                ? rota.meios_pagamento_operacao
                    .map((id) => formasPagamento.find((f) => f.id === id)?.name ?? id)
                    .join(" · ")
                : "Pago na hora";

            const lojaLabel =
              rota.meio_cobranca_destino === "dinheiro"
                ? "Dinheiro Leva e Traz"
                : rota.meio_cobranca_destino === "maquina_loja"
                ? "Máquina da Loja"
                : rota.meio_cobranca_destino === "pix_loja"
                ? "PIX da Loja"
                : rota.meio_cobranca_destino === "pix_empresa"
                ? "PIX da Empresa"
                : null;

            const pagRotaOperacaoTotal = (pagamentosPorRota[rota.id] || [])
              .filter((p) => p.pertence_a === "operacao")
              .reduce((s, p) => s + p.valor, 0);
            const pagRotaLojaTotal = (pagamentosPorRota[rota.id] || [])
              .filter((p) => p.pertence_a === "loja" && p.forma_pagamento_id !== DEVOLVER_LOJA_ID)
              .reduce((s, p) => s + p.valor, 0);
            const extrasRota = getExtrasForRota(rota.id);
            const expectedRotaOperacao = rota.taxa_resolvida != null
              ? rota.taxa_resolvida + extrasRota
              : extrasRota > 0 ? extrasRota : null;
            const expectedRotaLoja = rota.receber_do_cliente && !lojaRecebeuDireto(rota) ? (rota.valor_a_receber ?? 0) : null;
            const rotaOperacaoErro = expectedRotaOperacao !== null &&
              Math.round(pagRotaOperacaoTotal * 100) !== Math.round(expectedRotaOperacao * 100);
            const rotaLojaErro = expectedRotaLoja !== null &&
              Math.round(pagRotaLojaTotal * 100) !== Math.round(expectedRotaLoja * 100);
            const rotaTemErro = rotaOperacaoErro || rotaLojaErro;

            return (
              <div key={rota.id} className={`rounded-lg border p-4 space-y-3 transition-colors ${
                rotaTemErro ? "border-amber-500/60 bg-amber-500/5" : "border-border bg-card"
              }`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {rotaTemErro && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                    Rota {i + 1} — {getBairroName(rota.bairro_destino_id)}
                    <span className="text-muted-foreground font-normal">
                      ({rota.responsavel})
                    </span>
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1 flex-wrap">
                      <Building2 className="h-3 w-3" />
                      Taxa: {fmt(rota.taxa_resolvida ?? 0)}
                      {getExtrasForRota(rota.id) > 0 && (
                        <span className="text-amber-500 tabular-nums">+ Extras: {fmt(getExtrasForRota(rota.id))}</span>
                      )}
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-medium">
                        {taxaLabel}
                      </span>
                    </span>
                    {rota.receber_do_cliente && (
                      <span className="flex items-center gap-1">
                        <Store className="h-3 w-3" />
                        Loja: {fmt(rota.valor_a_receber ?? 0)}
                        {lojaLabel && (
                          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-medium">
                            {lojaLabel}
                          </span>
                        )}
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
                      {(taxasExtrasMap.get(rota.id) ?? []).map((te: { nome: string; valor: number }, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">{te.nome}:</span>
                          <span className="tabular-nums font-medium text-amber-500">{fmt(te.valor)}</span>
                        </div>
                      ))}
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

                {rotaTemErro && (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div className="text-xs space-y-0.5">
                      {rotaOperacaoErro && (
                        <p className="text-amber-700 dark:text-amber-400">
                          <strong>Operação:</strong> registrado <strong>{fmt(pagRotaOperacaoTotal)}</strong>, esperado <strong>{fmt(expectedRotaOperacao!)}</strong>
                        </p>
                      )}
                      {rotaLojaErro && (
                        <p className="text-amber-700 dark:text-amber-400">
                          <strong>Loja:</strong> registrado <strong>{fmt(pagRotaLojaTotal)}</strong>, esperado <strong>{fmt(expectedRotaLoja!)}</strong>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Admin payment rows */}
                <div className="space-y-3">
                  {(pagamentosPorRota[rota.id] || []).map((pag) => (
                    <div
                      key={pag.id}
                      className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[1fr_100px_120px_auto] sm:gap-2 sm:items-end"
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
                            <SelectItem value={DEVOLVER_LOJA_ID}>Dinheiro Devolvido à Loja</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end sm:contents">
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
                            disabled={pag.forma_pagamento_id === DEVOLVER_LOJA_ID}
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
                          className="h-9 w-9 text-destructive self-end"
                          onClick={() => removePagamento(rota.id, pag.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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

              </div>
            );
          })}

          {/* Resumo */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <h4 className="text-sm font-semibold">Resumo</h4>

            <div className="space-y-1.5 text-sm">
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 sm:gap-x-4 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                <span />
                <span className="text-right w-20 sm:w-24">Conferido</span>
                <span className="text-right w-20 sm:w-24">Esperado</span>
              </div>

              <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 sm:gap-x-4 items-center">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  Receita Operação
                </span>
                <span className="tabular-nums text-right w-20 sm:w-24 font-medium">{fmt(totalOperacao)}</span>
                <span className="tabular-nums text-right w-20 sm:w-24 text-muted-foreground">{fmt(totalEsperadoOperacao)}</span>
              </div>

              {isFaturado && totalFaturar > 0 && (
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 sm:gap-x-4 items-center">
                  <span className="text-muted-foreground pl-5">↳ A Faturar</span>
                  <span className="tabular-nums text-right w-20 sm:w-24 font-medium">{fmt(totalFaturar)}</span>
                  <span className="w-20 sm:w-24" />
                </div>
              )}

              <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 sm:gap-x-4 items-center">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5 shrink-0" />
                  Crédito Loja
                </span>
                <span className="tabular-nums text-right w-20 sm:w-24 font-medium">{fmt(totalCreditoLoja)}</span>
                <span className="tabular-nums text-right w-20 sm:w-24 text-muted-foreground">{fmt(totalEsperadoReceber)}</span>
              </div>

              {totalDevolvido > 0 && (
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 sm:gap-x-4 items-center">
                  <span className="text-muted-foreground pl-5">↳ Devolvido à Loja</span>
                  <span className="tabular-nums text-right w-20 sm:w-24 font-medium">{fmt(totalDevolvido)}</span>
                  <span className="w-20 sm:w-24" />
                </div>
              )}
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
                : isFaturado
                  ? [
                      diffFaturarCents !== 0 && `Faturar: ${fmt(diffFaturar)}`,
                      diffLojaCents !== 0 && `Loja: ${fmt(diffLoja)}`,
                    ].filter(Boolean).join(" | ") || `Diferença: Faturar ${fmt(diffFaturar)}`
                  : `Diferença: Operação ${fmt(diffOperacao)} | Loja ${fmt(diffLoja)}`}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 px-4 py-3 sm:px-6 border-t flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="w-full sm:w-auto"
            onClick={handleConfirm}
            disabled={!isBalanced || isSubmitting || isConciliada}
          >
            <CheckCircle className="h-4 w-4 mr-1.5" />
            {isSubmitting
              ? "Processando..."
              : isConciliada
                ? "Já conciliada"
                : "Conferir e Gerar Fatura"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

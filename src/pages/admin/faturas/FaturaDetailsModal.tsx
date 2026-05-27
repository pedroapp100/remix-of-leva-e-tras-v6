import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchRotasBySolicitacao, updateRota } from "@/services/solicitacoes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import type { Fatura, TipoAjuste, EntregaFatura, RotaEntregaFatura } from "@/types/database";
import { STATUS_GERAL_VARIANT, TIPO_FATURAMENTO_LABELS } from "@/lib/formatters";
import { formatCurrency, formatDateBR, formatDateTimeBR } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  FileText, Calendar, Receipt, ArrowDownUp, Pencil, History,
  Banknote, ArrowUpRight, ArrowDownRight, Download, Package,
  ChevronDown, ChevronRight, User, MapPin, Truck, Phone, DollarSign,
  Lock, Trash2, Save, X, CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { generateFaturaPDF } from "@/lib/generateFaturaPDF";
import { RegistrarRepasseDialog } from "./RegistrarRepasseDialog";
import { RegistrarPagamentoDialog } from "./RegistrarPagamentoDialog";
import { AdicionarAjusteDialog } from "./AdicionarAjusteDialog";
import {
  useLancamentosByFatura,
  useAjustesByFatura,
  useHistoricoFatura,
  useUpdateFatura,
  useCreateAjuste,
  useCreateHistoricoFatura,
  useEntregasByFatura,
  useFaturaById,
} from "@/hooks/useFaturas";
import { useCreateReceita } from "@/hooks/useFinanceiro";
import { buildReceitaFromFatura } from "@/lib/faturaReceita";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  fatura: Fatura | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quando true, oculta todos os botões de ação — modo somente leitura para o portal do cliente */
  viewOnly?: boolean;
}

export function FaturaDetailsModal({ fatura, open, onOpenChange, viewOnly = false }: Props) {
  const { user } = useAuth();
  const faturaId = fatura?.id ?? "";

  // ── Queries reais ──
  const { data: liveFatura } = useFaturaById(faturaId);
  const { data: lancamentos = [] } = useLancamentosByFatura(faturaId);
  const { data: ajustes = [] } = useAjustesByFatura(faturaId);
  const { data: historico = [] } = useHistoricoFatura(faturaId);
  const { data: entregas = [] } = useEntregasByFatura(faturaId);

  // ── Mutations ──
  const queryClient = useQueryClient();
  const updateFatura = useUpdateFatura();
  const createAjuste = useCreateAjuste();
  const createHistorico = useCreateHistoricoFatura();
  const createReceita = useCreateReceita();

  const [repasseOpen, setRepasseOpen] = useState(false);
  const [pagamentoOpen, setPagamentoOpen] = useState(false);
  const [ajusteOpen, setAjusteOpen] = useState(false);
  const [lancandoReceita, setLancandoReceita] = useState(false);
  const [entregasExpanded, setEntregasExpanded] = useState(false);
  const [expandedEntrega, setExpandedEntrega] = useState<string | null>(null);
  const [fecharConfirmOpen, setFecharConfirmOpen] = useState(false);
  const [editingEntrega, setEditingEntrega] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, { valor_taxas: number; valor_recebido_cliente: number }>>({});

  if (!fatura) return null;

  const saldo = liveFatura?.saldo_liquido ?? fatura.saldo_liquido ?? 0;
  // saldo < 0 → loja deve pagar à empresa (empresa RECEBE) → verde
  // saldo > 0 → empresa deve repassar à loja (empresa PAGA) → vermelho
  const saldoColor = saldo < 0 ? "text-emerald-500" : saldo > 0 ? "text-destructive" : "text-muted-foreground";
  const saldoLabel = saldo > 0 ? "Operação deve repassar à loja" : saldo < 0 ? "Loja deve pagar à operação" : "Quitado";

  const totalAjustesVal = ajustes.reduce((sum, a) => sum + (a.tipo === "credito" ? a.valor : -a.valor), 0);
  const valorBaseOriginal = (fatura.total_creditos_loja ?? 0) - (fatura.total_debitos_loja ?? 0) + totalAjustesVal;
  const statusRepasse  = liveFatura?.status_repasse  ?? fatura.status_repasse;
  const statusCobranca = liveFatura?.status_cobranca ?? fatura.status_cobranca;

  const handleRepasse = async (valor: number, formaPagamento: string, observacao: string, _comprovantes: File[]) => {
    const novoSaldo = saldo - valor;
    const faturaFinalizada = novoSaldo === 0;
    const taxas = (liveFatura ?? fatura).total_debitos_loja ?? 0;
    try {
      await updateFatura.mutateAsync({
        id: fatura.id,
        patch: {
          saldo_liquido: novoSaldo,
          valor_repasse: valor,
          status_repasse: "Repassado",
          status_geral: faturaFinalizada ? "Finalizada" : fatura.status_geral,
        },
      });
      await createHistorico.mutateAsync({
        fatura_id: fatura.id,
        tipo: "repasse",
        descricao: `Repasse de ${formatCurrency(valor)} registrado${formaPagamento ? ` via ${formaPagamento}` : ""}${observacao ? ` — ${observacao}` : ""}`,
        usuario_id: user?.id ?? null,
        valor_anterior: saldo,
        valor_novo: novoSaldo,
        metadata: null,
      });
      // Auto-lançar Receita de taxas se ainda não foi lançada
      if (taxas > 0 && !receitaJaLancada) {
        const receitaTaxas = buildReceitaFromFatura({
          faturaId: fatura.id,
          faturaNumero: fatura.numero,
          clienteId: fatura.cliente_id,
          valor: taxas,
          tipo: "repasse",
        });
        if (receitaTaxas) {
          await createReceita.mutateAsync(receitaTaxas);
          await createHistorico.mutateAsync({
            fatura_id: fatura.id,
            tipo: "receita_lancada",
            descricao: `Receita de taxas ${formatCurrency(taxas)} lançada automaticamente ao registrar repasse`,
            usuario_id: user?.id ?? null,
            valor_anterior: null,
            valor_novo: taxas,
            metadata: null,
          });
        }
      }
      if (faturaFinalizada) {
        await createHistorico.mutateAsync({
          fatura_id: fatura.id,
          tipo: "finalizada",
          descricao: "Fatura finalizada automaticamente após repasse total",
          usuario_id: user?.id ?? null,
          valor_anterior: null,
          valor_novo: null,
          metadata: null,
        });
      }
      setRepasseOpen(false);
      if (faturaFinalizada) {
        toast.success(`Fatura ${fatura.numero} finalizada!`, {
          description: `Repasse de ${formatCurrency(valor)} registrado — saldo zerado.`,
          duration: 5000,
        });
        onOpenChange(false);
      } else {
        toast.success(`Repasse de ${formatCurrency(valor)} registrado com sucesso`);
      }
    } catch (err) {
      toast.error("Erro ao registrar repasse");
    }
  };

  const handleAjuste = async (tipo: TipoAjuste, valor: number, motivo: string) => {
    const ajusteValor = tipo === "credito" ? valor : -valor;
    const novoSaldo = saldo + ajusteValor;
    const statusAtual = liveFatura?.status_geral ?? fatura.status_geral;
    const deveAutoFinalizar =
      novoSaldo === 0 &&
      (statusAtual === "Fechada" || statusAtual === "Vencida");
    try {
      await createAjuste.mutateAsync({
        fatura_id: fatura.id,
        solicitacao_id: null,
        tipo,
        valor,
        motivo,
        usuario_id: user?.id ?? null,
      });
      await updateFatura.mutateAsync({
        id: fatura.id,
        patch: {
          saldo_liquido: novoSaldo,
          ...(deveAutoFinalizar && { status_geral: "Finalizada" }),
        },
      });
      await createHistorico.mutateAsync({
        fatura_id: fatura.id,
        tipo: "ajuste",
        descricao: `Ajuste ${tipo === "credito" ? "crédito" : "débito"} de ${formatCurrency(valor)} — ${motivo}`,
        usuario_id: user?.id ?? null,
        valor_anterior: saldo,
        valor_novo: novoSaldo,
        metadata: null,
      });
      if (deveAutoFinalizar) {
        await createHistorico.mutateAsync({
          fatura_id: fatura.id,
          tipo: "finalizada",
          descricao: "Fatura finalizada automaticamente — ajuste zerou o saldo",
          usuario_id: user?.id ?? null,
          valor_anterior: null,
          valor_novo: null,
          metadata: null,
        });
      }
      setAjusteOpen(false);
      if (deveAutoFinalizar) {
        toast.success(`Fatura ${fatura.numero} finalizada!`, {
          description: `Ajuste de ${formatCurrency(valor)} zerou o saldo.`,
          duration: 5000,
        });
        onOpenChange(false);
      } else {
        toast.success(`Ajuste de ${formatCurrency(valor)} (${tipo}) adicionado com sucesso`);
      }
    } catch (err) {
      toast.error("Erro ao adicionar ajuste");
    }
  };

  // Receita considerada lançada se houver evento de repasse, pagamento ou lançamento manual no histórico
  const receitaJaLancada = historico.some(
    (h) => h.tipo === "receita_lancada"
  );

  const handleLancarReceita = async () => {
    const taxas = (liveFatura ?? fatura).total_debitos_loja ?? 0;
    const receita = buildReceitaFromFatura({
      faturaId: fatura.id,
      faturaNumero: fatura.numero,
      clienteId: fatura.cliente_id,
      valor: taxas,
      tipo: "repasse",
    });
    if (!receita) {
      toast.error("Não há valor de taxas para lançar nesta fatura.");
      return;
    }
    setLancandoReceita(true);
    try {
      await createReceita.mutateAsync(receita);
      await createHistorico.mutateAsync({
        fatura_id: fatura.id,
        tipo: "receita_lancada",
        descricao: `Receita de ${formatCurrency(taxas)} lançada manualmente no financeiro`,
        usuario_id: user?.id ?? null,
        valor_anterior: null,
        valor_novo: taxas,
        metadata: null,
      });
      toast.success(`Receita de ${formatCurrency(taxas)} lançada com sucesso.`);
    } catch {
      toast.error("Erro ao lançar receita. Tente novamente.");
    } finally {
      setLancandoReceita(false);
    }
  };

  const handleFechar = async () => {
    const saldoZerado = saldo === 0;
    const taxas = (liveFatura ?? fatura).total_debitos_loja ?? 0;
    try {
      await updateFatura.mutateAsync({
        id: fatura.id,
        patch: { status_geral: saldoZerado ? "Finalizada" : "Fechada" },
      });
      await createHistorico.mutateAsync({
        fatura_id: fatura.id,
        tipo: saldoZerado ? "finalizada" : "fechada",
        descricao: saldoZerado
          ? "Fatura finalizada automaticamente — saldo zerado ao fechar"
          : `Fatura fechada — saldo: ${formatCurrency(saldo)}`,
        usuario_id: user?.id ?? null,
        valor_anterior: null,
        valor_novo: null,
        metadata: null,
      });
      if (saldoZerado && taxas > 0 && !receitaJaLancada) {
        const receitaTaxas = buildReceitaFromFatura({
          faturaId: fatura.id,
          faturaNumero: fatura.numero,
          clienteId: fatura.cliente_id,
          valor: taxas,
          tipo: "pagamento",
        });
        if (receitaTaxas) {
          await createReceita.mutateAsync(receitaTaxas);
          await createHistorico.mutateAsync({
            fatura_id: fatura.id,
            tipo: "receita_lancada",
            descricao: `Receita de taxas ${formatCurrency(taxas)} lançada automaticamente ao fechar fatura`,
            usuario_id: user?.id ?? null,
            valor_anterior: null,
            valor_novo: taxas,
            metadata: null,
          });
        }
      }
      setFecharConfirmOpen(false);
      if (saldoZerado) {
        toast.success(`Fatura ${fatura.numero} finalizada!`, {
          description: "Saldo zerado — nenhuma movimentação pendente.",
          duration: 5000,
        });
        onOpenChange(false);
      } else {
        toast.success("Fatura fechada com sucesso");
      }
    } catch (err) {
      toast.error("Erro ao fechar fatura");
    }
  };

  const handlePagamento = async (valor: number, formaPagamento: string, observacao: string) => {
    const novoSaldo = saldo < 0 ? saldo + valor : saldo - valor;
    const faturaFinalizada = novoSaldo === 0;
    const taxas = (liveFatura ?? fatura).total_debitos_loja ?? 0;
    try {
      await updateFatura.mutateAsync({
        id: fatura.id,
        patch: {
          saldo_liquido: novoSaldo,
          status_geral: faturaFinalizada ? "Finalizada" : fatura.status_geral,
        },
      });
      await createHistorico.mutateAsync({
        fatura_id: fatura.id,
        tipo: "pagamento",
        descricao: `Pagamento de ${formatCurrency(valor)} via ${formaPagamento} registrado${observacao ? ` — ${observacao}` : ""}`,
        usuario_id: user?.id ?? null,
        valor_anterior: saldo,
        valor_novo: novoSaldo,
        metadata: { forma_pagamento: formaPagamento, observacao: observacao || null },
      });
      if (faturaFinalizada && taxas > 0 && !receitaJaLancada) {
        const receitaTaxas = buildReceitaFromFatura({
          faturaId: fatura.id,
          faturaNumero: fatura.numero,
          clienteId: fatura.cliente_id,
          valor: taxas,
          tipo: "pagamento",
          formaPagamento,
          observacao: observacao || undefined,
        });
        if (receitaTaxas) {
          await createReceita.mutateAsync(receitaTaxas);
          await createHistorico.mutateAsync({
            fatura_id: fatura.id,
            tipo: "receita_lancada",
            descricao: `Receita de taxas ${formatCurrency(taxas)} lançada automaticamente ao registrar pagamento`,
            usuario_id: user?.id ?? null,
            valor_anterior: null,
            valor_novo: taxas,
            metadata: null,
          });
        }
      }
      if (faturaFinalizada) {
        await createHistorico.mutateAsync({
          fatura_id: fatura.id,
          tipo: "finalizada",
          descricao: "Fatura finalizada automaticamente após pagamento total",
          usuario_id: user?.id ?? null,
          valor_anterior: null,
          valor_novo: null,
          metadata: null,
        });
      }
      setPagamentoOpen(false);
      if (faturaFinalizada) {
        toast.success(`Fatura ${fatura.numero} finalizada!`, {
          description: `Pagamento de ${formatCurrency(valor)} registrado — saldo zerado.`,
          duration: 5000,
        });
        onOpenChange(false);
      } else {
        toast.success(`Pagamento de ${formatCurrency(valor)} registrado com sucesso`);
      }
    } catch (err) {
      toast.error("Erro ao registrar pagamento");
    }
  };
  const handleSaveEntregaEdit = async (solicitacaoId: string, codigo: string) => {
    const vals = editValues[solicitacaoId];
    const original = entregas.find((e) => e.solicitacao_id === solicitacaoId);
    if (!vals || !original) return;

    const diffTaxas = vals.valor_taxas - original.valor_taxas;
    const diffRecebido = vals.valor_recebido_cliente - original.valor_recebido_cliente;
    const novoSaldo = saldo - diffTaxas;

    try {
      // 1. Busca as rotas reais para atualizar valores no banco
      const rotasReais = await fetchRotasBySolicitacao(solicitacaoId);

      if (rotasReais.length > 0 && Math.abs(diffTaxas) > 0.001) {
        const fatorTaxa = original.valor_taxas > 0
          ? vals.valor_taxas / original.valor_taxas
          : 1 / rotasReais.length;
        for (const rota of rotasReais) {
          await updateRota(rota.id, {
            taxa_resolvida: original.valor_taxas > 0
              ? (rota.taxa_resolvida ?? 0) * fatorTaxa
              : vals.valor_taxas / rotasReais.length,
          });
        }
      }

      if (rotasReais.length > 0 && Math.abs(diffRecebido) > 0.001) {
        const rotasComRecebido = rotasReais.filter((r) => r.receber_do_cliente);
        if (rotasComRecebido.length > 0) {
          const fatorRecebido = original.valor_recebido_cliente > 0
            ? vals.valor_recebido_cliente / original.valor_recebido_cliente
            : 1 / rotasComRecebido.length;
          for (const rota of rotasComRecebido) {
            await updateRota(rota.id, {
              valor_a_receber: original.valor_recebido_cliente > 0
                ? (rota.valor_a_receber ?? 0) * fatorRecebido
                : vals.valor_recebido_cliente / rotasComRecebido.length,
            });
          }
        }
      }

      // 2. Ajuste financeiro + saldo se taxa mudou
      if (Math.abs(diffTaxas) > 0.001) {
        const ajusteTipo: TipoAjuste = diffTaxas > 0 ? "debito" : "credito";
        await createAjuste.mutateAsync({
          fatura_id: fatura.id,
          solicitacao_id: solicitacaoId,
          tipo: ajusteTipo,
          valor: Math.abs(diffTaxas),
          motivo: `Correção manual — entrega ${codigo}: taxa ${formatCurrency(original.valor_taxas)} → ${formatCurrency(vals.valor_taxas)}${Math.abs(diffRecebido) > 0.001 ? `, recebido ${formatCurrency(original.valor_recebido_cliente)} → ${formatCurrency(vals.valor_recebido_cliente)}` : ""}`,
          usuario_id: user?.id ?? null,
        });
        await updateFatura.mutateAsync({
          id: fatura.id,
          patch: { saldo_liquido: novoSaldo },
        });
      }

      // 3. Histórico
      await createHistorico.mutateAsync({
        fatura_id: fatura.id,
        tipo: "ajuste",
        descricao: `Entrega ${codigo} editada: taxa ${formatCurrency(original.valor_taxas)} → ${formatCurrency(vals.valor_taxas)}, recebido ${formatCurrency(original.valor_recebido_cliente)} → ${formatCurrency(vals.valor_recebido_cliente)}`,
        usuario_id: user?.id ?? null,
        valor_anterior: saldo,
        valor_novo: Math.abs(diffTaxas) > 0.001 ? novoSaldo : saldo,
        metadata: null,
      });

      // 4. Re-fetcha entregas para refletir novos valores na tela
      await queryClient.invalidateQueries({ queryKey: ["entregas_fatura", fatura.id] });

      setEditingEntrega(null);
      toast.success(`Entrega ${codigo} salva com sucesso`);
    } catch (err) {
      console.error("handleSaveEntregaEdit:", err);
      toast.error("Erro ao salvar edição da entrega");
    }
  };

  const handleGerarPDF = async () => {
    const entregasMap: Record<string, typeof entregas> = entregas.length > 0 ? { [fatura.id]: entregas } : {};
    try {
      await generateFaturaPDF(fatura, entregasMap, lancamentos, ajustes);
      toast.success(`PDF da fatura ${fatura.numero} gerado com sucesso`);
    } catch {
      toast.error("Erro ao gerar PDF");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl max-h-[90vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 shrink-0">
            <DialogTitle className="flex items-center gap-3 text-base sm:text-xl">
              <FileText className="h-5 w-5 text-primary" />
              Fatura {fatura.numero}
            </DialogTitle>
          <DialogDescription className="sr-only">.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="px-4 sm:px-6 pb-6 space-y-6">
              {/* ── 1. Cabeçalho ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{fatura.cliente_nome}</p>
                  {fatura.status_geral === "Finalizada" && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-xs gap-1 h-5">
                        <CheckCircle className="h-3 w-3" /> Fatura Paga
                      </Badge>
                      {receitaJaLancada && (
                        <Badge className="bg-primary/10 text-primary border border-primary/20 text-xs gap-1 h-5">
                          <DollarSign className="h-3 w-3" /> Lançada
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">Tipo</p>
                  <p className="font-medium">{TIPO_FATURAMENTO_LABELS[fatura.tipo_faturamento]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Emissão</p>
                  <p className="font-medium">{formatDateBR(fatura.data_emissao)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Vencimento</p>
                  <p className="font-medium">{formatDateBR(fatura.data_vencimento)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={STATUS_GERAL_VARIANT[fatura.status_geral]}>{fatura.status_geral}</Badge>
                <Badge variant="outline">{liveFatura?.total_entregas ?? fatura.total_entregas} entregas</Badge>
              </div>

              <Separator />

              {/* ── 2. Resumo Financeiro ── */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4" /> Resumo Financeiro</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6 pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                    <SummaryItem label="Créditos Loja" value={fatura.total_creditos_loja ?? 0} icon={<ArrowDownRight className="h-4 w-4 text-emerald-500" />} />
                    <SummaryItem label="Débitos Loja" value={fatura.total_debitos_loja ?? 0} icon={<ArrowUpRight className="h-4 w-4 text-destructive" />} />
                    <SummaryItem label="Ajustes" value={ajustes.reduce((sum, a) => sum + (a.tipo === "credito" ? a.valor : -a.valor), 0)} icon={<ArrowDownUp className="h-4 w-4 text-amber-500" />} />
                    {fatura.status_geral === "Finalizada" ? (
                      <div className="col-span-2 sm:col-span-1 flex gap-4 min-w-0">
                        {(fatura.total_creditos_loja ?? 0) > 0 && (
                          <div className="min-w-0">
                            <p className="text-muted-foreground text-xs mb-1">Repassado ao lojista</p>
                            <p className="text-base sm:text-lg font-bold tabular-nums">{formatCurrency((fatura.total_creditos_loja ?? 0) - (fatura.total_debitos_loja ?? 0))}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="min-w-0">
                        <p className="text-muted-foreground text-xs mb-1">Saldo Líquido</p>
                        {saldo === 0 && valorBaseOriginal > 0 && statusRepasse === "Repassado" ? (
                          <>
                            <p className="text-base sm:text-lg font-bold tabular-nums text-emerald-500">{formatCurrency(valorBaseOriginal)}</p>
                            <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Repassado à loja</p>
                          </>
                        ) : saldo === 0 && valorBaseOriginal < 0 && statusCobranca === "Cobrado" ? (
                          <>
                            <p className="text-base sm:text-lg font-bold tabular-nums text-emerald-500">{formatCurrency(Math.abs(valorBaseOriginal))}</p>
                            <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Cobrado do lojista</p>
                          </>
                        ) : (
                          <>
                            <p className={cn("text-base sm:text-lg font-bold tabular-nums", saldoColor)}>{formatCurrency(saldo)}</p>
                            <p className="text-xs text-muted-foreground break-words">{saldoLabel}</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ── 3. Entregas Incluídas ── */}
              <Card>
                <Collapsible open={entregasExpanded} onOpenChange={setEntregasExpanded}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Entregas Incluídas ({liveFatura?.total_entregas ?? fatura.total_entregas})
                        </span>
                        {entregasExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CardContent className="pb-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      {liveFatura?.total_entregas ?? fatura.total_entregas} entregas realizadas no período de {formatDateBR(fatura.data_emissao)} a {formatDateBR(fatura.data_vencimento)}.
                    </p>
                    <CollapsibleContent>
                      {entregas.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">Dados detalhados das entregas não disponíveis.</p>
                      ) : (
                        <div className="space-y-2">
                          {entregas.map((e) => (
                            <EntregaCard
                              key={e.solicitacao_id}
                              entrega={e}
                              expanded={expandedEntrega === e.solicitacao_id}
                              onToggle={() => setExpandedEntrega(expandedEntrega === e.solicitacao_id ? null : e.solicitacao_id)}
                              isEditing={editingEntrega === e.solicitacao_id}
                              editValue={editValues[e.solicitacao_id]}
                              canEdit={fatura.status_geral !== "Finalizada" && !viewOnly}
                              onStartEdit={() => {
                                setEditingEntrega(e.solicitacao_id);
                                setEditValues(prev => ({
                                  ...prev,
                                  [e.solicitacao_id]: { valor_taxas: e.valor_taxas, valor_recebido_cliente: e.valor_recebido_cliente },
                                }));
                                if (!expandedEntrega) setExpandedEntrega(e.solicitacao_id);
                              }}
                              onCancelEdit={() => setEditingEntrega(null)}
                              onSaveEdit={() => { void handleSaveEntregaEdit(e.solicitacao_id, e.codigo); }}
                              onEditChange={(field, val) => {
                                setEditValues(prev => ({
                                  ...prev,
                                  [e.solicitacao_id]: { ...prev[e.solicitacao_id], [field]: val },
                                }));
                              }}
                              onRemove={() => {
                                toast.success(`Entrega ${e.codigo} removida da fatura`);
                              }}
                            />
                          ))}
                          {/* Totais */}
                          <div className="flex items-center justify-between pt-3 mt-2 border-t border-border/50 text-sm flex-wrap gap-2">
                            <span className="font-medium text-muted-foreground">Totais</span>
                            <div className="flex gap-6 flex-wrap">
                              <span className="text-muted-foreground">{entregas.reduce((s, e) => s + e.total_rotas, 0)} rotas</span>
                              <span className="font-semibold tabular-nums">{formatCurrency(entregas.reduce((s, e) => s + e.valor_taxas, 0))} taxas</span>
                              {fatura.status_geral === "Finalizada" ? (
                                <>
                                  {(fatura.total_creditos_loja ?? 0) > 0 && (
                                    <span className="font-semibold tabular-nums text-destructive">
                                      {formatCurrency((fatura.total_creditos_loja ?? 0) - (fatura.total_debitos_loja ?? 0))} repassado ao lojista
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <span className="font-semibold tabular-nums text-emerald-500">{formatCurrency(entregas.reduce((s, e) => s + e.valor_recebido_cliente, 0))} recebido</span>
                                  <span className={`font-semibold tabular-nums ${saldoColor}`}>{formatCurrency(saldo)} saldo líquido</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </CardContent>
                </Collapsible>
              </Card>

              {/* ── 4. Lançamentos Financeiros ── */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Banknote className="h-4 w-4" /> Lançamentos Financeiros</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {lancamentos.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4">Nenhum lançamento registrado.</p>
                  ) : (
                    <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lancamentos.map((l) => (
                          <TableRow key={l.id}>
                            <TableCell className="text-sm">{l.descricao}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {l.tipo === "credito_loja" ? "Crédito Loja" : l.tipo === "receita_operacao" ? "Receita Op." : l.tipo === "debito_loja" ? "Débito Loja" : "Ajuste"}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn("text-right tabular-nums font-medium whitespace-nowrap", l.sinal === "credito" ? "text-emerald-500" : "text-destructive")}>
                              {l.sinal === "debito" ? "− " : ""}{formatCurrency(l.valor)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={l.status_liquidacao === "liquidado" ? "default" : "secondary"} className="text-xs">
                                {l.status_liquidacao === "liquidado" ? "Liquidado" : l.status_liquidacao === "estornado" ? "Estornado" : "Pendente"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── 5. Ajustes Manuais ── */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Pencil className="h-4 w-4" /> Ajustes Manuais</CardTitle>
                </CardHeader>
                <CardContent>
                  {ajustes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum ajuste registrado.</p>
                  ) : (
                    <div className="space-y-3">
                      {ajustes.map((a) => (
                        <div key={a.id} className="flex items-start justify-between p-3 rounded-lg border border-border/50 bg-muted/30">
                          <div>
                            <p className="text-sm font-medium">{a.motivo}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatDateTimeBR(a.created_at)}</p>
                          </div>
                          <span className={cn("font-semibold tabular-nums", a.tipo === "credito" ? "text-emerald-500" : "text-destructive")}>
                            {a.tipo === "debito" ? "- " : "+ "}{formatCurrency(a.valor)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── 5b. Comprovante de Pagamento (apenas faturas finalizadas) ── */}
              {fatura.status_geral === "Finalizada" && (() => {
                const pagamentos = historico.filter((h) => h.tipo === "pagamento");
                const meta = (h: typeof historico[number]) => {
                  const m = h.metadata as Record<string, string | null> | null;
                  return m ?? {};
                };
                return (
                  <Card className="border-emerald-500/30 bg-emerald-500/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2 text-emerald-600">
                        <CheckCircle className="h-4 w-4" /> Comprovante de Pagamento
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {pagamentos.length === 0 ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span>Fatura quitada por ajuste manual — saldo zerado.</span>
                          </div>
                          {!viewOnly && ((liveFatura ?? fatura).total_debitos_loja ?? 0) > 0 && (
                            receitaJaLancada ? (
                              <Badge className="gap-1.5 bg-primary/10 text-primary border border-primary/20 text-xs py-1.5 px-3">
                                <DollarSign className="h-3.5 w-3.5" /> Lançado no financeiro
                              </Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10"
                                disabled={lancandoReceita}
                                onClick={handleLancarReceita}
                              >
                                <DollarSign className="h-3.5 w-3.5" />
                                {lancandoReceita ? "Lançando..." : "Lançar Fatura"}
                              </Button>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {pagamentos.map((h) => {
                            const m = meta(h);
                            const formaPagamento = m.forma_pagamento ?? null;
                            const obs = m.observacao ?? null;
                            return (
                              <div key={h.id} className="rounded-lg border border-emerald-500/20 bg-background p-4 space-y-2">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <Banknote className="h-4 w-4 text-emerald-500 shrink-0" />
                                    <span className="font-semibold tabular-nums text-emerald-600">
                                      {h.valor_anterior !== null && h.valor_novo !== null
                                        ? formatCurrency(Math.abs(h.valor_anterior - h.valor_novo))
                                        : "—"}
                                    </span>
                                  </div>
                                  <Badge className="bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-xs gap-1">
                                    <CheckCircle className="h-3 w-3" /> Quitado
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                  {formaPagamento && (
                                    <div>
                                      <p className="text-xs text-muted-foreground">Forma de pagamento</p>
                                      <p className="font-medium">{formaPagamento}</p>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-xs text-muted-foreground">Data do pagamento</p>
                                    <p className="font-medium">{formatDateTimeBR(h.created_at)}</p>
                                  </div>
                                  {obs && (
                                    <div className="sm:col-span-2">
                                      <p className="text-xs text-muted-foreground">Observação</p>
                                      <p className="font-medium">{obs}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {!viewOnly && ((liveFatura ?? fatura).total_debitos_loja ?? 0) > 0 && (
                            receitaJaLancada ? (
                              <Badge className="gap-1.5 bg-primary/10 text-primary border border-primary/20 text-xs py-1.5 px-3">
                                <DollarSign className="h-3.5 w-3.5" /> Lançado no financeiro
                              </Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10"
                                disabled={lancandoReceita}
                                onClick={handleLancarReceita}
                              >
                                <DollarSign className="h-3.5 w-3.5" />
                                {lancandoReceita ? "Lançando..." : "Lançar Fatura"}
                              </Button>
                            )
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* ── 6. Histórico ── */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Histórico</CardTitle>                </CardHeader>
                <CardContent>
                  {historico.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
                  ) : (
                    <div className="space-y-3">
                      {historico.map((h) => (
                        <div key={h.id} className="flex items-start gap-3">
                          <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                          <div>
                            <p className="text-sm">{h.descricao}</p>
                            <p className="text-xs text-muted-foreground">{formatDateTimeBR(h.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── 7. Ações ── */}
              {!viewOnly && fatura.status_geral !== "Finalizada" && (
                <>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    {(fatura.status_geral === "Fechada" || fatura.status_geral === "Vencida") && saldo > 0 && (
                      <Button variant="outline" onClick={() => setRepasseOpen(true)}>
                        <ArrowUpRight className="h-4 w-4 mr-1.5" /> Registrar Repasse
                      </Button>
                    )}
                    {(fatura.status_geral === "Fechada" || fatura.status_geral === "Vencida") && saldo < 0 && (
                      <Button variant="outline" onClick={() => setPagamentoOpen(true)}>
                        <Banknote className="h-4 w-4 mr-1.5" /> Registrar Pagamento
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setAjusteOpen(true)}>
                      <Pencil className="h-4 w-4 mr-1.5" /> Adicionar Ajuste
                    </Button>
                    <Button variant="outline" onClick={handleGerarPDF}>
                      <Download className="h-4 w-4 mr-1.5" /> Gerar PDF
                    </Button>
                    {fatura.status_geral === "Aberta" && (
                      <Button variant="outline" onClick={() => setFecharConfirmOpen(true)}>
                        <Lock className="h-4 w-4 mr-1.5" /> Fechar Fatura
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-dialogs */}
      <RegistrarRepasseDialog
        fatura={fatura}
        open={repasseOpen}
        onOpenChange={setRepasseOpen}
        onConfirm={handleRepasse}
      />
      <RegistrarPagamentoDialog
        fatura={fatura}
        open={pagamentoOpen}
        onOpenChange={setPagamentoOpen}
        onConfirm={handlePagamento}
      />
      <AdicionarAjusteDialog
        fatura={fatura}
        open={ajusteOpen}
        onOpenChange={setAjusteOpen}
        onConfirm={handleAjuste}
      />
      <ConfirmDialog
        open={fecharConfirmOpen}
        onOpenChange={setFecharConfirmOpen}
        title="Fechar Fatura"
        description={`Tem certeza que deseja fechar a fatura ${fatura.numero}? O saldo atual é ${formatCurrency(saldo)}. Após o fechamento, a fatura não poderá mais receber novas entregas.`}
        confirmLabel="Fechar Fatura"
        onConfirm={handleFechar}
      />
    </>
  );
}

function SummaryItem({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1">{icon} {label}</p>
      <p className="text-base sm:text-lg font-semibold tabular-nums">{formatCurrency(value)}</p>
    </div>
  );
}

function EntregaCard({ entrega, expanded, onToggle, isEditing, editValue, canEdit, onStartEdit, onCancelEdit, onSaveEdit, onEditChange, onRemove }: {
  entrega: EntregaFatura;
  expanded: boolean;
  onToggle: () => void;
  isEditing?: boolean;
  editValue?: { valor_taxas: number; valor_recebido_cliente: number };
  canEdit?: boolean;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
  onSaveEdit?: () => void;
  onEditChange?: (field: "valor_taxas" | "valor_recebido_cliente", value: number) => void;
  onRemove?: () => void;
}) {
  const toDisplay = (v: number) =>
    v === 0 ? "" : v.toFixed(2).replace(".", ",");

  const [taxasStr, setTaxasStr] = useState(() => toDisplay(editValue?.valor_taxas ?? 0));
  const [recebidoStr, setRecebidoStr] = useState(() => toDisplay(editValue?.valor_recebido_cliente ?? 0));

  // Sincroniza ao entrar no modo edição
  useEffect(() => {
    if (isEditing && editValue) {
      setTaxasStr(toDisplay(editValue.valor_taxas));
      setRecebidoStr(toDisplay(editValue.valor_recebido_cliente));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  const parseVal = (s: string) => parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  return (
    <div className={cn("border rounded-lg overflow-hidden", isEditing ? "border-primary/50 ring-1 ring-primary/20" : "border-border/50")}>
      <div className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/30 transition-colors">
        <button onClick={onToggle} className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            <span className="font-mono text-xs font-medium text-primary">{entrega.codigo}</span>
          </div>
          <Badge variant={entrega.status === "concluida" ? "default" : "destructive"} className="text-[10px] h-5">
            {entrega.status === "concluida" ? "Concluída" : "Cancelada"}
          </Badge>
        </button>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="font-semibold tabular-nums text-sm">{formatCurrency(entrega.valor_taxas)}</span>
          {canEdit && !isEditing && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onStartEdit?.(); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onRemove?.(); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          {isEditing && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={(e) => { e.stopPropagation(); onSaveEdit?.(); }}>
                <Save className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onCancelEdit?.(); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-border/30 bg-muted/20">
          {/* Edit form */}
          {isEditing && editValue && (
            <div className="grid grid-cols-2 gap-3 py-3 p-3 mb-3 rounded-md border border-primary/20 bg-primary/5">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Valor Taxas (R$)</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={taxasStr}
                  placeholder="0,00"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9,]/g, "");
                    setTaxasStr(raw);
                    onEditChange?.("valor_taxas", parseVal(raw));
                  }}
                  onBlur={() => {
                    const n = parseVal(taxasStr);
                    setTaxasStr(n === 0 ? "" : n.toFixed(2).replace(".", ","));
                  }}
                  className="h-8 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Valor Recebido (R$)</label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={recebidoStr}
                  placeholder="0,00"
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9,]/g, "");
                    setRecebidoStr(raw);
                    onEditChange?.("valor_recebido_cliente", parseVal(raw));
                  }}
                  onBlur={() => {
                    const n = parseVal(recebidoStr);
                    setRecebidoStr(n === 0 ? "" : n.toFixed(2).replace(".", ","));
                  }}
                  className="h-8 text-sm tabular-nums"
                />
              </div>
            </div>
          )}

          {/* Info geral da entrega */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 text-sm">
            <div className="flex items-start gap-2">
              <Truck className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Entregador</p>
                <p className="font-medium text-sm">{entrega.entregador_nome}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Conclusão</p>
                <p className="font-medium text-sm">{formatDateTimeBR(entrega.data_conclusao)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Ponto de Coleta</p>
                <p className="font-medium text-sm">{entrega.ponto_coleta}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Banknote className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Recebido do cliente</p>
                <p className={cn("font-medium text-sm tabular-nums", entrega.valor_recebido_cliente > 0 ? "text-emerald-500" : "text-muted-foreground")}>
                  {entrega.valor_recebido_cliente > 0 ? formatCurrency(entrega.valor_recebido_cliente) : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Rotas detalhadas */}
          <div className="mt-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Rotas ({entrega.rotas?.length ?? 0})
            </p>
            <div className="space-y-2">
              {(entrega.rotas ?? []).map((rota, i) => (
                <RotaCard key={i} rota={rota} index={i} />
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 mt-3 border-t border-border/30 text-sm">
            <span className="text-muted-foreground">Taxa total da entrega</span>
            <span className="font-semibold tabular-nums">{formatCurrency(isEditing && editValue ? editValue.valor_taxas : entrega.valor_taxas)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

const MEIO_COBRANCA_LABELS: Record<string, { label: string; className: string }> = {
  maquina_loja: { label: "Máquina da Loja", className: "border-blue-500/50 text-blue-600 bg-blue-500/5" },
  pix_loja:     { label: "PIX da Loja",     className: "border-violet-500/50 text-violet-600 bg-violet-500/5" },
  pix_empresa:  { label: "PIX Empresa",     className: "border-emerald-500/50 text-emerald-600 bg-emerald-500/5" },
};

function RotaCard({ rota, index }: { rota: RotaEntregaFatura; index: number }) {
  return (
    <div className="rounded-md border border-border/40 bg-background/50 p-2.5 text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium flex items-center gap-1.5">
          <MapPin className="h-3 w-3 text-primary" />
          Rota {index + 1} — {rota.bairro_destino}
        </span>
        <div className="flex items-center gap-1.5">
          {rota.valor_receber != null && rota.meio_cobranca_destino === "dinheiro" && (
            <Badge variant="outline" className={`text-[10px] h-5 ${
              rota.destino_dinheiro === "repassar_empresa"
                ? "border-blue-500/50 text-blue-600 bg-blue-500/5"
                : "border-orange-500/50 text-orange-600 bg-orange-500/5"
            }`}>
              {rota.destino_dinheiro === "repassar_empresa" ? "Dinheiro → Empresa" : "Dinheiro → Loja"}
            </Badge>
          )}
          {rota.valor_receber != null && rota.meio_cobranca_destino && rota.meio_cobranca_destino !== "dinheiro" && MEIO_COBRANCA_LABELS[rota.meio_cobranca_destino] && (
            <Badge variant="outline" className={`text-[10px] h-5 ${MEIO_COBRANCA_LABELS[rota.meio_cobranca_destino].className}`}>
              {MEIO_COBRANCA_LABELS[rota.meio_cobranca_destino].label}
            </Badge>
          )}
          <Badge variant={rota.status === "concluida" ? "default" : "destructive"} className="text-[10px] h-5">
            {rota.status === "concluida" ? "Concluída" : "Cancelada"}
          </Badge>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground">
        <span className="flex items-center gap-1 text-xs"><User className="h-3 w-3" />{rota.responsavel}</span>
        <span className="flex items-center gap-1 text-xs"><Phone className="h-3 w-3" />{rota.telefone}</span>
        <div className="flex flex-col gap-0.5">
          {rota.pagamento_operacao === "faturar" && (
            <Badge variant="outline" className="text-[10px] h-4 px-1 w-fit border-border text-muted-foreground">
              Faturado
            </Badge>
          )}
          {rota.pagamento_operacao === "pago_na_hora" && (
            <Badge variant="outline" className="text-[10px] h-4 px-1 w-fit border-amber-500/50 text-amber-600 bg-amber-500/5">
              Pago no ato
            </Badge>
          )}
          <span className="flex items-center gap-1 text-xs">
            <DollarSign className="h-3 w-3" />
            Taxa: {formatCurrency(rota.taxa)}
          </span>
          {rota.taxas_extras.map((te, i) => (
            <span key={i} className="flex items-center gap-1 text-xs text-amber-600">
              <DollarSign className="h-3 w-3" />
              {te.nome}: {formatCurrency(te.valor)}
            </span>
          ))}
          {rota.taxas_extras.length > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-foreground border-t border-border/40 pt-0.5 mt-0.5">
              <DollarSign className="h-3 w-3" />
              Subtotal: {formatCurrency(rota.taxa + rota.taxas_extras.reduce((s, t) => s + t.valor, 0))}
            </span>
          )}
        </div>
        {rota.valor_receber != null && (
          <span className="flex items-center gap-1 text-xs text-emerald-500">
            <DollarSign className="h-3 w-3" />
            Recebido: {formatCurrency(rota.valor_receber)}
          </span>
        )}
      </div>
    </div>
  );
}

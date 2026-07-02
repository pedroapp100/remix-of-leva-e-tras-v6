import { useMemo, useState, useCallback, lazy, Suspense } from "react";
import type { Solicitacao, Rota, PagamentoSolicitacao } from "@/types/database";
import { STATUS_SOLICITACAO_LABELS } from "@/types/database";
import { TipoOperacaoBadge } from "@/components/shared/TipoOperacaoBadge";
import { useRotasBySolicitacao, usePagamentosBySolicitacao, useHistoricoBySolicitacao } from "@/hooks/useSolicitacoes";
import { useClientes } from "@/hooks/useClientes";
import { useEntregadores } from "@/hooks/useEntregadores";
import { useAdminProfiles } from "@/hooks/useUsers";
import { useBairros, useRegioes, useFormasPagamento } from "@/hooks/useSettings";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, Phone, User, Clock, DollarSign, MessageCircle, Store, Building2, Plus, Truck, CheckCircle, Receipt, X, XCircle, ArrowRight, Coins, CheckCircle2, CheckCheck, ChevronDown } from "lucide-react";

const FATURAR_ID = "__faturar__";

const ConciliacaoDialogLazy = lazy(() =>
  import("@/pages/admin/solicitacoes/ConciliacaoDialog").then((m) => ({ default: m.ConciliacaoDialog }))
);

const HISTORICO_TIPO_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  criacao:          { icon: Plus,         color: "text-emerald-500" },
  atribuicao:       { icon: User,         color: "text-primary" },
  inicio:           { icon: Truck,        color: "text-amber-500" },
  conclusao:        { icon: CheckCircle,  color: "text-emerald-500" },
  conciliacao:      { icon: DollarSign,   color: "text-primary" },
  conciliacao_admin:{ icon: Receipt,      color: "text-primary" },
  cancelamento:     { icon: X,            color: "text-destructive" },
  rejeicao:         { icon: XCircle,      color: "text-destructive" },
  transferencia:    { icon: ArrowRight,   color: "text-amber-500" },
};

// tipoStyles removed — now using TipoOperacaoBadge component

const PAGAMENTO_OPERACAO_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  faturar:         { label: "Faturado",         variant: "default" },
  pago_na_hora:    { label: "Pago na hora",      variant: "outline" },
  descontar_saldo: { label: "Desconto em saldo", variant: "secondary" },
};

interface ViewSolicitacaoDialogProps {
  solicitacao: Solicitacao | null;
  onClose: () => void;
  isDriverView?: boolean;
  onConcluir?: () => void;
}

const fmt = (v: number | null | undefined) => v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

const statusVariant = (s: string): "default" | "secondary" | "outline" | "destructive" => {
  switch (s) {
    case "concluida": return "default";
    case "pendente": return "secondary";
    case "cancelada": case "rejeitada": return "destructive";
    default: return "outline";
  }
};

function buildWhatsAppUrl(phone: string, clienteName: string): string {
  const digits = phone.replace(/\D/g, "");
  const fullNumber = digits.length <= 11 ? `55${digits}` : digits;
  const message = encodeURIComponent(`Olá, tudo bem! Sou entregador do ${clienteName}. Me manda sua localização!`);
  return `https://wa.me/${fullNumber}?text=${message}`;
}

/* ── Sub-components ── */

function RotaContactCard({ rota, clienteName, getBairroName, getRegiaoByBairro }: { rota: Rota; clienteName: string; getBairroName: (id: string) => string; getRegiaoByBairro: (id: string) => string }) {
  return (
    <div className="rounded-md border border-primary/20 bg-muted/40 p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary shrink-0" />
        <div>
          <p className="font-medium text-foreground">{getBairroName(rota.bairro_destino_id)}</p>
          <p className="text-xs text-muted-foreground">{getRegiaoByBairro(rota.bairro_destino_id)}</p>
        </div>
      </div>
      <Separator className="my-1" />
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="font-medium text-foreground">{rota.responsavel}</span>
      </div>
      <div className="flex items-center gap-2">
        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="font-medium text-foreground">{rota.telefone}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={buildWhatsAppUrl(rota.telefone, clienteName)}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center justify-center gap-1.5 rounded-full px-2.5 py-1 bg-green-500/15 text-green-600 hover:bg-green-500/25 transition-colors text-xs font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          </TooltipTrigger>
          <TooltipContent side="top">Pedir localização via WhatsApp</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function RotaPaymentPreview({ rota, getFormaPagamentoName }: { rota: Rota; getFormaPagamentoName: (id: string) => string }) {
  const badge = PAGAMENTO_OPERACAO_BADGE[rota.pagamento_operacao] ?? { label: rota.pagamento_operacao, variant: "outline" as const };
  return (
    <div className="space-y-2">
      {/* Card Operação */}
      <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium text-xs uppercase tracking-wide">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            Operação
          </span>
          <Badge
            variant={badge.variant}
            className={`text-[10px] px-1.5 py-0${
              rota.pagamento_operacao === "pago_na_hora" ? " border-amber-500 text-amber-600" : ""
            }`}
          >
            {badge.label}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Taxa de Entrega</span>
          <span className="tabular-nums font-medium">{fmt(rota.taxa_resolvida)}</span>
        </div>
        {rota.meios_pagamento_operacao.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {rota.meios_pagamento_operacao.map((id) => (
              <Badge key={id} variant="secondary" className="text-[10px] px-1.5 py-0">
                {getFormaPagamentoName(id)}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Card Loja */}
      {rota.receber_do_cliente && (
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5">
          <span className="flex items-center gap-1.5 font-medium text-xs uppercase tracking-wide">
            <Store className="h-3.5 w-3.5 text-status-pending" />
            Loja
          </span>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Cobrar no destino</span>
            <span className="tabular-nums font-medium">{fmt(rota.valor_a_receber)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function RotaConciliationCard({ rota, pagamentos, isFaturado, getBairroName, getRegiaoByBairro, getFormaPagamentoName }: { rota: Rota; pagamentos: PagamentoSolicitacao[]; isFaturado: boolean; getBairroName: (id: string) => string; getRegiaoByBairro: (id: string) => string; getFormaPagamentoName: (id: string) => string }) {
  const pagOperacao = pagamentos.filter((p) => p.pertence_a === "operacao");
  const pagLoja = pagamentos.filter((p) => p.pertence_a === "loja");

  return (
    <div className="space-y-2">
      {/* Destino */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span>{getBairroName(rota.bairro_destino_id)} — {getRegiaoByBairro(rota.bairro_destino_id)}</span>
      </div>

      {/* Card Operação */}
      <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium text-xs uppercase tracking-wide">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            Operação
          </span>
          {pagOperacao.length > 0 && (
            <Badge variant={isFaturado ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
              {getFormaPagamentoName(pagOperacao[0].forma_pagamento_id)}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Taxa de Entrega</span>
          <span className="tabular-nums font-medium">{fmt(rota.taxa_resolvida)}</span>
        </div>
        {pagOperacao.length > 0 && (
          <div className="flex items-center justify-between text-sm border-t border-border pt-1.5">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums font-medium">{fmt(pagOperacao.reduce((s, p) => s + p.valor, 0))}</span>
          </div>
        )}
      </div>

      {/* Card Loja */}
      {pagLoja.length > 0 && (
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-xs uppercase tracking-wide">
              <Store className="h-3.5 w-3.5 text-status-pending" />
              Loja
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {getFormaPagamentoName(pagLoja[0].forma_pagamento_id)}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Cobrar no destino</span>
            <span className="tabular-nums font-medium">{fmt(pagLoja.reduce((s, p) => s + p.valor, 0))}</span>
          </div>
        </div>
      )}

      {/* Fallback if no pagamentos but has receber_do_cliente */}
      {pagLoja.length === 0 && rota.receber_do_cliente && (
        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5">
          <span className="flex items-center gap-1.5 font-medium text-xs uppercase tracking-wide">
            <Store className="h-3.5 w-3.5 text-status-pending" />
            Loja
          </span>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Cobrar no destino</span>
            <span className="tabular-nums font-medium">{fmt(rota.valor_a_receber)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Dialog ── */

export function ViewSolicitacaoDialog({ solicitacao, onClose, isDriverView = false, onConcluir }: ViewSolicitacaoDialogProps) {
  const { data: rotas = [] } = useRotasBySolicitacao(solicitacao?.id ?? "");
  const { data: allPagamentos = [] } = usePagamentosBySolicitacao(solicitacao?.id ?? "");
  const { data: historicoRows = [] } = useHistoricoBySolicitacao(solicitacao?.id ?? "");
  const { data: clientes = [] } = useClientes();
  const { data: entregadores = [] } = useEntregadores();
  const { data: adminProfiles = [] } = useAdminProfiles();
  const { data: bairros = [] } = useBairros();
  const { data: regioes = [] } = useRegioes();
  const { data: formasPagamento = [] } = useFormasPagamento();

  const getBairroName = (id: string) => bairros.find((b) => b.id === id)?.nome ?? id;
  const getRegiaoByBairro = (bairroId: string) => {
    const bairro = bairros.find((b) => b.id === bairroId);
    return bairro ? regioes.find((r) => r.id === bairro.region_id)?.name ?? "—" : "—";
  };
  const getFormaPagamentoName = (id: string) => {
    if (id === FATURAR_ID) return "Faturado";
    return formasPagamento.find((f) => f.id === id)?.name ?? id;
  };

  const clienteData = useMemo(
    () => solicitacao ? clientes.find((c) => c.id === solicitacao.cliente_id) : null,
    [solicitacao?.cliente_id, clientes]
  );
  const clienteName = clienteData?.nome ?? (solicitacao?.cliente_id ?? "—");
  const entregadorName = useMemo(
    () => solicitacao?.entregador_id ? (entregadores.find((e) => e.id === solicitacao.entregador_id)?.nome ?? solicitacao.entregador_id) : "—",
    [solicitacao?.entregador_id, entregadores]
  );
  const isConcluida = solicitacao?.status === "concluida";
  const isFaturado = clienteData?.modalidade === "faturado";
  const isPrePago = clienteData?.modalidade === "pre_pago";

  const pagamentosPorRota = useMemo(() => {
    if (!isConcluida) return {};
    const map: Record<string, PagamentoSolicitacao[]> = {};
    rotas.forEach((r) => { map[r.id] = allPagamentos.filter(p => p.rota_id === r.id); });
    return map;
  }, [isConcluida, rotas, allPagamentos]);

  const conciliacao = useMemo(() => {
    if (!isConcluida || !rotas.length) return null;
    const totalTaxas = rotas.reduce((s, r) => s + (r.taxa_resolvida ?? 0), 0);
    const totalLoja = rotas.filter((r) => r.receber_do_cliente).reduce((s, r) => s + (r.valor_a_receber ?? 0), 0);
    const totalEntregadorRecebe = (isFaturado || isPrePago) ? totalLoja : totalTaxas + totalLoja;
    return { totalTaxas, totalLoja, totalEntregadorRecebe };
  }, [isConcluida, rotas, isFaturado, isPrePago]);

  // Per-rota registration state (driver view) — merged: BD real data + local session
  const rotasComPagamentoBD = useMemo(
    () => new Set(allPagamentos.map((p) => p.rota_id).filter((id): id is string => !!id)),
    [allPagamentos]
  );
  const [rotasRegistradasLocal, setRotasRegistradasLocal] = useState<Set<string>>(new Set());
  const rotasRegistradas = useMemo(
    () => new Set([...rotasComPagamentoBD, ...rotasRegistradasLocal]),
    [rotasComPagamentoBD, rotasRegistradasLocal]
  );
  const [rotaSelecionada, setRotaSelecionada] = useState<Rota | null>(null);
  const [expandedRotas, setExpandedRotas] = useState<Set<string>>(new Set());
  const [rotasFaturadaVisitadas, setRotasFaturadaVisitadas] = useState<Set<string>>(new Set());
  const [historicoAberto, setHistoricoAberto] = useState(!isDriverView);
  const [cabecalhoAberto, setCabecalhoAberto] = useState(!isDriverView);
  const marcarRotaFaturadaConcluida = useCallback((rotaId: string) => {
    setRotasFaturadaVisitadas((prev) => new Set([...prev, rotaId]));
    setExpandedRotas((prev) => { const next = new Set(prev); next.delete(rotaId); return next; });
  }, []);
  const toggleExpandRota = useCallback((rotaId: string) => {
    setExpandedRotas((prev) => {
      const next = new Set(prev);
      if (next.has(rotaId)) next.delete(rotaId); else next.add(rotaId);
      return next;
    });
  }, []);
  const marcarRotaRegistrada = useCallback((rotaId: string) => {
    setRotasRegistradasLocal((prev) => new Set([...prev, rotaId]));
    setExpandedRotas((prev) => { const next = new Set(prev); next.delete(rotaId); return next; });
  }, []);

  if (!solicitacao) return null;

  const rotasObrigatorias = rotas.filter(
    (r) => r.pagamento_operacao === "pago_na_hora" || r.receber_do_cliente
  );
  const qtdRegistradas = rotasObrigatorias.filter((r) => rotasRegistradas.has(r.id)).length;
  const todasRegistradas = rotasObrigatorias.length === 0 || qtdRegistradas === rotasObrigatorias.length;
  const rotasFaltando = rotasObrigatorias.filter((r) => !rotasRegistradas.has(r.id));

  return (
    <>
      <Dialog open={!!solicitacao} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-1">
            <span className="text-base font-semibold">Entrega {solicitacao.codigo}</span>
            <Badge variant={statusVariant(solicitacao.status)} className="w-fit">
              {STATUS_SOLICITACAO_LABELS[solicitacao.status]}
            </Badge>
          </DialogTitle>
        <DialogDescription className="sr-only">.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Info Geral — sempre visível */}
          <div className="text-sm">
            <span className="text-muted-foreground">Cliente</span>
            <p className="font-medium flex items-center gap-1.5">
              {clienteName}
              {isFaturado && <Badge variant="default" className="text-[10px] px-1.5 py-0">Faturado</Badge>}
              {isPrePago && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Pré-pago</Badge>}
            </p>
          </div>

          {/* Ponto de Coleta — sempre visível */}
          {solicitacao.tipo_coleta === "cliente_loja" ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Local de Coleta</span>
                <p className="font-medium flex items-center gap-1.5 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {solicitacao.ponto_coleta}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Local de Entrega</span>
                <p className="font-medium flex items-center gap-1.5 mt-0.5">
                  <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {clienteData ? `${clienteData.endereco}, ${clienteData.bairro}` : clienteName}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-sm">
              <span className="text-muted-foreground">Ponto de Coleta</span>
              <p className="font-medium flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />{solicitacao.ponto_coleta}
              </p>
            </div>
          )}

          {/* Botão toggle — só para entregador */}
          {isDriverView && (
            <button
              type="button"
              onClick={() => setCabecalhoAberto((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${cabecalhoAberto ? "rotate-180" : ""}`} />
              {cabecalhoAberto ? "Ocultar detalhes" : "Ver mais detalhes da entrega"}
            </button>
          )}

          {/* Informações secundárias — retraídas para entregador */}
          {(!isDriverView || cabecalhoAberto) && (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Entregador</span><p className="font-medium">{entregadorName}</p></div>
                <div><span className="text-muted-foreground">Tipo</span><p><TipoOperacaoBadge tipoOperacao={solicitacao.tipo_operacao} /></p></div>
                {!isDriverView && (
                  <div><span className="text-muted-foreground">Taxas</span><p className="font-medium tabular-nums">{fmt(solicitacao.valor_total_taxas)}</p></div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><span className="text-muted-foreground">Criação</span><p className="tabular-nums">{fmtDate(solicitacao.data_solicitacao)}</p></div>
                <div><span className="text-muted-foreground">Início</span><p className="tabular-nums">{fmtDate(solicitacao.data_inicio)}</p></div>
                <div><span className="text-muted-foreground">Conclusão</span><p className="tabular-nums">{fmtDate(solicitacao.data_conclusao)}</p></div>
              </div>

              {solicitacao.justificativa && (
                <div className="text-sm rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <span className="text-muted-foreground font-medium">Justificativa</span>
                  <p>{solicitacao.justificativa}</p>
                </div>
              )}
            </>
          )}

          <Separator />

          {/* Rotas */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Rotas ({rotas.length})</h4>
            <div className="space-y-3">
              {rotas.map((rota, i) => {
                const temCobranca = rota.pagamento_operacao !== "faturar" || rota.receber_do_cliente;
                const isFaturadaSemCobrar = isDriverView && !temCobranca;
                const isRegistrada = isDriverView && temCobranca && rotasRegistradas.has(rota.id);
                const isMarcadaConcluida = isFaturadaSemCobrar && rotasFaturadaVisitadas.has(rota.id);
                const isVerde = isRegistrada || isMarcadaConcluida;
                const isExpandable = true;
                const isExpanded = !isVerde !== expandedRotas.has(rota.id);
                return (
                <div
                  key={rota.id}
                  className={`rounded-lg border p-3 space-y-3 text-sm transition-colors duration-200 ${
                    isVerde ? "border-emerald-500/30 bg-emerald-500/5" : "border-border"
                  }`}
                >
                  {/* Header */}
                  <div
                    className={`flex items-center justify-between gap-2 ${isDriverView && isExpandable ? "cursor-pointer select-none" : ""}`}
                    onClick={() => isDriverView && isExpandable && toggleExpandRota(rota.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-medium truncate">
                        Rota {i + 1}: {getBairroName(rota.bairro_destino_id)} → {rota.responsavel}
                      </span>
                      {isMarcadaConcluida && (
                        <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2 py-0.5">
                          <CheckCircle2 className="h-3 w-3" /> Concluída
                        </span>
                      )}
                      {isRegistrada && (
                        <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-2 py-0.5">
                          <CheckCircle2 className="h-3 w-3" /> Recebido
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Botão marcar faturada como entregue */}
                      {isFaturadaSemCobrar && !isConcluida && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); if (!isMarcadaConcluida) marcarRotaFaturadaConcluida(rota.id); }}
                              disabled={isMarcadaConcluida}
                              className={`inline-flex items-center justify-center rounded-full h-6 w-6 transition-colors ${
                                isMarcadaConcluida
                                  ? "text-emerald-500 cursor-default"
                                  : "text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"
                              }`}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {isMarcadaConcluida ? "Entregue" : "Marcar como entregue"}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {/* Ícone de conciliação */}
                      {isDriverView && temCobranca && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setRotaSelecionada(rota); }}
                              className={`inline-flex items-center justify-center rounded-full h-6 w-6 transition-colors ${
                                isRegistrada
                                  ? "text-emerald-500 hover:bg-emerald-500/10"
                                  : "text-amber-500 hover:bg-amber-500/10 animate-pulse"
                              }`}
                            >
                              <Coins className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {isRegistrada ? "Visualizar / Corrigir recebimento" : "Registrar recebimento"}
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {isDriverView && isExpandable && (
                        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                      )}
                      {!isDriverView && (
                        <Badge variant={rota.status === "concluida" ? "default" : rota.status === "cancelada" ? "destructive" : "outline"}>
                          {rota.status}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                  <>
                  {/* ── Modo Operacional (pendente/aceita/em_andamento) ── */}
                  {!isConcluida && !isDriverView && (
                    <>
                      <RotaContactCard rota={rota} clienteName={clienteName} getBairroName={getBairroName} getRegiaoByBairro={getRegiaoByBairro} />
                      <RotaPaymentPreview rota={rota} getFormaPagamentoName={getFormaPagamentoName} />
                    </>
                  )}
                  {!isConcluida && isDriverView && (
                    <>
                      <RotaContactCard rota={rota} clienteName={clienteName} getBairroName={getBairroName} getRegiaoByBairro={getRegiaoByBairro} />

                      {/* pago_na_hora: entregador cobra o total (taxa + loja) — sem mencionar "taxa" */}
                      {rota.pagamento_operacao === "pago_na_hora" && (
                        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-medium text-xs uppercase tracking-wide text-amber-600">
                              <DollarSign className="h-3.5 w-3.5" />
                              Cobrar no Destino
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500 text-amber-600">
                              Pago na hora
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm font-semibold">
                            <span className="text-muted-foreground">Total a cobrar</span>
                            <span className="tabular-nums">
                              {fmt((rota.taxa_resolvida ?? 0) + (rota.receber_do_cliente ? (rota.valor_a_receber ?? 0) : 0))}
                            </span>
                          </div>
                          {rota.meios_pagamento_operacao.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {rota.meios_pagamento_operacao.map((id) => (
                                <Badge key={id} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {getFormaPagamentoName(id)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* faturar/descontar: entregador só cobra o valor da loja se houver */}
                      {rota.pagamento_operacao !== "pago_na_hora" && rota.receber_do_cliente && (
                        <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5">
                          <span className="flex items-center gap-1.5 font-medium text-xs uppercase tracking-wide">
                            <Store className="h-3.5 w-3.5 text-status-pending" />
                            Cobrar do Cliente
                          </span>
                          <div className="flex items-center justify-between text-sm font-semibold">
                            <span className="text-muted-foreground">Valor a receber</span>
                            <span className="tabular-nums">{fmt(rota.valor_a_receber)}</span>
                          </div>
                        </div>
                      )}

                      {/* faturada sem cobrança: card informativo + botão marcar entregue */}
                      {isFaturadaSemCobrar && (
                        <div className="rounded-md border border-border bg-muted/30 p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Receipt className="h-3.5 w-3.5 shrink-0" />
                            <span>Faturado — sem cobrança no destino</span>
                          </div>
                          {!isMarcadaConcluida && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10 text-xs h-7 px-2"
                              onClick={() => marcarRotaFaturadaConcluida(rota.id)}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Marcar entregue
                            </Button>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* ── Modo Conciliação (concluída) ── */}
                  {isConcluida && !isDriverView && (
                    <RotaConciliationCard
                      rota={rota}
                      pagamentos={pagamentosPorRota[rota.id] || []}
                      isFaturado={!!isFaturado}
                      getBairroName={getBairroName}
                      getRegiaoByBairro={getRegiaoByBairro}
                      getFormaPagamentoName={getFormaPagamentoName}
                    />
                  )}
                  {isConcluida && isDriverView && (rota.receber_do_cliente || rota.pagamento_operacao === "pago_na_hora") && (
                    <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5">
                      <span className="flex items-center gap-1.5 font-medium text-xs uppercase tracking-wide">
                        <Store className="h-3.5 w-3.5 text-status-pending" />
                        {rota.pagamento_operacao === "pago_na_hora" ? "Cobrado no Destino" : "Cobrado do Cliente"}
                      </span>
                      <div className="flex items-center justify-between text-sm font-semibold">
                        <span className="text-muted-foreground">
                          {rota.pagamento_operacao === "pago_na_hora" ? "Total cobrado" : "Valor cobrado"}
                        </span>
                        <span className="tabular-nums">
                          {fmt(
                            rota.pagamento_operacao === "pago_na_hora"
                              ? (rota.taxa_resolvida ?? 0) + (rota.receber_do_cliente ? (rota.valor_a_receber ?? 0) : 0)
                              : (rota.valor_a_receber ?? 0)
                          )}
                        </span>
                      </div>
                      {/* Pagamentos registrados */}
                      {(pagamentosPorRota[rota.id] || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {(pagamentosPorRota[rota.id] || []).map((p) => (
                            <Badge key={p.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {getFormaPagamentoName(p.forma_pagamento_id)}: {fmt(p.valor)}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {/* Botão editar/visualizar conciliação */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-1 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                        onClick={() => setRotaSelecionada(rota)}
                      >
                        <Coins className="h-3.5 w-3.5 mr-1.5" />
                        {(pagamentosPorRota[rota.id] || []).length > 0 ? "Visualizar / Corrigir conciliação" : "Registrar recebimento"}
                      </Button>
                    </div>
                  )}

                  {rota.observacoes && <p className="text-xs text-muted-foreground italic">{rota.observacoes}</p>}
                  </>
                  )}
                </div>
                );
              })}
            </div>
          </div>

          {/* Progresso + botão concluir — visão entregador, não concluída */}
          {!isConcluida && isDriverView && onConcluir && (
            <>
              <Separator />
              {rotasObrigatorias.length > 0 && (
                <div className={`flex items-center gap-1.5 text-xs ${todasRegistradas ? "text-emerald-500" : "text-amber-500"}`}>
                  {todasRegistradas ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Coins className="h-3.5 w-3.5" />}
                  <span className="tabular-nums">
                    {qtdRegistradas}/{rotasObrigatorias.length} rota{rotasObrigatorias.length !== 1 ? "s" : ""} com recebimento registrado
                  </span>
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  onClick={onConcluir}
                  disabled={!todasRegistradas}
                  className="bg-status-completed hover:bg-status-completed/90 text-white w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCheck className="h-4 w-4 mr-1.5" /> Concluir Entrega
                  {!todasRegistradas && rotasFaltando.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 h-4">
                      {rotasFaltando.length} pendente{rotasFaltando.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Resumo de Conciliação (só para concluída) */}
          {isConcluida && conciliacao && !isDriverView && (
            <>
              <Separator />
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
                <h4 className="text-sm font-semibold mb-2">Resumo da Conciliação</h4>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    Total Operação
                  </span>
                  <span className="tabular-nums font-medium">{fmt(conciliacao.totalTaxas)}</span>
                </div>
                {conciliacao.totalLoja > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Store className="h-3.5 w-3.5" />
                      Total Loja (cobrar no destino)
                    </span>
                    <span className="tabular-nums font-medium">{fmt(conciliacao.totalLoja)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>🏆 Total que o entregador recebe</span>
                  <span className="tabular-nums text-primary">{fmt(conciliacao.totalEntregadorRecebe)}</span>
                </div>
                {(isFaturado || isPrePago) && (
                  <p className="text-xs text-muted-foreground italic">
                    * {isFaturado ? "Operação faturada" : "Cliente pré-pago"} — taxa não somada ao total do entregador.
                  </p>
                )}
              </div>
            </>
          )}

          {isConcluida && conciliacao && isDriverView && conciliacao.totalLoja > 0 && (
            <>
              <Separator />
              <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
                <h4 className="text-sm font-semibold mb-2">Resumo — Valores Cobrados</h4>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Store className="h-3.5 w-3.5" />
                    Total cobrado do cliente
                  </span>
                  <span className="tabular-nums font-medium">{fmt(conciliacao.totalLoja)}</span>
                </div>
              </div>
            </>
          )}

          {!isDriverView && (
          <>
          <Separator />

          {/* Histórico */}
          <div>
            <button
              type="button"
              onClick={() => setHistoricoAberto((v) => !v)}
              className="w-full flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm font-semibold hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Histórico</span>
                {historicoRows.length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">&middot; {historicoRows.length} {historicoRows.length === 1 ? "registro" : "registros"}</span>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${historicoAberto ? "rotate-180" : ""}`} />
            </button>

            {historicoAberto && (
              <div className="mt-3">
                {historicoRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic px-1">Nenhum registro de histórico.</p>
                ) : (
                  <div className="space-y-0">
                    {historicoRows.map((ev, idx) => {
                      const userName = ev.usuario_id
                        ? (adminProfiles.find((p) => p.id === ev.usuario_id)?.nome
                          ?? entregadores.find((e) => e.profile_id === ev.usuario_id)?.nome
                          ?? null)
                        : null;
                      const config = HISTORICO_TIPO_CONFIG[ev.tipo] ?? { icon: Clock, color: "text-muted-foreground" };
                      const Icon = config.icon;
                      const isLast = idx === historicoRows.length - 1;
                      return (
                        <div key={ev.id} className="flex items-start gap-3 text-sm">
                          {/* icon + connector */}
                          <div className="flex flex-col items-center shrink-0">
                            <div className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center bg-muted/50 border border-border/50 ${config.color}`}>
                              <Icon className="h-3 w-3" />
                            </div>
                            {!isLast && <div className="w-px flex-1 min-h-[12px] bg-border/40 my-0.5" />}
                          </div>
                          {/* content */}
                          <div className="pb-3">
                            <p className="leading-snug">{ev.descricao}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {fmtDate(ev.created_at)}{userName ? ` · ${userName}` : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
          </>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Single-rota mini-dialog */}
    {rotaSelecionada && (
      <Suspense fallback={null}>
        <ConciliacaoDialogLazy
          open={!!rotaSelecionada}
          onOpenChange={(open) => !open && setRotaSelecionada(null)}
          rotas={[rotaSelecionada]}
          solicitacaoId={solicitacao?.id}
          clienteId={solicitacao?.cliente_id}
          isConcluding={false}
          isDriverView
          isEditing={rotasComPagamentoBD.has(rotaSelecionada.id)}
          existingPagamentos={allPagamentos.filter((p) => p.rota_id === rotaSelecionada.id)}
          onConcluir={() => { marcarRotaRegistrada(rotaSelecionada.id); setRotaSelecionada(null); }}
        />
      </Suspense>
    )}


    </>
  );
}

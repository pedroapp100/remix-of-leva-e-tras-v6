import { useMemo } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MapPin, Phone, User, Clock, DollarSign, MessageCircle, Store, Building2, Plus, Truck, CheckCircle, Receipt, X, XCircle, ArrowRight } from "lucide-react";

const FATURAR_ID = "__faturar__";

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

export function ViewSolicitacaoDialog({ solicitacao, onClose, isDriverView = false }: ViewSolicitacaoDialogProps) {
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

  if (!solicitacao) return null;

  return (
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
          {/* Info Geral */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Cliente</span>
              <p className="font-medium flex items-center gap-1.5">
                {clienteName}
                {isFaturado && <Badge variant="default" className="text-[10px] px-1.5 py-0">Faturado</Badge>}
                {isPrePago && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Pré-pago</Badge>}
              </p>
            </div>
            <div><span className="text-muted-foreground">Entregador</span><p className="font-medium">{entregadorName}</p></div>
            <div><span className="text-muted-foreground">Tipo</span><p><TipoOperacaoBadge tipoOperacao={solicitacao.tipo_operacao} /></p></div>
            {!isDriverView && (
              <div><span className="text-muted-foreground">Taxas</span><p className="font-medium tabular-nums">{fmt(solicitacao.valor_total_taxas)}</p></div>
            )}
          </div>

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

          <Separator />

          {/* Rotas */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Rotas ({rotas.length})</h4>
            <div className="space-y-3">
              {rotas.map((rota, i) => (
                <div key={rota.id} className="rounded-lg border border-border p-3 space-y-3 text-sm">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      Rota {i + 1}: {getBairroName(rota.bairro_destino_id)} → {rota.responsavel}
                    </span>
                    <Badge variant={rota.status === "concluida" ? "default" : rota.status === "cancelada" ? "destructive" : "outline"}>
                      {rota.status}
                    </Badge>
                  </div>

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
                        {rota.pagamento_operacao === "pago_na_hora" ? "Cobrado no Destino" : "Cobrar do Cliente"}
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
                    </div>
                  )}

                  {rota.observacoes && <p className="text-xs text-muted-foreground italic">{rota.observacoes}</p>}
                </div>
              ))}
            </div>
          </div>

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

          <Separator />

          {/* Histórico */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Histórico</h4>
            {historicoRows.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum registro de histórico.</p>
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
                      <div className={`pb-3 ${isLast ? "" : ""}`}>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

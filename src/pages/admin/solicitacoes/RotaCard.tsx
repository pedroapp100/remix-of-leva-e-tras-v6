import { MOCK_BAIRROS, MOCK_TAXAS_EXTRAS, MOCK_FORMAS_PAGAMENTO } from "@/data/mockSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Trash2, AlertTriangle, Briefcase, Store, Receipt, Wallet, CreditCard, Banknote, Smartphone, Building2, ArrowLeftRight } from "lucide-react";
import type { Modalidade } from "@/types/database";

const taxasExtrasDisponiveis = MOCK_TAXAS_EXTRAS.filter((t) => t.ativo);
const formasPagamentoAtivas = MOCK_FORMAS_PAGAMENTO.filter((f) => f.enabled);
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export interface TaxaExtra {
  id: string;
  nome: string;
  valor: number;
}

export type PagamentoOperacaoMode = "faturar" | "pago_na_hora" | "descontar_saldo";
export type MeioCobrancaDestino = "dinheiro" | "maquina_loja" | "pix_loja" | "pix_empresa";
export type DestinoDinheiro = "devolver_loja" | "repassar_empresa";

export interface RotaForm {
  id: string;
  bairro_destino_id: string;
  responsavel: string;
  telefone: string;
  observacoes: string;
  receber_do_cliente: boolean;
  valor_a_receber: number;
  meios_pagamento: string[];
  taxa_resolvida: number | null;
  taxas_extras: TaxaExtra[];
  pagamento_operacao: PagamentoOperacaoMode;
  meios_pagamento_operacao: string[];
  meio_cobranca_destino: MeioCobrancaDestino | "";
  destino_dinheiro: DestinoDinheiro | "";
}

interface RotaCardProps {
  rota: RotaForm;
  index: number;
  canRemove: boolean;
  clienteModalidade: Modalidade;
  onUpdate: (id: string, field: keyof RotaForm, value: any) => void;
  onRemove: (id: string) => void;
  onAddTaxaExtra: (rotaId: string, configId: string) => void;
  onRemoveTaxaExtra: (rotaId: string, taxaId: string) => void;
  onUpdateTaxaExtra: (rotaId: string, taxaId: string, field: "nome" | "valor", value: string | number) => void;
  onToggleMeioPagamento: (rotaId: string, meioPagamentoId: string) => void;
  onToggleMeioPagamentoOperacao: (rotaId: string, meioPagamentoId: string) => void;
}

export function getRotaSubtotalOperacao(r: RotaForm) {
  return (r.taxa_resolvida ?? 0) + r.taxas_extras.reduce((s, t) => s + t.valor, 0);
}

export function getRotaTotalEntregador(r: RotaForm) {
  const operacao = r.pagamento_operacao === "pago_na_hora" ? getRotaSubtotalOperacao(r) : 0;
  const loja = r.receber_do_cliente ? r.valor_a_receber : 0;
  return operacao + loja;
}

export function RotaCard({
  rota, index, canRemove, clienteModalidade,
  onUpdate, onRemove, onAddTaxaExtra, onRemoveTaxaExtra, onUpdateTaxaExtra, onToggleMeioPagamento, onToggleMeioPagamentoOperacao,
}: RotaCardProps) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Rota {index + 1}</span>
        {canRemove && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onRemove(rota.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Destination & Contact */}
      <div className="space-y-2">
        <Label className="text-xs">Bairro Destino *</Label>
        <Select value={rota.bairro_destino_id} onValueChange={(v) => onUpdate(rota.id, "bairro_destino_id", v)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>{MOCK_BAIRROS.map((b) => (<SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>))}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Responsável *</Label>
          <Input value={rota.responsavel} onChange={(e) => onUpdate(rota.id, "responsavel", e.target.value)} placeholder="Nome" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Telefone *</Label>
          <PhoneInput value={rota.telefone} onChange={(v) => onUpdate(rota.id, "telefone", v)} />
        </div>
      </div>

      {/* ── SECTION: RECEITA DA OPERAÇÃO ── */}
      <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wide">Receita da Operação</span>
        </div>

        {/* Taxa de entrega (auto) */}
        {rota.bairro_destino_id && rota.taxa_resolvida != null ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <span className="text-muted-foreground">Taxa de Entrega (fallback)</span>
            </div>
            <span className="text-sm font-semibold tabular-nums">{fmt(rota.taxa_resolvida)}</span>
          </div>
        ) : rota.bairro_destino_id ? (
          <div className="text-xs text-destructive">Sem tarifa para este bairro</div>
        ) : null}

        {/* Taxas extras */}
        {rota.taxas_extras.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Taxas Extras</Label>
            {rota.taxas_extras.map((te) => (
              <div key={te.id} className="grid grid-cols-[1fr_100px_auto] gap-2 items-center">
                <span className="text-xs truncate">{te.nome}</span>
                <CurrencyInput value={te.valor} onChange={(v) => onUpdateTaxaExtra(rota.id, te.id, "valor", v)} />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onRemoveTaxaExtra(rota.id, te.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
        {taxasExtrasDisponiveis.length > 0 && (
          <Select onValueChange={(v) => onAddTaxaExtra(rota.id, v)} value="">
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="+ Adicionar taxa extra" />
            </SelectTrigger>
            <SelectContent>
              {taxasExtrasDisponiveis.map((te) => (
                <SelectItem key={te.id} value={te.id}>{te.nome} — {fmt(te.valor_padrao)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Subtotal operação */}
        {rota.taxa_resolvida != null && (
          <div className="flex items-center justify-between pt-1 border-t border-primary/10">
            <span className="text-xs font-medium text-primary">Subtotal Operação</span>
            <span className="text-sm font-bold tabular-nums text-primary">{fmt(getRotaSubtotalOperacao(rota))}</span>
          </div>
        )}

        {/* ── FORMA DE PAGAMENTO DA TAXA ── */}
        {rota.taxa_resolvida != null && (
          <div className="space-y-2 pt-2 border-t border-primary/10">
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              <Label className="text-xs font-semibold text-primary">Como será pago?</Label>
            </div>

            <RadioGroup
              value={rota.pagamento_operacao}
              onValueChange={(v) => onUpdate(rota.id, "pagamento_operacao", v)}
              className="gap-1.5"
            >
              {/* Faturar - always available */}
              <label className={`flex items-center gap-2.5 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                rota.pagamento_operacao === "faturar"
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:border-primary/20"
              }`}>
                <RadioGroupItem value="faturar" />
                <div className="flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">Faturar</span>
                </div>
                <span className="text-[10px] text-muted-foreground ml-auto">Incluir na próxima fatura</span>
              </label>

              {/* Pago na hora */}
              <label className={`flex items-center gap-2.5 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                rota.pagamento_operacao === "pago_na_hora"
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:border-primary/20"
              }`}>
                <RadioGroupItem value="pago_na_hora" />
                <div className="flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">Pago na hora</span>
                </div>
                <span className="text-[10px] text-muted-foreground ml-auto">Pagamento já realizado</span>
              </label>

              {/* Descontar do saldo - only for pre-paid */}
              {clienteModalidade === "pre_pago" && (
                <label className={`flex items-center gap-2.5 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                  rota.pagamento_operacao === "descontar_saldo"
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : "border-border hover:border-emerald-500/20"
                }`}>
                  <RadioGroupItem value="descontar_saldo" />
                  <div className="flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-xs font-medium">Descontar do saldo</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground ml-auto">Abater do crédito</span>
                </label>
              )}
            </RadioGroup>

            {/* Payment methods when "pago_na_hora" */}
            {rota.pagamento_operacao === "pago_na_hora" && (
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs text-muted-foreground">Meio de Pagamento</Label>
                <div className="flex flex-wrap gap-2">
                  {formasPagamentoAtivas.map((fp) => {
                    const selected = rota.meios_pagamento_operacao.includes(fp.id);
                    return (
                      <Badge
                        key={fp.id}
                        variant={selected ? "default" : "outline"}
                        className={`cursor-pointer text-xs transition-colors ${selected ? "" : "opacity-60 hover:opacity-100"}`}
                        onClick={() => onToggleMeioPagamentoOperacao(rota.id, fp.id)}
                      >
                        {fp.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SECTION: COBRANÇA PARA A LOJA ── */}
      <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-amber-600" />
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Cobrança para a Loja</span>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={rota.receber_do_cliente}
            onCheckedChange={(v) => {
              onUpdate(rota.id, "receber_do_cliente", !!v);
              if (!v) {
                onUpdate(rota.id, "meio_cobranca_destino", "");
                onUpdate(rota.id, "destino_dinheiro", "");
              }
            }}
          />
          <Label className="text-xs font-normal">Entregador cobra valor do destinatário</Label>
        </div>

        {rota.receber_do_cliente && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Valor a Cobrar no Destino</Label>
              <CurrencyInput value={rota.valor_a_receber} onChange={(v) => onUpdate(rota.id, "valor_a_receber", v)} />
            </div>

            {/* ── COMO O ENTREGADOR RECEBE ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-amber-600" />
                <Label className="text-xs font-semibold text-amber-600">Como o entregador recebe?</Label>
              </div>

              <RadioGroup
                value={rota.meio_cobranca_destino}
                onValueChange={(v) => {
                  onUpdate(rota.id, "meio_cobranca_destino", v);
                  if (v !== "dinheiro") {
                    onUpdate(rota.id, "destino_dinheiro", "");
                  }
                }}
                className="gap-1.5"
              >
                {/* Dinheiro */}
                <label className={`flex items-center gap-2.5 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                  rota.meio_cobranca_destino === "dinheiro"
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-border hover:border-amber-500/20"
                }`}>
                  <RadioGroupItem value="dinheiro" />
                  <div className="flex items-center gap-1.5">
                    <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">Dinheiro</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground ml-auto">Recebe em espécie</span>
                </label>

                {/* Máquina da Loja */}
                <label className={`flex items-center gap-2.5 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                  rota.meio_cobranca_destino === "maquina_loja"
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-border hover:border-amber-500/20"
                }`}>
                  <RadioGroupItem value="maquina_loja" />
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">Máquina da Loja</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground ml-auto">Passa na maquininha do lojista</span>
                </label>

                {/* PIX da Loja */}
                <label className={`flex items-center gap-2.5 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                  rota.meio_cobranca_destino === "pix_loja"
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-border hover:border-amber-500/20"
                }`}>
                  <RadioGroupItem value="pix_loja" />
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">PIX da Loja</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground ml-auto">PIX direto para a loja</span>
                </label>

                {/* PIX da Empresa */}
                <label className={`flex items-center gap-2.5 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                  rota.meio_cobranca_destino === "pix_empresa"
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-border hover:border-amber-500/20"
                }`}>
                  <RadioGroupItem value="pix_empresa" />
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">PIX da Empresa</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground ml-auto">PIX para a empresa de entregas</span>
                </label>
              </RadioGroup>
            </div>

            {/* ── SUB-OPÇÃO: DESTINO DO DINHEIRO ── */}
            {rota.meio_cobranca_destino === "dinheiro" && (
              <div className="space-y-2 pt-1 ml-4 border-l-2 border-amber-500/20 pl-3">
                <div className="flex items-center gap-1.5">
                  <ArrowLeftRight className="h-3.5 w-3.5 text-amber-600" />
                  <Label className="text-xs font-semibold text-amber-600">O que o entregador faz com o dinheiro?</Label>
                </div>

                <RadioGroup
                  value={rota.destino_dinheiro}
                  onValueChange={(v) => onUpdate(rota.id, "destino_dinheiro", v)}
                  className="gap-1.5"
                >
                  <label className={`flex items-center gap-2.5 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                    rota.destino_dinheiro === "devolver_loja"
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-border hover:border-amber-500/20"
                  }`}>
                    <RadioGroupItem value="devolver_loja" />
                    <div className="flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">Devolver à Loja</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-auto">Leva o valor de volta ao lojista</span>
                  </label>

                  <label className={`flex items-center gap-2.5 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
                    rota.destino_dinheiro === "repassar_empresa"
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-border hover:border-amber-500/20"
                  }`}>
                    <RadioGroupItem value="repassar_empresa" />
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium">Repassar à Empresa</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-auto">Entrega o valor na empresa</span>
                  </label>
                </RadioGroup>
              </div>
            )}
          </div>
        )}

        {!rota.receber_do_cliente && (
          <p className="text-xs text-muted-foreground">Nenhuma cobrança no destino — apenas entrega.</p>
        )}
      </div>

      {/* ── TOTAL DO ENTREGADOR ── */}
      {rota.taxa_resolvida != null && (
        <div className="rounded-md bg-muted/50 p-3 flex items-center justify-between">
          <span className="text-xs font-medium">💰 Total que o entregador recebe nesta rota</span>
          <span className="text-sm font-bold tabular-nums">{fmt(getRotaTotalEntregador(rota))}</span>
        </div>
      )}
    </div>
  );
}
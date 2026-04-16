import { useState, useMemo } from "react";
import type { Rota } from "@/types/database";
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
import { useCreatePagamentos } from "@/hooks/useSolicitacoes";
import { useClienteSaldoMap, useClientes } from "@/hooks/useClientes";

interface PagamentoLinha {
  id: string;
  forma_pagamento_id: string;
  valor: number;
  pertence_a: "operacao" | "loja";
}

const FATURAR_ID = "__faturar__";

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
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ConciliacaoDialog({ open, onOpenChange, rotas, onConcluir, clienteId, solicitacaoId, isEditing = false, isConcluding = false, isDriverView = false }: ConciliacaoDialogProps) {
  const createPagamentosMut = useCreatePagamentos();
  const { getClienteSaldo } = useClienteSaldoMap();
  const { data: clientes = [] } = useClientes();
  const { data: formasPagamento = [] } = useFormasPagamento();
  const { data: bairros = [] } = useBairros();
  const getBairroName = (id: string) => bairros.find((b) => b.id === id)?.nome ?? id;
  const formasAtivas = formasPagamento.filter((f) => f.enabled);
  const cliente = useMemo(() => clienteId ? clientes.find((c) => c.id === clienteId) : null, [clienteId, clientes]);
  const isPrePago = cliente?.modalidade === "pre_pago";
  const isFaturado = cliente?.modalidade === "faturado";

  // Saldo pré-pago e suficiência
  const saldoPrePago = useMemo(() => {
    if (!isPrePago || !clienteId) return null;
    const saldo = getClienteSaldo(clienteId);
    const totalTaxas = rotas.reduce((s, r) => s + (r.taxa_resolvida ?? 0), 0);
    return { saldo, totalTaxas, suficiente: saldo >= totalTaxas, diferenca: totalTaxas - saldo };
  }, [isPrePago, clienteId, getClienteSaldo, rotas]);
  const [pagamentosPorRota, setPagamentosPorRota] = useState<Record<string, PagamentoLinha[]>>(() => {
    const initial: Record<string, PagamentoLinha[]> = {};
    rotas.forEach((r) => { initial[r.id] = []; });
    return initial;
  });

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
      [rotaId]: (prev[rotaId] || []).map((p) => p.id === pagId ? { ...p, [field]: value } : p),
    }));
  };

  // Resumo — use integer cents to avoid floating-point issues
  const allPagamentos = Object.values(pagamentosPorRota).flat();
  const totalFaturarCents = allPagamentos.filter((p) => p.forma_pagamento_id === FATURAR_ID && p.pertence_a === "operacao").reduce((s, p) => s + Math.round(p.valor * 100), 0);
  const totalOperacaoCents = allPagamentos.filter((p) => p.pertence_a === "operacao").reduce((s, p) => s + Math.round(p.valor * 100), 0);
  const totalLojaCents = allPagamentos.filter((p) => p.pertence_a === "loja").reduce((s, p) => s + Math.round(p.valor * 100), 0);
  const totalEsperadoTaxasCents = rotas.reduce((s, r) => s + Math.round((r.taxa_resolvida ?? 0) * 100), 0);
  const totalEsperadoReceberCents = rotas.filter((r) => r.receber_do_cliente).reduce((s, r) => s + Math.round((r.valor_a_receber ?? 0) * 100), 0);
  
  const diffOperacaoCents = totalOperacaoCents - totalEsperadoTaxasCents;
  const diffLojaCents = totalLojaCents - totalEsperadoReceberCents;
  // For pre-paid and invoiced clients, operation fees are not collected in cash by the driver
  const isBalanced = (isPrePago || isFaturado ? true : diffOperacaoCents === 0) && diffLojaCents === 0;

  const totalOperacao = totalOperacaoCents / 100;
  const totalLoja = totalLojaCents / 100;
  const totalFaturar = totalFaturarCents / 100;
  const totalEsperadoTaxas = totalEsperadoTaxasCents / 100;
  const totalEsperadoReceber = totalEsperadoReceberCents / 100;
  const diffOperacao = diffOperacaoCents / 100;
  const diffLoja = diffLojaCents / 100;

  const handleConcluir = async () => {
    if (allPagamentos.length === 0) { toast.error("Registre ao menos um pagamento."); return; }
    if (allPagamentos.some((p) => p.valor <= 0)) { toast.error("Todos os pagamentos devem ter valor positivo."); return; }
    if (!isDriverView && !isBalanced) { toast.error("Os valores não estão balanceados. Verifique os pagamentos."); return; }

    // Persist payments to DB
    if (solicitacaoId) {
      const persistedPagamentos = allPagamentos
        .filter((pag) => pag.forma_pagamento_id !== FATURAR_ID)
        .map((pag) => ({
          solicitacao_id: solicitacaoId,
          rota_id: Object.entries(pagamentosPorRota).find(([, pags]) => pags.some((p) => p.id === pag.id))?.[0] ?? "",
          forma_pagamento_id: pag.forma_pagamento_id,
          valor: pag.valor,
          pertence_a: pag.pertence_a,
          observacao: null as string | null,
          created_by: null as string | null,
        }));
      if (persistedPagamentos.length > 0) {
        try {
          await createPagamentosMut.mutateAsync(persistedPagamentos);
        } catch {
          toast.error("Erro ao salvar pagamentos. Tente novamente.");
          return;
        }
      }
    }

    onConcluir();
    onOpenChange(false);
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

          {rotas.map((rota, i) => (
            <div key={rota.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Rota {i + 1} — {getBairroName(rota.bairro_destino_id)}</h4>
                {!isDriverView && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Taxa: {fmt(rota.taxa_resolvida ?? 0)}</span>
                    {rota.receber_do_cliente && <span>| Receber: {fmt(rota.valor_a_receber ?? 0)}</span>}
                  </div>
                )}
                {isDriverView && rota.receber_do_cliente && (
                  <span className="text-xs text-muted-foreground">Cobrar: {fmt(rota.valor_a_receber ?? 0)}</span>
                )}
              </div>

              <div className="space-y-2">
                {(pagamentosPorRota[rota.id] || []).map((pag) => (
                  isDriverView ? (
                    <div key={pag.id} className="grid grid-cols-[1fr_100px_auto] gap-2 items-end">
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
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor</Label>
                        <CurrencyInput value={pag.valor} onChange={(v) => updatePagamento(rota.id, pag.id, "valor", v)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Pertence a</Label>
                        <Select value={pag.pertence_a} onValueChange={(v) => updatePagamento(rota.id, pag.id, "pertence_a", v)}>
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

              {i < rotas.length - 1 && <Separator />}
            </div>
          ))}

          {/* Resumo */}
          {isDriverView ? (
            <div className="rounded-lg border border-border p-4 space-y-2">
              <h4 className="text-sm font-semibold">Resumo dos Recebimentos</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Total Recebido</span>
                <span className="tabular-nums text-right font-medium">{fmt(allPagamentos.reduce((s, p) => s + p.valor, 0))}</span>
              </div>
              {allPagamentos.length > 0 && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <CheckCircle className="h-4 w-4" />
                    {allPagamentos.length} pagamento(s) registrado(s)
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
                <span className="tabular-nums text-right">{fmt(totalLoja)} <span className="text-xs text-muted-foreground">/ {fmt(totalEsperadoReceber)}</span></span>
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

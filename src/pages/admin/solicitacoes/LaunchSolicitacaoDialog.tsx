import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useClientes, useTabelaPrecos, useClienteSaldoMap } from "@/hooks/useClientes";
import { useBairros, useTaxasExtras, useTiposOperacao, useFormasPagamento } from "@/hooks/useSettings";
import { useEntregadores } from "@/hooks/useEntregadores";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle, ChevronRight, ChevronLeft, Briefcase, Store, Package, RotateCcw, MapPin, CircleCheckBig, MapPinned, Receipt, Wallet, CalendarIcon, History } from "lucide-react";
import { toast } from "sonner";
import { RotaCard, getRotaSubtotalOperacao, getRotaTotalEntregador } from "./RotaCard";
import type { RotaForm } from "./RotaCard";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Resolve a taxa para uma rota seguindo hierarquia de 3 níveis:
 * 1. Regra específica por bairro + tipo de operação
 * 2. Regra por região do bairro + tipo de operação
 * 3. Regra geral (sem bairro e sem região) + tipo de operação
 * 4. Fallback: taxa_entrega padrão do bairro
 */
function resolverTarifa(
  bairros: { id: string; taxa_entrega: number; nome: string; region_id: string }[],
  tabelaPrecos: { cliente_id: string; ativo: boolean; prioridade: number; bairro_destino_id?: string | null; regiao_id?: string | null; tipo_operacao?: string | null; taxa_base: number }[],
  bairroId: string,
  clienteId?: string,
  tipoOp?: string
): { taxa: number; fallback: boolean } {
  const bairro = bairros.find((b) => b.id === bairroId);
  if (!bairro) return { taxa: 0, fallback: false };

  if (clienteId) {
    const regrasFiltradas = tabelaPrecos
      .filter((p) => p.cliente_id === clienteId && p.ativo)
      .sort((a, b) => a.prioridade - b.prioridade);

    const matchTipo = (p: (typeof regrasFiltradas)[0]) =>
      !tipoOp || p.tipo_operacao === "todos" || p.tipo_operacao === tipoOp;

    // Nível 1: bairro específico + tipo
    const porBairro = regrasFiltradas.find(
      (p) => p.bairro_destino_id === bairroId && matchTipo(p)
    );
    if (porBairro) return { taxa: porBairro.taxa_base, fallback: false };

    // Nível 2: região do bairro + tipo
    const porRegiao = regrasFiltradas.find(
      (p) => !p.bairro_destino_id && p.regiao_id === bairro.region_id && matchTipo(p)
    );
    if (porRegiao) return { taxa: porRegiao.taxa_base, fallback: false };

    // Nível 3: regra geral (sem bairro e sem região) + tipo
    const geral = regrasFiltradas.find(
      (p) => !p.bairro_destino_id && !p.regiao_id && matchTipo(p)
    );
    if (geral) return { taxa: geral.taxa_base, fallback: false };
  }

  return { taxa: bairro.taxa_entrega, fallback: true };
}

const emptyRota = (): RotaForm => ({
  id: crypto.randomUUID(),
  bairro_destino_id: "",
  responsavel: "",
  telefone: "",
  observacoes: "",
  receber_do_cliente: false,
  valor_a_receber: 0,
  meios_pagamento: [],
  taxa_resolvida: null,
  is_fallback: false,
  taxas_extras: [],
  pagamento_operacao: "faturar",
  meios_pagamento_operacao: [],
  meio_cobranca_destino: "",
  destino_dinheiro: "",
});

type TipoColeta = "loja_cliente" | "cliente_loja" | "ponto_ponto";

const TIPOS_COLETA = [
  {
    value: "loja_cliente" as TipoColeta,
    label: "Coletar na loja X Entregar ao Cliente",
    desc: "Buscar na loja e levar ao cliente final.",
    icon: Package,
  },
  {
    value: "cliente_loja" as TipoColeta,
    label: "Coletar no Cliente X Levar Para loja",
    desc: "Buscar no cliente final e levar para a loja.",
    icon: RotateCcw,
  },
  {
    value: "ponto_ponto" as TipoColeta,
    label: "Coletar em lugar específico X Entregar em lugar específico",
    desc: "Uma rota com ponto de coleta e entrega personalizados.",
    icon: MapPin,
  },
];

interface LaunchSolicitacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { clienteId: string; tipoOperacao: string; tipoColeta: TipoColeta; pontoColeta: string; entregadorId?: string; dataRetroativa?: string; retroativoConcluida?: boolean; rotas: RotaForm[] }) => Promise<boolean> | boolean;
}

export function LaunchSolicitacaoDialog({ open, onOpenChange, onSubmit }: LaunchSolicitacaoDialogProps) {
  const { getClienteSaldo } = useClienteSaldoMap();
  const { data: clientesData = [] } = useClientes();
  const { data: entregadoresData = [] } = useEntregadores();
  const { data: bairros = [] } = useBairros();
  const { data: taxasExtrasData = [] } = useTaxasExtras();
  const { data: tiposOperacaoData = [] } = useTiposOperacao();
  const { data: formasPagamentoData = [] } = useFormasPagamento();
  const getFormaPagamentoNome = (id: string) => formasPagamentoData.find((f) => f.id === id)?.name ?? id;
  const clientesAtivos = clientesData.filter((c) => c.status === "ativo");
  const entregadoresAtivos = entregadoresData.filter((e) => e.status === "ativo");
  const tiposAtivos = tiposOperacaoData.filter((t) => t.ativo);
  const taxasExtrasDisponiveis = taxasExtrasData.filter((t) => t.ativo);
  const [step, setStep] = useState(0);

  // Step 0
  const [tipoColeta, setTipoColeta] = useState<TipoColeta | "">("");

  // Step 1
  const [clienteId, setClienteId] = useState("");
  const { data: tabelaPrecos = [] } = useTabelaPrecos(clienteId);
  const handleClienteChange = (id: string) => {
    setClienteId(id);
    const cliente = clientesAtivos.find((c) => c.id === id);
    if (cliente) {
      setPontoColeta(`${cliente.endereco}, ${cliente.bairro}`);
    }
  };
  const [tipoOperacao, setTipoOperacao] = useState(tiposAtivos[0]?.id ?? "");
  const [pontoColeta, setPontoColeta] = useState("");
  const [entregadorId, setEntregadorId] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [retroativoEnabled, setRetroativoEnabled] = useState(false);
  const [dataRetroativa, setDataRetroativa] = useState<Date | undefined>();
  const [retroativoConcluida, setRetroativoConcluida] = useState(false);
  // Step 2
  const [rotas, setRotas] = useState<RotaForm[]>([emptyRota()]);

  const resetForm = () => {
    setStep(0); setTipoColeta(""); setClienteId(""); setTipoOperacao(tiposAtivos[0]?.id ?? ""); setPontoColeta(""); setEntregadorId(""); setObservacoes("");
    setRetroativoEnabled(false); setDataRetroativa(undefined); setRetroativoConcluida(false);
    setRotas([emptyRota()]);
  };

  const addRota = () => setRotas((prev) => [...prev, emptyRota()]);

  const removeRota = (id: string) => {
    if (rotas.length <= 1) return;
    setRotas((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRota = (id: string, field: keyof RotaForm, value: any) => {
    setRotas((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      if (field === "bairro_destino_id" && typeof value === "string") {
        const tarifa = resolverTarifa(bairros, tabelaPrecos, value, clienteId || undefined, tipoOperacao || undefined);
        updated.taxa_resolvida = tarifa.taxa;
        updated.is_fallback = tarifa.fallback;
      }
      return updated;
    }));
  };

  const addTaxaExtra = (rotaId: string, configId: string) => {
    const config = taxasExtrasDisponiveis.find((t) => t.id === configId);
    if (!config) return;
    setRotas((prev) => prev.map((r) => {
      if (r.id !== rotaId) return r;
      if (r.taxas_extras.some((te) => te.nome === config.nome)) {
        toast.error(`"${config.nome}" já foi adicionada nesta rota.`);
        return r;
      }
      return {
        ...r,
        taxas_extras: [...r.taxas_extras, { id: crypto.randomUUID(), nome: config.nome, valor: config.valor_padrao }],
      };
    }));
  };

  const removeTaxaExtra = (rotaId: string, taxaId: string) => {
    setRotas((prev) => prev.map((r) => r.id !== rotaId ? r : {
      ...r,
      taxas_extras: r.taxas_extras.filter((t) => t.id !== taxaId),
    }));
  };

  const updateTaxaExtra = (rotaId: string, taxaId: string, field: "nome" | "valor", value: string | number) => {
    setRotas((prev) => prev.map((r) => r.id !== rotaId ? r : {
      ...r,
      taxas_extras: r.taxas_extras.map((t) => t.id !== taxaId ? t : { ...t, [field]: value }),
    }));
  };

  const toggleMeioPagamento = (rotaId: string, meioPagamentoId: string) => {
    setRotas((prev) => prev.map((r) => {
      if (r.id !== rotaId) return r;
      const has = r.meios_pagamento.includes(meioPagamentoId);
      return {
        ...r,
        meios_pagamento: has
          ? r.meios_pagamento.filter((id) => id !== meioPagamentoId)
          : [...r.meios_pagamento, meioPagamentoId],
      };
    }));
  };

  const validateStep1 = () => {
    if (!clienteId) { toast.error("Selecione um cliente."); return false; }
    return true;
  };

  const validateStep2 = () => {
    for (const r of rotas) {
      if (!r.bairro_destino_id || !r.responsavel.trim() || !r.telefone.trim()) {
        toast.error("Preencha todos os campos obrigatórios de cada rota."); return false;
      }
      if (r.taxa_resolvida === null || r.taxa_resolvida === 0) {
        toast.error("Sem tarifa disponível para um dos bairros."); return false;
      }
      if (r.receber_do_cliente && r.valor_a_receber <= 0) {
        toast.error("Informe o valor a cobrar no destino."); return false;
      }
      if (r.receber_do_cliente && !r.meio_cobranca_destino) {
        toast.error("Selecione como o entregador recebe no destino."); return false;
      }
      if (r.receber_do_cliente && r.meio_cobranca_destino === "dinheiro" && !r.destino_dinheiro) {
        toast.error("Informe o que o entregador faz com o dinheiro."); return false;
      }
      for (const te of r.taxas_extras) {
        if (!te.nome.trim() || te.valor <= 0) {
          toast.error("Preencha nome e valor de todas as taxas extras."); return false;
        }
      }
    }
    return true;
  };

  const handleNext = () => {
    if (step === 0) {
      if (!tipoColeta) { toast.error("Selecione o tipo de operação."); return; }
      setStep(1);
    } else if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleSubmit = async () => {
    if (retroativoEnabled && !dataRetroativa) {
      toast.error("Selecione a data retroativa.");
      return;
    }
    const success = await onSubmit({
      clienteId, tipoOperacao, tipoColeta: tipoColeta as TipoColeta, pontoColeta,
      entregadorId: entregadorId || undefined,
      dataRetroativa: retroativoEnabled && dataRetroativa ? dataRetroativa.toISOString() : undefined,
      retroativoConcluida: retroativoEnabled && retroativoConcluida ? true : undefined,
      rotas,
    });

    if (success) {
      resetForm();
      onOpenChange(false);
    }
  };

  // Totals
  const totalOperacao = rotas.reduce((s, r) => s + getRotaSubtotalOperacao(r), 0);
  const totalLoja = rotas.reduce((s, r) => s + (r.receber_do_cliente ? r.valor_a_receber : 0), 0);
  const totalEntregador = rotas.reduce((s, r) => s + getRotaTotalEntregador(r), 0);
  const clienteSelecionado = clientesAtivos.find((c) => c.id === clienteId);
  const clienteNome = clienteSelecionado?.nome ?? "";
  const clienteModalidade = clienteSelecionado?.modalidade;
  const saldoCliente = clienteId ? getClienteSaldo(clienteId) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
         <DialogHeader>
          <DialogTitle>
            {step === 0 ? "Lançar Nova Solicitação" : step === 1 ? "Lançar Nova Coleta" : `Nova Solicitação — Etapa ${step}/3`}
          </DialogTitle>
          <DialogDescription className="sr-only">.</DialogDescription>
          {step === 0 && (
            <p className="text-sm text-muted-foreground">Qual tipo de operação você deseja lançar?</p>
          )}
          {step === 1 && (
            <p className="text-sm text-muted-foreground">Preencha os dados da coleta na loja do cliente e das rotas de destino.</p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Step indicators - only for steps 1-3 */}
          {step > 0 && (
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
          )}

          {/* Step 0: Tipo de coleta */}
          {step === 0 && (
            <div className="space-y-3">
              {TIPOS_COLETA.map((tipo) => {
                const isSelected = tipoColeta === tipo.value;
                const Icon = tipo.icon;
                return (
                  <button
                    key={tipo.value}
                    type="button"
                    onClick={() => setTipoColeta(tipo.value)}
                    className={`w-full flex items-center gap-4 rounded-lg border p-4 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                      isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-semibold block ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {tipo.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{tipo.desc}</span>
                    </div>
                    {isSelected && (
                      <CircleCheckBig className="h-5 w-5 text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              {/* Cliente (Loja) */}
              <div className="space-y-2">
                <Label>Cliente (Loja) *</Label>
                <Select value={clienteId} onValueChange={handleClienteChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>{clientesAtivos.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}</SelectContent>
                </Select>
              </div>

              {/* Client Info Card */}
              {clienteSelecionado && (
                <div className="rounded-lg border border-border divide-y divide-border">
                  {/* Ponto de Coleta */}
                  <div className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <MapPinned className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <span className="text-sm font-semibold text-foreground block">Ponto de Coleta</span>
                        <span className="text-sm text-muted-foreground">
                          {clienteSelecionado.endereco}, {clienteSelecionado.bairro}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Modalidade */}
                  <div className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      {clienteSelecionado.modalidade === "faturado" ? (
                        <Receipt className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      ) : (
                        <Wallet className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      )}
                      <div>
                        {clienteSelecionado.modalidade === "faturado" ? (
                          <>
                            <Badge variant="default" className="text-[10px] h-5 mb-1">Cliente Faturado</Badge>
                            <span className="text-sm text-muted-foreground block">
                              Faturamento: <span className="font-semibold text-foreground">
                                {clienteSelecionado.frequencia_faturamento === "semanal" && `Semanal (toda ${clienteSelecionado.dia_da_semana_faturamento})`}
                                {clienteSelecionado.frequencia_faturamento === "mensal" && `Mensal (dia ${clienteSelecionado.dia_do_mes_faturamento})`}
                                {clienteSelecionado.frequencia_faturamento === "diario" && "Diário"}
                                {clienteSelecionado.frequencia_faturamento === "por_entrega" && `A cada ${clienteSelecionado.numero_de_entregas_para_faturamento} entregas`}
                                {!clienteSelecionado.frequencia_faturamento && "Não configurado"}
                              </span>
                            </span>
                          </>
                        ) : (
                          <>
                            <Badge variant="secondary" className="text-[10px] h-5 mb-1 bg-emerald-100 text-emerald-700 border-emerald-200">Cliente Pré-pago</Badge>
                            <span className="text-sm text-muted-foreground block">
                              Saldo atual: <span className="font-semibold text-emerald-600">{fmt(saldoCliente)}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tipo de Operação */}
              <div className="space-y-2">
                <Label>Tipo de Operação</Label>
                <div className={`grid gap-2 ${tiposAtivos.length <= 3 ? "grid-cols-3" : tiposAtivos.length <= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"}`}>
                  {tiposAtivos.map((op) => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setTipoOperacao(op.id)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        tipoOperacao === op.id
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: op.cor }} />
                        <span className={`text-sm font-medium ${tipoOperacao === op.id ? "text-primary" : "text-foreground"}`}>{op.nome}</span>
                      </div>
                      {op.descricao && <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 block">{op.descricao}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Entregador */}
              <div className="space-y-2">
                <Label>Entregador <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <Select value={entregadorId} onValueChange={setEntregadorId}>
                  <SelectTrigger><SelectValue placeholder="Atribuir depois" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Atribuir depois</SelectItem>
                    {entregadoresAtivos.map((e) => (<SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label>Observações <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações gerais sobre a solicitação..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>

              {/* Lançamento Retroativo */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-sm font-medium">Lançamento Retroativo</Label>
                      <p className="text-xs text-muted-foreground">Criar solicitação com data passada</p>
                    </div>
                  </div>
                  <Switch
                    checked={retroativoEnabled}
                    onCheckedChange={(checked) => {
                      setRetroativoEnabled(checked);
                      if (!checked) setDataRetroativa(undefined);
                    }}
                  />
                </div>
                {retroativoEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm">Data da Solicitação *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dataRetroativa && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dataRetroativa ? format(dataRetroativa, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dataRetroativa}
                            onSelect={setDataRetroativa}
                            disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex items-center justify-between rounded-md border border-border p-3">
                      <div>
                        <Label className="text-sm font-medium">Lançar como Concluída</Label>
                        <p className="text-xs text-muted-foreground">Preenche automaticamente início e conclusão</p>
                      </div>
                      <Switch
                        checked={retroativoConcluida}
                        onCheckedChange={setRetroativoConcluida}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Rotas ({rotas.length})</h4>
                <Button variant="outline" size="sm" onClick={addRota}><Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Rota</Button>
              </div>

              {rotas.map((rota, i) => {
                const clienteSel = clientesAtivos.find((c) => c.id === clienteId);
                return (
                  <RotaCard
                    key={rota.id}
                    rota={rota}
                    index={i}
                    canRemove={rotas.length > 1}
                    clienteModalidade={clienteSel?.modalidade ?? "faturado"}
                    onUpdate={updateRota}
                    onRemove={removeRota}
                    onAddTaxaExtra={addTaxaExtra}
                    onRemoveTaxaExtra={removeTaxaExtra}
                    onUpdateTaxaExtra={updateTaxaExtra}
                    onToggleMeioPagamento={toggleMeioPagamento}
                    onToggleMeioPagamentoOperacao={(rotaId, meioPagamentoId) => {
                      setRotas((prev) => prev.map((r) => {
                        if (r.id !== rotaId) return r;
                        const has = r.meios_pagamento_operacao.includes(meioPagamentoId);
                        return {
                          ...r,
                          meios_pagamento_operacao: has
                            ? r.meios_pagamento_operacao.filter((id) => id !== meioPagamentoId)
                            : [...r.meios_pagamento_operacao, meioPagamentoId],
                        };
                      }));
                    }}
                  />
                );
              })}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Revisão</h4>

              {/* General info */}
              <div className="rounded-lg border border-border p-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-muted-foreground">Operação</span>
                  <span className="font-medium">{TIPOS_COLETA.find((t) => t.value === tipoColeta)?.label}</span>
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-medium flex items-center gap-2">
                    {clienteNome}
                    {clienteModalidade && (
                      <Badge variant={clienteModalidade === "faturado" ? "default" : "secondary"} className="text-[10px] h-5">
                        {clienteModalidade === "faturado" ? "Faturado" : "Pré-pago"}
                      </Badge>
                    )}
                  </span>
                  <span className="text-muted-foreground">Prioridade</span><span><Badge variant="outline">{tiposAtivos.find((t) => t.id === tipoOperacao)?.nome ?? tipoOperacao}</Badge></span>
                  <span className="text-muted-foreground">Coleta</span><span>{pontoColeta}</span>
                  {entregadorId && entregadorId !== "none" && (
                    <>
                      <span className="text-muted-foreground">Entregador</span>
                      <span className="font-medium">{entregadoresAtivos.find((e) => e.id === entregadorId)?.nome}</span>
                    </>
                   )}
                  <span className="text-muted-foreground">Rotas</span><span>{rotas.length}</span>
                  {retroativoEnabled && dataRetroativa && (
                    <>
                      <span className="text-muted-foreground">Data Retroativa</span>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] h-5 border-amber-500/30 text-amber-600">
                          <History className="h-3 w-3 mr-1" /> Retroativo
                        </Badge>
                        {format(dataRetroativa, "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      {retroativoConcluida && (
                        <>
                          <span className="text-muted-foreground">Status Inicial</span>
                          <span>
                            <Badge variant="default" className="text-[10px] h-5">
                              <CheckCircle className="h-3 w-3 mr-1" /> Concluída
                            </Badge>
                          </span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Route details */}
              {rotas.map((r, i) => (
                <div key={r.id} className="rounded-lg border border-border p-4 space-y-3 text-sm">
                  <div className="font-medium">Rota {i + 1}: {bairros.find((b) => b.id === r.bairro_destino_id)?.nome} → {r.responsavel}</div>

                  {/* Operação section */}
                  <div className="rounded-md bg-primary/5 border border-primary/10 p-2.5 space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-primary mb-1">
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="h-3 w-3" /> OPERAÇÃO
                      </span>
                      <Badge variant={r.pagamento_operacao === "faturar" ? "default" : "secondary"} className="text-[10px] h-5">
                        {r.pagamento_operacao === "faturar" ? "Faturado" : r.pagamento_operacao === "pago_na_hora" ? "Pago na hora" : "Descontar saldo"}
                      </Badge>
                    </div>
                    {r.meios_pagamento_operacao.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {r.meios_pagamento_operacao.map((id) => (
                          <Badge key={id} variant="outline" className="text-[10px] h-5">
                            {getFormaPagamentoNome(id)}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Taxa de Entrega</span>
                      <span className="tabular-nums">{fmt(r.taxa_resolvida ?? 0)}</span>
                    </div>
                    {r.taxas_extras.map((te) => (
                      <div key={te.id} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">+ {te.nome}</span>
                        <span className="tabular-nums">{fmt(te.valor)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-semibold text-primary pt-1 border-t border-primary/10">
                      <span>Subtotal</span>
                      <span className="tabular-nums">{fmt(getRotaSubtotalOperacao(r))}</span>
                    </div>
                  </div>

                  {/* Loja section */}
                  {r.receber_do_cliente && r.valor_a_receber > 0 && (
                    <div className="rounded-md bg-amber-500/5 border border-amber-500/10 p-2.5 space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-amber-600 mb-1">
                        <span className="flex items-center gap-1.5">
                          <Store className="h-3 w-3" /> LOJA
                        </span>
                        <Badge variant="outline" className="text-[10px] h-5 border-amber-500/30 text-amber-600">
                          {r.meio_cobranca_destino === "dinheiro" ? "Dinheiro" : r.meio_cobranca_destino === "maquina_loja" ? "Cartão Loja" : r.meio_cobranca_destino === "pix_loja" ? "Pix Loja" : r.meio_cobranca_destino === "pix_empresa" ? "Pix Empresa" : "—"}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Cobrar no destino</span>
                        <span className="tabular-nums font-semibold">{fmt(r.valor_a_receber)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Grand totals */}
              <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-primary" /> Total Operação</span>
                  <span className="font-bold tabular-nums text-primary">{fmt(totalOperacao)}</span>
                </div>
                {totalLoja > 0 && (
                  <div className="flex justify-between">
                    <span className="flex items-center gap-1.5"><Store className="h-3.5 w-3.5 text-amber-600" /> Total Loja (cobrar no destino)</span>
                    <span className="font-bold tabular-nums text-amber-600">{fmt(totalLoja)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-base">
                  <span className="font-semibold">💰 Total que o entregador recebe</span>
                  <span className="font-bold tabular-nums">{fmt(totalEntregador)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-emerald-500">
                <CheckCircle className="h-4 w-4" />
                Pronto para criar a solicitação
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)}><ChevronLeft className="h-4 w-4 mr-1" /> Voltar</Button>
          ) : (
            <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancelar</Button>
          )}
          {step < 3 ? (
            <Button onClick={handleNext}>{step === 0 ? "Continuar" : "Próximo"} <ChevronRight className="h-4 w-4 ml-1" /></Button>
          ) : (
            <Button onClick={handleSubmit}>Criar Solicitação</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calculator, MapPin, Zap, RotateCcw, Clock, AlertTriangle, CheckCircle2, Info, Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { useBairros, useRegioes, useTiposOperacao, useTaxasExtras } from "@/hooks/useSettings";
import { useClientes, useTabelaPrecos } from "@/hooks/useClientes";
import { resolverTarifaCliente } from "@/lib/resolverTarifa";
import { cn } from "@/lib/utils";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface RotaSimulada {
  id: string;
  bairroId: string;
  incluirEspera: boolean;
  incluirRetorno: boolean;
}

interface SimuladorOperacoesProps {
  clienteId?: string;
  showClienteSelector?: boolean;
  showRegiaoNoSelect?: boolean;
}

export function SimuladorOperacoes({ clienteId: fixedClienteId, showClienteSelector = false, showRegiaoNoSelect = true }: SimuladorOperacoesProps) {
  const { data: clientes = [] } = useClientes();
  const { data: bairros = [] } = useBairros();
  const { data: regioes = [] } = useRegioes();
  const { data: tiposOperacao = [] } = useTiposOperacao();
  const { data: taxasExtras = [] } = useTaxasExtras();

  const TIPOS_ATIVOS = useMemo(() => tiposOperacao.filter((t) => t.ativo), [tiposOperacao]);

  const [selectedCliente, setSelectedCliente] = useState(fixedClienteId || "");
  // Sem fallback pro "primeiro cliente da lista" — no Admin, enquanto nenhum
  // cliente for escolhido explicitamente, clienteId fica vazio de propósito.
  const clienteId = fixedClienteId || selectedCliente || "";
  const precisaEscolherCliente = showClienteSelector && !clienteId;

  const { data: tabelaPrecos = [] } = useTabelaPrecos(clienteId);

  const [tipoOperacao, setTipoOperacao] = useState("");
  const [incluirUrgencia, setIncluirUrgencia] = useState(false);

  // TIPOS_ATIVOS chega depois do primeiro render (query assíncrona) — sem isso,
  // tipoOperacao fica travado em "" pra sempre e nenhuma regra de preço dá match.
  useEffect(() => {
    if (!tipoOperacao && TIPOS_ATIVOS.length > 0) {
      setTipoOperacao(TIPOS_ATIVOS[0].id);
    }
  }, [TIPOS_ATIVOS, tipoOperacao]);
  const [rotas, setRotas] = useState<RotaSimulada[]>([
    { id: "1", bairroId: "", incluirEspera: false, incluirRetorno: false },
  ]);
  const [bairroPopoverOpenId, setBairroPopoverOpenId] = useState<string | null>(null);
  const [clientePopoverOpen, setClientePopoverOpen] = useState(false);

  const addRota = () => {
    setRotas((prev) => [
      ...prev,
      { id: String(Date.now()), bairroId: "", incluirEspera: false, incluirRetorno: false },
    ]);
  };

  const removeRota = (id: string) => {
    if (rotas.length <= 1) return;
    setRotas((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRota = (id: string, updates: Partial<RotaSimulada>) => {
    setRotas((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const resultado = useMemo(() => {
    const rotasCalc = rotas
      .filter((r) => r.bairroId)
      .map((rota) => {
        const bairro = bairros.find((b) => b.id === rota.bairroId);
        const bairroNome = bairro?.nome || "—";
        const regiao = bairro ? regioes.find((r) => r.id === bairro.region_id) : null;

        if (!clienteId) {
          return {
            bairroNome,
            regiao: regiao?.name || "—",
            taxaBase: 0,
            taxaEspera: 0,
            taxaRetorno: 0,
            subtotal: 0,
            regraNome: null as string | null,
            fallback: false,
            encontrada: false,
          };
        }

        const tarifa = resolverTarifaCliente(bairros, tabelaPrecos, rota.bairroId, clienteId, tipoOperacao);
        const taxaBase = tarifa.taxaBase;
        const taxaEspera = rota.incluirEspera ? tarifa.taxaEspera : 0;
        const taxaRetorno = rota.incluirRetorno ? tarifa.taxaRetorno : 0;

        const regraNome =
          tarifa.nivel === "bairro"
            ? "Bairro específico"
            : tarifa.nivel === "regiao"
            ? `Região (${regiao?.name || "—"})`
            : tarifa.nivel === "geral"
            ? "Regra geral"
            : "Taxa padrão do bairro";

        return {
          bairroNome,
          regiao: regiao?.name || "—",
          taxaBase,
          taxaEspera,
          taxaRetorno,
          subtotal: taxaBase + taxaEspera + taxaRetorno,
          regraNome,
          fallback: tarifa.fallback,
          encontrada: true,
        };
      });

    const subtotalRotas = rotasCalc.reduce((acc, r) => acc + r.subtotal, 0);

    // Urgência: usa a primeira regra encontrada ou taxa extra config
    let taxaUrgencia = 0;
    if (incluirUrgencia) {
      const primeiraRota = rotas.find((r) => r.bairroId);
      if (primeiraRota && clienteId) {
        const tarifa = resolverTarifaCliente(bairros, tabelaPrecos, primeiraRota.bairroId, clienteId, tipoOperacao);
        taxaUrgencia = tarifa.taxaUrgencia;
      }
      if (!taxaUrgencia) {
        const taxaUrgConfig = taxasExtras.find((t) => t.nome.toLowerCase().includes("urgência") && t.ativo);
        taxaUrgencia = taxaUrgConfig?.valor_padrao || 0;
      }
    }

    return {
      rotas: rotasCalc,
      subtotalRotas,
      taxaUrgencia,
      total: subtotalRotas + taxaUrgencia,
      temRotas: rotasCalc.length > 0,
    };
  }, [rotas, tipoOperacao, incluirUrgencia, clienteId, tabelaPrecos, bairros, regioes, taxasExtras]);

  const resetForm = () => {
    setTipoOperacao(TIPOS_ATIVOS[0]?.id ?? "");
    setIncluirUrgencia(false);
    setRotas([{ id: "1", bairroId: "", incluirEspera: false, incluirRetorno: false }]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* ── Painel de entrada ── */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Simulador de Operações
          </CardTitle>
          <CardDescription>
            Simule o custo de corridas em tempo real com base nas regras de precificação cadastradas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cliente selector (admin only) */}
          {showClienteSelector && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cliente</Label>
              <Popover open={clientePopoverOpen} onOpenChange={setClientePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientePopoverOpen}
                    className={cn("w-full justify-between font-normal", !selectedCliente && "text-muted-foreground")}
                  >
                    <span className="truncate">
                      {selectedCliente ? clientes.find((c) => c.id === selectedCliente)?.nome : "Selecione o cliente"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {clientes.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={c.nome}
                            onSelect={() => {
                              setSelectedCliente(c.id);
                              setClientePopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-3.5 w-3.5 shrink-0", selectedCliente === c.id ? "opacity-100" : "opacity-0")} />
                            {c.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo de Operação</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TIPOS_ATIVOS.map((op) => {
                const active = tipoOperacao === op.id;
                return (
                  <button
                    key={op.id}
                    onClick={() => setTipoOperacao(op.id)}
                    className={`flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-3 text-sm font-medium transition-all duration-200 ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: op.cor }} />
                    {op.nome}
                  </button>
                );
              })}
            </div>
            {(() => {
              const tipoAtual = tiposOperacao.find((t) => t.id === tipoOperacao);
              if (!tipoAtual) return null;
              const diasLabel = tipoAtual.dias_semana.length > 0
                ? tipoAtual.dias_semana.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ")
                : tipoAtual.aplica_feriado ? "Feriados" : "Todos os dias";
              const horarioLabel = tipoAtual.horario_inicio && tipoAtual.horario_fim
                ? `${tipoAtual.horario_inicio} – ${tipoAtual.horario_fim}`
                : "Horário livre";
              return (
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 pl-1">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{horarioLabel}</span>
                  <span>•</span>
                  <span>{diasLabel}</span>
                </div>
              );
            })()}
          </div>

          <Separator />

          {/* Rotas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Destinos da Entrega</Label>
              <Button variant="outline" size="sm" onClick={addRota}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Destino
              </Button>
            </div>

            {rotas.map((rota, idx) => (
              <Card key={rota.id} className="bg-muted/30 border-dashed">
                <CardContent className="pt-4 pb-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Destino {idx + 1}
                    </span>
                    {rotas.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeRota(rota.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  {(() => {
                    const bairroSelecionado = bairros.find((b) => b.id === rota.bairroId);
                    const isOpen = bairroPopoverOpenId === rota.id;
                    return (
                      <Popover open={isOpen} onOpenChange={(open) => setBairroPopoverOpenId(open ? rota.id : null)}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={isOpen}
                            className={cn("w-full justify-between font-normal", !bairroSelecionado && "text-muted-foreground")}
                          >
                            <span className="truncate">{bairroSelecionado?.nome || "Selecione o bairro de destino"}</span>
                            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar bairro..." />
                            <CommandList>
                              <CommandEmpty>Nenhum bairro encontrado.</CommandEmpty>
                              <CommandGroup>
                                {bairros.map((b) => {
                                  const reg = showRegiaoNoSelect ? regioes.find((r) => r.id === b.region_id) : null;
                                  return (
                                    <CommandItem
                                      key={b.id}
                                      value={b.nome}
                                      onSelect={() => {
                                        updateRota(rota.id, { bairroId: b.id });
                                        setBairroPopoverOpenId(null);
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-3.5 w-3.5 shrink-0", rota.bairroId === b.id ? "opacity-100" : "opacity-0")} />
                                      {b.nome} {reg ? `(${reg.name})` : ""}
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    );
                  })()}
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rota.incluirEspera}
                        onCheckedChange={(v) => updateRota(rota.id, { incluirEspera: v })}
                        id={`espera-${rota.id}`}
                      />
                      <Label htmlFor={`espera-${rota.id}`} className="text-sm flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Espera
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rota.incluirRetorno}
                        onCheckedChange={(v) => updateRota(rota.id, { incluirRetorno: v })}
                        id={`retorno-${rota.id}`}
                      />
                      <Label htmlFor={`retorno-${rota.id}`} className="text-sm flex items-center gap-1.5">
                        <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" /> Retorno
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          {/* Urgência */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <Label className="text-sm font-medium">Incluir Taxa de Urgência</Label>
            </div>
            <Switch checked={incluirUrgencia} onCheckedChange={setIncluirUrgencia} />
          </div>

          <Button variant="outline" className="w-full" onClick={resetForm}>
            Limpar Simulação
          </Button>
        </CardContent>
      </Card>

      {/* ── Painel de resultado ── */}
      <Card className="lg:col-span-2 h-fit lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle className="text-lg">Resultado da Simulação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {precisaEscolherCliente ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Selecione um cliente para simular.</p>
            </div>
          ) : !resultado.temRotas ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Selecione ao menos um bairro de destino para simular.</p>
            </div>
          ) : (
            <>
              {/* Breakdown por rota */}
              {resultado.rotas.map((rota, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">{rota.bairroNome}</span>
                    {rota.encontrada ? (
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-5 ${rota.fallback ? "border-amber-400 text-amber-600 dark:text-amber-400" : ""}`}
                      >
                        {rota.fallback ? <AlertTriangle className="h-3 w-3 mr-1" /> : <Info className="h-3 w-3 mr-1" />}
                        {rota.regraNome}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] h-5">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Sem regra
                      </Badge>
                    )}
                  </div>
                  {rota.encontrada && (
                    <div className="ml-6 space-y-1 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Taxa base</span>
                        <span className="tabular-nums">{fmt(rota.taxaBase)}</span>
                      </div>
                      {rota.taxaEspera > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Taxa de espera</span>
                          <span className="tabular-nums">{fmt(rota.taxaEspera)}</span>
                        </div>
                      )}
                      {rota.taxaRetorno > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Taxa de retorno</span>
                          <span className="tabular-nums">{fmt(rota.taxaRetorno)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium pt-1 border-t border-border/50">
                        <span>Subtotal</span>
                        <span className="tabular-nums">{fmt(rota.subtotal)}</span>
                      </div>
                    </div>
                  )}
                  {rota.fallback && (
                    <div className="ml-6 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-2.5 py-1.5">
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">
                        ⚠ Usando taxa padrão do bairro. Configure uma regra na Tabela de Preços do cliente para tarifa personalizada.
                      </p>
                    </div>
                  )}
                  {idx < resultado.rotas.length - 1 && <Separator className="mt-3" />}
                </div>
              ))}

              <Separator />

              {/* Totais */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal rotas ({resultado.rotas.length})</span>
                  <span className="tabular-nums">{fmt(resultado.subtotalRotas)}</span>
                </div>
                {resultado.taxaUrgencia > 0 && (
                  <div className="flex justify-between text-sm text-amber-600">
                    <span className="flex items-center gap-1">
                      <Zap className="h-3.5 w-3.5" /> Urgência
                    </span>
                    <span className="tabular-nums">{fmt(resultado.taxaUrgencia)}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="text-base font-bold">Total Estimado</span>
                <span className="text-xl sm:text-2xl font-bold text-primary tabular-nums">
                  {fmt(resultado.total)}
                </span>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <span>
                  Valores calculados com base nas regras de precificação vigentes. O valor final pode variar conforme ajustes na operação.
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

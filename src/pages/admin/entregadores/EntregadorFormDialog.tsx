import { useState, useEffect } from "react";
import type { Entregador, TipoVeiculo, TipoComissao, MetaModoCalculo } from "@/types/database";
import { TIPO_VEICULO_LABELS } from "@/types/database";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { toast } from "sonner";
import { Trash2, Plus, AlertTriangle } from "lucide-react";
import { useComissaoFaixas, useSaveComissaoFaixas, detectarGapsFaixas } from "@/hooks/useComissaoFaixas";
import { formatCurrency } from "@/lib/formatters";

interface FaixaForm {
  id: string; // local key only
  de: number;
  ate: number;
  valor_por_entrega: number;
}

interface EntregadorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Entregador | null;
  onSave: (data: Entregador, senha?: string, faixas?: FaixaForm[]) => void;
}

export function EntregadorFormDialog({ open, onOpenChange, editing, onSave }: EntregadorFormDialogProps) {
  const [nome, setNome] = useState("");
  const [documento, setDocumento] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");
  const [veiculo, setVeiculo] = useState<TipoVeiculo>("moto");
  const [status, setStatus] = useState<"ativo" | "inativo">("ativo");
  const [tipoComissao, setTipoComissao] = useState<TipoComissao>("percentual");
  const [valorComissao, setValorComissao] = useState(0);
  const [metaModo, setMetaModo] = useState<MetaModoCalculo>("escalonado");
  const [faixas, setFaixas] = useState<FaixaForm[]>([]);
  const [senha, setSenha] = useState("");

  const { data: faixasExistentes = [] } = useComissaoFaixas(
    editing?.tipo_comissao === "meta" ? editing.id : null
  );
  const { mutateAsync: salvarFaixas } = useSaveComissaoFaixas();

  useEffect(() => {
    if (editing) {
      setNome(editing.nome);
      setDocumento(editing.documento);
      setEmail(editing.email);
      setTelefone(editing.telefone);
      setCidade(editing.cidade);
      setBairro(editing.bairro);
      setVeiculo(editing.veiculo);
      setStatus(editing.status);
      setTipoComissao(editing.tipo_comissao);
      setValorComissao(editing.valor_comissao);
      setMetaModo(editing.meta_modo_calculo ?? "escalonado");
    } else {
      setNome(""); setDocumento(""); setEmail(""); setTelefone("");
      setCidade("Fortaleza"); setBairro(""); setVeiculo("moto");
      setStatus("ativo"); setTipoComissao("percentual"); setValorComissao(0);
      setMetaModo("escalonado"); setFaixas([]);
      setSenha("");
    }
  }, [editing, open]);

  // Carrega faixas existentes ao abrir no modo edição
  useEffect(() => {
    if (faixasExistentes.length > 0) {
      setFaixas(
        faixasExistentes.map((f) => ({
          id: f.id,
          de: f.de,
          ate: f.ate,
          valor_por_entrega: f.valor_por_entrega,
        }))
      );
    }
  }, [faixasExistentes]);

  const adicionarFaixa = () => {
    const ultima = faixas[faixas.length - 1];
    const novoDe = ultima ? ultima.ate + 1 : 1;
    setFaixas([
      ...faixas,
      {
        id: crypto.randomUUID(),
        de: novoDe,
        ate: novoDe + 99,
        valor_por_entrega: 0,
      },
    ]);
  };

  const removerFaixa = (id: string) => {
    setFaixas(faixas.filter((f) => f.id !== id));
  };

  const atualizarFaixa = (id: string, campo: keyof FaixaForm, valor: number) => {
    setFaixas(faixas.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)));
  };

  const gaps = tipoComissao === "meta" ? detectarGapsFaixas(faixas) : [];

  const faixasValidas =
    tipoComissao !== "meta" ||
    faixas.every((f) => f.ate > f.de && f.valor_por_entrega >= 0);

  const handleSubmit = async () => {
    if (!nome.trim() || !documento.trim() || !email.trim() || !telefone.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    if (!editing && !senha.trim()) {
      toast.error("Defina uma senha de acesso para o entregador.");
      return;
    }
    if (!editing && senha.trim().length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (tipoComissao === "meta" && faixas.length === 0) {
      toast.error("Adicione pelo menos uma faixa de entrega.");
      return;
    }
    if (!faixasValidas) {
      toast.error("Verifique as faixas: 'Até' deve ser maior que 'De' e valor ≥ 0.");
      return;
    }

    const now = new Date().toISOString();
    const entregadorData: Entregador = {
      id: editing?.id ?? "",
      nome, documento, email, telefone, cidade, bairro, veiculo, status,
      tipo_comissao: tipoComissao,
      valor_comissao: tipoComissao === "meta" ? 0 : valorComissao,
      meta_modo_calculo: tipoComissao === "meta" ? metaModo : null,
      created_at: editing?.created_at ?? now,
      updated_at: now,
    };

    // Para edição de entregador existente com meta: salva faixas diretamente
    if (tipoComissao === "meta" && editing?.id) {
      try {
        await salvarFaixas({ entregadorId: editing.id, faixas });
      } catch {
        toast.error("Entregador salvo, mas erro ao salvar faixas. Tente editar novamente.");
      }
    }

    // Para novo entregador com meta: passa faixas pelo callback para o pai salvar após criação
    const faixasParaSalvar = tipoComissao === "meta" && !editing ? faixas : undefined;
    onSave(entregadorData, !editing ? senha.trim() : undefined, faixasParaSalvar);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Entregador" : "Novo Entregador"}</DialogTitle>
          <DialogDescription className="sr-only">.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Dados Pessoais */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Dados Pessoais</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nome completo *</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Carlos Silva" />
              </div>
              <div className="space-y-2">
                <Label>CPF / CNPJ *</Label>
                <Input value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <PhoneInput value={telefone} onChange={setTelefone} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as "ativo" | "inativo")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Localização e Veículo */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Localização & Veículo</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Ex: Fortaleza" />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Ex: Centro" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Veículo</Label>
                <Select value={veiculo} onValueChange={(v) => setVeiculo(v as TipoVeiculo)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TIPO_VEICULO_LABELS) as [TipoVeiculo, string][]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Comissão */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Comissão</h4>
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Tipo de comissão</Label>
                <RadioGroup
                  value={tipoComissao}
                  onValueChange={(v) => setTipoComissao(v as TipoComissao)}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="percentual" id="com-percent" />
                    <Label htmlFor="com-percent" className="font-normal cursor-pointer">Percentual (%)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="fixo" id="com-fixo" />
                    <Label htmlFor="com-fixo" className="font-normal cursor-pointer">Valor fixo (R$)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="meta" id="com-meta" />
                    <Label htmlFor="com-meta" className="font-normal cursor-pointer">Por Meta</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Percentual e Fixo */}
              {(tipoComissao === "percentual" || tipoComissao === "fixo") && (
                <div className="space-y-2">
                  <Label>{tipoComissao === "percentual" ? "Percentual de comissão (%)" : "Valor fixo por entrega (R$)"}</Label>
                  {tipoComissao === "percentual" ? (
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={valorComissao}
                      onChange={(e) => setValorComissao(Number(e.target.value))}
                      placeholder="Ex: 15"
                    />
                  ) : (
                    <CurrencyInput value={valorComissao} onChange={setValorComissao} />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Comissão calculada somente sobre a receita operacional.
                  </p>
                </div>
              )}

              {/* Por Meta */}
              {tipoComissao === "meta" && (
                <div className="space-y-4">
                  {/* Modo de cálculo */}
                  <div className="space-y-2">
                    <Label>Modo de cálculo</Label>
                    <RadioGroup
                      value={metaModo}
                      onValueChange={(v) => setMetaModo(v as MetaModoCalculo)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="escalonado" id="modo-esc" />
                        <div>
                          <Label htmlFor="modo-esc" className="font-normal cursor-pointer">Escalonado</Label>
                          <p className="text-xs text-muted-foreground">Cada entrega vale o valor da sua faixa</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="faixa_maxima" id="modo-max" />
                        <div>
                          <Label htmlFor="modo-max" className="font-normal cursor-pointer">Faixa Máxima</Label>
                          <p className="text-xs text-muted-foreground">Tudo vale a faixa mais alta atingida</p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Editor de faixas */}
                  <div className="space-y-2">
                    <Label>Faixas de entrega</Label>

                    {faixas.length > 0 && (
                      <div className="rounded-md border border-border overflow-hidden">
                        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-0 bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                          <span>De</span>
                          <span>Até</span>
                          <span>R$/entrega</span>
                          <span />
                        </div>
                        {faixas.map((faixa) => (
                          <div
                            key={faixa.id}
                            className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center px-3 py-2 border-t border-border"
                          >
                            <Input
                              type="number"
                              min={1}
                              value={faixa.de}
                              onChange={(e) => atualizarFaixa(faixa.id, "de", Number(e.target.value))}
                              className="h-8 text-sm"
                            />
                            <Input
                              type="number"
                              min={faixa.de + 1}
                              value={faixa.ate}
                              onChange={(e) => atualizarFaixa(faixa.id, "ate", Number(e.target.value))}
                              className="h-8 text-sm"
                            />
                            <CurrencyInput
                              value={faixa.valor_por_entrega}
                              onChange={(v) => atualizarFaixa(faixa.id, "valor_por_entrega", v)}
                              className="h-8 text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removerFaixa(faixa.id)}
                              type="button"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={adicionarFaixa}
                      type="button"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar faixa
                    </Button>

                    {/* Aviso de gap (informativo, não bloqueia) */}
                    {gaps.length > 0 && (
                      <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 space-y-1">
                        <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-xs font-medium">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          Intervalo sem faixa detectado
                        </div>
                        {gaps.map((g, i) => (
                          <p key={i} className="text-xs text-amber-600 dark:text-amber-500 ml-5">
                            Entregas {g.de}–{g.ate} usarão {formatCurrency(g.valorHerdado)}/entrega (faixa anterior)
                          </p>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Comissão calculada somente sobre a receita operacional. O contador zera todo mês.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Acesso ao Portal (apenas novo cadastro) */}
          {!editing && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Acesso ao Portal</h4>
              <div className="space-y-2">
                <Label>Senha de acesso *</Label>
                <Input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  className={senha && senha.length < 6 ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {senha && senha.length < 6 && (
                  <p className="text-xs text-destructive">A senha deve ter no mínimo 6 caracteres.</p>
                )}
                {senha && senha.length >= 6 && (
                  <p className="text-xs text-green-600 dark:text-green-400">✓ Senha válida</p>
                )}
                <p className="text-xs text-muted-foreground">
                  O entregador usará o email cadastrado e esta senha para acessar o portal.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>{editing ? "Salvar" : "Cadastrar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


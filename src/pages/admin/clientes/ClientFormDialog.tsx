import { useState, useEffect, useCallback } from "react";
import { MOCK_CLIENTES } from "@/data/mockClientes";
import type { Cliente, Modalidade, FrequenciaFaturamento, DiaSemana } from "@/types/database";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { toast } from "sonner";

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Cliente | null;
  onSave: (data: Cliente, senha?: string) => void;
}

const UF_LIST = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

export function ClientFormDialog({ open, onOpenChange, editing, onSave }: ClientFormDialogProps) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"pessoa_fisica" | "pessoa_juridica">("pessoa_fisica");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("CE");
  const [chavePix, setChavePix] = useState("");
  const [status, setStatus] = useState<"ativo" | "inativo" | "bloqueado">("ativo");
  const [modalidade, setModalidade] = useState<Modalidade>("pre_pago");
  const [faturamentoAuto, setFaturamentoAuto] = useState(false);
  const [frequencia, setFrequencia] = useState<FrequenciaFaturamento | "">("");
  const [numEntregas, setNumEntregas] = useState<number | "">("");
  const [diaSemana, setDiaSemana] = useState<DiaSemana | "">("");
  const [diaMes, setDiaMes] = useState<number | "">("");
  const [senha, setSenha] = useState("");

  useEffect(() => {
    if (editing) {
      setNome(editing.nome);
      setTipo(editing.tipo);
      setEmail(editing.email);
      setTelefone(editing.telefone);
      setEndereco(editing.endereco);
      setBairro(editing.bairro);
      setCidade(editing.cidade);
      setUf(editing.uf);
      setChavePix(editing.chavePix ?? "");
      setStatus(editing.status);
      setModalidade(editing.modalidade);
      setFaturamentoAuto(editing.ativar_faturamento_automatico);
      setFrequencia(editing.frequencia_faturamento ?? "");
      setNumEntregas(editing.numero_de_entregas_para_faturamento ?? "");
      setDiaSemana(editing.dia_da_semana_faturamento ?? "");
      setDiaMes(editing.dia_do_mes_faturamento ?? "");
    } else {
      setNome(""); setTipo("pessoa_fisica"); setEmail(""); setTelefone("");
      setEndereco(""); setBairro(""); setCidade(""); setUf("CE");
      setChavePix(""); setStatus("ativo"); setModalidade("pre_pago");
      setFaturamentoAuto(false); setFrequencia(""); setNumEntregas(""); setDiaSemana(""); setDiaMes("");
      setSenha("");
    }
  }, [editing, open]);

  const handleSubmit = () => {
    if (!nome.trim() || !email.trim() || !telefone.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    if (emailError) {
      toast.error(emailError);
      return;
    }
    if (!editing && !senha.trim()) {
      toast.error("Defina uma senha de acesso para o cliente.");
      return;
    }
    if (!editing && senha.trim().length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    const now = new Date().toISOString();
    onSave({
      id: editing?.id ?? "",
      nome: nome.trim(),
      tipo,
      email: email.trim(),
      telefone,
      endereco: endereco.trim(),
      bairro: bairro.trim(),
      cidade: cidade.trim(),
      uf,
      chavePix: chavePix.trim() || null,
      status,
      modalidade,
      ativar_faturamento_automatico: modalidade === "faturado" ? faturamentoAuto : false,
      frequencia_faturamento: modalidade === "faturado" && faturamentoAuto && frequencia ? frequencia as FrequenciaFaturamento : null,
      numero_de_entregas_para_faturamento: frequencia === "por_entrega" && numEntregas ? Number(numEntregas) : null,
      dia_da_semana_faturamento: frequencia === "semanal" && diaSemana ? diaSemana as DiaSemana : null,
      dia_do_mes_faturamento: frequencia === "mensal" && diaMes ? Number(diaMes) : null,
      created_at: editing?.created_at ?? now,
      updated_at: now,
    }, !editing ? senha.trim() : undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{editing ? "Editar Cliente" : "Cadastrar Novo Cliente"}</DialogTitle>
          <DialogDescription>
            Preencha as informações abaixo para {editing ? "atualizar o cliente" : "cadastrar um novo cliente"} no sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Seção 1: Configuração de Faturamento (card destacado) */}
          <div className="rounded-lg border border-border p-5 space-y-4">
            <h3 className="text-base font-semibold">Configuração de Faturamento</h3>

            <div className="space-y-2">
              <Label>Modalidade de Pagamento</Label>
              <Select value={modalidade} onValueChange={(v) => setModalidade(v as Modalidade)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre_pago">Pré-pago</SelectItem>
                  <SelectItem value="faturado">Faturado (Pós-pago)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {modalidade === "faturado" && (
              <>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="faturamento-auto"
                    checked={faturamentoAuto}
                    onCheckedChange={(checked) => setFaturamentoAuto(checked === true)}
                  />
                  <Label htmlFor="faturamento-auto" className="cursor-pointer text-sm">
                    Ativar fechamento automático de fatura
                  </Label>
                </div>

                {faturamentoAuto && (
                  <div className="rounded-md border border-border/60 bg-muted/30 p-4 space-y-4">
                    <div className="space-y-3">
                      <Label className="text-sm">Frequência de fechamento:</Label>
                      <RadioGroup
                        value={frequencia}
                        onValueChange={(v) => setFrequencia(v as FrequenciaFaturamento)}
                        className="flex flex-wrap gap-x-5 gap-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="diario" id="freq-diario" />
                          <Label htmlFor="freq-diario" className="cursor-pointer font-normal">Diário</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="semanal" id="freq-semanal" />
                          <Label htmlFor="freq-semanal" className="cursor-pointer font-normal">Semanal</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="mensal" id="freq-mensal" />
                          <Label htmlFor="freq-mensal" className="cursor-pointer font-normal">Mensal</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="por_entrega" id="freq-entrega" />
                          <Label htmlFor="freq-entrega" className="cursor-pointer font-normal">Por Nº de Entregas</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {frequencia === "por_entrega" && (
                      <div className="space-y-2">
                        <Label>Nº de entregas para fechamento</Label>
                        <Input
                          type="number"
                          min={1}
                          value={numEntregas}
                          onChange={(e) => setNumEntregas(e.target.value ? Number(e.target.value) : "")}
                          placeholder="Ex: 30"
                        />
                      </div>
                    )}

                    {frequencia === "semanal" && (
                      <div className="space-y-2">
                        <Label>Dia da semana para fechamento</Label>
                        <Select value={diaSemana as string} onValueChange={(v) => setDiaSemana(v as DiaSemana)}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="segunda">Segunda-feira</SelectItem>
                            <SelectItem value="terca">Terça-feira</SelectItem>
                            <SelectItem value="quarta">Quarta-feira</SelectItem>
                            <SelectItem value="quinta">Quinta-feira</SelectItem>
                            <SelectItem value="sexta">Sexta-feira</SelectItem>
                            <SelectItem value="sabado">Sábado</SelectItem>
                            <SelectItem value="domingo">Domingo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {frequencia === "mensal" && (
                      <div className="space-y-2">
                        <Label>Dia do mês para fechamento</Label>
                        <Input
                          type="number"
                          min={1}
                          max={28}
                          value={diaMes}
                          onChange={(e) => setDiaMes(e.target.value ? Number(e.target.value) : "")}
                          placeholder="Ex: 28"
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <Separator />

          {/* Seção 2: Dados Cadastrais */}
          <div>
            <h3 className="text-base font-semibold mb-4">Dados Cadastrais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nome *</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do cliente ou empresa" />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pessoa_fisica">Pessoa Física</SelectItem>
                    <SelectItem value="pessoa_juridica">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                  onBlur={() => {
                    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                      setEmailError("Email inválido");
                    } else if (email.trim() && MOCK_CLIENTES.some((c) => c.email.toLowerCase() === email.trim().toLowerCase() && c.id !== editing?.id)) {
                      setEmailError("Email já cadastrado");
                    }
                  }}
                  placeholder="email@exemplo.com"
                  className={emailError ? "border-destructive" : ""}
                />
                {emailError && <p className="text-xs text-destructive">{emailError}</p>}
              </div>
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <PhoneInput value={telefone} onChange={setTelefone} />
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número" />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Select value={uf} onValueChange={setUf}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UF_LIST.map((u) => (<SelectItem key={u} value={u}>{u}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Bairro" />
              </div>
              <div className="space-y-2">
                <Label>Chave PIX</Label>
                <Input value={chavePix} onChange={(e) => setChavePix(e.target.value)} placeholder="CPF, email, telefone ou chave aleatória" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="bloqueado">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Seção 3: Acesso ao Portal (apenas novo cadastro) */}
          {!editing && (
            <>
              <Separator />
              <div>
                <h3 className="text-base font-semibold mb-4">Acesso ao Portal</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      O cliente usará o email cadastrado e esta senha para acessar o portal.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit}>{editing ? "Salvar" : "Cadastrar Cliente"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

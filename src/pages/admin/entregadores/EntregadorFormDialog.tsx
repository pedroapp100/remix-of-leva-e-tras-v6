import { useState, useEffect } from "react";
import type { Entregador, TipoVeiculo, TipoComissao } from "@/types/database";
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

interface EntregadorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Entregador | null;
  onSave: (data: Entregador, senha?: string) => void;
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
  const [senha, setSenha] = useState("");

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
    } else {
      setNome(""); setDocumento(""); setEmail(""); setTelefone("");
      setCidade("Fortaleza"); setBairro(""); setVeiculo("moto");
      setStatus("ativo"); setTipoComissao("percentual"); setValorComissao(0);
      setSenha("");
    }
  }, [editing, open]);

  const handleSubmit = () => {
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
    const now = new Date().toISOString();
    onSave({
      id: editing?.id ?? "",
      nome, documento, email, telefone, cidade, bairro, veiculo, status,
      tipo_comissao: tipoComissao,
      valor_comissao: valorComissao,
      created_at: editing?.created_at ?? now,
      updated_at: now,
    }, !editing ? senha.trim() : undefined);
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
                <RadioGroup value={tipoComissao} onValueChange={(v) => setTipoComissao(v as TipoComissao)} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="percentual" id="com-percent" />
                    <Label htmlFor="com-percent" className="font-normal cursor-pointer">Percentual (%)</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="fixo" id="com-fixo" />
                    <Label htmlFor="com-fixo" className="font-normal cursor-pointer">Valor fixo (R$)</Label>
                  </div>
                </RadioGroup>
              </div>
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

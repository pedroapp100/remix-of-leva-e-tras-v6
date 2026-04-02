import { useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/shared/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { useClienteId } from "@/hooks/useClienteId";

export default function ClientePerfilPage() {
  const { cliente: clienteData } = useClienteId();
  const cliente = clienteData!;
  const [form, setForm] = useState({
    nome: cliente.nome,
    email: cliente.email,
    telefone: cliente.telefone,
    endereco: cliente.endereco,
    bairro: cliente.bairro,
    cidade: cliente.cidade,
    uf: cliente.uf,
    chavePix: cliente.chavePix ?? "",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    toast.success("Perfil atualizado com sucesso!");
  };

  return (
    <PageContainer title="Meu Perfil" subtitle="Atualize suas informações pessoais.">
      <Card data-onboarding="client-profile-form" className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Dados Cadastrais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={form.nome} onChange={(e) => handleChange("nome", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <PhoneInput value={form.telefone} onChange={(v) => handleChange("telefone", v)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chavePix">Chave PIX</Label>
              <Input id="chavePix" value={form.chavePix} onChange={(e) => handleChange("chavePix", e.target.value)} placeholder="CPF, email ou chave aleatória" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" value={form.endereco} onChange={(e) => handleChange("endereco", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input id="bairro" value={form.bairro} onChange={(e) => handleChange("bairro", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" value={form.cidade} onChange={(e) => handleChange("cidade", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uf">UF</Label>
                <Input id="uf" value={form.uf} onChange={(e) => handleChange("uf", e.target.value)} maxLength={2} />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

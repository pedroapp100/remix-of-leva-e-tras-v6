import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/shared/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { useEntregadorById, useUpdateEntregador } from "@/hooks/useEntregadores";
import { useEntregadorId } from "@/hooks/useEntregadorId";

export default function EntregadorPerfilPage() {
  const { entregadorId: ENTREGADOR_ID } = useEntregadorId();
  const { data: entregador } = useEntregadorById(ENTREGADOR_ID ?? "");
  const updateEntregador = useUpdateEntregador();
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    documento: "",
    cidade: "",
    bairro: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entregador) {
      setForm({
        nome: entregador.nome ?? "",
        email: entregador.email ?? "",
        telefone: entregador.telefone ?? "",
        documento: entregador.documento ?? "",
        cidade: entregador.cidade ?? "",
        bairro: entregador.bairro ?? "",
      });
    }
  }, [entregador]);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!ENTREGADOR_ID) return;
      await updateEntregador.mutateAsync({ id: ENTREGADOR_ID, patch: { nome: form.nome, email: form.email, telefone: form.telefone, cidade: form.cidade, bairro: form.bairro } });
      toast.success("Perfil atualizado com sucesso!");
    } catch {
      toast.error("Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer title="Meu Perfil" subtitle="Atualize suas informações pessoais.">
      <Card data-onboarding="driver-profile-form" className="max-w-2xl">
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
              <Label htmlFor="documento">Documento (CPF)</Label>
              <Input id="documento" value={form.documento} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" value={form.cidade} onChange={(e) => handleChange("cidade", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input id="bairro" value={form.bairro} onChange={(e) => handleChange("bairro", e.target.value)} />
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

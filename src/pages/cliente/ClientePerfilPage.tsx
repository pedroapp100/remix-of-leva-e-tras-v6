import { useEffect, useState } from "react";
import { PageContainer } from "@/components/shared/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClienteId } from "@/hooks/useClienteId";

export default function ClientePerfilPage() {
  const { cliente } = useClienteId();
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    endereco: "",
    bairro: "",
    cidade: "",
    uf: "",
    chave_pix: "",
  });

  useEffect(() => {
    if (cliente) {
      setForm({
        nome: cliente.nome ?? "",
        email: cliente.email ?? "",
        telefone: cliente.telefone ?? "",
        endereco: cliente.endereco ?? "",
        bairro: cliente.bairro ?? "",
        cidade: cliente.cidade ?? "",
        uf: cliente.uf ?? "",
        chave_pix: cliente.chave_pix ?? "",
      });
    }
  }, [cliente]);

  return (
    <PageContainer title="Meu Perfil" subtitle="Seus dados cadastrais. Para alterar, entre em contato com o administrador.">
      <Card data-onboarding="client-profile-form" className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Dados Cadastrais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={form.nome} readOnly className="cursor-default bg-muted/40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} readOnly className="cursor-default bg-muted/40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" value={form.telefone} readOnly className="cursor-default bg-muted/40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chave_pix">Chave PIX</Label>
              <Input id="chave_pix" value={form.chave_pix} readOnly className="cursor-default bg-muted/40" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" value={form.endereco} readOnly className="cursor-default bg-muted/40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input id="bairro" value={form.bairro} readOnly className="cursor-default bg-muted/40" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" value={form.cidade} readOnly className="cursor-default bg-muted/40" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uf">UF</Label>
                <Input id="uf" value={form.uf} readOnly className="cursor-default bg-muted/40" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

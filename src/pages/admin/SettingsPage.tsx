import { PageContainer } from "@/components/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Globe, CreditCard, Shield, DollarSign, Receipt, Calculator, Clock, Users, Webhook, Plug, Bell, Settings } from "lucide-react";
import { GeralTab } from "./settings/GeralTab";
import { BairrosTab } from "./settings/BairrosTab";
import { RegioesTab } from "./settings/RegioesTab";
import { FormasPagamentoTab } from "./settings/FormasPagamentoTab";
import { CargosTab } from "./settings/CargosTab";
import { TabelaPrecosTab } from "./settings/TabelaPrecosTab";
import { TaxasExtrasTab } from "./settings/TaxasExtrasTab";
import { TiposOperacaoTab } from "./settings/TiposOperacaoTab";
import { UsuariosTab } from "./settings/UsuariosTab";
import { WebhooksTab } from "./settings/WebhooksTab";
import { IntegracoesTab } from "./settings/IntegracoesTab";
import { NotificacoesTab } from "./settings/NotificacoesTab";
import { SimuladorOperacoes } from "@/components/shared/SimuladorOperacoes";
import { useSearchParams } from "react-router-dom";

const tabs = [
  { value: "bairros", label: "Bairros", icon: MapPin },
  { value: "regioes", label: "Regiões", icon: Globe },
  { value: "pagamento", label: "Pagamentos", icon: CreditCard },
  { value: "cargos", label: "Cargos", icon: Shield },
  { value: "usuarios", label: "Usuários", icon: Users },
  { value: "tipos_operacao", label: "Tipos de Operação", icon: Clock },
  { value: "precos", label: "Tabela de Preços", icon: DollarSign },
  { value: "taxas_extras", label: "Taxas Extras", icon: Receipt },
  { value: "simulador", label: "Simulador", icon: Calculator },
  { value: "notificacoes", label: "Notificações", icon: Bell },
  { value: "webhooks", label: "Webhooks", icon: Webhook },
  { value: "integracoes", label: "Integrações", icon: Plug },
];

export default function SettingsPage() {
  const [searchParams] = useSearchParams();
  const clienteId = searchParams.get("cliente") ?? undefined;
  const defaultTab = clienteId ? "precos" : "bairros";

  return (
    <PageContainer
      title="Configurações"
      subtitle="Gerencie as configurações do sistema."
    >
      <Card>
        <CardContent className="p-4">
          <Tabs defaultValue={defaultTab} data-onboarding="settings-tabs">
            <div className="overflow-x-auto scrollbar-hide">
              <TabsList className="inline-flex h-auto flex-wrap">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="gap-1.5"
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="bairros" className="mt-4"><BairrosTab /></TabsContent>
            <TabsContent value="regioes" className="mt-4"><RegioesTab /></TabsContent>
            <TabsContent value="pagamento" className="mt-4"><FormasPagamentoTab /></TabsContent>
            <TabsContent value="cargos" className="mt-4"><CargosTab /></TabsContent>
            <TabsContent value="usuarios" className="mt-4"><UsuariosTab /></TabsContent>
            <TabsContent value="tipos_operacao" className="mt-4"><TiposOperacaoTab /></TabsContent>
            <TabsContent value="precos" className="mt-4" data-onboarding="price-table"><TabelaPrecosTab initialClienteId={clienteId} /></TabsContent>
            <TabsContent value="taxas_extras" className="mt-4"><TaxasExtrasTab /></TabsContent>
            <TabsContent value="simulador" className="mt-4"><SimuladorOperacoes showClienteSelector /></TabsContent>
            <TabsContent value="notificacoes" className="mt-4"><NotificacoesTab /></TabsContent>
            <TabsContent value="webhooks" className="mt-4"><WebhooksTab /></TabsContent>
            <TabsContent value="integracoes" className="mt-4"><IntegracoesTab /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PageContainer>
  );
}

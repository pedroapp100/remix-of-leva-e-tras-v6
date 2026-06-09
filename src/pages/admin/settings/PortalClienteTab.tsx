import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useSettingsStore } from "@/contexts/SettingsStore";
import { toast } from "sonner";
import { LayoutDashboard, ClipboardList, DollarSign, Calculator, Lock } from "lucide-react";

const CLIENT_PAGES = [
  {
    key: "simulador",
    label: "Simulador",
    description: "Calculadora de preços de entrega — permite que o cliente simule o valor antes de solicitar.",
    icon: Calculator,
    fixed: true,
  },
  {
    key: "dashboard",
    label: "Dashboard",
    description: "Página inicial com resumo de atividades, solicitações recentes e indicadores.",
    icon: LayoutDashboard,
    fixed: false,
  },
  {
    key: "solicitacoes",
    label: "Minhas Solicitações",
    description: "Histórico completo e acompanhamento em tempo real dos pedidos do cliente.",
    icon: ClipboardList,
    fixed: false,
  },
  {
    key: "financeiro",
    label: "Meu Financeiro",
    description: "Extrato, saldo e movimentações financeiras do cliente.",
    icon: DollarSign,
    fixed: false,
  },
] as const;

export function PortalClienteTab() {
  const { cliente_pages_enabled, updateSetting } = useSettingsStore();

  const handleToggle = (pageKey: string, enabled: boolean) => {
    const updated = enabled
      ? [...cliente_pages_enabled, pageKey]
      : cliente_pages_enabled.filter((k) => k !== pageKey);

    updateSetting("cliente_pages_enabled", updated);
    const page = CLIENT_PAGES.find((p) => p.key === pageKey);
    toast.success(
      enabled
        ? `"${page?.label}" visível para clientes.`
        : `"${page?.label}" ocultada do portal.`
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Páginas visíveis no Portal do Cliente</CardTitle>
          <CardDescription>
            Controle quais seções aparecem no menu lateral para os clientes. Alterações entram em vigor na próxima vez que o cliente carregar a página.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {CLIENT_PAGES.map(({ key, label, description, icon: Icon, fixed }) => {
            const enabled = fixed || cliente_pages_enabled.includes(key);

            return (
              <div
                key={key}
                className="flex items-start justify-between gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`toggle-${key}`} className="cursor-pointer text-sm font-medium">
                        {label}
                      </Label>
                      {fixed && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Lock className="h-2.5 w-2.5" />
                          Sempre visível
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                </div>
                <Switch
                  id={`toggle-${key}`}
                  checked={enabled}
                  disabled={fixed}
                  onCheckedChange={(checked) => handleToggle(key, checked)}
                  className="shrink-0"
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

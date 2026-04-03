import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { useSettingsStore } from "@/contexts/SettingsStore";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

export function GeralTab() {
  const { limite_saldo_pre_pago, updateSetting } = useSettingsStore();

  const handleLimiteChange = (value: number) => {
    updateSetting("limite_saldo_pre_pago", value);
    toast.success("Limite de saldo atualizado!");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Saldo Pré-pago
          </CardTitle>
          <CardDescription>
            Defina o limite mínimo de saldo para clientes pré-pagos. Quando o saldo ficar abaixo deste valor, o sistema emitirá alertas e notificações ao administrador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-2">
            <Label htmlFor="limite-saldo">Limite mínimo de alerta</Label>
            <CurrencyInput
              id="limite-saldo"
              value={limite_saldo_pre_pago}
              onChange={handleLimiteChange}
              placeholder="R$ 0,00"
            />
            <p className="text-xs text-muted-foreground">
              Clientes com saldo abaixo deste valor serão sinalizados na listagem e gerarão notificações ao concluir entregas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

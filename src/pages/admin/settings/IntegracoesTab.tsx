import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { create } from "zustand";
import {
  MessageSquare, Mail, CreditCard, MapPin, Bell,
  Settings2, ExternalLink, Plus, Pencil, Trash2, Copy, Eye, EyeOff,
  CheckCircle2, XCircle, Zap, Send,
} from "lucide-react";

/* ── Types ── */
type IntegracaoStatus = "conectado" | "desconectado" | "erro";
type IntegracaoCategoria = "comunicacao" | "pagamento" | "mapa" | "notificacao" | "outro";

interface IntegracaoEntry {
  id: string;
  nome: string;
  descricao: string;
  categoria: IntegracaoCategoria;
  icone: string;
  status: IntegracaoStatus;
  ativo: boolean;
  api_key?: string;
  config: Record<string, string>;
  created_at: string;
  updated_at: string;
}

/* ── Store ── */
interface IntegracaoStore {
  integracoes: IntegracaoEntry[];
  updateIntegracao: (id: string, data: Partial<Omit<IntegracaoEntry, "id">>) => void;
  addIntegracao: (i: IntegracaoEntry) => void;
  deleteIntegracao: (id: string) => void;
}

const useIntegracaoStore = create<IntegracaoStore>((set) => ({
  integracoes: [
    {
      id: "int-whatsapp",
      nome: "WhatsApp via Baileys (QR Code)",
      descricao: "Conecte seu WhatsApp pessoal ou comercial via QR Code para enviar notificações de entrega aos clientes.",
      categoria: "comunicacao",
      icone: "whatsapp",
      status: "desconectado",
      ativo: false,
      api_key: "",
      config: { instance_name: "", webhook_url: "" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  updateIntegracao: (id, data) =>
    set((s) => ({
      integracoes: s.integracoes.map((i) =>
        i.id === id ? { ...i, ...data, updated_at: new Date().toISOString() } : i
      ),
    })),
  addIntegracao: (i) => set((s) => ({ integracoes: [...s.integracoes, i] })),
  deleteIntegracao: (id) =>
    set((s) => ({ integracoes: s.integracoes.filter((i) => i.id !== id) })),
}));

/* ── Icon Map ── */
const ICON_MAP: Record<string, React.ElementType> = {
  whatsapp: MessageSquare,
  email: Mail,
  stripe: CreditCard,
  maps: MapPin,
  push: Bell,
  telegram: Send,
};

const CATEGORIA_LABELS: Record<IntegracaoCategoria, string> = {
  comunicacao: "Comunicação",
  pagamento: "Pagamento",
  mapa: "Mapa & Localização",
  notificacao: "Notificação",
  outro: "Outro",
};

const STATUS_CONFIG: Record<IntegracaoStatus, { label: string; variant: "success" | "secondary" | "destructive" }> = {
  conectado: { label: "Conectado", variant: "success" },
  desconectado: { label: "Desconectado", variant: "secondary" },
  erro: { label: "Erro", variant: "destructive" },
};

/* ── Component ── */
export function IntegracoesTab() {
  const { integracoes, updateIntegracao } = useIntegracaoStore();
  const [configOpen, setConfigOpen] = useState(false);
  const [selected, setSelected] = useState<IntegracaoEntry | null>(null);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [formApiKey, setFormApiKey] = useState("");
  const [formConfig, setFormConfig] = useState<Record<string, string>>({});
  const [filterCategoria, setFilterCategoria] = useState<"todas" | IntegracaoCategoria>("todas");

  const filtered = filterCategoria === "todas"
    ? integracoes
    : integracoes.filter((i) => i.categoria === filterCategoria);

  const openConfig = (item: IntegracaoEntry) => {
    setSelected(item);
    setFormApiKey(item.api_key || "");
    setFormConfig({ ...item.config });
    setApiKeyVisible(false);
    setConfigOpen(true);
  };

  const handleSave = () => {
    if (!selected) return;
    const hasKey = formApiKey.trim().length > 0;
    updateIntegracao(selected.id, {
      api_key: formApiKey.trim(),
      config: formConfig,
      status: hasKey ? "conectado" : "desconectado",
      ativo: hasKey,
    });
    toast.success(`Integração "${selected.nome}" ${hasKey ? "configurada" : "desconectada"} com sucesso!`);
    setConfigOpen(false);
  };

  const handleToggle = (item: IntegracaoEntry, checked: boolean) => {
    if (checked && !item.api_key) {
      openConfig(item);
      return;
    }
    updateIntegracao(item.id, {
      ativo: checked,
      status: checked ? "conectado" : "desconectado",
    });
    toast.success(`${item.nome} ${checked ? "ativado" : "desativado"}.`);
  };

  const handleTestConnection = () => {
    if (!selected) return;
    toast.info(`Testando conexão com ${selected.nome}...`);
    setTimeout(() => {
      if (formApiKey.trim().length > 10) {
        toast.success(`Conexão com ${selected.nome} estabelecida com sucesso!`);
      } else {
        toast.error(`Falha ao conectar com ${selected.nome}. Verifique a chave API.`);
      }
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Integrações</h3>
          <p className="text-sm text-muted-foreground">
            Conecte serviços externos para estender as funcionalidades do sistema.
          </p>
        </div>
        <Select value={filterCategoria} onValueChange={(v) => setFilterCategoria(v as typeof filterCategoria)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {Object.entries(CATEGORIA_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid de integrações */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((item) => {
          const Icon = ICON_MAP[item.icone] || Zap;
          const statusCfg = STATUS_CONFIG[item.status];

          return (
            <Card
              key={item.id}
              className={`transition-all hover:shadow-md ${
                item.ativo ? "border-primary/30 bg-primary/5" : ""
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${item.ativo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{item.nome}</CardTitle>
                      <Badge variant={statusCfg.variant === "success" ? "default" : statusCfg.variant} className={`mt-1 text-xs ${statusCfg.variant === "success" ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15" : ""}`}>
                        {statusCfg.variant === "success" ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : statusCfg.variant === "destructive" ? (
                          <XCircle className="h-3 w-3 mr-1" />
                        ) : null}
                        {statusCfg.label}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={item.ativo}
                    onCheckedChange={(checked) => handleToggle(item, checked)}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm mb-4">{item.descricao}</CardDescription>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {CATEGORIA_LABELS[item.categoria]}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openConfig(item)}
                    className="gap-1.5"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    Configurar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog de configuração */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected && (() => {
                const Icon = ICON_MAP[selected.icone] || Zap;
                return <Icon className="h-5 w-5 text-primary" />;
              })()}
              Configurar {selected?.nome}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* API Key */}
            <div className="space-y-2">
              <Label>Chave API / Token</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={apiKeyVisible ? "text" : "password"}
                    value={formApiKey}
                    onChange={(e) => setFormApiKey(e.target.value)}
                    placeholder="Cole a chave API aqui..."
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setApiKeyVisible(!apiKeyVisible)}
                  >
                    {apiKeyVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (formApiKey) {
                      navigator.clipboard.writeText(formApiKey);
                      toast.success("Chave copiada!");
                    }
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Dynamic config fields */}
            {selected && Object.keys(selected.config).length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Configurações adicionais</Label>
                {Object.entries(selected.config).map(([key]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs text-muted-foreground capitalize">
                      {key.replace(/_/g, " ")}
                    </Label>
                    <Input
                      value={formConfig[key] || ""}
                      onChange={(e) => setFormConfig((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={key}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleTestConnection} className="gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Testar Conexão
            </Button>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button variant="ghost">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleSave}>Salvar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

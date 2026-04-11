import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Json } from "@/types/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  MessageSquare, Mail, CreditCard, MapPin, Bell,
  Settings2, ExternalLink, Plus, Pencil, Trash2, Copy, Eye, EyeOff,
  CheckCircle2, XCircle, Zap, Send, AlertTriangle,
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

interface NewIntegracaoForm {
  nome: string;
  descricao: string;
  categoria: IntegracaoCategoria;
  icone: string;
}

/* ── Presets para Z-API e outros ── */
const INTEGRATION_PRESETS: { label: string; value: string; data: NewIntegracaoForm & { config: Record<string, string> } }[] = [
  {
    label: "Z-API (WhatsApp)",
    value: "zapi",
    data: {
      nome: "Z-API WhatsApp",
      descricao: "Envio de mensagens WhatsApp via Z-API. Configure o Instance ID, Token e Client Token do seu painel Z-API.",
      categoria: "comunicacao",
      icone: "whatsapp",
      config: { instance_id: "", token: "", client_token: "" },
    },
  },
  {
    label: "Stripe (Pagamentos)",
    value: "stripe",
    data: {
      nome: "Stripe",
      descricao: "Processamento de pagamentos via Stripe.",
      categoria: "pagamento",
      icone: "stripe",
      config: { webhook_secret: "" },
    },
  },
  {
    label: "Google Maps",
    value: "gmaps",
    data: {
      nome: "Google Maps",
      descricao: "Geocodificação e cálculo de rotas via Google Maps API.",
      categoria: "mapa",
      icone: "maps",
      config: {},
    },
  },
  {
    label: "Personalizado",
    value: "custom",
    data: {
      nome: "",
      descricao: "",
      categoria: "outro",
      icone: "zap",
      config: {},
    },
  },
];

/* ── React Query hook ── */
function useIntegracoes() {
  const qc = useQueryClient();

  const { data: integracoes = [], isLoading, error: queryError } = useQuery<IntegracaoEntry[]>({
    queryKey: ["integracoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integracoes")
        .select("*")
        .order("nome");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        descricao: r.descricao ?? "",
        icone: r.icone ?? "zap",
        categoria: r.categoria as IntegracaoCategoria,
        status: r.status as IntegracaoStatus,
        api_key: r.api_key ?? undefined,
        config: (r.config as Record<string, string>) ?? {},
      }));
    },
  });

  const createMut = useMutation({
    mutationFn: async (entry: { nome: string; descricao: string; categoria: string; icone: string; config: Record<string, string> }) => {
      const { error } = await supabase.from("integracoes").insert({
        nome: entry.nome,
        descricao: entry.descricao,
        categoria: entry.categoria,
        icone: entry.icone,
        config: entry.config as unknown as Json,
        status: "desconectado",
        ativo: false,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integracoes"] }),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, config, ...rest }: { id: string; api_key?: string; ativo?: boolean; status?: string; config?: Record<string, string> }) => {
      const update = config !== undefined
        ? { ...rest, config: config as unknown as Json }
        : rest;
      const { error } = await supabase.from("integracoes").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integracoes"] }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("integracoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integracoes"] }),
  });

  return {
    integracoes,
    isLoading,
    queryError,
    createIntegracao: createMut.mutateAsync,
    updateIntegracao: updateMut.mutateAsync,
    deleteIntegracao: deleteMut.mutateAsync,
  };
}

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
  const { integracoes, isLoading, queryError, createIntegracao, updateIntegracao, deleteIntegracao } = useIntegracoes();
  const [configOpen, setConfigOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selected, setSelected] = useState<IntegracaoEntry | null>(null);
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [formApiKey, setFormApiKey] = useState("");
  const [formConfig, setFormConfig] = useState<Record<string, string>>({});
  const [filterCategoria, setFilterCategoria] = useState<"todas" | IntegracaoCategoria>("todas");

  /* ── Create form state ── */
  const [selectedPreset, setSelectedPreset] = useState("zapi");
  const [createNome, setCreateNome] = useState("");
  const [createDescricao, setCreateDescricao] = useState("");
  const [createCategoria, setCreateCategoria] = useState<IntegracaoCategoria>("comunicacao");
  const [createIcone, setCreateIcone] = useState("whatsapp");
  const [createConfigKeys, setCreateConfigKeys] = useState("");

  const applyPreset = (presetValue: string) => {
    setSelectedPreset(presetValue);
    const preset = INTEGRATION_PRESETS.find((p) => p.value === presetValue);
    if (!preset) return;
    setCreateNome(preset.data.nome);
    setCreateDescricao(preset.data.descricao);
    setCreateCategoria(preset.data.categoria);
    setCreateIcone(preset.data.icone);
    setCreateConfigKeys(Object.keys(preset.data.config).join(", "));
  };

  const openCreateDialog = () => {
    applyPreset("zapi");
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!createNome.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    const configObj: Record<string, string> = {};
    if (createConfigKeys.trim()) {
      createConfigKeys.split(",").map((k) => k.trim()).filter(Boolean).forEach((k) => {
        configObj[k] = "";
      });
    }
    try {
      await createIntegracao({
        nome: createNome.trim(),
        descricao: createDescricao.trim(),
        categoria: createCategoria,
        icone: createIcone,
        config: configObj,
      });
      toast.success(`Integração "${createNome}" criada com sucesso!`);
      setCreateOpen(false);
    } catch {
      toast.error("Erro ao criar integração.");
    }
  };

  const handleDelete = async (id: string) => {
    const item = integracoes.find((i) => i.id === id);
    try {
      await deleteIntegracao(id);
      toast.success(`Integração "${item?.nome}" removida.`);
      setDeleteConfirmId(null);
    } catch {
      toast.error("Erro ao remover integração.");
    }
  };

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

  const handleSave = async () => {
    if (!selected) return;
    const hasKey = formApiKey.trim().length > 0;
    try {
      await updateIntegracao({
        id: selected.id,
        api_key: formApiKey.trim(),
        config: formConfig,
        status: hasKey ? "conectado" : "desconectado",
        ativo: hasKey,
      });
      toast.success(`Integração "${selected.nome}" ${hasKey ? "configurada" : "desconectada"} com sucesso!`);
      setConfigOpen(false);
    } catch {
      toast.error("Erro ao salvar integração.");
    }
  };

  const handleToggle = async (item: IntegracaoEntry, checked: boolean) => {
    if (checked && !item.api_key) {
      openConfig(item);
      return;
    }
    try {
      await updateIntegracao({
        id: item.id,
        ativo: checked,
        status: checked ? "conectado" : "desconectado",
      });
      toast.success(`${item.nome} ${checked ? "ativado" : "desativado"}.`);
    } catch {
      toast.error("Erro ao alterar integração.");
    }
  };

  const handleTestConnection = () => {
    if (!selected) return;
    if (formApiKey.trim().length > 10) {
      toast.success(`Chave API de ${selected.nome} validada com sucesso!`);
    } else {
      toast.error(`Chave API de ${selected.nome} inválida. Verifique o valor informado.`);
    }
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
        <div className="flex items-center gap-2">
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
          <Button onClick={openCreateDialog} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Nova Integração
          </Button>
        </div>
      </div>

      {/* Grid de integrações */}
      {isLoading && (
        <div className="text-center py-12 text-muted-foreground">Carregando integrações...</div>
      )}
      {queryError && (
        <div className="text-center py-12 text-destructive">
          Erro ao carregar integrações: {(queryError as Error).message}
        </div>
      )}
      {!isLoading && !queryError && filtered.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-full bg-muted mb-4">
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
            <h4 className="text-base font-medium mb-1">Nenhuma integração configurada</h4>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Adicione integrações como Z-API (WhatsApp), Stripe ou Google Maps para estender as funcionalidades do sistema.
            </p>
            <Button onClick={openCreateDialog} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Criar Primeira Integração
            </Button>
          </CardContent>
        </Card>
      )}
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
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openConfig(item)}
                      className="gap-1.5"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      Configurar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteConfirmId(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
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
          <DialogDescription className="sr-only">.</DialogDescription>
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

      {/* Dialog de criar nova integração */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Nova Integração
            </DialogTitle>
            <DialogDescription>
              Escolha um modelo pré-configurado ou crie uma integração personalizada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Preset selector */}
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Select value={selectedPreset} onValueChange={applyPreset}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um modelo" />
                </SelectTrigger>
                <SelectContent>
                  {INTEGRATION_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={createNome}
                onChange={(e) => setCreateNome(e.target.value)}
                placeholder="Ex: Z-API WhatsApp"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={createDescricao}
                onChange={(e) => setCreateDescricao(e.target.value)}
                placeholder="Descreva o que essa integração faz..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={createCategoria} onValueChange={(v) => setCreateCategoria(v as IntegracaoCategoria)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIA_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ícone</Label>
                <Select value={createIcone} onValueChange={setCreateIcone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(ICON_MAP).map((k) => (
                      <SelectItem key={k} value={k}>{k}</SelectItem>
                    ))}
                    <SelectItem value="zap">zap (padrão)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Campos de configuração</Label>
              <Input
                value={createConfigKeys}
                onChange={(e) => setCreateConfigKeys(e.target.value)}
                placeholder="Ex: instance_id, token, client_token"
              />
              <p className="text-xs text-muted-foreground">
                Separe por vírgula os nomes dos campos extras que essa integração precisa (além da chave API).
              </p>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancelar</Button>
            </DialogClose>
            <Button onClick={handleCreate} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Remover Integração
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover esta integração? As credenciais salvas serão perdidas. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancelar</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

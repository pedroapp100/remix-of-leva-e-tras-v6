import { useState, useMemo } from "react";
import { DataTable } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import type { TipoOperacaoConfig, DiaSemanaConfig } from "@/types/database";
import { useTiposOperacao, useUpsertTipoOperacao } from "@/hooks/useSettings";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";


const DIAS_LABELS: Record<DiaSemanaConfig, string> = {
  seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb", dom: "Dom",
};

const ALL_DIAS: DiaSemanaConfig[] = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];

export function TiposOperacaoTab() {
  const { data: tipos = [], refetch } = useTiposOperacao();
  const upsertTipo = useUpsertTipoOperacao();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TipoOperacaoConfig | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TipoOperacaoConfig | null>(null);

  // Form state
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [diasSemana, setDiasSemana] = useState<DiaSemanaConfig[]>([]);
  const [horarioInicio, setHorarioInicio] = useState("");
  const [horarioFim, setHorarioFim] = useState("");
  const [aplicaFeriado, setAplicaFeriado] = useState(false);
  const [cor, setCor] = useState("#3b82f6");
  const [ativo, setAtivo] = useState(true);

  const openCreate = () => {
    setEditing(null);
    setNome(""); setDescricao(""); setDiasSemana(["seg", "ter", "qua", "qui", "sex"]);
    setHorarioInicio("08:00"); setHorarioFim("18:00");
    setAplicaFeriado(false); setCor("#3b82f6"); setAtivo(true);
    setDialogOpen(true);
  };

  const openEdit = (t: TipoOperacaoConfig) => {
    setEditing(t);
    setNome(t.nome); setDescricao(t.descricao ?? "");
    setDiasSemana(t.dias_semana); setHorarioInicio(t.horario_inicio ?? "");
    setHorarioFim(t.horario_fim ?? ""); setAplicaFeriado(t.aplica_feriado);
    setCor(t.cor); setAtivo(t.ativo);
    setDialogOpen(true);
  };

  const toggleDia = (dia: DiaSemanaConfig) => {
    setDiasSemana((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
    );
  };

  const handleSave = async () => {
    if (!nome.trim()) { toast.error("Nome é obrigatório."); return; }
    if (diasSemana.length === 0 && !aplicaFeriado) { toast.error("Selecione pelo menos um dia ou marque como feriado."); return; }
    const now = new Date().toISOString();
    const data = {
      nome: nome.trim(), descricao: descricao || null,
      dias_semana: diasSemana, horario_inicio: horarioInicio || null,
      horario_fim: horarioFim || null, aplica_feriado: aplicaFeriado,
      cor, ativo, prioridade: editing ? editing.prioridade : tipos.length + 1,
      updated_at: now,
    };
    if (editing) {
      await upsertTipo.mutateAsync({ ...data, id: editing.id });
      toast.success("Tipo de operação atualizado!");
    } else {
      await upsertTipo.mutateAsync({ ...data, created_at: now });
      toast.success("Tipo de operação criado!");
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from("tipos_operacao_config").delete().eq("id", deleteTarget.id);
    refetch();
    toast.success("Tipo de operação removido!");
    setDeleteTarget(null);
  };

  const formatDias = (dias: DiaSemanaConfig[]) => {
    if (dias.length === 7) return "Todos os dias";
    if (dias.length === 5 && !dias.includes("sab") && !dias.includes("dom")) return "Seg–Sex";
    if (dias.length === 2 && dias.includes("sab") && dias.includes("dom")) return "Sáb–Dom";
    return dias.map((d) => DIAS_LABELS[d]).join(", ");
  };

  const formatHorario = (inicio?: string | null, fim?: string | null) => {
    if (!inicio && !fim) return "Todo o dia";
    return `${inicio || "00:00"} – ${fim || "23:59"}`;
  };

  const columns: Column<TipoOperacaoConfig>[] = [
    {
      key: "prioridade", header: "#", className: "w-12", sortable: true,
      cell: (r) => <span className="tabular-nums text-muted-foreground">{r.prioridade}</span>,
    },
    {
      key: "nome", header: "Nome",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: r.cor }} />
          <span className="font-medium">{r.nome}</span>
        </div>
      ),
    },
    {
      key: "dias_semana", header: "Dias",
      cell: (r) => <span className="text-sm">{formatDias(r.dias_semana)}</span>,
    },
    {
      key: "horario_inicio", header: "Horário",
      cell: (r) => <span className="text-sm tabular-nums">{formatHorario(r.horario_inicio, r.horario_fim)}</span>,
    },
    {
      key: "aplica_feriado", header: "Feriado",
      cell: (r) => r.aplica_feriado
        ? <Badge variant="outline" className="text-amber-600 border-amber-300">Sim</Badge>
        : <span className="text-muted-foreground text-sm">Não</span>,
    },
    {
      key: "ativo", header: "Status",
      cell: (r) => <Badge variant={r.ativo ? "default" : "secondary"}>{r.ativo ? "Ativo" : "Inativo"}</Badge>,
    },
    {
      key: "actions", header: "Ações", className: "w-28 text-right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-200" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar tipo</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/30 transition-colors duration-200" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir tipo</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Tipos de Operação</CardTitle>
              <CardDescription className="text-sm">Configure os tipos de operação com base em horários, dias da semana e feriados.</CardDescription>
            </div>
            <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-2" /> Novo Tipo</Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={tipos}
            columns={columns}
            emptyTitle="Nenhum tipo de operação"
            emptySubtitle="Cadastre tipos de operação para configurar a precificação."
            emptyActionLabel="Cadastrar primeiro tipo"
            onEmptyAction={openCreate}
            pageSize={10}
            renderMobileCard={(r) => (
              <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: r.cor }} />
                    <span className="font-medium">{r.nome}</span>
                  </div>
                  <Badge variant={r.ativo ? "default" : "secondary"}>{r.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">{formatDias(r.dias_semana)} • {formatHorario(r.horario_inicio, r.horario_fim)}</div>
                {r.aplica_feriado && <Badge variant="outline" className="text-amber-600 border-amber-300">Aplica em feriados</Badge>}
                <div className="flex items-center justify-end gap-1 border-t border-border pt-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(r)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          />
        </CardContent>

        {/* Dialog de criação/edição */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Tipo de Operação" : "Novo Tipo de Operação"}</DialogTitle>
            <DialogDescription className="sr-only">.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-[1fr_auto] gap-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Horário Comercial" />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-9 w-12 rounded border border-input cursor-pointer" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição opcional..." rows={2} />
              </div>

              <div className="space-y-2">
                <Label>Dias da Semana *</Label>
                <div className="flex flex-wrap gap-2">
                  {ALL_DIAS.map((dia) => (
                    <label
                      key={dia}
                      className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                        diasSemana.includes(dia)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-input hover:bg-accent"
                      }`}
                    >
                      <Checkbox
                        checked={diasSemana.includes(dia)}
                        onCheckedChange={() => toggleDia(dia)}
                        className="sr-only"
                      />
                      {DIAS_LABELS[dia]}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 mt-1">
                  <Button type="button" variant="outline" size="sm" className="text-xs h-7"
                    onClick={() => setDiasSemana(["seg", "ter", "qua", "qui", "sex"])}>Dias úteis</Button>
                  <Button type="button" variant="outline" size="sm" className="text-xs h-7"
                    onClick={() => setDiasSemana(["sab", "dom"])}>Fim de semana</Button>
                  <Button type="button" variant="outline" size="sm" className="text-xs h-7"
                    onClick={() => setDiasSemana([...ALL_DIAS])}>Todos</Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Horário Início</Label>
                  <Input type="time" value={horarioInicio} onChange={(e) => setHorarioInicio(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Vazio = sem restrição</p>
                </div>
                <div className="space-y-2">
                  <Label>Horário Fim</Label>
                  <Input type="time" value={horarioFim} onChange={(e) => setHorarioFim(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Vazio = sem restrição</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-md border border-input p-3">
                <Switch checked={aplicaFeriado} onCheckedChange={setAplicaFeriado} />
                <div>
                  <Label className="text-sm font-medium">Aplicar em feriados</Label>
                  <p className="text-xs text-muted-foreground">Este tipo será usado automaticamente em datas de feriado cadastradas</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={ativo} onCheckedChange={setAtivo} />
                <Label>Tipo ativo</Label>
              </div>

              {/* Preview */}
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Preview</p>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cor }} />
                  <span className="font-medium text-sm">{nome || "Sem nome"}</span>
                  <Badge variant={ativo ? "default" : "secondary"} className="text-xs">{ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>📅 {diasSemana.length > 0 ? formatDias(diasSemana) : "Nenhum dia"}</p>
                  <p>🕐 {formatHorario(horarioInicio, horarioFim)}</p>
                  {aplicaFeriado && <p>🎉 Aplica em feriados</p>}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>{editing ? "Salvar" : "Cadastrar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Excluir tipo de operação"
          description={`Tem certeza que deseja excluir "${deleteTarget?.nome}"? Regras de preço vinculadas a este tipo precisarão ser atualizadas.`}
          confirmLabel="Excluir"
          variant="destructive"
          onConfirm={handleDelete}
        />
      </Card>
    </div>
  );
}

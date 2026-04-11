import { useState } from "react";
import { useTaxasExtras, useUpsertTaxaExtra } from "@/hooks/useSettings";
import { supabase } from "@/lib/supabase";
import { useLogStore } from "@/contexts/LogStore";
import type { TaxaExtraConfig } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DataTable } from "@/components/shared/DataTable";
import type { Column } from "@/components/shared/DataTable";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function TaxasExtrasTab() {
  const { addLog } = useLogStore();
  const { data: taxas = [], refetch } = useTaxasExtras();
  const upsertTaxa = useUpsertTaxaExtra();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaxaExtraConfig | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaxaExtraConfig | null>(null);

  // Form state
  const [nome, setNome] = useState("");
  const [valorPadrao, setValorPadrao] = useState(0);
  const [ativo, setAtivo] = useState(true);

  const openNew = () => {
    setEditing(null);
    setNome("");
    setValorPadrao(0);
    setAtivo(true);
    setFormOpen(true);
  };

  const openEdit = (taxa: TaxaExtraConfig) => {
    setEditing(taxa);
    setNome(taxa.nome);
    setValorPadrao(taxa.valor_padrao);
    setAtivo(taxa.ativo);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error("Informe o nome da taxa.");
      return;
    }
    if (valorPadrao <= 0) {
      toast.error("Informe um valor padrão válido.");
      return;
    }
    const data = { nome: nome.trim(), valor_padrao: valorPadrao, ativo };
    if (editing) {
      await upsertTaxa.mutateAsync({ ...data, id: editing.id });
      addLog({ categoria: "configuracao", acao: "taxa_extra_editada", entidade_id: editing.id, descricao: `Taxa extra "${nome}" atualizada — ${fmt(valorPadrao)}`, detalhes: { nome, valor_padrao: valorPadrao, ativo } });
      toast.success("Taxa extra atualizada!");
    } else {
      const inserted = await upsertTaxa.mutateAsync(data);
      addLog({ categoria: "configuracao", acao: "taxa_extra_criada", entidade_id: inserted?.id ?? "new", descricao: `Taxa extra "${nome}" cadastrada — ${fmt(valorPadrao)}`, detalhes: { nome, valor_padrao: valorPadrao } });
      toast.success("Taxa extra cadastrada!");
    }
    setFormOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from("taxas_extras_config").delete().eq("id", deleteTarget.id);
    addLog({ categoria: "configuracao", acao: "taxa_extra_removida", entidade_id: deleteTarget.id, descricao: `Taxa extra "${deleteTarget.nome}" removida`, detalhes: null });
    toast.success("Taxa extra removida!");
    refetch();
    setDeleteTarget(null);
  };

  const toggleAtivo = async (id: string) => {
    const t = taxas.find((tx) => tx.id === id);
    if (!t) return;
    await upsertTaxa.mutateAsync({ ...t, ativo: !t.ativo });
    addLog({ categoria: "configuracao", acao: "taxa_extra_toggle", entidade_id: id, descricao: `Taxa extra "${t.nome}" ${!t.ativo ? "ativada" : "desativada"}`, detalhes: { ativo: !t.ativo } });
  };

  const columns: Column<TaxaExtraConfig>[] = [
    {
      key: "nome",
      header: "Nome",
      cell: (r) => <span className="font-medium">{r.nome}</span>,
    },
    {
      key: "valor_padrao",
      header: "Valor Padrão",
      cell: (r) => <span className="tabular-nums">{fmt(r.valor_padrao)}</span>,
    },
    {
      key: "ativo",
      header: "Status",
      cell: (r) => (
        <Badge variant={r.ativo ? "default" : "secondary"}>
          {r.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Ações",
      className: "w-28 text-right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-200"
                  onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar taxa extra</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/30 transition-colors duration-200"
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir taxa extra</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Taxas Extras</CardTitle>
          <CardDescription>Gerencie as taxas extras disponíveis nas solicitações.</CardDescription>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Nova Taxa
        </Button>
      </CardHeader>
      <CardContent>
        <DataTable
          data={taxas}
          columns={columns}
          emptyTitle="Nenhuma taxa extra cadastrada"
          emptySubtitle="Crie a primeira taxa extra para usar nas solicitações."
          emptyActionLabel="Nova Taxa"
          onEmptyAction={openNew}
          renderMobileCard={(r) => (
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{r.nome}</span>
                <Badge variant={r.ativo ? "default" : "secondary"}>
                  {r.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Valor padrão</span>
                <span className="tabular-nums font-medium">{fmt(r.valor_padrao)}</span>
              </div>
              <div className="flex items-center justify-end gap-1 border-t border-border pt-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/15" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        />
      </CardContent>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Taxa Extra" : "Nova Taxa Extra"}</DialogTitle>
          <DialogDescription className="sr-only">.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Taxa de espera" />
            </div>
            <div className="space-y-2">
              <Label>Valor Padrão *</Label>
              <CurrencyInput value={valorPadrao} onChange={setValorPadrao} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={ativo} onCheckedChange={setAtivo} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Excluir Taxa Extra"
        description={`Deseja excluir a taxa "${deleteTarget?.nome}"? Essa ação não pode ser desfeita.`}
        variant="destructive"
        confirmLabel="Excluir"
        onConfirm={handleDelete}
      />
    </Card>
  );
}

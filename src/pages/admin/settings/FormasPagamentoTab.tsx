import { useState } from "react";
import { DataTable, SearchInput } from "@/components/shared";
import { useLogStore } from "@/contexts/LogStore";
import type { Column } from "@/components/shared/DataTable";
import type { FormaPagamento } from "@/types/database";
import { MOCK_FORMAS_PAGAMENTO } from "@/data/mockSettings";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function FormasPagamentoTab() {
  const { addLog } = useLogStore();
  const [formas, setFormas] = useState<FormaPagamento[]>(MOCK_FORMAS_PAGAMENTO);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FormaPagamento | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const filtered = formas.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  const toggleEnabled = (id: string) => {
    setFormas((prev) => prev.map((f) => {
      if (f.id !== id) return f;
      const toggled = { ...f, enabled: !f.enabled };
      addLog({ categoria: "configuracao", acao: "forma_pagamento_toggle", entidade_id: id, descricao: `Forma de pagamento "${f.name}" ${toggled.enabled ? "ativada" : "desativada"}`, detalhes: { enabled: toggled.enabled } });
      return toggled;
    }));
    toast.success("Status atualizado!");
  };

  const openCreate = () => { setEditing(null); setName(""); setDescription(""); setDialogOpen(true); };
  const openEdit = (f: FormaPagamento) => { setEditing(f); setName(f.name); setDescription(f.description ?? ""); setDialogOpen(true); };

  const handleSave = () => {
    if (!name.trim()) { toast.error("Nome é obrigatório."); return; }
    if (editing) {
      setFormas((prev) => prev.map((f) => (f.id === editing.id ? { ...f, name, description: description || null } : f)));
      addLog({ categoria: "configuracao", acao: "forma_pagamento_editada", entidade_id: editing.id, descricao: `Forma de pagamento "${name}" atualizada`, detalhes: { nome: name } });
      toast.success("Forma de pagamento atualizada!");
    } else {
      const newId = `fp-${Date.now()}`;
      setFormas((prev) => [...prev, { id: newId, name, description: description || null, enabled: true, order: prev.length + 1 }]);
      addLog({ categoria: "configuracao", acao: "forma_pagamento_criada", entidade_id: newId, descricao: `Forma de pagamento "${name}" criada`, detalhes: { nome: name } });
      toast.success("Forma de pagamento criada!");
    }
    setDialogOpen(false);
  };

  const columns: Column<FormaPagamento>[] = [
    { key: "order", header: "#", className: "w-12", cell: (r) => <span className="text-muted-foreground tabular-nums">{r.order}</span> },
    { key: "name", header: "Nome", sortable: true, cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "description", header: "Descrição", cell: (r) => <span className="text-muted-foreground">{r.description ?? "—"}</span> },
    {
      key: "enabled", header: "Status",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Switch checked={r.enabled} onCheckedChange={() => toggleEnabled(r.id)} />
          <Badge variant={r.enabled ? "default" : "secondary"}>{r.enabled ? "Ativa" : "Inativa"}</Badge>
        </div>
      ),
    },
    {
      key: "actions", header: "Ações", className: "w-16 text-right",
      cell: (r) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-200" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar forma de pagamento</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Formas de Pagamento</CardTitle>
        <CardDescription className="text-sm">Formas de pagamento não podem ser excluídas, apenas desabilitadas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar forma de pagamento..." className="flex-1" />
          <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-2" /> Nova Forma</Button>
        </div>
        <DataTable data={filtered} columns={columns} emptyTitle="Nenhuma forma de pagamento" emptySubtitle="Cadastre as formas de pagamento aceitas." emptyActionLabel="Cadastrar" onEmptyAction={openCreate}
          renderMobileCard={(r) => (
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{r.name}</span>
                <div className="flex items-center gap-2">
                  <Switch checked={r.enabled} onCheckedChange={() => toggleEnabled(r.id)} />
                  <Badge variant={r.enabled ? "default" : "secondary"}>{r.enabled ? "Ativa" : "Inativa"}</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground ml-auto" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Pencil className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        />
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Editar Forma de Pagamento" : "Nova Forma de Pagamento"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: PIX" /></div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição opcional..." rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

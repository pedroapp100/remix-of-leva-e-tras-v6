import { useState, useMemo } from "react";
import { DataTable, SearchInput } from "@/components/shared";
import { useLogStore } from "@/contexts/LogStore";
import type { Column } from "@/components/shared/DataTable";
import type { TabelaPrecoCliente } from "@/types/database";
import { MOCK_TABELA_PRECOS, MOCK_BAIRROS, MOCK_REGIOES, MOCK_CLIENTES_SELECT, MOCK_TIPOS_OPERACAO } from "@/data/mockSettings";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, CircleDot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { toast } from "sonner";

const TIPO_OP_MAP = Object.fromEntries(MOCK_TIPOS_OPERACAO.map((t) => [t.id, t]));
const TIPO_OP_LABELS: Record<string, string> = { ...Object.fromEntries(MOCK_TIPOS_OPERACAO.map((t) => [t.id, t.nome])), todos: "Todos" };

interface TabelaPrecosTabProps {
  initialClienteId?: string;
}

export function TabelaPrecosTab({ initialClienteId }: TabelaPrecosTabProps) {
  const { addLog } = useLogStore();
  const [precos, setPrecos] = useState<TabelaPrecoCliente[]>(MOCK_TABELA_PRECOS);
  const [selectedCliente, setSelectedCliente] = useState<string>(
    initialClienteId && MOCK_CLIENTES_SELECT.some(c => c.id === initialClienteId)
      ? initialClienteId
      : MOCK_CLIENTES_SELECT[0].id
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TabelaPrecoCliente | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TabelaPrecoCliente | null>(null);

  const [bairroId, setBairroId] = useState("");
  const [regiaoId, setRegiaoId] = useState("");
  const [tipoOp, setTipoOp] = useState(MOCK_TIPOS_OPERACAO[0]?.id ?? "");
  const [taxaBase, setTaxaBase] = useState(0);
  const [taxaRetorno, setTaxaRetorno] = useState(0);
  const [taxaEspera, setTaxaEspera] = useState(0);
  const [taxaUrgencia, setTaxaUrgencia] = useState(0);
  const [ativo, setAtivo] = useState(true);
  const [observacao, setObservacao] = useState("");

  const clientePrecos = useMemo(() => precos.filter((p) => p.cliente_id === selectedCliente), [precos, selectedCliente]);

  const getBairroName = (id: string | null) => id ? MOCK_BAIRROS.find((b) => b.id === id)?.nome ?? "—" : "Todos";
  const getRegiaoName = (id: string | null) => id ? MOCK_REGIOES.find((r) => r.id === id)?.name ?? "—" : "—";
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const coverage = useMemo(() => {
    const totalBairros = MOCK_BAIRROS.length;
    const coveredBairros = new Set(clientePrecos.filter((p) => p.ativo && p.bairro_destino_id).map((p) => p.bairro_destino_id)).size;
    const hasRegionRules = clientePrecos.some((p) => p.ativo && p.regiao_id && !p.bairro_destino_id);
    if (coveredBairros === 0 && !hasRegionRules) return { color: "text-destructive", label: "Sem cobertura" };
    if (coveredBairros >= totalBairros || hasRegionRules) return { color: "text-emerald-500", label: "Cobertura completa" };
    return { color: "text-amber-500", label: `Cobertura parcial (${coveredBairros}/${totalBairros})` };
  }, [clientePrecos]);

  const openCreate = () => {
    setEditing(null); setBairroId(""); setRegiaoId(""); setTipoOp(MOCK_TIPOS_OPERACAO[0]?.id ?? "");
    setTaxaBase(0); setTaxaRetorno(0); setTaxaEspera(0); setTaxaUrgencia(0);
    setAtivo(true); setObservacao(""); setDialogOpen(true);
  };

  const openEdit = (p: TabelaPrecoCliente) => {
    setEditing(p); setBairroId(p.bairro_destino_id ?? ""); setRegiaoId(p.regiao_id ?? "");
    setTipoOp(p.tipo_operacao); setTaxaBase(p.taxa_base); setTaxaRetorno(p.taxa_retorno);
    setTaxaEspera(p.taxa_espera); setTaxaUrgencia(p.taxa_urgencia); setAtivo(p.ativo);
    setObservacao(p.observacao ?? ""); setDialogOpen(true);
  };

  const handleSave = () => {
    if (taxaBase <= 0) { toast.error("Taxa base deve ser maior que zero."); return; }
    const now = new Date().toISOString();
    if (editing) {
      setPrecos((prev) => prev.map((p) => p.id === editing.id ? {
        ...p, bairro_destino_id: bairroId || null, regiao_id: regiaoId || null,
        tipo_operacao: tipoOp as TabelaPrecoCliente["tipo_operacao"],
        taxa_base: taxaBase, taxa_retorno: taxaRetorno, taxa_espera: taxaEspera,
        taxa_urgencia: taxaUrgencia, ativo, observacao: observacao || null, updated_at: now,
      } : p));
      addLog({ categoria: "configuracao", acao: "preco_editado", entidade_id: editing.id, descricao: `Regra de preço atualizada — taxa base ${fmt(taxaBase)}`, detalhes: { bairro: getBairroName(bairroId || null), taxa_base: taxaBase } });
      toast.success("Regra de preço atualizada!");
    } else {
      const newId = `tp-${Date.now()}`;
      setPrecos((prev) => [...prev, {
        id: newId, cliente_id: selectedCliente,
        bairro_destino_id: bairroId || null, regiao_id: regiaoId || null,
        tipo_operacao: tipoOp as TabelaPrecoCliente["tipo_operacao"],
        taxa_base: taxaBase, taxa_retorno: taxaRetorno, taxa_espera: taxaEspera,
        taxa_urgencia: taxaUrgencia, ativo, prioridade: clientePrecos.length + 1,
        observacao: observacao || null, created_at: now, updated_at: now,
      }]);
      addLog({ categoria: "configuracao", acao: "preco_criado", entidade_id: newId, descricao: `Regra de preço criada — taxa base ${fmt(taxaBase)}`, detalhes: { bairro: getBairroName(bairroId || null), taxa_base: taxaBase } });
      toast.success("Regra de preço criada!");
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setPrecos((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    addLog({ categoria: "configuracao", acao: "preco_removido", entidade_id: deleteTarget.id, descricao: `Regra de preço removida — ${getBairroName(deleteTarget.bairro_destino_id)}`, detalhes: null });
    toast.success("Regra removida!");
    setDeleteTarget(null);
  };

  const columns: Column<TabelaPrecoCliente>[] = [
    { key: "prioridade", header: "#", className: "w-12", sortable: true, cell: (r) => <span className="tabular-nums text-muted-foreground">{r.prioridade}</span> },
    { key: "bairro_destino_id", header: "Bairro", cell: (r) => <span className="font-medium">{getBairroName(r.bairro_destino_id)}</span> },
    { key: "regiao_id", header: "Região", cell: (r) => <span className="text-muted-foreground">{getRegiaoName(r.regiao_id)}</span> },
    { key: "tipo_operacao", header: "Tipo", cell: (r) => {
      const tipo = TIPO_OP_MAP[r.tipo_operacao];
      return (
        <div className="flex items-center gap-1.5">
          {tipo && <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tipo.cor }} />}
          <Badge variant="outline">{TIPO_OP_LABELS[r.tipo_operacao] ?? r.tipo_operacao}</Badge>
        </div>
      );
    }},
    { key: "taxa_base", header: "Base", sortable: true, cell: (r) => <span className="tabular-nums">{fmt(r.taxa_base)}</span> },
    { key: "taxa_retorno", header: "Retorno", cell: (r) => <span className="tabular-nums">{fmt(r.taxa_retorno)}</span> },
    { key: "taxa_espera", header: "Espera", cell: (r) => <span className="tabular-nums">{fmt(r.taxa_espera)}</span> },
    { key: "taxa_urgencia", header: "Urgência", cell: (r) => <span className="tabular-nums">{fmt(r.taxa_urgencia)}</span> },
    { key: "ativo", header: "Status", cell: (r) => <Badge variant={r.ativo ? "default" : "secondary"}>{r.ativo ? "Ativo" : "Inativo"}</Badge> },
    {
      key: "actions", header: "Ações", className: "w-28 text-right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-200" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Pencil className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Editar regra de preço</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/30 transition-colors duration-200" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}><Trash2 className="h-4 w-4" /></Button>
              </TooltipTrigger>
              <TooltipContent>Excluir regra de preço</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tabela de Preços por Cliente</CardTitle>
        <CardDescription className="text-sm">Configure regras de preço específicas por cliente, bairro e tipo de operação.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 max-w-xs">
            <Select value={selectedCliente} onValueChange={setSelectedCliente}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>{MOCK_CLIENTES_SELECT.map((c) => (<SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className={`flex items-center gap-2 text-sm font-medium ${coverage.color}`}>
            <CircleDot className="h-4 w-4" />
            {coverage.label}
          </div>
          <div className="sm:ml-auto">
            <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-2" /> Nova Regra</Button>
          </div>
        </div>
        <DataTable data={clientePrecos} columns={columns} emptyTitle="Nenhuma regra de preço" emptySubtitle="Cadastre regras de preço para este cliente." emptyActionLabel="Cadastrar primeira regra" onEmptyAction={openCreate} pageSize={10}
          renderMobileCard={(r) => (
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{getBairroName(r.bairro_destino_id)}</span>
                <Badge variant={r.ativo ? "default" : "secondary"}>{r.ativo ? "Ativo" : "Inativo"}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{getRegiaoName(r.regiao_id)}</span>
                <Badge variant="outline">{TIPO_OP_LABELS[r.tipo_operacao] ?? r.tipo_operacao}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-1 text-sm">
                <span className="text-muted-foreground">Base:</span><span className="tabular-nums">{fmt(r.taxa_base)}</span>
                <span className="text-muted-foreground">Retorno:</span><span className="tabular-nums">{fmt(r.taxa_retorno)}</span>
                <span className="text-muted-foreground">Espera:</span><span className="tabular-nums">{fmt(r.taxa_espera)}</span>
                <span className="text-muted-foreground">Urgência:</span><span className="tabular-nums">{fmt(r.taxa_urgencia)}</span>
              </div>
              <div className="flex items-center justify-end gap-1 border-t border-border pt-2">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        />
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Editar Regra de Preço" : "Nova Regra de Preço"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bairro Destino</Label>
                <Select value={bairroId} onValueChange={setBairroId}>
                  <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {MOCK_BAIRROS.map((b) => (<SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Região</Label>
                <Select value={regiaoId} onValueChange={setRegiaoId}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {MOCK_REGIOES.map((r) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Operação</Label>
              <Select value={tipoOp} onValueChange={setTipoOp}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOCK_TIPOS_OPERACAO.filter((t) => t.ativo).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: t.cor }} />
                        {t.nome}
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Taxa Base *</Label><CurrencyInput value={taxaBase} onChange={setTaxaBase} /></div>
              <div className="space-y-2"><Label>Taxa Retorno</Label><CurrencyInput value={taxaRetorno} onChange={setTaxaRetorno} /></div>
              <div className="space-y-2"><Label>Taxa Espera</Label><CurrencyInput value={taxaEspera} onChange={setTaxaEspera} /></div>
              <div className="space-y-2"><Label>Taxa Urgência</Label><CurrencyInput value={taxaUrgencia} onChange={setTaxaUrgencia} /></div>
            </div>
            <div className="flex items-center gap-3"><Switch checked={ativo} onCheckedChange={setAtivo} /><Label>Regra ativa</Label></div>
            <div className="space-y-2"><Label>Observação</Label><Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Observação opcional..." rows={2} /></div>
            {taxaBase > 0 && (
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Preview da tarifa</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span>Base:</span><span className="tabular-nums font-medium">{fmt(taxaBase)}</span>
                  <span>Retorno:</span><span className="tabular-nums">{fmt(taxaRetorno)}</span>
                  <span>Espera:</span><span className="tabular-nums">{fmt(taxaEspera)}</span>
                  <span>Urgência:</span><span className="tabular-nums">{fmt(taxaUrgencia)}</span>
                  <span className="font-semibold border-t border-border pt-1 mt-1">Total máximo:</span>
                  <span className="tabular-nums font-bold border-t border-border pt-1 mt-1">{fmt(taxaBase + taxaRetorno + taxaEspera + taxaUrgencia)}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)} title="Excluir regra de preço" description="Tem certeza que deseja excluir esta regra?" confirmLabel="Excluir" variant="destructive" onConfirm={handleDelete} />
    </Card>
  );
}

import { useState, useRef, useMemo } from "react";
import { SearchInput, ConfirmDialog } from "@/components/shared";
import { useLogStore } from "@/contexts/LogStore";
import type { Bairro } from "@/types/database";
import { useBairros, useRegioes, useUpsertBairro, useDeleteBairro } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, AlertTriangle, Upload, FileSpreadsheet, X, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/shared/CurrencyInput";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function BairrosTab() {
  const { addLog } = useLogStore();
  const { data: bairros = [], refetch: refetchBairros } = useBairros();
  const { data: regioes = [] } = useRegioes();
  const upsertBairro = useUpsertBairro();
  const deleteBairroMutation = useDeleteBairro();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBairro, setEditingBairro] = useState<Bairro | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bairro | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ParsedBairro[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState("");
  const [regionId, setRegionId] = useState("");
  const [taxa, setTaxa] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Ao buscar, força todos os grupos abertos para não esconder resultados
  const isCollapsed = (id: string) =>
    search.trim() === "" && !expandedGroups.has(id);

  type ParsedBairro = { nome: string; regiao: string; region_id: string; taxa_entrega: number; valid: boolean; error?: string };

  const filtered = bairros.filter((b) =>
    b.nome.toLowerCase().includes(search.toLowerCase())
  );

  const getRegionName = (id: string) =>
    regioes.find((r) => r.id === id)?.name ?? "—";

  const findRegionId = (name: string): string | null => {
    const normalized = name.trim().toLowerCase();
    const found = regioes.find((r) => r.name.toLowerCase() === normalized);
    return found?.id ?? null;
  };

  const openCreate = () => {
    setEditingBairro(null); setNome(""); setRegionId(""); setTaxa(0); setDialogOpen(true);
  };

  const openEdit = (b: Bairro) => {
    setEditingBairro(b); setNome(b.nome); setRegionId(b.region_id); setTaxa(b.taxa_entrega); setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim() || !regionId) { toast.error("Preencha todos os campos obrigatórios."); return; }
    if (editingBairro) {
      await upsertBairro.mutateAsync({ id: editingBairro.id, nome, region_id: regionId, taxa_entrega: taxa });
      addLog({ categoria: "configuracao", acao: "bairro_editado", entidade_id: editingBairro.id, descricao: `Bairro "${nome}" atualizado`, detalhes: { nome, regiao: getRegionName(regionId), taxa } });
      toast.success("Bairro atualizado com sucesso!");
    } else {
      const inserted = await upsertBairro.mutateAsync({ nome, region_id: regionId, taxa_entrega: taxa });
      addLog({ categoria: "configuracao", acao: "bairro_criado", entidade_id: inserted?.id ?? "new", descricao: `Bairro "${nome}" cadastrado`, detalhes: { nome, regiao: getRegionName(regionId), taxa } });
      toast.success("Bairro cadastrado com sucesso!");
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteBairroMutation.mutateAsync(deleteTarget.id);
    addLog({ categoria: "configuracao", acao: "bairro_removido", entidade_id: deleteTarget.id, descricao: `Bairro "${deleteTarget.nome}" removido`, detalhes: null });
    toast.success("Bairro removido com sucesso!");
    setDeleteTarget(null);
  };

  // ── Import logic ──
  const parseCurrencyBR = (val: string): number => {
    const cleaned = val.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const parseCSV = (text: string): ParsedBairro[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    // skip header
    return lines.slice(1).map((line) => {
      const parts = line.split(/[;,\t]/).map((s) => s.trim().replace(/^["']|["']$/g, ""));
      const nome = parts[0] ?? "";
      const regiao = parts[1] ?? "";
      const taxaStr = parts[2] ?? "0";
      const region_id = findRegionId(regiao);
      const taxa_entrega = parseCurrencyBR(taxaStr);
      const valid = !!nome && !!region_id;
      return { nome, regiao, region_id: region_id ?? "", taxa_entrega, valid, error: !nome ? "Nome vazio" : !region_id ? `Região "${regiao}" não encontrada` : undefined };
    });
  };

  const parseTXT = (text: string): ParsedBairro[] => {
    // Same as CSV but also try space-separated
    const csvResult = parseCSV(text);
    if (csvResult.length > 0) return csvResult;
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    return lines.map((line) => {
      const nome = line.trim();
      return { nome, regiao: "", region_id: "", taxa_entrega: 0, valid: false, error: "Formato: apenas nome detectado. Use CSV com colunas: Nome;Região;Taxa" };
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "pdf") {
      toast.error("Para PDF, copie o conteúdo em formato CSV (Nome;Região;Taxa) e salve como .csv ou .txt");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const text = await file.text();
    let parsed: ParsedBairro[] = [];

    if (ext === "csv") {
      parsed = parseCSV(text);
    } else if (ext === "txt") {
      parsed = parseTXT(text);
    } else {
      toast.error("Formato não suportado. Use CSV ou TXT.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (parsed.length === 0) {
      toast.error("Nenhum dado encontrado no arquivo.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setImportPreview(parsed);
    setImportDialogOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImportConfirm = async () => {
    const validItems = importPreview.filter((p) => p.valid);
    if (validItems.length === 0) { toast.error("Nenhum item válido para importar."); return; }
    for (const p of validItems) {
      await upsertBairro.mutateAsync({ nome: p.nome, region_id: p.region_id, taxa_entrega: p.taxa_entrega });
    }
    toast.success(`${validItems.length} bairro(s) importado(s) com sucesso!`);
    setImportDialogOpen(false);
    setImportPreview([]);
  };

  const grupos = useMemo(() => {
    const porRegiao = new Map<string, Bairro[]>();
    for (const b of filtered) {
      const key = b.region_id ?? "__sem_regiao__";
      if (!porRegiao.has(key)) porRegiao.set(key, []);
      porRegiao.get(key)!.push(b);
    }
    // Ordenar bairros dentro de cada grupo
    for (const list of porRegiao.values()) {
      list.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    }
    // Grupos de regiões cadastradas primeiro (ordenados por nome), depois sem região
    const gruposOrdenados: { regiaoId: string; nome: string; bairros: Bairro[] }[] = [];
    for (const r of [...regioes].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))) {
      const lista = porRegiao.get(r.id);
      if (lista && lista.length > 0) {
        gruposOrdenados.push({ regiaoId: r.id, nome: r.name, bairros: lista });
      }
    }
    const semRegiao = porRegiao.get("__sem_regiao__");
    if (semRegiao && semRegiao.length > 0) {
      gruposOrdenados.push({ regiaoId: "__sem_regiao__", nome: "Sem região", bairros: semRegiao });
    }
    return gruposOrdenados;
  }, [filtered, regioes]);

  const renderBairroActions = (r: Bairro) => (
    <div className="flex items-center justify-end gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-200" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Pencil className="h-4 w-4" /></Button>
          </TooltipTrigger>
          <TooltipContent>Editar bairro</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/30 transition-colors duration-200" onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}><Trash2 className="h-4 w-4" /></Button>
          </TooltipTrigger>
          <TooltipContent>Excluir bairro</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Bairros</CardTitle>
        <CardDescription className="text-sm">Gerencie os bairros e suas taxas de entrega padrão (fallback).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar bairro..." className="flex-1" />
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileSelect} />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Importar
            </Button>
            <Button onClick={openCreate} size="sm"><Plus className="h-4 w-4 mr-2" /> Novo Bairro</Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <p className="text-muted-foreground font-medium">Nenhum bairro cadastrado</p>
            <p className="text-sm text-muted-foreground">Cadastre o primeiro bairro para começar.</p>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Cadastrar primeiro bairro</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {grupos.map(({ regiaoId, nome: regiaoNome, bairros: listaBairros }) => (
              <div key={regiaoId} className="rounded-lg border border-border overflow-hidden">
                {/* Cabeçalho clicável */}
                <button
                  type="button"
                  onClick={() => toggleGroup(regiaoId)}
                  className="w-full flex items-center gap-2 px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
                >
                  {isCollapsed(regiaoId)
                    ? <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <span className="text-sm font-semibold text-foreground">{regiaoNome}</span>
                  <Badge variant="secondary" className="text-xs ml-1">
                    {listaBairros.length} {listaBairros.length === 1 ? "bairro" : "bairros"}
                  </Badge>
                </button>

                {!isCollapsed(regiaoId) && (
                  <>
                    {/* Tabela desktop */}
                    <div className="hidden sm:block">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/20">
                            <TableHead className="text-xs">Nome</TableHead>
                            <TableHead className="text-xs">Taxa de Entrega (fallback)</TableHead>
                            <TableHead className="w-24 text-right text-xs">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {listaBairros.map((b) => (
                            <TableRow key={b.id} className="hover:bg-muted/30">
                              <TableCell className="font-medium">{b.nome}</TableCell>
                              <TableCell className="tabular-nums text-muted-foreground">
                                {b.taxa_entrega.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </TableCell>
                              <TableCell className="text-right">{renderBairroActions(b)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Cards mobile */}
                    <div className="sm:hidden divide-y divide-border">
                      {listaBairros.map((b) => (
                        <div key={b.id} className="p-4 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{b.nome}</span>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={(e) => { e.stopPropagation(); openEdit(b); }}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={(e) => { e.stopPropagation(); setDeleteTarget(b); }}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </div>
                          <span className="tabular-nums text-sm text-muted-foreground">
                            {b.taxa_entrega.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingBairro ? "Editar Bairro" : "Novo Bairro"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nome *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Centro" /></div>
            <div className="space-y-2">
              <Label>Região *</Label>
              <Select value={regionId} onValueChange={setRegionId}>
                <SelectTrigger><SelectValue placeholder="Selecione a região" /></SelectTrigger>
                <SelectContent>{regioes.map((r) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Taxa de Entrega (Fallback)</Label>
              <CurrencyInput value={taxa} onChange={setTaxa} />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                Este valor é usado como FALLBACK quando não há regra de preço específica.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingBairro ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)} title="Excluir bairro" description={`Tem certeza que deseja excluir o bairro "${deleteTarget?.nome}"? Esta ação não pode ser desfeita.`} confirmLabel="Excluir" variant="destructive" onConfirm={handleDelete} />

      {/* Import Preview Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Importar Bairros
            </DialogTitle>
            <DialogDescription>
              Arquivo: <span className="font-medium">{importFileName}</span> — {importPreview.length} linha(s) encontrada(s), {importPreview.filter(p => p.valid).length} válida(s).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 space-y-1">
              <p className="font-medium">Formato esperado (CSV/TXT):</p>
              <code className="block text-foreground/80">Nome;Região;Taxa</code>
              <code className="block text-foreground/80">Centro;Centro;8,00</code>
              <p>Separadores aceitos: <code>;</code> <code>,</code> <code>tab</code> — Regiões devem corresponder exatamente às cadastradas.</p>
            </div>

            <ScrollArea className="max-h-[300px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Região</TableHead>
                    <TableHead>Taxa</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importPreview.map((row, i) => (
                    <TableRow key={i} className={row.valid ? "" : "bg-destructive/5"}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="font-medium">{row.nome || "—"}</TableCell>
                      <TableCell>
                        {row.valid ? (
                          <Badge variant="outline">{row.regiao}</Badge>
                        ) : (
                          <span className="text-muted-foreground">{row.regiao || "—"}</span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.taxa_entrega.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </TableCell>
                      <TableCell>
                        {row.valid ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">OK</Badge>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="destructive" className="cursor-help">Erro</Badge>
                              </TooltipTrigger>
                              <TooltipContent>{row.error}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportPreview([]); }}>Cancelar</Button>
            <Button onClick={handleImportConfirm} disabled={importPreview.filter(p => p.valid).length === 0}>
              <Upload className="h-4 w-4 mr-2" />
              Importar {importPreview.filter(p => p.valid).length} bairro(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

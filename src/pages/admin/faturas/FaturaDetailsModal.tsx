import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import type { Fatura, TipoAjuste, EntregaFatura, RotaEntregaFatura } from "@/types/database";
import { STATUS_GERAL_VARIANT, TIPO_FATURAMENTO_LABELS } from "@/lib/formatters";
import { formatCurrency, formatDateBR, formatDateTimeBR } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  FileText, Calendar, Receipt, ArrowDownUp, Pencil, History,
  Banknote, ArrowUpRight, ArrowDownRight, Download, Package,
  ChevronDown, ChevronRight, User, MapPin, Truck, Phone, DollarSign,
  Lock, Trash2, Save, X,
} from "lucide-react";
import { toast } from "sonner";
import { generateFaturaPDF } from "@/lib/generateFaturaPDF";
import { RegistrarRepasseDialog } from "./RegistrarRepasseDialog";
import { RegistrarPagamentoDialog } from "./RegistrarPagamentoDialog";
import { AdicionarAjusteDialog } from "./AdicionarAjusteDialog";
import {
  useLancamentosByFatura,
  useAjustesByFatura,
  useHistoricoFatura,
  useUpdateFatura,
  useCreateAjuste,
  useCreateHistoricoFatura,
  useEntregasByFatura,
} from "@/hooks/useFaturas";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  fatura: Fatura | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFaturaUpdate?: (updated: Fatura) => void;
}

export function FaturaDetailsModal({ fatura, open, onOpenChange, onFaturaUpdate }: Props) {
  const { user } = useAuth();
  const faturaId = fatura?.id ?? "";

  // ── Queries reais ──
  const { data: lancamentos = [] } = useLancamentosByFatura(faturaId);
  const { data: ajustes = [] } = useAjustesByFatura(faturaId);
  const { data: historico = [] } = useHistoricoFatura(faturaId);
  const { data: entregas = [] } = useEntregasByFatura(faturaId);

  // ── Mutations ──
  const updateFatura = useUpdateFatura();
  const createAjuste = useCreateAjuste();
  const createHistorico = useCreateHistoricoFatura();

  const [repasseOpen, setRepasseOpen] = useState(false);
  const [pagamentoOpen, setPagamentoOpen] = useState(false);
  const [ajusteOpen, setAjusteOpen] = useState(false);
  const [entregasExpanded, setEntregasExpanded] = useState(false);
  const [expandedEntrega, setExpandedEntrega] = useState<string | null>(null);
  const [fecharConfirmOpen, setFecharConfirmOpen] = useState(false);
  const [editingEntrega, setEditingEntrega] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, { valor_taxas: number; valor_recebido_cliente: number }>>({});

  if (!fatura) return null;

  const saldo = fatura.saldo_liquido ?? 0;
  const saldoColor = saldo > 0 ? "text-emerald-500" : saldo < 0 ? "text-destructive" : "text-muted-foreground";
  const saldoLabel = saldo > 0 ? "Operação deve repassar à loja" : saldo < 0 ? "Loja deve pagar à operação" : "Quitado";

  const handleRepasse = async (valor: number, observacao: string) => {
    const novoSaldo = saldo - valor;
    try {
      await updateFatura.mutateAsync({
        id: fatura.id,
        patch: {
          saldo_liquido: novoSaldo,
          status_repasse: "Repassado",
          status_geral: novoSaldo === 0 ? "Fechada" : fatura.status_geral,
        },
      });
      await createHistorico.mutateAsync({
        fatura_id: fatura.id,
        tipo: "repasse",
        descricao: `Repasse de ${formatCurrency(valor)} registrado${observacao ? ` — ${observacao}` : ""}`,
        usuario_id: user?.id ?? null,
        valor_anterior: saldo,
        valor_novo: novoSaldo,
        metadata: null,
      });
      setRepasseOpen(false);
      toast.success(`Repasse de ${formatCurrency(valor)} registrado com sucesso`);
    } catch (err) {
      toast.error("Erro ao registrar repasse");
    }
  };

  const handleAjuste = async (tipo: TipoAjuste, valor: number, motivo: string) => {
    const ajusteValor = tipo === "credito" ? valor : -valor;
    const novoSaldo = saldo + ajusteValor;
    try {
      await createAjuste.mutateAsync({
        fatura_id: fatura.id,
        solicitacao_id: null,
        tipo,
        valor,
        motivo,
        usuario_id: user?.id ?? "",
      });
      await updateFatura.mutateAsync({
        id: fatura.id,
        patch: { saldo_liquido: novoSaldo },
      });
      await createHistorico.mutateAsync({
        fatura_id: fatura.id,
        tipo: "ajuste",
        descricao: `Ajuste ${tipo === "credito" ? "crédito" : "débito"} de ${formatCurrency(valor)} — ${motivo}`,
        usuario_id: user?.id ?? null,
        valor_anterior: saldo,
        valor_novo: novoSaldo,
        metadata: null,
      });
      setAjusteOpen(false);
      toast.success(`Ajuste de ${formatCurrency(valor)} (${tipo}) adicionado com sucesso`);
    } catch (err) {
      toast.error("Erro ao adicionar ajuste");
    }
  };

  const handleFinalizar = async () => {
    try {
      await updateFatura.mutateAsync({
        id: fatura.id,
        patch: { status_geral: "Finalizada" },
      });
      await createHistorico.mutateAsync({
        fatura_id: fatura.id,
        tipo: "finalizada",
        descricao: "Fatura finalizada — saldo zerado",
        usuario_id: user?.id ?? null,
        valor_anterior: null,
        valor_novo: null,
        metadata: null,
      });
      toast.success("Fatura finalizada com sucesso");
    } catch (err) {
      toast.error("Erro ao finalizar fatura");
    }
  };

  const handleFechar = async () => {
    try {
      await updateFatura.mutateAsync({
        id: fatura.id,
        patch: { status_geral: "Fechada" },
      });
      await createHistorico.mutateAsync({
        fatura_id: fatura.id,
        tipo: "fechada",
        descricao: `Fatura fechada — saldo: ${formatCurrency(saldo)}`,
        usuario_id: user?.id ?? null,
        valor_anterior: null,
        valor_novo: null,
        metadata: null,
      });
      setFecharConfirmOpen(false);
      toast.success("Fatura fechada com sucesso");
    } catch (err) {
      toast.error("Erro ao fechar fatura");
    }
  };

  const handleCobranca = async () => {
    try {
      await updateFatura.mutateAsync({
        id: fatura.id,
        patch: { status_cobranca: "Cobrado" },
      });
      await createHistorico.mutateAsync({
        fatura_id: fatura.id,
        tipo: "cobranca",
        descricao: `Cobrança de ${formatCurrency(Math.abs(saldo))} registrada`,
        usuario_id: user?.id ?? null,
        valor_anterior: null,
        valor_novo: null,
        metadata: null,
      });
      toast.success(`Cobrança de ${formatCurrency(Math.abs(saldo))} registrada`);
    } catch (err) {
      toast.error("Erro ao registrar cobrança");
    }
  };

  const handlePagamento = async (valor: number, formaPagamento: string, observacao: string) => {
    const novoSaldo = saldo < 0 ? saldo + valor : saldo - valor;
    try {
      await updateFatura.mutateAsync({
        id: fatura.id,
        patch: {
          saldo_liquido: novoSaldo,
          status_geral: novoSaldo === 0 ? "Finalizada" : fatura.status_geral,
        },
      });
      await createHistorico.mutateAsync({
        fatura_id: fatura.id,
        tipo: "pagamento",
        descricao: `Pagamento de ${formatCurrency(valor)} registrado${observacao ? ` — ${observacao}` : ""}`,
        usuario_id: user?.id ?? null,
        valor_anterior: saldo,
        valor_novo: novoSaldo,
        metadata: null,
      });
      setPagamentoOpen(false);
      toast.success(`Pagamento de ${formatCurrency(valor)} registrado com sucesso`);
    } catch (err) {
      toast.error("Erro ao registrar pagamento");
    }
  };
  const handleGerarPDF = async () => {
    const entregasMap: Record<string, typeof entregas> = entregas.length > 0 ? { [fatura.id]: entregas } : {};
    try {
      await generateFaturaPDF(fatura, entregasMap, lancamentos, ajustes);
      toast.success(`PDF da fatura ${fatura.numero} gerado com sucesso`);
    } catch {
      toast.error("Erro ao gerar PDF");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <FileText className="h-5 w-5 text-primary" />
              Fatura {fatura.numero}
            </DialogTitle>
          <DialogDescription className="sr-only">.</DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-5rem)]">
            <div className="px-6 pb-6 space-y-6">
              {/* ── 1. Cabeçalho ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{fatura.cliente_nome}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tipo</p>
                  <p className="font-medium">{TIPO_FATURAMENTO_LABELS[fatura.tipo_faturamento]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Emissão</p>
                  <p className="font-medium">{formatDateBR(fatura.data_emissao)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Vencimento</p>
                  <p className="font-medium">{formatDateBR(fatura.data_vencimento)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={STATUS_GERAL_VARIANT[fatura.status_geral]}>{fatura.status_geral}</Badge>
                <Badge variant="outline">{fatura.total_entregas} entregas</Badge>
              </div>

              <Separator />

              {/* ── 2. Resumo Financeiro ── */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4" /> Resumo Financeiro</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <SummaryItem label="Créditos Loja" value={fatura.total_creditos_loja ?? 0} icon={<ArrowDownRight className="h-4 w-4 text-emerald-500" />} />
                    <SummaryItem label="Débitos Loja" value={fatura.total_debitos_loja ?? 0} icon={<ArrowUpRight className="h-4 w-4 text-destructive" />} />
                    <SummaryItem label="Ajustes" value={ajustes.reduce((sum, a) => sum + (a.tipo === "credito" ? a.valor : -a.valor), 0)} icon={<ArrowDownUp className="h-4 w-4 text-amber-500" />} />
                    <div>
                      <p className="text-muted-foreground text-xs mb-1">Saldo Líquido</p>
                      <p className={cn("text-lg font-bold tabular-nums", saldoColor)}>{formatCurrency(saldo)}</p>
                      <p className="text-xs text-muted-foreground">{saldoLabel}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── 3. Entregas Incluídas ── */}
              <Card>
                <Collapsible open={entregasExpanded} onOpenChange={setEntregasExpanded}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Entregas Incluídas ({fatura.total_entregas})
                        </span>
                        {entregasExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CardContent className="pb-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      {fatura.total_entregas} entregas realizadas no período de {formatDateBR(fatura.data_emissao)} a {formatDateBR(fatura.data_vencimento)}.
                    </p>
                    <CollapsibleContent>
                      {entregas.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">Dados detalhados das entregas não disponíveis.</p>
                      ) : (
                        <div className="space-y-2">
                          {entregas.map((e) => (
                            <EntregaCard
                              key={e.solicitacao_id}
                              entrega={e}
                              expanded={expandedEntrega === e.solicitacao_id}
                              onToggle={() => setExpandedEntrega(expandedEntrega === e.solicitacao_id ? null : e.solicitacao_id)}
                              isEditing={editingEntrega === e.solicitacao_id}
                              editValue={editValues[e.solicitacao_id]}
                              canEdit={fatura.status_geral !== "Finalizada"}
                              onStartEdit={() => {
                                setEditingEntrega(e.solicitacao_id);
                                setEditValues(prev => ({
                                  ...prev,
                                  [e.solicitacao_id]: { valor_taxas: e.valor_taxas, valor_recebido_cliente: e.valor_recebido_cliente },
                                }));
                                if (!expandedEntrega) setExpandedEntrega(e.solicitacao_id);
                              }}
                              onCancelEdit={() => setEditingEntrega(null)}
                              onSaveEdit={() => {
                                const vals = editValues[e.solicitacao_id];
                                if (!vals) return;
                                toast.success(`Entrega ${e.codigo} atualizada: taxa ${formatCurrency(vals.valor_taxas)}, recebido ${formatCurrency(vals.valor_recebido_cliente)}`);
                                setEditingEntrega(null);
                              }}
                              onEditChange={(field, val) => {
                                setEditValues(prev => ({
                                  ...prev,
                                  [e.solicitacao_id]: { ...prev[e.solicitacao_id], [field]: val },
                                }));
                              }}
                              onRemove={() => {
                                toast.success(`Entrega ${e.codigo} removida da fatura`);
                              }}
                            />
                          ))}
                          {/* Totais */}
                          <div className="flex items-center justify-between pt-3 mt-2 border-t border-border/50 text-sm">
                            <span className="font-medium text-muted-foreground">Totais</span>
                            <div className="flex gap-6">
                              <span className="text-muted-foreground">{entregas.reduce((s, e) => s + e.total_rotas, 0)} rotas</span>
                              <span className="font-semibold tabular-nums">{formatCurrency(entregas.reduce((s, e) => s + e.valor_taxas, 0))} taxas</span>
                              <span className="font-semibold tabular-nums text-emerald-500">{formatCurrency(entregas.reduce((s, e) => s + e.valor_recebido_cliente, 0))} recebido</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </CardContent>
                </Collapsible>
              </Card>

              {/* ── 4. Lançamentos Financeiros ── */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Banknote className="h-4 w-4" /> Lançamentos Financeiros</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {lancamentos.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4">Nenhum lançamento registrado.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lancamentos.map((l) => (
                          <TableRow key={l.id}>
                            <TableCell className="text-sm">{l.descricao}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {l.tipo === "credito_loja" ? "Crédito Loja" : l.tipo === "receita_operacao" ? "Receita Op." : l.tipo === "debito_loja" ? "Débito Loja" : "Ajuste"}
                              </Badge>
                            </TableCell>
                            <TableCell className={cn("text-right tabular-nums font-medium", l.sinal === "credito" ? "text-emerald-500" : "text-destructive")}>
                              {l.sinal === "debito" ? "- " : ""}{formatCurrency(l.valor)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={l.status_liquidacao === "liquidado" ? "default" : "secondary"} className="text-xs">
                                {l.status_liquidacao === "liquidado" ? "Liquidado" : l.status_liquidacao === "estornado" ? "Estornado" : "Pendente"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* ── 5. Ajustes Manuais ── */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Pencil className="h-4 w-4" /> Ajustes Manuais</CardTitle>
                </CardHeader>
                <CardContent>
                  {ajustes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum ajuste registrado.</p>
                  ) : (
                    <div className="space-y-3">
                      {ajustes.map((a) => (
                        <div key={a.id} className="flex items-start justify-between p-3 rounded-lg border border-border/50 bg-muted/30">
                          <div>
                            <p className="text-sm font-medium">{a.motivo}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatDateTimeBR(a.created_at)}</p>
                          </div>
                          <span className={cn("font-semibold tabular-nums", a.tipo === "credito" ? "text-emerald-500" : "text-destructive")}>
                            {a.tipo === "debito" ? "- " : "+ "}{formatCurrency(a.valor)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── 6. Histórico ── */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4" /> Histórico</CardTitle>
                </CardHeader>
                <CardContent>
                  {historico.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
                  ) : (
                    <div className="space-y-3">
                      {historico.map((h) => (
                        <div key={h.id} className="flex items-start gap-3">
                          <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                          <div>
                            <p className="text-sm">{h.descricao}</p>
                            <p className="text-xs text-muted-foreground">{formatDateTimeBR(h.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── 7. Ações ── */}
              {fatura.status_geral !== "Finalizada" && (
                <>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    {saldo > 0 && (
                      <Button variant="outline" onClick={() => setRepasseOpen(true)}>
                        <ArrowUpRight className="h-4 w-4 mr-1.5" /> Registrar Repasse
                      </Button>
                    )}
                    {saldo < 0 && (
                      <Button variant="outline" onClick={handleCobranca}>
                        <ArrowDownRight className="h-4 w-4 mr-1.5" /> Registrar Cobrança
                      </Button>
                    )}
                    {saldo !== 0 && (
                      <Button variant="outline" onClick={() => setPagamentoOpen(true)}>
                        <Banknote className="h-4 w-4 mr-1.5" /> Registrar Pagamento
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setAjusteOpen(true)}>
                      <Pencil className="h-4 w-4 mr-1.5" /> Adicionar Ajuste
                    </Button>
                    <Button variant="outline" onClick={handleGerarPDF}>
                      <Download className="h-4 w-4 mr-1.5" /> Gerar PDF
                    </Button>
                    {fatura.status_geral === "Aberta" || fatura.status_geral === "Vencida" ? (
                      <Button variant="outline" onClick={() => setFecharConfirmOpen(true)}>
                        <Lock className="h-4 w-4 mr-1.5" /> Fechar Fatura
                      </Button>
                    ) : null}
                    {saldo === 0 && (
                      <Button onClick={handleFinalizar}>
                        Finalizar Fatura
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Sub-dialogs */}
      <RegistrarRepasseDialog
        fatura={fatura}
        open={repasseOpen}
        onOpenChange={setRepasseOpen}
        onConfirm={handleRepasse}
      />
      <RegistrarPagamentoDialog
        fatura={fatura}
        open={pagamentoOpen}
        onOpenChange={setPagamentoOpen}
        onConfirm={handlePagamento}
      />
      <AdicionarAjusteDialog
        fatura={fatura}
        open={ajusteOpen}
        onOpenChange={setAjusteOpen}
        onConfirm={handleAjuste}
      />
      <ConfirmDialog
        open={fecharConfirmOpen}
        onOpenChange={setFecharConfirmOpen}
        title="Fechar Fatura"
        description={`Tem certeza que deseja fechar a fatura ${fatura.numero}? O saldo atual é ${formatCurrency(saldo)}. Após o fechamento, a fatura não poderá mais receber novas entregas.`}
        confirmLabel="Fechar Fatura"
        onConfirm={handleFechar}
      />
    </>
  );
}

function SummaryItem({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1">{icon} {label}</p>
      <p className="text-lg font-semibold tabular-nums">{formatCurrency(value)}</p>
    </div>
  );
}

function EntregaCard({ entrega, expanded, onToggle, isEditing, editValue, canEdit, onStartEdit, onCancelEdit, onSaveEdit, onEditChange, onRemove }: {
  entrega: EntregaFatura;
  expanded: boolean;
  onToggle: () => void;
  isEditing?: boolean;
  editValue?: { valor_taxas: number; valor_recebido_cliente: number };
  canEdit?: boolean;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
  onSaveEdit?: () => void;
  onEditChange?: (field: "valor_taxas" | "valor_recebido_cliente", value: number) => void;
  onRemove?: () => void;
}) {
  return (
    <div className={cn("border rounded-lg overflow-hidden", isEditing ? "border-primary/50 ring-1 ring-primary/20" : "border-border/50")}>
      <div className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/30 transition-colors">
        <button onClick={onToggle} className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            <span className="font-mono text-xs font-medium text-primary">{entrega.codigo}</span>
          </div>
          <Badge variant={entrega.status === "concluida" ? "default" : "destructive"} className="text-[10px] h-5">
            {entrega.status === "concluida" ? "Concluída" : "Cancelada"}
          </Badge>
        </button>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="font-semibold tabular-nums text-sm">{formatCurrency(entrega.valor_taxas)}</span>
          {canEdit && !isEditing && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onStartEdit?.(); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onRemove?.(); }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          {isEditing && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={(e) => { e.stopPropagation(); onSaveEdit?.(); }}>
                <Save className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onCancelEdit?.(); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-border/30 bg-muted/20">
          {/* Edit form */}
          {isEditing && editValue && (
            <div className="grid grid-cols-2 gap-3 py-3 p-3 mb-3 rounded-md border border-primary/20 bg-primary/5">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Valor Taxas (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editValue.valor_taxas}
                  onChange={(e) => onEditChange?.("valor_taxas", parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Valor Recebido (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editValue.valor_recebido_cliente}
                  onChange={(e) => onEditChange?.("valor_recebido_cliente", parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm tabular-nums"
                />
              </div>
            </div>
          )}

          {/* Info geral da entrega */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 text-sm">
            <div className="flex items-start gap-2">
              <Truck className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Entregador</p>
                <p className="font-medium text-sm">{entrega.entregador_nome}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Conclusão</p>
                <p className="font-medium text-sm">{formatDateTimeBR(entrega.data_conclusao)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Ponto de Coleta</p>
                <p className="font-medium text-sm">{entrega.ponto_coleta}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Banknote className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Recebido do cliente</p>
                <p className={cn("font-medium text-sm tabular-nums", entrega.valor_recebido_cliente > 0 ? "text-emerald-500" : "text-muted-foreground")}>
                  {entrega.valor_recebido_cliente > 0 ? formatCurrency(entrega.valor_recebido_cliente) : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Rotas detalhadas */}
          <div className="mt-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Rotas ({entrega.rotas?.length ?? 0})
            </p>
            <div className="space-y-2">
              {(entrega.rotas ?? []).map((rota, i) => (
                <RotaCard key={i} rota={rota} index={i} />
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 mt-3 border-t border-border/30 text-sm">
            <span className="text-muted-foreground">Taxa total da entrega</span>
            <span className="font-semibold tabular-nums">{formatCurrency(isEditing && editValue ? editValue.valor_taxas : entrega.valor_taxas)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function RotaCard({ rota, index }: { rota: RotaEntregaFatura; index: number }) {
  return (
    <div className="rounded-md border border-border/40 bg-background/50 p-2.5 text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium flex items-center gap-1.5">
          <MapPin className="h-3 w-3 text-primary" />
          Rota {index + 1} — {rota.bairro_destino}
        </span>
        <Badge variant={rota.status === "concluida" ? "default" : "destructive"} className="text-[10px] h-5">
          {rota.status === "concluida" ? "Concluída" : "Cancelada"}
        </Badge>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-muted-foreground">
        <span className="flex items-center gap-1 text-xs"><User className="h-3 w-3" />{rota.responsavel}</span>
        <span className="flex items-center gap-1 text-xs"><Phone className="h-3 w-3" />{rota.telefone}</span>
        <span className="flex items-center gap-1 text-xs"><DollarSign className="h-3 w-3" />Taxa: {formatCurrency(rota.taxa)}</span>
        {rota.valor_receber != null && (
          <span className="flex items-center gap-1 text-xs text-emerald-500"><DollarSign className="h-3 w-3" />Receber: {formatCurrency(rota.valor_receber)}</span>
        )}
      </div>
    </div>
  );
}

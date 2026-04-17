import { useState, useMemo } from "react";
import type { Cliente } from "@/types/database";
import { STATUS_SOLICITACAO_LABELS } from "@/types/database";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Pencil, ExternalLink, ClipboardList, Receipt, Info, DollarSign, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSolicitacoesByCliente, useRotasBySolicitacaoIds } from "@/hooks/useSolicitacoes";
import { useClienteSaldoMap } from "@/hooks/useClientes";
import { useRecargasByCliente } from "@/hooks/useFinanceiro";
import { useEntregadores } from "@/hooks/useEntregadores";
import { useFaturasByCliente } from "@/hooks/useFaturas";
import { RecargaSaldoDialog } from "./RecargaSaldoDialog";
import { ExportDropdown } from "@/components/shared/ExportDropdown";
import { exportCSV, exportPDF } from "@/lib/exportTable";

interface ClientProfileModalProps {
  client: Cliente | null;
  onClose: () => void;
  onEdit: (client: Cliente) => void;
}

const MODALIDADE_LABELS: Record<string, string> = {
  pre_pago: "Pré-pago",
  faturado: "Faturado",
};

const FREQUENCIA_LABELS: Record<string, string> = {
  diario: "Diário",
  semanal: "Semanal",
  mensal: "Mensal",
  por_entrega: "Por nº de entregas",
};

const statusVariant = (s: string): "default" | "secondary" | "outline" | "destructive" => {
  switch (s) {
    case "concluida": return "default";
    case "pendente": return "secondary";
    case "cancelada": case "rejeitada": return "destructive";
    default: return "outline";
  }
};

const fmt = (v: number | null | undefined) =>
  v != null ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

const fmtDateTime = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

const STATUS_GERAL_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  Aberta: "secondary",
  Fechada: "outline",
  Finalizada: "default",
  Vencida: "destructive",
};

export function ClientProfileModal({ client, onClose, onEdit }: ClientProfileModalProps) {
  const navigate = useNavigate();
  const { data: solicitacoes = [] } = useSolicitacoesByCliente(client?.id ?? "");
  const solIds = useMemo(() => solicitacoes.map((s) => s.id), [solicitacoes]);
  const { data: allRotas = [] } = useRotasBySolicitacaoIds(solIds);
  const { getClienteSaldo } = useClienteSaldoMap();
  const { data: entregadores = [] } = useEntregadores();
  const { data: recargas = [] } = useRecargasByCliente(client?.id ?? "");
  const { data: faturas = [] } = useFaturasByCliente(client?.id ?? "");
  const getRotasBySolicitacao = (solId: string) => allRotas.filter(r => r.solicitacao_id === solId);
  const getEntregadorNome = (id: string | null | undefined) =>
    !id ? "—" : (entregadores.find((e) => e.id === id)?.nome ?? id);
  const [recargaOpen, setRecargaOpen] = useState(false);
  const [recargaPage, setRecargaPage] = useState(1);
  const [recargaPerPage, setRecargaPerPage] = useState(10);

  if (!client) return null;

  const saldoPrePago = client.modalidade === "pre_pago" ? getClienteSaldo(client.id) : null;

  const createdDate = new Date(client.created_at).toLocaleDateString("pt-BR");

  // Client solicitations (already scoped to this client via useSolicitacoesByCliente)
  const clientSolicitacoes = solicitacoes
    .sort((a, b) => new Date(b.data_solicitacao).getTime() - new Date(a.data_solicitacao).getTime())
    .slice(0, 5);

  const totalSolicitacoes = solicitacoes.length;
  const solicitacoesMes = solicitacoes.filter((s) => {
    const d = new Date(s.data_solicitacao);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const totalTaxas = solicitacoes
    .filter((s) => s.valor_total_taxas != null)
    .reduce((sum, s) => sum + (s.valor_total_taxas ?? 0), 0);

  // Frequency description
  const getFrequenciaDesc = () => {
    if (!client.frequencia_faturamento) return "—";
    const freq = FREQUENCIA_LABELS[client.frequencia_faturamento] ?? client.frequencia_faturamento;
    if (client.frequencia_faturamento === "semanal" && client.dia_da_semana_faturamento) {
      return `${freq} (toda ${client.dia_da_semana_faturamento})`;
    }
    if (client.frequencia_faturamento === "mensal" && client.dia_do_mes_faturamento) {
      return `${freq} (dia ${client.dia_do_mes_faturamento})`;
    }
    if (client.frequencia_faturamento === "por_entrega" && client.numero_de_entregas_para_faturamento) {
      return `${freq} (a cada ${client.numero_de_entregas_para_faturamento} entregas)`;
    }
    return freq;
  };

  return (
    <>
    <Dialog open={!!client} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 space-y-1">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-xl">Perfil de {client.nome}</DialogTitle>
            <DialogDescription>Visualize todas as informações e históricos do cliente.</DialogDescription>
          </DialogHeader>
        </div>

        {/* Metrics Bar */}
        <div className="px-6 grid grid-cols-3 gap-4 pb-4">
          <MiniMetric label="Solicitações" value={String(totalSolicitacoes)} />
          <MiniMetric label="Este mês" value={String(solicitacoesMes)} />
          <MiniMetric label="Total taxas" value={fmt(totalTaxas)} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="info" className="w-full">
          <div className="px-6 border-b border-border">
            <ScrollArea className="w-full">
              <TabsList className="bg-transparent h-auto p-0 gap-0 w-full justify-start">
                <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm">
                  Informações
                </TabsTrigger>
                <TabsTrigger value="solicitacoes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm">
                  Solicitações
                </TabsTrigger>
                <TabsTrigger value="fechamentos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm">
                  Fechamentos
                </TabsTrigger>
                {client.modalidade === "pre_pago" && (
                  <TabsTrigger value="recargas" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm">
                    Recargas
                  </TabsTrigger>
                )}
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          {/* Tab: Informações */}
          <TabsContent value="info" className="p-6 mt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card: Informações Cadastrais */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Informações Cadastrais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FieldItem label="Nome / Razão Social" value={client.nome} />
                    <FieldItem label="Email" value={client.email} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FieldItem label="Telefone" value={client.telefone} />
                    <FieldItem label="Endereço Principal" value={`${client.endereco}, ${client.bairro}, ${client.cidade} - ${client.uf}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FieldItem label="Chave Pix" value={client.chave_pix ?? "—"} />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <Badge variant={client.status === "ativo" ? "default" : "outline"} className={client.status === "ativo" ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                        {client.status === "ativo" ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </div>
                  <FieldItem label="Tipo" value={client.tipo === "pessoa_juridica" ? "Pessoa Jurídica" : "Pessoa Física"} />
                  <FieldItem label="Cadastrado em" value={createdDate} />
                </CardContent>
              </Card>

              {/* Card: Configuração Financeira */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Configuração Financeira</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Modalidade de Pagamento</p>
                      <Badge variant={client.modalidade === "faturado" ? "default" : "secondary"}>
                        {MODALIDADE_LABELS[client.modalidade]}
                      </Badge>
                    </div>
                    <FieldItem label="Fechamento de Fatura" value={getFrequenciaDesc()} />
                  </div>
                  {client.modalidade === "faturado" && (
                    <div className="grid grid-cols-2 gap-4">
                      <FieldItem label="Faturamento Automático" value={client.ativar_faturamento_automatico ? "Sim" : "Não"} />
                      {client.numero_de_entregas_para_faturamento && (
                        <FieldItem label="Nº entregas p/ faturar" value={String(client.numero_de_entregas_para_faturamento)} />
                      )}
                    </div>
                  )}
                  {saldoPrePago !== null && (
                    <div className="rounded-lg bg-muted/50 p-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Saldo Pré-Pago</span>
                      <span className={`text-base sm:text-lg font-bold tabular-nums ${saldoPrePago <= 100 ? "text-destructive" : "text-primary"}`}>
                        {saldoPrePago.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => onEdit(client)}>
                <Pencil className="h-4 w-4 mr-2" /> Editar Cliente
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { onClose(); navigate(`/admin/configuracoes?cliente=${client.id}`); }}
              >
                <ExternalLink className="h-4 w-4 mr-2" /> Ver Tabela de Preços
              </Button>
              {client.modalidade === "pre_pago" && (
                <Button size="sm" onClick={() => setRecargaOpen(true)}>
                  <DollarSign className="h-4 w-4 mr-2" /> Adicionar Recarga
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Tab: Solicitações */}
          <TabsContent value="solicitacoes" className="p-6 mt-0">
            {clientSolicitacoes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">Nenhuma solicitação encontrada</p>
                <p className="text-xs mt-1">As solicitações deste cliente aparecerão aqui.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground font-medium mb-3">Últimas 5 solicitações</p>
                {clientSolicitacoes.map((s) => {
                  const rotas = getRotasBySolicitacao(s.id);
                  return (
                    <div key={s.id} className="rounded-lg border border-border p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-muted-foreground">{s.codigo}</span>
                          <Badge variant={statusVariant(s.status)} className="text-xs">
                            {STATUS_SOLICITACAO_LABELS[s.status]}
                          </Badge>
                        </div>
                        <span className="font-medium tabular-nums text-sm">{fmt(s.valor_total_taxas)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{fmtDateTime(s.data_solicitacao)}</span>
                        <span>{rotas.length} rota(s)</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Entregador: <span className="text-foreground">{getEntregadorNome(s.entregador_id)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Tab: Fechamentos */}
          <TabsContent value="fechamentos" className="p-6 mt-0">
            {faturas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">Nenhum fechamento encontrado</p>
                <p className="text-xs mt-1">Os fechamentos/faturas deste cliente aparecerão aqui.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground font-medium mb-3">Fechamentos recentes</p>
                {faturas.map((f) => (
                  <div key={f.id} className="rounded-lg border border-border p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{f.numero}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fmtDateTime(f.data_emissao).split(",")[0]} — {fmtDateTime(f.data_vencimento).split(",")[0]}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className="font-medium tabular-nums text-sm">{fmt(f.saldo_liquido)}</span>
                      <Badge variant={STATUS_GERAL_VARIANT[f.status_geral] ?? "outline"}>
                        {f.status_geral}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Recargas */}
          {client.modalidade === "pre_pago" && (
            <TabsContent value="recargas" className="p-6 mt-0">
              {/* Resumo */}
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-base sm:text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {recargas.reduce((s, r) => s + r.valor, 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Recargas</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-base sm:text-lg font-bold tabular-nums">{recargas.length}</p>
                  <p className="text-xs text-muted-foreground">Recargas Realizadas</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className={`text-base sm:text-lg font-bold tabular-nums ${(saldoPrePago ?? 0) <= 100 ? "text-destructive" : "text-primary"}`}>
                    {(saldoPrePago ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                  <p className="text-xs text-muted-foreground">Saldo Atual</p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground font-medium">Histórico de Recargas</p>
                <div className="flex items-center gap-2">
                  {recargas.length > 0 && (
                    <ExportDropdown
                      onExportExcel={() => {
                        const sorted = [...recargas].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                        exportCSV({
                          title: `Recargas - ${client.nome}`,
                          headers: ["Data", "Valor", "Observação", "Registrado por"],
                          rows: sorted.map((r) => [
                            new Date(r.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
                            r.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                            r.observacao ?? "",
                            r.registrado_por_id ?? "",
                          ]),
                          filename: `recargas_${client.nome.replace(/\s+/g, "_").toLowerCase()}`,
                        });
                      }}
                      onExportPDF={() => {
                        const sorted = [...recargas].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                        exportPDF({
                          title: `Recargas - ${client.nome}`,
                          subtitle: `Saldo atual: ${(saldoPrePago ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
                          headers: ["Data", "Valor", "Observação", "Registrado por"],
                          rows: sorted.map((r) => [
                            new Date(r.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
                            r.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
                            r.observacao ?? "",
                            r.registrado_por_id ?? "",
                          ]),
                          filename: `recargas_${client.nome.replace(/\s+/g, "_").toLowerCase()}`,
                        });
                      }}
                    />
                  )}
                  <Button size="sm" onClick={() => setRecargaOpen(true)}>
                    <DollarSign className="h-4 w-4 mr-2" /> Nova Recarga
                  </Button>
                </div>
              </div>
              {recargas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Wallet className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium">Nenhuma recarga registrada</p>
                  <p className="text-xs mt-1">As recargas de saldo pré-pago aparecerão aqui.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const sorted = [...recargas].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                    const totalPages = Math.ceil(sorted.length / recargaPerPage);
                    const paginated = sorted.slice((recargaPage - 1) * recargaPerPage, recargaPage * recargaPerPage);
                    return (
                      <>
                        {paginated.map((r) => (
                          <div key={r.id} className="rounded-lg border border-border p-4 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm text-emerald-600 dark:text-emerald-400">
                                + {r.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">{r.observacao}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Por: {r.registrado_por_id} • {new Date(r.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                              </p>
                            </div>
                            <Badge variant="secondary">Crédito</Badge>
                          </div>
                        ))}
                        {sorted.length > recargaPerPage && (
                          <div className="flex items-center justify-between pt-3 border-t border-border">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Exibir</span>
                              <select
                                value={recargaPerPage}
                                onChange={(e) => { setRecargaPerPage(Number(e.target.value)); setRecargaPage(1); }}
                                className="rounded border border-border bg-background px-2 py-1 text-xs"
                              >
                                {[10, 25, 50, 100].map((n) => (
                                  <option key={n} value={n}>{n}</option>
                                ))}
                              </select>
                              <span>por página</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" disabled={recargaPage <= 1} onClick={() => setRecargaPage((p) => p - 1)}>
                                Anterior
                              </Button>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {recargaPage} / {totalPages}
                              </span>
                              <Button variant="outline" size="sm" disabled={recargaPage >= totalPages} onClick={() => setRecargaPage((p) => p + 1)}>
                                Próxima
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
    {client.modalidade === "pre_pago" && (
      <RecargaSaldoDialog open={recargaOpen} onOpenChange={setRecargaOpen} cliente={client} />
    )}
    </>
  );
}

function FieldItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-3 rounded-lg bg-muted/50">
      <p className="text-base sm:text-lg font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

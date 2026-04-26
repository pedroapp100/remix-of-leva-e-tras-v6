import type { Entregador } from "@/types/database";
import { TIPO_VEICULO_LABELS } from "@/types/database";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Package, CheckCircle2, Clock, TrendingUp, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { AvatarWithFallback } from "@/components/shared";
import { useMemo } from "react";
import { useSolicitacoesByEntregador } from "@/hooks/useSolicitacoes";
import { useComissao } from "@/hooks/useComissao";
import { useComissaoFaixas, calcularProgressoFaixa } from "@/hooks/useComissaoFaixas";
import { formatCurrency } from "@/lib/formatters";

interface EntregadorProfileModalProps {
  entregador: Entregador | null;
  onClose: () => void;
  onEdit: (e: Entregador) => void;
}

const fmt = (v: number | null | undefined) =>
  v != null ? formatCurrency(v) : "—";

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  aceita: "Aceita",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
  rejeitada: "Rejeitada",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  concluida: "default",
  pendente: "secondary",
  aceita: "secondary",
  em_andamento: "outline",
  cancelada: "destructive",
  rejeitada: "destructive",
};

export function EntregadorProfileModal({ entregador, onClose, onEdit }: EntregadorProfileModalProps) {
  const { data: solicitacoes = [] } = useSolicitacoesByEntregador(entregador?.id ?? "");
  const comissao = useComissao(entregador?.id ?? null);
  const { data: faixas = [] } = useComissaoFaixas(
    entregador?.tipo_comissao === "meta" ? entregador.id : null
  );

  const progresso = useMemo(() => {
    if (comissao?.tipo_comissao !== "meta" || !comissao.faixas?.length) return null;
    return calcularProgressoFaixa(comissao.entregas, comissao.faixas);
  }, [comissao]);

  if (!entregador) return null;

  const concluidas = solicitacoes.filter((s) => s.status === "concluida").length;
  const emAndamento = solicitacoes.filter((s) => s.status === "em_andamento" || s.status === "aceita").length;

  const ultimasSolicitacoes = [...solicitacoes]
    .sort((a, b) => new Date(b.data_solicitacao).getTime() - new Date(a.data_solicitacao).getTime())
    .slice(0, 5);

  const tipoComissaoLabel =
    entregador.tipo_comissao === "percentual"
      ? `${entregador.valor_comissao}%`
      : entregador.tipo_comissao === "fixo"
      ? fmt(entregador.valor_comissao)
      : entregador.meta_modo_calculo === "escalonado"
      ? "Meta (Escalonado)"
      : "Meta (Faixa Máxima)";

  return (
    <Dialog open={!!entregador} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 space-y-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <AvatarWithFallback
                src={entregador.avatar ?? undefined}
                name={entregador.nome}
                className="h-14 w-14 text-lg"
              />
              <div>
                <DialogTitle className="text-base sm:text-xl font-semibold">{entregador.nome}</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">{entregador.email}</DialogDescription>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={entregador.status === "ativo" ? "default" : "secondary"}>
                    {entregador.status === "ativo" ? "Ativo" : "Inativo"}
                  </Badge>
                  <Badge variant="outline">{TIPO_VEICULO_LABELS[entregador.veiculo] ?? entregador.veiculo}</Badge>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => onEdit(entregador)} className="shrink-0">
              <Pencil className="h-4 w-4 mr-2" /> Editar
            </Button>
          </div>
        </DialogHeader>

        <Separator />

        <div className="px-6 py-4 space-y-5">
          {/* Métricas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <Package className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-xl sm:text-2xl font-bold">{solicitacoes.length}</p>
                <p className="text-xs text-muted-foreground">Total entregas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <CheckCircle2 className="h-5 w-5 mx-auto text-green-500 mb-1" />
                <p className="text-xl sm:text-2xl font-bold">{concluidas}</p>
                <p className="text-xs text-muted-foreground">Concluídas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <Clock className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
                <p className="text-xl sm:text-2xl font-bold">{emAndamento}</p>
                <p className="text-xs text-muted-foreground">Em andamento</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <TrendingUp className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                <p className="text-xl sm:text-2xl font-bold">{fmt(comissao?.comissao)}</p>
                <p className="text-xs text-muted-foreground">Comissão total</p>
              </CardContent>
            </Card>
          </div>

          {/* Dados Cadastrais */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Dados Cadastrais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">CPF/CNPJ:</span><span className="font-medium ml-1">{entregador.documento || "—"}</span></div>
              <div><span className="text-muted-foreground">Telefone:</span><span className="font-medium ml-1">{entregador.telefone || "—"}</span></div>
              <div><span className="text-muted-foreground">Cidade:</span><span className="font-medium ml-1">{entregador.cidade || "—"}</span></div>
              <div><span className="text-muted-foreground">Bairro:</span><span className="font-medium ml-1">{entregador.bairro || "—"}</span></div>
              <div><span className="text-muted-foreground">Veículo:</span><span className="font-medium ml-1">{TIPO_VEICULO_LABELS[entregador.veiculo] ?? entregador.veiculo}</span></div>
              <div>
                <span className="text-muted-foreground">Comissão:</span>
                <span className="font-medium ml-1">
                  {tipoComissaoLabel}
                  {entregador.tipo_comissao !== "meta" && (
                    <span className="text-muted-foreground ml-1">({entregador.tipo_comissao === "percentual" ? "%" : "fixo"})</span>
                  )}
                </span>
              </div>
              <div><span className="text-muted-foreground">Cadastrado em:</span><span className="font-medium ml-1">{fmtDate(entregador.created_at)}</span></div>
            </div>

            {/* Progresso de meta — mês atual */}
            {entregador.tipo_comissao === "meta" && comissao && (
              <div className="mt-4 rounded-lg border border-border p-3 space-y-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Progresso do Mês Atual</p>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entregas concluídas</span>
                  <span className="font-bold tabular-nums">{comissao.entregas}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Comissão acumulada</span>
                  <span className="font-semibold tabular-nums text-emerald-500">{fmt(comissao.comissao)}</span>
                </div>
                {progresso && (
                  <>
                    {progresso.faixaAtual && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Faixa atual</span>
                        <span className="font-medium tabular-nums">
                          {progresso.faixaAtual.de}–{progresso.faixaAtual.ate} entregas · {fmt(progresso.faixaAtual.valor_por_entrega)}/entrega
                        </span>
                      </div>
                    )}
                    {progresso.proximaFaixa ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Próxima faixa em</span>
                          <span className="font-medium tabular-nums text-primary">
                            +{progresso.entregasFaltam} entrega{progresso.entregasFaltam !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <Progress value={progresso.percentualProxima} className="h-2" />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{progresso.faixaAtual?.de ?? 0} entregas</span>
                          <span>{progresso.proximaFaixa.de} entregas</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-500 font-medium">✓ Faixa máxima atingida!</p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Faixas de comissão meta */}
            {entregador.tipo_comissao === "meta" && faixas.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Faixas configuradas:</p>
                <div className="space-y-1">
                  {[...faixas].sort((a, b) => a.de - b.de).map((f) => (
                    <div key={f.id} className="flex items-center justify-between text-xs rounded-md bg-muted/50 px-2 py-1">
                      <span className="text-muted-foreground">{f.de} – {f.ate} entregas</span>
                      <span className="font-medium tabular-nums">{formatCurrency(f.valor_por_entrega)}/entrega</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Últimas entregas */}
          {ultimasSolicitacoes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Últimas Entregas</h3>
              <div className="space-y-2">
                {ultimasSolicitacoes.map((s) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">#{s.codigo}</span>
                      <span className="text-muted-foreground ml-2">{new Date(s.data_solicitacao).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <Badge variant={STATUS_VARIANT[s.status] ?? "outline"}>
                      {STATUS_LABEL[s.status] ?? s.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

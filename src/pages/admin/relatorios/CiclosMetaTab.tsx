import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useEntregadoresAtivos } from "@/hooks/useEntregadores";
import { useFecharCicloManual } from "@/hooks/useComissaoFaixas";
import type { CicloComissaoMeta } from "@/types/database";
import { DataTable } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/lib/formatters";
import { CalendarClock, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type CicloRow = CicloComissaoMeta & { entregador_nome?: string };

function useAllCiclosComissaoMeta() {
  return useQuery<CicloRow[]>({
    queryKey: ["ciclos_comissao_meta_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ciclos_comissao_meta")
        .select("*, entregadores(nome)")
        .order("mes_referencia", { ascending: false })
        .order("fechado_em", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((c: CicloRow & { entregadores?: { nome: string } }) => ({
        ...c,
        entregador_nome: (c as { entregadores?: { nome: string } }).entregadores?.nome ?? "—",
      }));
    },
  });
}

function fmtMes(mes: string) {
  const [ano, m] = mes.split("-");
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${meses[parseInt(m, 10) - 1]} ${ano}`;
}

export function CiclosMetaTab() {
  const { data: ciclos = [], isLoading } = useAllCiclosComissaoMeta();
  const { data: entregadores = [] } = useEntregadoresAtivos();
  const { mutateAsync: fecharCiclo, isPending } = useFecharCicloManual();

  const [entregadorFilter, setEntregadorFilter] = useState("todos");
  const [mesFilter, setMesFilter] = useState("todos");

  const mesesDisponiveis = useMemo(() => {
    const set = new Set(ciclos.map((c) => c.mes_referencia));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [ciclos]);

  const filtered = useMemo(() => {
    return ciclos.filter((c) => {
      if (entregadorFilter !== "todos" && c.entregador_id !== entregadorFilter) return false;
      if (mesFilter !== "todos" && c.mes_referencia !== mesFilter) return false;
      return true;
    });
  }, [ciclos, entregadorFilter, mesFilter]);

  const totalComissao = filtered.reduce((s, c) => s + c.comissao_calculada, 0);

  const columns: Column<CicloRow>[] = [
    {
      key: "entregador_nome",
      header: "Entregador",
      sortable: true,
      cell: (c) => <span className="font-medium">{c.entregador_nome}</span>,
    },
    {
      key: "mes_referencia",
      header: "Mês",
      sortable: true,
      cell: (c) => <span className="tabular-nums">{fmtMes(c.mes_referencia)}</span>,
    },
    {
      key: "total_entregas",
      header: "Entregas",
      sortable: true,
      cell: (c) => <span className="tabular-nums">{c.total_entregas}</span>,
    },
    {
      key: "meta_modo_calculo",
      header: "Modo",
      cell: (c) => (
        <Badge variant="outline" className="text-xs">
          {c.meta_modo_calculo === "escalonado" ? "Escalonado" : "Faixa Máx."}
        </Badge>
      ),
    },
    {
      key: "comissao_calculada",
      header: "Comissão",
      sortable: true,
      cell: (c) => (
        <span className="font-semibold tabular-nums text-emerald-500">
          {formatCurrency(c.comissao_calculada)}
        </span>
      ),
    },
    {
      key: "criado_por",
      header: "Origem",
      cell: (c) => (
        <Badge variant={c.criado_por === "manual" ? "secondary" : "outline"} className="text-xs">
          {c.criado_por === "manual" ? "Manual" : "Automático"}
        </Badge>
      ),
    },
    {
      key: "fechado_em",
      header: "Fechado em",
      sortable: true,
      cell: (c) => (
        <span className="tabular-nums text-muted-foreground text-xs">
          {new Date(c.fechado_em).toLocaleDateString("pt-BR")}
        </span>
      ),
    },
  ];

  const renderMobileCard = (c: CicloRow) => (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium">{c.entregador_nome}</span>
        <span className="font-semibold tabular-nums text-emerald-500">{formatCurrency(c.comissao_calculada)}</span>
      </div>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{fmtMes(c.mes_referencia)} · {c.total_entregas} entregas</span>
        <Badge variant="outline" className="text-xs">
          {c.meta_modo_calculo === "escalonado" ? "Esc." : "Fx."}
        </Badge>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Fechado em {new Date(c.fechado_em).toLocaleDateString("pt-BR")}</span>
        <Badge variant={c.criado_por === "manual" ? "secondary" : "outline"} className="text-xs">
          {c.criado_por === "manual" ? "Manual" : "Auto"}
        </Badge>
      </div>
    </Card>
  );

  const handleFecharCiclo = async () => {
    try {
      await fecharCiclo();
      toast.success("Ciclos fechados com sucesso! Os entregadores com comissão por meta do mês atual foram processados.");
    } catch (err) {
      toast.error("Erro ao fechar ciclos: " + (err instanceof Error ? err.message : "Tente novamente."));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header com resumo e botão */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            Ciclos exibidos: <strong className="text-foreground">{filtered.length}</strong>
          </span>
          <span>
            Total comissões:{" "}
            <strong className="text-emerald-500">{formatCurrency(totalComissao)}</strong>
          </span>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 shrink-0">
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Fechar Ciclo Manualmente
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-orange-500" />
                Fechar Ciclos do Mês Atual
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá calcular e registrar a comissão de <strong>todos</strong> os
                entregadores com tipo "Por Meta" para o mês atual. Ciclos já fechados para o
                mesmo mês não serão duplicados.
                <br /><br />
                Normalmente isso ocorre automaticamente no dia 1 de cada mês. Use esta opção
                para forçar o fechamento antes da data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleFecharCiclo} disabled={isPending}>
                {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirmar Fechamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <Select value={entregadorFilter} onValueChange={setEntregadorFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Todos os entregadores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os entregadores</SelectItem>
            {entregadores.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={mesFilter} onValueChange={setMesFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Todos os meses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os meses</SelectItem>
            {mesesDisponiveis.map((m) => (
              <SelectItem key={m} value={m}>
                {fmtMes(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Aviso se sem entregadores com meta */}
      {!isLoading && ciclos.length === 0 && (
        <div className="py-12 text-center text-muted-foreground space-y-2">
          <CalendarClock className="h-10 w-10 mx-auto opacity-40" />
          <p className="font-medium">Nenhum ciclo fechado ainda</p>
          <p className="text-sm">
            Os ciclos são gerados automaticamente no dia 1 de cada mês para entregadores com
            comissão do tipo "Por Meta". Você pode forçar o fechamento clicando em "Fechar
            Ciclo Manualmente".
          </p>
        </div>
      )}

      {(isLoading || ciclos.length > 0) && (
        <DataTable
          data={filtered}
          columns={columns}
          pageSize={15}
          renderMobileCard={renderMobileCard}
          emptyTitle="Nenhum ciclo encontrado"
          emptySubtitle="Tente ajustar os filtros."
        />
      )}
    </div>
  );
}

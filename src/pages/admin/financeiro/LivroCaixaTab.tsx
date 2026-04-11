import { useState, useMemo } from "react";
import { DataTable, SearchInput } from "@/components/shared";
import type { Column } from "@/components/shared/DataTable";
import type { LivroCaixaEntry } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDateBR } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LivroCaixaTabProps {
  entries: LivroCaixaEntry[];
}

export function LivroCaixaTab({ entries }: LivroCaixaTabProps) {
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [categoriaFilter, setCategoriaFilter] = useState("todos");

  const categorias = useMemo(() => [...new Set(entries.map((e) => e.categoria))].sort(), [entries]);

  const filtered = entries.filter(
    (e) => {
      const matchSearch = e.descricao.toLowerCase().includes(search.toLowerCase()) ||
        e.categoria.toLowerCase().includes(search.toLowerCase());
      const matchTipo = tipoFilter === "todos" || e.tipo === tipoFilter;
      const matchCategoria = categoriaFilter === "todos" || e.categoria === categoriaFilter;
      return matchSearch && matchTipo && matchCategoria;
    }
  );

  const columns: Column<LivroCaixaEntry>[] = [
    { key: "data", header: "Data", sortable: true, cell: (e) => <span className="text-sm">{formatDateBR(e.data)}</span> },
    {
      key: "tipo", header: "Tipo",
      cell: (e) => (
        <Badge variant={e.tipo === "entrada" ? "default" : "destructive"} className="gap-1 text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
          {e.tipo === "entrada" ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
          {e.tipo === "entrada" ? "Entrada" : "Saída"}
        </Badge>
      ),
    },
    { key: "descricao", header: "Descrição", sortable: true, cell: (e) => <span className="font-medium">{e.descricao}</span> },
    { key: "categoria", header: "Categoria", cell: (e) => <Badge variant="outline" className="text-xs">{e.categoria}</Badge> },
    {
      key: "valor", header: "Valor", sortable: true,
      cell: (e) => (
        <span className={cn("font-semibold tabular-nums", e.tipo === "entrada" ? "text-primary" : "text-destructive")}>
          {e.tipo === "saida" ? "- " : "+ "}{formatCurrency(e.valor)}
        </span>
      ),
    },
    {
      key: "saldo_acumulado", header: "Saldo Acum.", sortable: true,
      cell: (e) => (
        <span className={cn("font-semibold tabular-nums", e.saldo_acumulado >= 0 ? "text-foreground" : "text-destructive")}>
          {formatCurrency(e.saldo_acumulado)}
        </span>
      ),
    },
  ];

  const renderMobileCard = (e: LivroCaixaEntry) => (
    <Card className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="gap-1 text-xs bg-primary/10 text-primary border-primary/20">
          {e.tipo === "entrada" ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
          {e.tipo === "entrada" ? "Entrada" : "Saída"}
        </Badge>
        <span className="text-xs text-muted-foreground">{formatDateBR(e.data)}</span>
      </div>
      <p className="font-medium text-sm">{e.descricao}</p>
      <div className="flex justify-between text-sm">
        <span className={cn("font-semibold tabular-nums", e.tipo === "entrada" ? "text-primary" : "text-destructive")}>
          {e.tipo === "saida" ? "- " : "+ "}{formatCurrency(e.valor)}
        </span>
        <span className={cn("tabular-nums", e.saldo_acumulado >= 0 ? "text-foreground" : "text-destructive")}>
          Saldo: {formatCurrency(e.saldo_acumulado)}
        </span>
      </div>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar no livro caixa..." className="flex-1 min-w-[200px]" />
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="entrada">Entrada</SelectItem>
            <SelectItem value="saida">Saída</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || tipoFilter !== "todos" || categoriaFilter !== "todos") && (
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => { setSearch(""); setTipoFilter("todos"); setCategoriaFilter("todos"); }}>
            <X className="h-3.5 w-3.5" /> Limpar filtros
          </Button>
        )}
      </div>
      <DataTable
        data={filtered}
        columns={columns}
        pageSize={15}
        renderMobileCard={renderMobileCard}
        emptyTitle="Nenhum lançamento encontrado"
        emptySubtitle="O livro caixa mostra todas as entradas e saídas consolidadas."
      />
    </div>
  );
}

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  pageSizeOptions?: number[];
  loading?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onRowClick?: (row: T) => void;
  renderMobileCard?: (row: T, index: number) => React.ReactNode;
  className?: string;
}

type SortDirection = "asc" | "desc" | null;

const PAGE_SIZE_OPTIONS_DEFAULT = [10, 25, 50, 100];

export function DataTable<T extends { id?: string }>({
  data,
  columns,
  pageSize: initialPageSize = 10,
  pageSizeOptions = PAGE_SIZE_OPTIONS_DEFAULT,
  loading = false,
  emptyTitle = "Nenhum registro encontrado",
  emptySubtitle,
  emptyActionLabel,
  onEmptyAction,
  onRowClick,
  renderMobileCard,
  className,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [currentPageSize, setCurrentPageSize] = useState(initialPageSize);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);
  const isMobile = useIsMobile();

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = String(aVal).localeCompare(String(bVal), "pt-BR", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.ceil(sortedData.length / currentPageSize);
  const pagedData = sortedData.slice(page * currentPageSize, (page + 1) * currentPageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortKey(null); setSortDir(null); }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  if (loading) {
    return <LoadingSkeleton type="table" rows={5} columns={columns.length} className={className} />;
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        subtitle={emptySubtitle}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
        className={className}
      />
    );
  }

  const showMobileCards = isMobile && renderMobileCard;

  return (
    <div className={cn("space-y-3", className)}>
      {showMobileCards ? (
        <div className="space-y-3">
          {pagedData.map((row, i) => (
            <div
              key={(row as Record<string, unknown>).id as string || i}
              onClick={() => onRowClick?.(row)}
              className={cn(onRowClick && "cursor-pointer")}
            >
              {renderMobileCard(row, page * currentPageSize + i)}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-transparent hover:bg-transparent">
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "h-12 px-4 text-base font-semibold text-foreground/70",
                      col.sortable && "cursor-pointer select-none hover:text-foreground transition-colors duration-200",
                      col.className
                    )}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className={cn("flex items-center gap-1.5", col.className?.includes("text-center") && "justify-center")}>
                      {col.header}
                      {col.sortable && (
                        sortKey === col.key ? (
                          sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                        )
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedData.map((row, i) => (
                <TableRow
                  key={(row as Record<string, unknown>).id as string || i}
                  className={cn(
                    "border-b border-border/50 hover:bg-muted/30 transition-colors duration-200",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={cn("h-14 px-4 text-base", col.className)}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Exibir</span>
          <Select
            value={String(currentPageSize)}
            onValueChange={(v) => {
              setCurrentPageSize(Number(v));
              setPage(0);
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>por página</span>
          <span className="ml-2 hidden sm:inline">
            — {page * currentPageSize + 1}–{Math.min((page + 1) * currentPageSize, sortedData.length)} de {sortedData.length}
          </span>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 tabular-nums">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

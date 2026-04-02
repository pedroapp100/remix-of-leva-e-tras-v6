import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportDropdownProps {
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  loading?: boolean;
}

export function ExportDropdown({ onExportPDF, onExportExcel, loading = false }: ExportDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={loading}>
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl">
        {onExportPDF && (
          <DropdownMenuItem onClick={onExportPDF} className="gap-2 cursor-pointer rounded-lg">
            <FileText className="h-4 w-4 text-destructive" />
            Exportar PDF
          </DropdownMenuItem>
        )}
        {onExportExcel && (
          <DropdownMenuItem onClick={onExportExcel} className="gap-2 cursor-pointer rounded-lg">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Exportar Excel
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

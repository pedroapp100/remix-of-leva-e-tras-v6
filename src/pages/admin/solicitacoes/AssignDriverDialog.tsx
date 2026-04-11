import type { Entregador } from "@/types/database";
import { useEntregadores } from "@/hooks/useEntregadores";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AvatarWithFallback } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { TIPO_VEICULO_LABELS } from "@/types/database";

interface AssignDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (entregadorId: string) => void;
  excludeEntregadorId?: string | null;
}

export function AssignDriverDialog({ open, onOpenChange, onAssign, excludeEntregadorId }: AssignDriverDialogProps) {
  const { data: entregadoresData = [] } = useEntregadores();
  const ativos = entregadoresData.filter((e) => e.status === "ativo" && e.id !== excludeEntregadorId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Atribuir Entregador</DialogTitle>
        <DialogDescription className="sr-only">.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {ativos.map((e) => (
            <button
              key={e.id}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent transition-colors duration-200 text-left"
              onClick={() => { onAssign(e.id); onOpenChange(false); }}
            >
              <AvatarWithFallback name={e.nome} className="h-10 w-10" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{e.nome}</p>
                <p className="text-sm text-muted-foreground">{e.telefone}</p>
              </div>
              <Badge variant="outline">{TIPO_VEICULO_LABELS[e.veiculo]}</Badge>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

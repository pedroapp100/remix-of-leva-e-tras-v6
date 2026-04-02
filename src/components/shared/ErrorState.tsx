import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  message = "Ocorreu um erro ao carregar os dados.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center", className)}>
      <div className="h-14 w-14 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
        <AlertCircle className="h-7 w-7 text-destructive" />
      </div>
      <h3 className="text-base font-semibold tracking-tight mb-1">Erro</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="mt-4 gap-2" size="sm">
          <RefreshCw className="h-3.5 w-3.5" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

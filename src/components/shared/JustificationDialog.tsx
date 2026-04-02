import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface JustificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  minLength?: number;
  loading?: boolean;
  onConfirm: (justification: string) => void;
}

export function JustificationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  minLength = 10,
  loading = false,
  onConfirm,
}: JustificationDialogProps) {
  const [text, setText] = useState("");
  const isValid = text.trim().length >= minLength;

  const handleConfirm = () => {
    if (isValid) {
      onConfirm(text.trim());
      setText("");
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) setText("");
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="justification">Justificativa</Label>
          <Textarea
            id="justification"
            placeholder={`Mínimo ${minLength} caracteres...`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            {text.trim().length}/{minLength} caracteres mínimos
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid || loading}>
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value?: number;
  onChange?: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/** Format a value in BRL reais (e.g. 8.5 → "R$ 8,50") */
function formatCurrency(reais: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(reais);
}

/** Parse display string to cents integer, then convert to reais */
function parseToReais(str: string): number {
  const cents = parseInt(str.replace(/\D/g, "") || "0", 10);
  return Math.round(cents) / 100;
}

export function CurrencyInput({
  value = 0,
  onChange,
  placeholder = "R$ 0,00",
  disabled = false,
  className,
  id,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(
    value > 0 ? formatCurrency(value) : ""
  );

  // Sync display when external value changes
  useEffect(() => {
    setDisplayValue(value > 0 ? formatCurrency(value) : "");
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const reais = parseToReais(raw);
      setDisplayValue(reais > 0 ? formatCurrency(reais) : "");
      onChange?.(reais);
    },
    [onChange]
  );

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      disabled={disabled}
      className={cn("tabular-nums", className)}
    />
  );
}

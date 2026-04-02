import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

function formatPhone(digits: string): string {
  const clean = digits.replace(/\D/g, "").slice(0, 11);
  if (clean.length <= 2) return clean.length > 0 ? `(${clean}` : "";
  if (clean.length <= 7) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
}

export function PhoneInput({
  value = "",
  onChange,
  placeholder = "(99) 99999-9999",
  disabled = false,
  className,
  id,
}: PhoneInputProps) {
  const [displayValue, setDisplayValue] = useState(formatPhone(value));

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const digits = raw.replace(/\D/g, "").slice(0, 11);
      const formatted = formatPhone(digits);
      setDisplayValue(formatted);
      onChange?.(digits);
    },
    [onChange]
  );

  return (
    <Input
      id={id}
      type="tel"
      inputMode="numeric"
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      disabled={disabled}
      className={cn("tabular-nums", className)}
    />
  );
}

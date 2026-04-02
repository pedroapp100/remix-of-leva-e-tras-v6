import { useState, useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  debounceMs?: number;
  className?: string;
}

export function SearchInput({
  placeholder = "Buscar...",
  value: controlledValue,
  onChange,
  debounceMs = 300,
  className,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(controlledValue || "");
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const displayValue = controlledValue !== undefined ? controlledValue : internalValue;

  const handleChange = useCallback(
    (newValue: string) => {
      setInternalValue(newValue);
      if (timer) clearTimeout(timer);
      const newTimer = setTimeout(() => {
        onChange?.(newValue);
      }, debounceMs);
      setTimer(newTimer);
    },
    [onChange, debounceMs, timer]
  );

  const handleClear = () => {
    setInternalValue("");
    onChange?.("");
  };

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={displayValue}
        onChange={(e) => handleChange(e.target.value)}
        className="pl-9 pr-8 h-9"
      />
      {displayValue && (
        <button
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

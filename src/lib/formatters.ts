// =============================================================================
// FORMATADORES — LEVA E TRAZ v2.0
// =============================================================================

/**
 * Formata valor em BRL: R$ 1.234,56
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Formata telefone: (99) 99999-9999
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

/**
 * Formata CPF: 000.000.000-00
 */
export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, "");
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

/**
 * Formata CNPJ: 00.000.000/0000-00
 */
export function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

/**
 * Máscara de input para CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00)
 * baseada na quantidade de dígitos digitada.
 */
export function maskDocumento(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

/**
 * Formata data no padrão BR: dd/mm/aaaa
 */
export function formatDateBR(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR");
}

/**
 * Formata data e hora: dd/mm/aaaa HH:mm
 */
export function formatDateTimeBR(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Retorna iniciais do nome (máx 2 letras)
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

// ── Fatura label maps ────────────────────────────────────────────────────────

import type { StatusGeral } from "@/types/database";

export const TIPO_FATURAMENTO_LABELS: Record<string, string> = {
  por_entrega: "Por Entrega",
  semanal: "Semanal",
  mensal: "Mensal",
  diario: "Diário",
  manual: "Manual",
};

export const STATUS_GERAL_VARIANT: Record<StatusGeral, "default" | "secondary" | "outline" | "destructive"> = {
  Aberta: "outline",
  Fechada: "secondary",
  Paga: "default",
  Finalizada: "default",
  Vencida: "destructive",
};

export const STATUS_DESPESA_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Pendente: "outline",
  Pago: "default",
  Atrasado: "destructive",
};

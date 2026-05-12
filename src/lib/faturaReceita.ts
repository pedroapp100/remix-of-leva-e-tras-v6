/**
 * lib/faturaReceita.ts
 * Pure logic for building a ReceitaInsert from a Fatura repasse/pagamento.
 * No React dependencies — safe to use and test in isolation.
 */
import type { ReceitaInsert } from "@/services/financeiro";

export interface FaturaReceitaInput {
  faturaId: string;
  faturaNumero: string;
  clienteId: string | null | undefined;
  valor: number;
  /** 'repasse' = empresa repassa para a loja (saldo > 0 cenário)
   *  'pagamento' = loja paga para a empresa (saldo < 0 cenário) */
  tipo: "repasse" | "pagamento";
  formaPagamento?: string;
  observacao?: string;
  categoriaId?: string | null;
}

/**
 * Builds a ReceitaInsert payload from a fatura payment/repasse event.
 * Returns null when the input is invalid (valor <= 0).
 */
export function buildReceitaFromFatura(input: FaturaReceitaInput): ReceitaInsert | null {
  if (input.valor <= 0) return null;

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const tipoLabel = input.tipo === "repasse" ? "Taxas de Serviço" : "Pagamento";
  const descricao = `${tipoLabel} — Fatura ${input.faturaNumero}${input.formaPagamento ? ` via ${input.formaPagamento}` : ""}`;

  const payload: ReceitaInsert = {
    descricao,
    valor: input.valor,
    data_recebimento: today,
    cliente_id: input.clienteId ?? null,
    categoria_id: input.categoriaId ?? null,
    observacao: input.observacao
      ? `Fatura ${input.faturaNumero}: ${input.observacao}`
      : `Fatura ${input.faturaNumero}`,
  };

  return payload;
}

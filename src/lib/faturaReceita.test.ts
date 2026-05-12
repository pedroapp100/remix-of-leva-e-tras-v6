import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildReceitaFromFatura } from "./faturaReceita";
import type { FaturaReceitaInput } from "./faturaReceita";

// Mock @/services/financeiro so the module resolves in test env
vi.mock("@/services/financeiro", () => ({}));

const BASE_REPASSE: FaturaReceitaInput = {
  faturaId: "fatura-001",
  faturaNumero: "F-2026-001",
  clienteId: "cliente-abc",
  valor: 150,
  tipo: "repasse",
};

const BASE_PAGAMENTO: FaturaReceitaInput = {
  faturaId: "fatura-002",
  faturaNumero: "F-2026-002",
  clienteId: "cliente-xyz",
  valor: 75,
  tipo: "pagamento",
};

describe("buildReceitaFromFatura", () => {
  it("returns null when valor is zero", () => {
    expect(buildReceitaFromFatura({ ...BASE_REPASSE, valor: 0 })).toBeNull();
  });

  it("returns null when valor is negative", () => {
    expect(buildReceitaFromFatura({ ...BASE_REPASSE, valor: -10 })).toBeNull();
  });

  it("repasse: builds payload with correct valor and descricao", () => {
    const result = buildReceitaFromFatura(BASE_REPASSE);
    expect(result).not.toBeNull();
    expect(result!.valor).toBe(150);
    expect(result!.descricao).toContain("Taxas de Serviço");
    expect(result!.descricao).toContain("F-2026-001");
  });

  it("pagamento: builds payload with correct valor and descricao", () => {
    const result = buildReceitaFromFatura(BASE_PAGAMENTO);
    expect(result).not.toBeNull();
    expect(result!.valor).toBe(75);
    expect(result!.descricao).toContain("Pagamento");
    expect(result!.descricao).toContain("F-2026-002");
  });

  it("includes formaPagamento in descricao when provided", () => {
    const result = buildReceitaFromFatura({ ...BASE_REPASSE, formaPagamento: "PIX" });
    expect(result!.descricao).toContain("PIX");
  });

  it("sets cliente_id from input", () => {
    const result = buildReceitaFromFatura(BASE_REPASSE);
    expect(result!.cliente_id).toBe("cliente-abc");
  });

  it("sets cliente_id to null when not provided", () => {
    const result = buildReceitaFromFatura({ ...BASE_REPASSE, clienteId: undefined });
    expect(result!.cliente_id).toBeNull();
  });

  it("includes observacao prefixed with fatura number", () => {
    const result = buildReceitaFromFatura({ ...BASE_REPASSE, observacao: "Pagamento parcial" });
    expect(result!.observacao).toContain("Pagamento parcial");
    expect(result!.observacao).toContain("F-2026-001");
  });

  it("sets categoria_id when provided", () => {
    const result = buildReceitaFromFatura({ ...BASE_REPASSE, categoriaId: "cat-123" });
    expect(result!.categoria_id).toBe("cat-123");
  });

  it("data_recebimento is today in YYYY-MM-DD format", () => {
    const result = buildReceitaFromFatura(BASE_REPASSE);
    expect(result!.data_recebimento).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

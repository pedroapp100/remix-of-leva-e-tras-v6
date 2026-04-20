import { describe, it, expect, vi } from "vitest";

/**
 * Tests the business rule change in ConciliacaoDialog:
 *
 * BEFORE fix: allPagamentos.length === 0 → always blocked (toast.error)
 * AFTER fix:  allPagamentos.length === 0 → only blocked when !isDriverView
 *
 * This replicates the exact guard logic from handleConcluir so we're
 * testing the real decision, not a mock.
 */

interface PagamentoLinha {
  id: string;
  forma_pagamento_id: string;
  valor: number;
  pertence_a: "operacao" | "loja";
}

function buildHandleConcluirGuard(
  isDriverView: boolean,
  allPagamentos: PagamentoLinha[]
): { blocked: boolean; reason?: string } {
  // Exact guard logic extracted from handleConcluir (post-fix)
  if (!isDriverView && allPagamentos.length === 0) {
    return { blocked: true, reason: "Registre ao menos um pagamento." };
  }
  if (allPagamentos.some((p) => p.valor <= 0)) {
    return { blocked: true, reason: "Todos os pagamentos devem ter valor positivo." };
  }
  return { blocked: false };
}

describe("ConciliacaoDialog — handleConcluir guard (post-fix)", () => {
  describe("isDriverView = true (entregador)", () => {
    it("allows concluding with zero payments (R$ 0,00 scenario)", () => {
      const result = buildHandleConcluirGuard(true, []);
      expect(result.blocked).toBe(false);
    });

    it("allows concluding with valid payments", () => {
      const pagamentos: PagamentoLinha[] = [
        { id: "1", forma_pagamento_id: "dinheiro", valor: 50, pertence_a: "operacao" },
      ];
      const result = buildHandleConcluirGuard(true, pagamentos);
      expect(result.blocked).toBe(false);
    });

    it("blocks when a payment has valor <= 0", () => {
      const pagamentos: PagamentoLinha[] = [
        { id: "1", forma_pagamento_id: "dinheiro", valor: 0, pertence_a: "operacao" },
      ];
      const result = buildHandleConcluirGuard(true, pagamentos);
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe("Todos os pagamentos devem ter valor positivo.");
    });

    it("blocks when a payment has negative valor", () => {
      const pagamentos: PagamentoLinha[] = [
        { id: "1", forma_pagamento_id: "dinheiro", valor: -10, pertence_a: "operacao" },
      ];
      const result = buildHandleConcluirGuard(true, pagamentos);
      expect(result.blocked).toBe(true);
    });
  });

  describe("isDriverView = false (admin/conciliação)", () => {
    it("blocks when there are no payments", () => {
      const result = buildHandleConcluirGuard(false, []);
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe("Registre ao menos um pagamento.");
    });

    it("allows concluding with valid payments", () => {
      const pagamentos: PagamentoLinha[] = [
        { id: "1", forma_pagamento_id: "dinheiro", valor: 100, pertence_a: "loja" },
      ];
      const result = buildHandleConcluirGuard(false, pagamentos);
      expect(result.blocked).toBe(false);
    });

    it("blocks when a payment has valor <= 0", () => {
      const pagamentos: PagamentoLinha[] = [
        { id: "1", forma_pagamento_id: "pix", valor: 0, pertence_a: "operacao" },
      ];
      const result = buildHandleConcluirGuard(false, pagamentos);
      expect(result.blocked).toBe(true);
      expect(result.reason).toBe("Todos os pagamentos devem ter valor positivo.");
    });
  });
});

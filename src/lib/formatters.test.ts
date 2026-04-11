import { describe, it, expect } from "vitest";
import { formatCurrency, formatPhone, formatCPF, formatCNPJ, formatDateBR } from "./formatters";

describe("formatCurrency", () => {
  it("formats positive values in BRL", () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain("1.234,56");
    expect(result).toContain("R$");
  });

  it("formats zero", () => {
    const result = formatCurrency(0);
    expect(result).toContain("0,00");
  });

  it("formats negative values", () => {
    const result = formatCurrency(-50);
    expect(result).toContain("50,00");
  });
});

describe("formatPhone", () => {
  it("formats 11-digit mobile numbers", () => {
    expect(formatPhone("11999887766")).toBe("(11) 99988-7766");
  });

  it("formats 10-digit landline numbers", () => {
    expect(formatPhone("1133445566")).toBe("(11) 3344-5566");
  });

  it("returns input unchanged for unexpected lengths", () => {
    expect(formatPhone("123")).toBe("123");
  });

  it("strips non-digit characters before formatting", () => {
    expect(formatPhone("(11) 99988-7766")).toBe("(11) 99988-7766");
  });
});

describe("formatCPF", () => {
  it("formats 11-digit CPF", () => {
    expect(formatCPF("12345678901")).toBe("123.456.789-01");
  });

  it("handles CPF with existing punctuation", () => {
    expect(formatCPF("123.456.789-01")).toBe("123.456.789-01");
  });
});

describe("formatCNPJ", () => {
  it("formats 14-digit CNPJ", () => {
    expect(formatCNPJ("12345678000199")).toBe("12.345.678/0001-99");
  });
});

describe("formatDateBR", () => {
  it("formats ISO string to dd/mm/yyyy", () => {
    const result = formatDateBR("2026-04-10T12:00:00Z");
    expect(result).toMatch(/10\/04\/2026/);
  });

  it("formats Date object", () => {
    const result = formatDateBR(new Date(2026, 0, 15));
    expect(result).toMatch(/15\/01\/2026/);
  });
});

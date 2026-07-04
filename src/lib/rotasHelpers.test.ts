import { describe, it, expect } from "vitest";
import { calcularCreditoLojaRota, calcularCreditoLojaTotal } from "./rotasHelpers";

const FORMAS = [
  { id: "forma-maquina-loja", retido_pela_loja: true },
  { id: "forma-dinheiro-empresa", retido_pela_loja: false },
  { id: "forma-pix-empresa", retido_pela_loja: false },
];

describe("calcularCreditoLojaRota", () => {
  it("não gera crédito quando o plano diz dinheiro mas a conciliação real foi Máquina da Loja (caso Arterial Esportes)", () => {
    const rota = {
      id: "rota-1",
      receber_do_cliente: true,
      valor_a_receber: 215,
      meio_cobranca_destino: "dinheiro" as const,
      destino_dinheiro: "repassar_empresa" as const,
    };
    const pagamentos = [
      { pertence_a: "loja" as const, valor: 215, forma_pagamento_id: "forma-maquina-loja" },
    ];
    expect(calcularCreditoLojaRota(rota, pagamentos, FORMAS)).toBe(0);
  });

  it("gera crédito quando a conciliação real confirma que o dinheiro chegou na empresa", () => {
    const rota = {
      id: "rota-1",
      receber_do_cliente: true,
      valor_a_receber: 100,
      meio_cobranca_destino: "maquina_loja" as const,
      destino_dinheiro: null,
    };
    const pagamentos = [
      { pertence_a: "loja" as const, valor: 100, forma_pagamento_id: "forma-dinheiro-empresa" },
    ];
    expect(calcularCreditoLojaRota(rota, pagamentos, FORMAS)).toBe(100);
  });

  it("usa o plano da rota como estimativa quando ainda não há nenhuma conciliação registrada", () => {
    const rota = {
      id: "rota-1",
      receber_do_cliente: true,
      valor_a_receber: 50,
      meio_cobranca_destino: "pix_empresa" as const,
      destino_dinheiro: null,
    };
    expect(calcularCreditoLojaRota(rota, [], FORMAS)).toBe(50);
  });

  it("ignora pagamentos 'Dinheiro Devolvido à Loja' (sentinela) mesmo com pertence_a loja", () => {
    const rota = {
      id: "rota-1",
      receber_do_cliente: true,
      valor_a_receber: 30,
      meio_cobranca_destino: "dinheiro" as const,
      destino_dinheiro: "devolver_loja" as const,
    };
    const pagamentos = [
      { pertence_a: "loja" as const, valor: 30, forma_pagamento_id: "__devolver_loja__" },
    ];
    expect(calcularCreditoLojaRota(rota, pagamentos, FORMAS, "__devolver_loja__")).toBe(0);
  });
});

describe("calcularCreditoLojaTotal", () => {
  it("soma o crédito de várias rotas, cruzando pagamentos pelo rota_id certo", () => {
    const rotas = [
      { id: "rota-1", receber_do_cliente: true, valor_a_receber: 215, meio_cobranca_destino: "dinheiro" as const, destino_dinheiro: "repassar_empresa" as const },
      { id: "rota-2", receber_do_cliente: true, valor_a_receber: 25, meio_cobranca_destino: "maquina_loja" as const, destino_dinheiro: null },
    ];
    const pagamentos = [
      { rota_id: "rota-1", pertence_a: "loja" as const, valor: 215, forma_pagamento_id: "forma-maquina-loja" },
      { rota_id: "rota-2", pertence_a: "loja" as const, valor: 25, forma_pagamento_id: "forma-pix-empresa" },
    ];
    // rota-1: planejado dinheiro/repassar, mas pago na máquina da loja → não credita (0)
    // rota-2: planejado máquina, mas pago via pix empresa → credita (25)
    expect(calcularCreditoLojaTotal(rotas, pagamentos, FORMAS)).toBe(25);
  });
});

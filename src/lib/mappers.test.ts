import { describe, it, expect } from "vitest";
import { rowToSolicitacao, rowToRota, rowToFatura } from "./mappers";

describe("rowToSolicitacao", () => {
  it("maps all required fields from row to domain type", () => {
    const row = {
      id: "sol-1",
      codigo: "S001",
      cliente_id: "cli-1",
      entregador_id: "ent-1",
      status: "pendente",
      tipo_operacao: "entrega",
      ponto_coleta: "Centro",
      data_solicitacao: "2026-01-01T10:00:00Z",
      data_inicio: null,
      data_conclusao: null,
      justificativa: null,
      retroativo: false,
      created_at: "2026-01-01T10:00:00Z",
      updated_at: "2026-01-01T10:00:00Z",
    };

    const result = rowToSolicitacao(row as never);

    expect(result.id).toBe("sol-1");
    expect(result.codigo).toBe("S001");
    expect(result.cliente_id).toBe("cli-1");
    expect(result.status).toBe("pendente");
    expect(result.historico).toEqual([]);
    expect(result.valor_total_taxas).toBeNull();
  });
});

describe("rowToRota", () => {
  it("maps row to Rota domain type", () => {
    const row = {
      id: "rota-1",
      solicitacao_id: "sol-1",
      bairro_destino_id: "bairro-1",
      responsavel: "João",
      telefone: "11999999999",
      observacoes: null,
      receber_do_cliente: true,
      valor_a_receber: 25.5,
      taxa_resolvida: 10,
      regra_preco_id: null,
      status: "concluida",
    };

    const result = rowToRota(row as never);

    expect(result.id).toBe("rota-1");
    expect(result.receber_do_cliente).toBe(true);
    expect(result.valor_a_receber).toBe(25.5);
    expect(result.taxa_resolvida).toBe(10);
  });

  it("handles null values for optional fields", () => {
    const row = {
      id: "rota-2",
      solicitacao_id: "sol-1",
      bairro_destino_id: null,
      responsavel: null,
      telefone: null,
      observacoes: null,
      receber_do_cliente: false,
      valor_a_receber: null,
      taxa_resolvida: null,
      regra_preco_id: null,
      status: "pendente",
    };

    const result = rowToRota(row as never);

    expect(result.valor_a_receber).toBeNull();
    expect(result.taxa_resolvida).toBeNull();
    expect(result.receber_do_cliente).toBe(false);
  });
});

describe("rowToFatura", () => {
  it("maps row to Fatura domain type with correct field transformations", () => {
    const row = {
      id: "fat-1",
      numero: "FAT-001",
      cliente_id: "cli-1",
      cliente_nome: "Loja Teste",
      tipo_faturamento: "por_entrega",
      total_entregas: 5,
      data_emissao: "2026-01-01",
      data_vencimento: "2026-01-15",
      saldo_liquido: 150,
      total_creditos_loja: 200,
      total_debitos_loja: 50,
      status_geral: "Aberta",
      status_taxas: "pendente",
      status_repasse: "pendente",
      status_cobranca: "pendente",
      observacoes: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    const result = rowToFatura(row as never);

    expect(result.id).toBe("fat-1");
    expect(result.numero).toBe("FAT-001");
    expect(result.valor_taxas).toBe(150); // mapped from saldo_liquido
    expect(result.valor_repasse).toBeNull();
    expect(result.total_entregas).toBe(5);
    expect(result.status_geral).toBe("Aberta");
  });
});

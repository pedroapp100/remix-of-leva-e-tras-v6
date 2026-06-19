import { describe, it, expect } from "vitest";
import { resolverTarifaCliente } from "./resolverTarifa";
import type { Bairro, TabelaPrecoCliente } from "@/types/database";

const bairros: Bairro[] = [
  { id: "bairro-munir", nome: "Munir Calixto", region_id: "regiao-1", taxa_entrega: 18 },
  { id: "bairro-aldeia", nome: "Aldeia dos sonhos", region_id: "regiao-afastada", taxa_entrega: 15 },
];

const baseRegra: TabelaPrecoCliente = {
  id: "regra-1",
  cliente_id: "casa-barroco",
  bairro_destino_id: null,
  regiao_id: null,
  tipo_operacao: "tipo-comercial",
  taxa_base: 18,
  taxa_retorno: 0,
  taxa_espera: 0,
  taxa_urgencia: 0,
  ativo: true,
  prioridade: 1,
  observacao: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("resolverTarifaCliente", () => {
  it("nível 1 — usa a regra específica do bairro quando existe", () => {
    const tabelaPrecos: TabelaPrecoCliente[] = [
      { ...baseRegra, id: "r-bairro", bairro_destino_id: "bairro-munir", taxa_base: 18 },
    ];

    const tarifa = resolverTarifaCliente(bairros, tabelaPrecos, "bairro-munir", "casa-barroco", "tipo-comercial");

    expect(tarifa).toEqual({ taxaBase: 18, taxaEspera: 0, taxaRetorno: 0, taxaUrgencia: 0, fallback: false, nivel: "bairro" });
  });

  it("nível 4 — cai para a taxa_entrega do bairro quando não existe regra nenhuma (caso Casa barroco / Aldeia dos sonhos)", () => {
    const tabelaPrecos: TabelaPrecoCliente[] = [
      { ...baseRegra, id: "r-bairro", bairro_destino_id: "bairro-munir", taxa_base: 18 },
    ];

    const tarifa = resolverTarifaCliente(bairros, tabelaPrecos, "bairro-aldeia", "casa-barroco", "tipo-comercial");

    expect(tarifa.fallback).toBe(true);
    expect(tarifa.nivel).toBe("fallback");
    expect(tarifa.taxaBase).toBe(15);
  });

  it("sem clienteId não aplica nenhuma regra e cai direto no fallback do bairro", () => {
    const tabelaPrecos: TabelaPrecoCliente[] = [
      { ...baseRegra, id: "r-bairro", bairro_destino_id: "bairro-munir", taxa_base: 18 },
    ];

    const tarifa = resolverTarifaCliente(bairros, tabelaPrecos, "bairro-munir", undefined, "tipo-comercial");

    expect(tarifa.fallback).toBe(true);
    expect(tarifa.taxaBase).toBe(18); // taxa_entrega do bairro, não a regra do cliente
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Estado mutável dos mocks — simula a query useTiposOperacao resolvendo
// DEPOIS do primeiro render (cache frio), que é o cenário real do bug.
const tiposOperacaoState: { data: { id: string; nome: string; ativo: boolean; cor: string; dias_semana: string[]; aplica_feriado: boolean; horario_inicio: string | null; horario_fim: string | null }[] } = {
  data: [],
};

vi.mock("@/hooks/useSettings", () => ({
  useBairros: () => ({ data: [{ id: "bairro-1", nome: "Munir Calixto", region_id: "regiao-1" }] }),
  useRegioes: () => ({ data: [{ id: "regiao-1", name: "Regiões afastadas daía" }] }),
  useTiposOperacao: () => tiposOperacaoState,
  useTaxasExtras: () => ({ data: [] }),
}));

vi.mock("@/hooks/useClientes", () => ({
  useClientes: () => ({ data: [{ id: "cliente-1", nome: "Casa barroco" }] }),
  useTabelaPrecos: () => ({
    data: [
      {
        id: "regra-1",
        cliente_id: "cliente-1",
        ativo: true,
        prioridade: 1,
        bairro_destino_id: "bairro-1",
        regiao_id: null,
        tipo_operacao: "tipo-1",
        taxa_base: 18,
        taxa_espera: 0,
        taxa_retorno: 0,
        taxa_urgencia: 0,
      },
    ],
  }),
}));

import { SimuladorOperacoes } from "@/components/shared/SimuladorOperacoes";

describe("SimuladorOperacoes — sincronização de tipoOperacao", () => {
  it("seleciona o tipo de operação automaticamente quando a lista carrega depois do primeiro render", async () => {
    // Primeiro render: useTiposOperacao ainda não resolveu (igual ao cache frio real).
    tiposOperacaoState.data = [];
    const { rerender } = render(<SimuladorOperacoes clienteId="cliente-1" />);

    // Nenhum botão de tipo deve existir ainda — lista vazia.
    expect(screen.queryByText("Horário Comercial")).not.toBeInTheDocument();

    // A query resolve: TIPOS_ATIVOS passa a ter 1 item.
    tiposOperacaoState.data = [
      {
        id: "tipo-1",
        nome: "Horário Comercial",
        ativo: true,
        cor: "#3b82f6",
        dias_semana: [],
        aplica_feriado: false,
        horario_inicio: null,
        horario_fim: null,
      },
    ];
    rerender(<SimuladorOperacoes clienteId="cliente-1" />);

    const botaoTipo = await screen.findByText("Horário Comercial");
    const button = botaoTipo.closest("button");
    expect(button).not.toBeNull();

    // Sem o fix, tipoOperacao fica travado em "" e o botão nunca fica "ativo"
    // (border-primary), mesmo com TIPOS_ATIVOS já populado.
    expect(button).toHaveClass("border-primary");
  });
});

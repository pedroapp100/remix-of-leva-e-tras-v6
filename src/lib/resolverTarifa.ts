/**
 * lib/resolverTarifa.ts
 * Hierarquia única de resolução de tarifa por regras de preço do cliente.
 * Usada pelo Simulador de Operações e pela criação real de solicitações —
 * antes cada área tinha sua própria cópia e elas divergiram (uma tinha
 * o fallback de taxa padrão do bairro, a outra não).
 */
import type { Bairro, TabelaPrecoCliente } from "@/types/database";

export type NivelTarifa = "bairro" | "regiao" | "geral" | "fallback";

export interface TarifaResolvida {
  taxaBase: number;
  taxaEspera: number;
  taxaRetorno: number;
  taxaUrgencia: number;
  fallback: boolean;
  nivel: NivelTarifa;
}

const TARIFA_VAZIA: TarifaResolvida = {
  taxaBase: 0,
  taxaEspera: 0,
  taxaRetorno: 0,
  taxaUrgencia: 0,
  fallback: false,
  nivel: "fallback",
};

function regraParaTarifa(regra: TabelaPrecoCliente, nivel: NivelTarifa): TarifaResolvida {
  return {
    taxaBase: regra.taxa_base,
    taxaEspera: regra.taxa_espera,
    taxaRetorno: regra.taxa_retorno,
    taxaUrgencia: regra.taxa_urgencia,
    fallback: false,
    nivel,
  };
}

/**
 * Hierarquia de 4 níveis:
 * 1. Regra específica por bairro + tipo de operação
 * 2. Regra por região do bairro + tipo de operação
 * 3. Regra geral (sem bairro e sem região) + tipo de operação
 * 4. Fallback: taxa_entrega padrão do bairro
 */
export function resolverTarifaCliente(
  bairros: Bairro[],
  tabelaPrecos: TabelaPrecoCliente[],
  bairroId: string,
  clienteId?: string,
  tipoOp?: string
): TarifaResolvida {
  const bairro = bairros.find((b) => b.id === bairroId);
  if (!bairro) return TARIFA_VAZIA;

  if (clienteId) {
    const regrasFiltradas = tabelaPrecos
      .filter((p) => p.cliente_id === clienteId && p.ativo)
      .sort((a, b) => a.prioridade - b.prioridade);

    const matchTipo = (p: TabelaPrecoCliente) =>
      !tipoOp || p.tipo_operacao === "todos" || p.tipo_operacao === tipoOp;

    const porBairro = regrasFiltradas.find((p) => p.bairro_destino_id === bairroId && matchTipo(p));
    if (porBairro) return regraParaTarifa(porBairro, "bairro");

    const porRegiao = regrasFiltradas.find(
      (p) => !p.bairro_destino_id && p.regiao_id === bairro.region_id && matchTipo(p)
    );
    if (porRegiao) return regraParaTarifa(porRegiao, "regiao");

    const geral = regrasFiltradas.find((p) => !p.bairro_destino_id && !p.regiao_id && matchTipo(p));
    if (geral) return regraParaTarifa(geral, "geral");
  }

  return { taxaBase: bairro.taxa_entrega, taxaEspera: 0, taxaRetorno: 0, taxaUrgencia: 0, fallback: true, nivel: "fallback" };
}

import { useMemo } from "react";
import { useGlobalStore } from "@/contexts/GlobalStore";
import { MOCK_ENTREGADORES } from "@/data/mockEntregadores";

export interface ComissaoCalculada {
  entregador_id: string;
  nome: string;
  entregas: number;
  valor_gerado: number;
  tipo_comissao: "percentual" | "fixo";
  taxa: number;
  comissao: number;
}

/**
 * Calculates driver commission reactively from concluded solicitations.
 * Replaces static MOCK_COMISSOES.
 */
export function useComissao(entregadorId: string): ComissaoCalculada | null {
  const { solicitacoes } = useGlobalStore();

  return useMemo(() => {
    const entregador = MOCK_ENTREGADORES.find((e) => e.id === entregadorId);
    if (!entregador) return null;

    const concluidas = solicitacoes.filter(
      (s) => s.entregador_id === entregadorId && s.status === "concluida"
    );

    const entregas = concluidas.length;
    const valor_gerado = concluidas.reduce(
      (sum, s) => sum + (s.valor_total_taxas ?? 0),
      0
    );

    const comissao =
      entregador.tipo_comissao === "percentual"
        ? (valor_gerado * entregador.valor_comissao) / 100
        : entregas * entregador.valor_comissao;

    return {
      entregador_id: entregadorId,
      nome: entregador.nome,
      entregas,
      valor_gerado,
      tipo_comissao: entregador.tipo_comissao,
      taxa: entregador.valor_comissao,
      comissao: Math.round(comissao * 100) / 100,
    };
  }, [solicitacoes, entregadorId]);
}

/**
 * Calculates commissions for all drivers.
 */
export function useAllComissoes(): ComissaoCalculada[] {
  const { solicitacoes } = useGlobalStore();

  return useMemo(() => {
    return MOCK_ENTREGADORES.map((entregador) => {
      const concluidas = solicitacoes.filter(
        (s) => s.entregador_id === entregador.id && s.status === "concluida"
      );
      const entregas = concluidas.length;
      const valor_gerado = concluidas.reduce(
        (sum, s) => sum + (s.valor_total_taxas ?? 0),
        0
      );
      const comissao =
        entregador.tipo_comissao === "percentual"
          ? (valor_gerado * entregador.valor_comissao) / 100
          : entregas * entregador.valor_comissao;

      return {
        entregador_id: entregador.id,
        nome: entregador.nome,
        entregas,
        valor_gerado,
        tipo_comissao: entregador.tipo_comissao,
        taxa: entregador.valor_comissao,
        comissao: Math.round(comissao * 100) / 100,
      };
    });
  }, [solicitacoes]);
}

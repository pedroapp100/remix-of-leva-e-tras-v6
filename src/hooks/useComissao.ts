import { useMemo } from "react";
import { useSolicitacoesAll } from "@/hooks/useSolicitacoes";
import { useEntregadorById, useEntregadoresAtivos } from "@/hooks/useEntregadores";

export interface ComissaoCalculada {
  id?: string;
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
export function useComissao(entregadorId: string | null): ComissaoCalculada | null {
  const { data: solicitacoes = [] } = useSolicitacoesAll();
  const { data: entregador } = useEntregadorById(entregadorId ?? "");

  return useMemo(() => {
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
      entregador_id: entregadorId ?? "",
      nome: entregador.nome,
      entregas,
      valor_gerado,
      tipo_comissao: entregador.tipo_comissao,
      taxa: entregador.valor_comissao,
      comissao: Math.round(comissao * 100) / 100,
    };
  }, [solicitacoes, entregadorId, entregador]);
}

/**
 * Calculates commissions for all drivers.
 */
export function useAllComissoes(): ComissaoCalculada[] {
  const { data: solicitacoes = [] } = useSolicitacoesAll();
  const { data: entregadores = [] } = useEntregadoresAtivos();

  return useMemo(() => {
    return entregadores.map((entregador) => {
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
  }, [solicitacoes, entregadores]);
}

import { useMemo } from "react";
import { useSolicitacoesAll } from "@/hooks/useSolicitacoes";
import { useEntregadorById, useEntregadoresAtivos } from "@/hooks/useEntregadores";
import { useComissaoFaixas, calcularComissaoMetaClient } from "@/hooks/useComissaoFaixas";
import type { MetaModoCalculo, ComissaoFaixa } from "@/types/database";

export interface ComissaoCalculada {
  id?: string;
  entregador_id: string;
  nome: string;
  entregas: number;
  valor_gerado: number;
  tipo_comissao: "percentual" | "fixo" | "meta";
  taxa: number;
  comissao: number;
  meta_modo_calculo?: MetaModoCalculo | null;
  faixas?: ComissaoFaixa[];
}

/** Retorna o início e fim do mês corrente em UTC (intervalo semi-aberto) */
function getMesCorrenteRange(): { inicio: Date; fim: Date } {
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
  return { inicio, fim };
}

/**
 * Calculates driver commission reactively from concluded solicitations.
 * Filters by current month. Supports percentual, fixo, and meta types.
 */
export function useComissao(entregadorId: string | null): ComissaoCalculada | null {
  const { data: solicitacoes = [] } = useSolicitacoesAll();
  const { data: entregador } = useEntregadorById(entregadorId ?? "");
  const { data: faixas = [] } = useComissaoFaixas(
    entregador?.tipo_comissao === "meta" ? entregadorId : null
  );

  return useMemo(() => {
    if (!entregador) return null;

    const { inicio, fim } = getMesCorrenteRange();

    const concluidas = solicitacoes.filter(
      (s) =>
        s.entregador_id === entregadorId &&
        s.status === "concluida" &&
        s.data_conclusao != null &&
        new Date(s.data_conclusao) >= inicio &&
        new Date(s.data_conclusao) < fim
    );

    const entregas = concluidas.length;
    const valor_gerado = concluidas.reduce(
      (sum, s) => sum + (s.valor_total_taxas ?? 0),
      0
    );

    let comissao = 0;

    if (entregador.tipo_comissao === "percentual") {
      comissao = (valor_gerado * entregador.valor_comissao) / 100;
    } else if (entregador.tipo_comissao === "fixo") {
      comissao = entregas * entregador.valor_comissao;
    } else if (entregador.tipo_comissao === "meta") {
      const modo = (entregador.meta_modo_calculo ?? "escalonado") as MetaModoCalculo;
      comissao = calcularComissaoMetaClient(entregas, faixas as ComissaoFaixa[], modo);
    }

    return {
      entregador_id: entregadorId ?? "",
      nome: entregador.nome,
      entregas,
      valor_gerado,
      tipo_comissao: entregador.tipo_comissao,
      taxa: entregador.valor_comissao,
      comissao: Math.round(comissao * 100) / 100,
      meta_modo_calculo: entregador.meta_modo_calculo ?? null,
      faixas: entregador.tipo_comissao === "meta" ? (faixas as ComissaoFaixa[]) : undefined,
    };
  }, [solicitacoes, entregadorId, entregador, faixas]);
}

/**
 * Calculates commissions for all drivers (current month only).
 * Note: meta type uses client-side faixas lookup — N+1 avoided via bulk fetch.
 */
export function useAllComissoes(): ComissaoCalculada[] {
  const { data: solicitacoes = [] } = useSolicitacoesAll();
  const { data: entregadores = [] } = useEntregadoresAtivos();

  return useMemo(() => {
    const { inicio, fim } = getMesCorrenteRange();

    return entregadores.map((entregador) => {
      const concluidas = solicitacoes.filter(
        (s) =>
          s.entregador_id === entregador.id &&
          s.status === "concluida" &&
          s.data_conclusao != null &&
          new Date(s.data_conclusao) >= inicio &&
          new Date(s.data_conclusao) < fim
      );
      const entregas = concluidas.length;
      const valor_gerado = concluidas.reduce(
        (sum, s) => sum + (s.valor_total_taxas ?? 0),
        0
      );

      let comissao = 0;
      if (entregador.tipo_comissao === "percentual") {
        comissao = (valor_gerado * entregador.valor_comissao) / 100;
      } else if (entregador.tipo_comissao === "fixo") {
        comissao = entregas * entregador.valor_comissao;
      }
      // meta: faixas não estão disponíveis aqui sem N+1 — comissao fica 0 até
      // o componente individual (useComissao) fazer o cálculo com as faixas.

      return {
        entregador_id: entregador.id,
        nome: entregador.nome,
        entregas,
        valor_gerado,
        tipo_comissao: entregador.tipo_comissao,
        taxa: entregador.valor_comissao,
        comissao: Math.round(comissao * 100) / 100,
        meta_modo_calculo: entregador.meta_modo_calculo ?? null,
      };
    });
  }, [solicitacoes, entregadores]);
}

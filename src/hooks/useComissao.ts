import { useMemo } from "react";
import type { DateRange } from "react-day-picker";
import { useSolicitacoesAll, useRotasWindow } from "@/hooks/useSolicitacoes";
import { useEntregadorById, useEntregadoresAtivos } from "@/hooks/useEntregadores";
import { useComissaoFaixas, useAllComissaoFaixas, calcularComissaoMetaClient } from "@/hooks/useComissaoFaixas";
import type { MetaModoCalculo, ComissaoFaixa } from "@/types/database";

export interface ComissaoCalculada {
  id?: string;
  entregador_id: string;
  nome: string;
  entregas: number;
  solicitacoes_count: number;
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
 * entregas = rotas concluídas (not solicitações).
 * Filters by current month. Supports percentual, fixo, and meta types.
 */
export function useComissao(entregadorId: string | null): ComissaoCalculada | null {
  const { data: solicitacoes = [] } = useSolicitacoesAll();
  const { data: entregador } = useEntregadorById(entregadorId ?? "");
  const { data: faixas = [] } = useComissaoFaixas(
    entregador?.tipo_comissao === "meta" ? entregadorId : null
  );
  const { data: todasRotas = [] } = useRotasWindow();

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

    const solIds = new Set(concluidas.map((s) => s.id));
    const rotasConcluidas = todasRotas.filter(
      (r) => solIds.has(r.solicitacao_id) && r.status === "concluida"
    );

    const entregas = rotasConcluidas.length;
    const solicitacoes_count = concluidas.length;
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
      solicitacoes_count,
      valor_gerado,
      tipo_comissao: entregador.tipo_comissao,
      taxa: entregador.valor_comissao,
      comissao: Math.round(comissao * 100) / 100,
      meta_modo_calculo: entregador.meta_modo_calculo ?? null,
      faixas: entregador.tipo_comissao === "meta" ? (faixas as ComissaoFaixa[]) : undefined,
    };
  }, [solicitacoes, todasRotas, entregadorId, entregador, faixas]);
}

/**
 * Calculates commissions for all drivers.
 * When dateRange is provided, filters by that period; otherwise defaults to current month.
 * entregas = rotas concluídas por entregador (not solicitações).
 */
export function useAllComissoes(dateRange?: DateRange): ComissaoCalculada[] {
  const sinceOverride = dateRange?.from
    ? dateRange.from.toISOString().slice(0, 10)
    : undefined;

  const { data: solicitacoes = [] } = useSolicitacoesAll();
  const { data: entregadores = [] } = useEntregadoresAtivos();
  const { data: todasRotas = [] } = useRotasWindow(sinceOverride);
  const { data: todasFaixas = [] } = useAllComissaoFaixas();

  return useMemo(() => {
    const { inicio: mesInicio, fim: mesFim } = getMesCorrenteRange();
    const inicio = dateRange?.from ?? mesInicio;
    // Set fim to start of the day after 'to' so the full 'to' day is included
    const fim = dateRange?.to
      ? new Date(dateRange.to.getFullYear(), dateRange.to.getMonth(), dateRange.to.getDate() + 1)
      : mesFim;

    return entregadores.map((entregador) => {
      const concluidas = solicitacoes.filter(
        (s) =>
          s.entregador_id === entregador.id &&
          s.status === "concluida" &&
          s.data_conclusao != null &&
          new Date(s.data_conclusao) >= inicio &&
          new Date(s.data_conclusao) < fim
      );

      const solIds = new Set(concluidas.map((s) => s.id));
      const rotasConcluidas = todasRotas.filter(
        (r) => solIds.has(r.solicitacao_id) && r.status === "concluida"
      );

      const entregas = rotasConcluidas.length;
      const solicitacoes_count = concluidas.length;
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
        const faixasDoEntregador = todasFaixas.filter(
          (f) => f.entregador_id === entregador.id
        ) as ComissaoFaixa[];
        comissao = calcularComissaoMetaClient(entregas, faixasDoEntregador, modo);
      }

      return {
        entregador_id: entregador.id,
        nome: entregador.nome,
        entregas,
        solicitacoes_count,
        valor_gerado,
        tipo_comissao: entregador.tipo_comissao,
        taxa: entregador.valor_comissao,
        comissao: Math.round(comissao * 100) / 100,
        meta_modo_calculo: entregador.meta_modo_calculo ?? null,
      };
    });
  }, [solicitacoes, entregadores, todasRotas, todasFaixas, dateRange]);
}

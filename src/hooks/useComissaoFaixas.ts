/**
 * hooks/useComissaoFaixas.ts
 * React Query hooks para faixas de comissão por meta e ciclos mensais fechados.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ComissaoFaixa, CicloComissaoMeta } from "@/types/database";

// ── Faixas ────────────────────────────────────────────────────────────────────

export function useComissaoFaixas(entregadorId: string | null) {
  return useQuery<ComissaoFaixa[]>({
    queryKey: ["comissao_faixas", entregadorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comissao_faixas")
        .select("*")
        .eq("entregador_id", entregadorId!)
        .order("de", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as ComissaoFaixa[];
    },
    enabled: Boolean(entregadorId),
  });
}

export function useSaveComissaoFaixas() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entregadorId,
      faixas,
    }: {
      entregadorId: string;
      faixas: Array<{ de: number; ate: number; valor_por_entrega: number }>;
    }) => {
      // Delete all existing faixas for this entregador, then re-insert
      const { error: delError } = await supabase
        .from("comissao_faixas")
        .delete()
        .eq("entregador_id", entregadorId);
      if (delError) throw new Error(delError.message);

      if (faixas.length === 0) return;

      const rows = faixas.map((f) => ({
        entregador_id: entregadorId,
        de: f.de,
        ate: f.ate,
        valor_por_entrega: f.valor_por_entrega,
      }));

      const { error: insError } = await supabase
        .from("comissao_faixas")
        .insert(rows);
      if (insError) throw new Error(insError.message);
    },
    onSuccess: (_data, { entregadorId }) => {
      qc.invalidateQueries({ queryKey: ["comissao_faixas", entregadorId] });
    },
  });
}

// ── Ciclos mensais fechados ───────────────────────────────────────────────────

export function useCiclosComissaoMeta(entregadorId: string | null) {
  return useQuery<CicloComissaoMeta[]>({
    queryKey: ["ciclos_comissao_meta", entregadorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ciclos_comissao_meta")
        .select("*")
        .eq("entregador_id", entregadorId!)
        .order("mes_referencia", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as CicloComissaoMeta[];
    },
    enabled: Boolean(entregadorId),
  });
}

export function useFecharCicloManual() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("fechar_ciclos_comissao_meta", {
        p_criado_por: "manual",
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ciclos_comissao_meta"] });
    },
  });
}

// ── Helpers de cálculo (client-side) ─────────────────────────────────────────

/**
 * Calcula comissão meta no cliente (para preview em tempo real).
 * Usa Opção B para gaps: herda valor da faixa anterior.
 */
export function calcularComissaoMetaClient(
  totalEntregas: number,
  faixas: ComissaoFaixa[],
  modo: "escalonado" | "faixa_maxima"
): number {
  if (totalEntregas <= 0 || faixas.length === 0) return 0;

  const sorted = [...faixas].sort((a, b) => a.de - b.de);

  if (modo === "faixa_maxima") {
    // Identifica a faixa mais alta atingida
    const faixaAtingida = [...sorted]
      .reverse()
      .find((f) => f.de <= totalEntregas);
    if (!faixaAtingida) return 0;
    return Math.round(totalEntregas * faixaAtingida.valor_por_entrega * 100) / 100;
  }

  // Escalonado: cada entrega vale o valor da faixa em que cai
  // Gap (Opção B): herda o valor da última faixa válida anterior
  let comissao = 0;
  let entregando = 1;
  let ultimoValor = 0;

  for (const faixa of sorted) {
    // Preenche gap com o último valor conhecido (Opção B)
    if (entregando < faixa.de && ultimoValor > 0) {
      const qtdGap = Math.min(faixa.de - 1, totalEntregas) - entregando + 1;
      if (qtdGap > 0) {
        comissao += qtdGap * ultimoValor;
        entregando += qtdGap;
      }
    }

    if (entregando > totalEntregas) break;

    if (entregando <= faixa.ate) {
      const inicio = Math.max(entregando, faixa.de);
      const fim = Math.min(faixa.ate, totalEntregas);
      const qtd = fim - inicio + 1;
      if (qtd > 0) {
        comissao += qtd * faixa.valor_por_entrega;
        entregando = fim + 1;
      }
    }

    ultimoValor = faixa.valor_por_entrega;
  }

  // Entregas além da última faixa herdam o último valor (Opção B)
  if (entregando <= totalEntregas && ultimoValor > 0) {
    comissao += (totalEntregas - entregando + 1) * ultimoValor;
  }

  return Math.round(comissao * 100) / 100;
}

/**
 * Detecta gaps entre faixas e retorna descrição do gap para aviso informativo.
 */
export function detectarGapsFaixas(
  faixas: Array<{ de: number; ate: number; valor_por_entrega: number }>
): Array<{ de: number; ate: number; valorHerdado: number }> {
  const sorted = [...faixas].sort((a, b) => a.de - b.de);
  const gaps: Array<{ de: number; ate: number; valorHerdado: number }> = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const atual = sorted[i];
    const proxima = sorted[i + 1];
    if (proxima.de > atual.ate + 1) {
      gaps.push({
        de: atual.ate + 1,
        ate: proxima.de - 1,
        valorHerdado: atual.valor_por_entrega,
      });
    }
  }

  return gaps;
}

/**
 * Retorna qual faixa o entregador está atualmente e quantas entregas faltam para a próxima.
 */
export function calcularProgressoFaixa(
  totalEntregas: number,
  faixas: ComissaoFaixa[]
): {
  faixaAtual: ComissaoFaixa | null;
  proximaFaixa: ComissaoFaixa | null;
  entregasFaltam: number;
  percentualProxima: number;
} {
  const sorted = [...faixas].sort((a, b) => a.de - b.de);

  let faixaAtual: ComissaoFaixa | null = null;
  let proximaFaixa: ComissaoFaixa | null = null;

  for (let i = 0; i < sorted.length; i++) {
    if (totalEntregas >= sorted[i].de) {
      faixaAtual = sorted[i];
      proximaFaixa = sorted[i + 1] ?? null;
    }
  }

  const entregasFaltam = proximaFaixa
    ? Math.max(0, proximaFaixa.de - totalEntregas)
    : 0;

  const percentualProxima =
    proximaFaixa && faixaAtual
      ? Math.min(
          100,
          Math.round(
            ((totalEntregas - faixaAtual.de) /
              (proximaFaixa.de - faixaAtual.de)) *
              100
          )
        )
      : 100;

  return { faixaAtual, proximaFaixa, entregasFaltam, percentualProxima };
}

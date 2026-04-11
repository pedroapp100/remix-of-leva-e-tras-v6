import { createContext, useContext, useState, useCallback, useMemo, useRef, type ReactNode } from "react";
import type { CaixaEntregador, StatusCaixa, RecebimentoDinheiro } from "@/types/database";
import { formatCurrency } from "@/lib/formatters";
import { useLogStore } from "@/contexts/LogStore";
import { supabase } from "@/lib/supabase";

interface CaixaStoreContextType {
  caixas: CaixaEntregador[];
  abrirCaixa: (entregadorId: string, trocoInicial: number) => boolean;
  fecharCaixa: (caixaId: string, valorDevolvido: number, observacoes: string) => void;
  editarCaixa: (caixaId: string, trocoInicial: number, observacoes: string) => void;
  justificarDivergencia: (caixaId: string, justificativa: string) => void;
  addRecebimentoAutomatico: (entregadorId: string, solicitacaoId: string, solicitacaoCodigo: string, clienteNome: string, valor: number) => void;
  getCaixasByEntregador: (entregadorId: string) => CaixaEntregador[];
  getCaixaAberto: (entregadorId: string) => CaixaEntregador | undefined;
  ensureLoaded: () => void;
}

const CaixaStoreContext = createContext<CaixaStoreContextType | null>(null);

export function CaixaStoreProvider({ children }: { children: ReactNode }) {
  const { addLog } = useLogStore();
  const [caixas, setCaixas] = useState<CaixaEntregador[]>([]);
  const [entregadoresCache, setEntregadoresCache] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const loadingRef = useRef(false);

  // Lazy load: only fetches data when a consumer actually reads caixas
  const ensureLoaded = useCallback(() => {
    if (loaded || loadingRef.current) return;
    loadingRef.current = true;

    supabase
      .from("caixas_entregadores")
      .select(`
        *,
        entregadores (nome),
        recebimentos_caixa (id, solicitacao_id, valor, observacao, created_at)
      `)
      .order("data", { ascending: false })
      .then(({ data }) => {
        if (!data) { setLoaded(true); return; }
        const mapped: CaixaEntregador[] = data.map((row: Record<string, unknown>) => {
          const troco = row.troco_inicial as number;
          const dbRecebimentos = (row.recebimentos_caixa as Array<Record<string, unknown>>) ?? [];
          const recebimentos: RecebimentoDinheiro[] = dbRecebimentos.map((r) => {
            const obs = (r.observacao as string) ?? "";
            const [codigo, ...rest] = obs.split(" - ");
            return {
              id: r.id as string,
              solicitacao_codigo: codigo || "",
              cliente_nome: rest.join(" - ") || "",
              valor_recebido: Number(r.valor),
              hora: new Date(r.created_at as string).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            };
          });
          const totalRecebido = recebimentos.reduce((s, r) => s + r.valor_recebido, 0);
          return {
            id: row.id as string,
            entregador_id: row.entregador_id as string,
            entregador_nome: (row.entregadores as { nome: string } | null)?.nome ?? (row.entregador_id as string),
            data: row.data as string,
            troco_inicial: troco,
            recebimentos,
            total_recebido: totalRecebido,
            total_esperado: troco + totalRecebido,
            valor_devolvido: row.valor_devolvido as number | null,
            diferenca: row.diferenca as number | null,
            status: row.status as StatusCaixa,
            observacoes: row.observacoes as string | null,
            created_at: row.created_at as string,
            closed_at: row.updated_at as string | null,
          };
        });
        setCaixas(mapped);
        setLoaded(true);
      });

    supabase
      .from("entregadores")
      .select("id, nome")
      .eq("status", "ativo")
      .then(({ data }) => {
        if (!data) return;
        const cache: Record<string, string> = {};
        for (const e of data) cache[e.id] = e.nome;
        setEntregadoresCache(cache);
      });
  }, [loaded]);

  const abrirCaixa = useCallback((entregadorId: string, trocoInicial: number) => {
    const entNome = entregadoresCache[entregadorId] ?? entregadorId;
    const hoje = new Date().toISOString().split("T")[0];

    // Validação anti-duplicata: impede abertura se já existe caixa aberto no mesmo dia
    const jaAberto = caixas.find(
      (c) => c.entregador_id === entregadorId && c.status === "aberto" && c.data === hoje
    );
    if (jaAberto) {
      return false;
    }
    const novo: CaixaEntregador = {
      id: `caixa-${Date.now()}`,
      entregador_id: entregadorId,
      entregador_nome: entNome,
      data: hoje,
      troco_inicial: trocoInicial,
      recebimentos: [],
      total_recebido: 0,
      total_esperado: trocoInicial,
      valor_devolvido: null,
      diferenca: null,
      status: "aberto",
      observacoes: null,
      created_at: new Date().toISOString(),
      closed_at: null,
    };
    setCaixas((prev) => [novo, ...prev]);
    supabase.from("caixas_entregadores").insert({
      entregador_id: novo.entregador_id,
      data: novo.data,
      troco_inicial: novo.troco_inicial,
      valor_devolvido: null,
      diferenca: null,
      justificativa_divergencia: null,
      observacoes: null,
      status: "aberto",
      aberto_por_id: null,
      fechado_por_id: null,
    }).select("id").single().then(({ data: inserted }) => {
      if (inserted) {
        setCaixas((prev) => prev.map((c) => c.id === novo.id ? { ...c, id: inserted.id } : c));
      }
    });
    addLog({
      categoria: "financeiro",
      acao: "caixa_aberto",
      entidade_id: entregadorId,
      descricao: `Caixa aberto para ${entNome} com troco de ${formatCurrency(trocoInicial)}`,
      detalhes: { troco_inicial: trocoInicial },
    });
    return true;
  }, [addLog, caixas, entregadoresCache]);

  const fecharCaixa = useCallback((caixaId: string, valorDevolvido: number, observacoes: string) => {
    setCaixas((prev) =>
      prev.map((c) => {
        if (c.id !== caixaId) return c;
        const diferenca = valorDevolvido - c.total_esperado;
        const novoStatus: StatusCaixa = diferenca === 0 ? "fechado" : "divergente";
        addLog({
          categoria: "financeiro",
          acao: "caixa_fechado",
          entidade_id: c.entregador_id,
          descricao: `Caixa de ${c.entregador_nome} fechado. Diferença: ${formatCurrency(diferenca)}`,
          detalhes: { esperado: c.total_esperado, devolvido: valorDevolvido, diferenca, status: novoStatus },
        });
        const updated = {
          ...c,
          valor_devolvido: valorDevolvido,
          diferenca,
          status: novoStatus,
          observacoes: observacoes || c.observacoes,
          closed_at: new Date().toISOString(),
        };
        supabase.from("caixas_entregadores").update({
          valor_devolvido: updated.valor_devolvido,
          diferenca: updated.diferenca,
          status: updated.status,
          observacoes: updated.observacoes,
        }).eq("id", caixaId);
        return updated;
      })
    );
  }, [addLog]);

  const editarCaixa = useCallback((caixaId: string, trocoInicial: number, observacoes: string) => {
    setCaixas((prev) =>
      prev.map((c) => {
        if (c.id !== caixaId) return c;
        const novoEsperado = trocoInicial + c.total_recebido;
        const novaDiferenca = c.valor_devolvido !== null ? c.valor_devolvido - novoEsperado : null;
        let novoStatus = c.status;
        if (c.status !== "aberto" && novaDiferenca !== null) {
          novoStatus = novaDiferenca === 0 ? "fechado" : "divergente";
        }
        const updated = {
          ...c,
          troco_inicial: trocoInicial,
          total_esperado: novoEsperado,
          diferenca: novaDiferenca,
          status: novoStatus,
          observacoes: observacoes || c.observacoes,
        };
        supabase.from("caixas_entregadores").update({
          troco_inicial: updated.troco_inicial,
          diferenca: updated.diferenca,
          status: updated.status,
          observacoes: updated.observacoes,
        }).eq("id", caixaId);
        return updated;
      })
    );
  }, []);

  const justificarDivergencia = useCallback((caixaId: string, justificativa: string) => {
    setCaixas((prev) =>
      prev.map((c) => {
        if (c.id !== caixaId) return c;
        addLog({
          categoria: "financeiro",
          acao: "caixa_justificativa",
          entidade_id: c.entregador_id,
          descricao: `Justificativa registrada para caixa divergente de ${c.entregador_nome}`,
          detalhes: { diferenca: c.diferenca, justificativa },
        });
        const updated = { ...c, observacoes: justificativa };
        supabase.from("caixas_entregadores").update({ observacoes: justificativa }).eq("id", caixaId);
        return updated;
      })
    );
  }, [addLog]);

  // Auto-add recebimento when a solicitação with cash payment is concluded
  const addRecebimentoAutomatico = useCallback(
    (entregadorId: string, solicitacaoId: string, solicitacaoCodigo: string, clienteNome: string, valor: number) => {
      const hoje = new Date().toISOString().split("T")[0];
      const caixa = caixas.find(
        (c) => c.entregador_id === entregadorId && c.status === "aberto" && c.data === hoje
      );
      if (!caixa) return;

      // Persist to recebimentos_caixa table
      supabase.from("recebimentos_caixa").insert({
        caixa_id: caixa.id,
        solicitacao_id: solicitacaoId,
        rota_id: null,
        forma_pagamento_id: null,
        valor,
        pertence_a: "loja" as const,
        observacao: `${solicitacaoCodigo} - ${clienteNome}`,
      }).select("id, created_at").single().then(({ data: inserted }) => {
        const novoRecebimento: RecebimentoDinheiro = {
          id: inserted?.id ?? `rec-${Date.now()}`,
          solicitacao_codigo: solicitacaoCodigo,
          cliente_nome: clienteNome,
          valor_recebido: valor,
          hora: inserted
            ? new Date(inserted.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
            : new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        };

        setCaixas((prev) => {
          const idx = prev.findIndex((c) => c.id === caixa.id);
          if (idx === -1) return prev;
          const cur = prev[idx];
          const novoTotalRecebido = cur.total_recebido + valor;
          const updated: CaixaEntregador = {
            ...cur,
            recebimentos: [...cur.recebimentos, novoRecebimento],
            total_recebido: novoTotalRecebido,
            total_esperado: cur.troco_inicial + novoTotalRecebido,
          };
          const result = [...prev];
          result[idx] = updated;
          return result;
        });
      });

      addLog({
        categoria: "financeiro",
        acao: "recebimento_caixa",
        entidade_id: entregadorId,
        descricao: `Recebimento de ${formatCurrency(valor)} registrado automaticamente no caixa (${solicitacaoCodigo})`,
        detalhes: { solicitacao: solicitacaoCodigo, cliente: clienteNome, valor },
      });
    },
    [addLog, caixas]
  );

  const getCaixasByEntregador = useCallback(
    (entregadorId: string) =>
      caixas.filter((c) => c.entregador_id === entregadorId).sort((a, b) => b.data.localeCompare(a.data)),
    [caixas]
  );

  const getCaixaAberto = useCallback(
    (entregadorId: string) => {
      const hoje = new Date().toISOString().split("T")[0];
      return caixas.find((c) => c.entregador_id === entregadorId && c.status === "aberto" && c.data === hoje);
    },
    [caixas]
  );

  const value = useMemo<CaixaStoreContextType>(
    () => ({
      caixas,
      abrirCaixa,
      fecharCaixa,
      editarCaixa,
      justificarDivergencia,
      addRecebimentoAutomatico,
      getCaixasByEntregador,
      getCaixaAberto,
      ensureLoaded,
    }),
    [caixas, abrirCaixa, fecharCaixa, editarCaixa, justificarDivergencia, addRecebimentoAutomatico, getCaixasByEntregador, getCaixaAberto, ensureLoaded]
  );

  return <CaixaStoreContext.Provider value={value}>{children}</CaixaStoreContext.Provider>;
}

export function useCaixaStore(): CaixaStoreContextType {
  const ctx = useContext(CaixaStoreContext);
  if (!ctx) throw new Error("useCaixaStore must be used within CaixaStoreProvider");
  ctx.ensureLoaded();
  return ctx;
}

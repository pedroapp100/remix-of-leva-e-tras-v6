import { createContext, useContext, useState, useCallback, useMemo, useRef, type ReactNode } from "react";
import type { CaixaEntregador, StatusCaixa, RecebimentoDinheiro } from "@/types/database";
import { formatCurrency } from "@/lib/formatters";
import { useLogStore } from "@/contexts/LogStore";
import { supabase } from "@/lib/supabase";

interface CaixaStoreContextType {
  caixas: CaixaEntregador[];
  abrirCaixa: (entregadorId: string, trocoInicial: number) => Promise<boolean>;
  fecharCaixa: (caixaId: string, valorDevolvido: number, observacoes: string) => Promise<boolean>;
  editarCaixa: (caixaId: string, trocoInicial: number, observacoes: string) => void;
  deleteCaixa: (caixaId: string) => Promise<{ success: boolean; error?: string }>;
  justificarDivergencia: (caixaId: string, justificativa: string) => void;
  addRecebimentoAutomatico: (entregadorId: string, solicitacaoId: string, solicitacaoCodigo: string, clienteNome: string, valor: number) => void;
  removeRecebimento: (caixaId: string, recebimentoId: string) => Promise<void>;
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
        recebimentos_caixa (
          id, solicitacao_id, valor, observacao, created_at,
          solicitacoes!recebimentos_caixa_solicitacao_id_fkey (
            codigo,
            clientes!solicitacoes_cliente_id_fkey (nome)
          )
        )
      `)
      .order("data", { ascending: false })
      .then(({ data }) => {
        if (!data) { setLoaded(true); return; }
        const mapped: CaixaEntregador[] = data.map((row: Record<string, unknown>) => {
          const troco = row.troco_inicial as number;
          const dbRecebimentos = (row.recebimentos_caixa as Array<Record<string, unknown>>) ?? [];
          const recebimentos: RecebimentoDinheiro[] = dbRecebimentos.map((r) => {
            const obs = (r.observacao as string) ?? "";
            const sol = r.solicitacoes as { codigo: string; clientes: { nome: string } | null } | null;
            const solCodigo = sol?.codigo ?? "";
            const clienteNome = sol?.clientes?.nome ?? "";
            return {
              id: r.id as string,
              solicitacao_id: r.solicitacao_id as string | null,
              solicitacao_codigo: solCodigo,
              cliente_nome: clienteNome,
              valor_recebido: Number(r.valor),
              hora: new Date(r.created_at as string).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
              observacao: obs || null,
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

  const abrirCaixa = useCallback(async (entregadorId: string, trocoInicial: number): Promise<boolean> => {
    const entNome = entregadoresCache[entregadorId] ?? entregadorId;
    const hoje = new Date().toISOString().split("T")[0];

    // Bloqueia abertura se já existe qualquer caixa aberto — força fechar o anterior primeiro
    const jaAberto = caixas.find(
      (c) => c.entregador_id === entregadorId && c.status === "aberto"
    );
    if (jaAberto) return false;

    // Aguarda o INSERT para obter o UUID real antes de atualizar o estado.
    // Evita que addRecebimentoAutomatico use um ID temporário inválido como UUID.
    const { data: rows, error } = await supabase.from("caixas_entregadores").insert({
      entregador_id: entregadorId,
      data: hoje,
      troco_inicial: trocoInicial,
      valor_devolvido: null,
      diferenca: null,
      justificativa_divergencia: null,
      observacoes: null,
      status: "aberto",
      aberto_por_id: null,
      fechado_por_id: null,
    }).select("id");

    if (error || !rows?.[0]) return false;

    const novo: CaixaEntregador = {
      id: rows[0].id,
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
    addLog({
      categoria: "financeiro",
      acao: "caixa_aberto",
      entidade_id: entregadorId,
      descricao: `Caixa aberto para ${entNome} com troco de ${formatCurrency(trocoInicial)}`,
      detalhes: { troco_inicial: trocoInicial },
    });
    return true;
  }, [addLog, caixas, entregadoresCache]);

  const fecharCaixa = useCallback(async (caixaId: string, valorDevolvido: number, observacoes: string): Promise<boolean> => {
    const caixa = caixas.find((c) => c.id === caixaId);
    if (!caixa) return false;

    const diferenca = valorDevolvido - caixa.total_esperado;
    const novoStatus: StatusCaixa = diferenca === 0 ? "fechado" : "divergente";
    const updated: CaixaEntregador = {
      ...caixa,
      valor_devolvido: valorDevolvido,
      diferenca,
      status: novoStatus,
      observacoes: observacoes || caixa.observacoes,
      closed_at: new Date().toISOString(),
    };

    // Atualização otimista: tela muda imediatamente
    setCaixas((prev) => prev.map((c) => (c.id === caixaId ? updated : c)));

    const { error } = await supabase.from("caixas_entregadores").update({
      valor_devolvido: updated.valor_devolvido,
      diferenca: updated.diferenca,
      status: updated.status,
      observacoes: updated.observacoes,
    }).eq("id", caixaId);

    if (error) {
      // Reverte a tela para o estado anterior se o banco falhou
      setCaixas((prev) => prev.map((c) => (c.id === caixaId ? caixa : c)));
      return false;
    }

    addLog({
      categoria: "financeiro",
      acao: "caixa_fechado",
      entidade_id: caixa.entregador_id,
      descricao: `Caixa de ${caixa.entregador_nome} fechado. Diferença: ${formatCurrency(diferenca)}`,
      detalhes: { esperado: caixa.total_esperado, devolvido: valorDevolvido, diferenca, status: novoStatus },
    });
    return true;
  }, [addLog, caixas]);

  const deleteCaixa = useCallback(async (caixaId: string): Promise<{ success: boolean; error?: string }> => {
    const caixa = caixas.find((c) => c.id === caixaId);
    if (!caixa) return { success: false, error: "Caixa não encontrado." };

    // Só permite excluir caixas vazios — um caixa com recebimento já registrado
    // não pode sumir sem deixar rastro do dinheiro recebido pelo entregador.
    if (caixa.recebimentos.length > 0) {
      return { success: false, error: "Este caixa tem recebimentos registrados e não pode ser excluído. Remova os recebimentos primeiro." };
    }

    const { error } = await supabase.from("caixas_entregadores").delete().eq("id", caixaId);

    if (error) {
      // Índice/FK do banco (recebimentos_caixa ON DELETE RESTRICT) pegou algo que o
      // estado local não sabia — mesma mensagem amigável do guard acima.
      if (error.code === "23503") {
        return { success: false, error: "Este caixa tem recebimentos registrados e não pode ser excluído. Remova os recebimentos primeiro." };
      }
      return { success: false, error: error.message };
    }

    setCaixas((prev) => prev.filter((c) => c.id !== caixaId));

    addLog({
      categoria: "financeiro",
      acao: "caixa_excluido",
      entidade_id: caixa.entregador_id,
      descricao: `Caixa de ${caixa.entregador_nome} (troco ${formatCurrency(caixa.troco_inicial)}) excluído`,
      detalhes: { troco_inicial: caixa.troco_inicial, status_anterior: caixa.status },
    });

    return { success: true };
  }, [addLog, caixas]);

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
      // Registra o recebimento num caixa já aberto (existente ou recém-criado) —
      // nunca desiste, para o dinheiro nunca ficar sem lugar pra cair
      const registrarEm = (caixaId: string) => {
        // Verifica duplicata antes de inserir — protege contra duplo clique no "Concluir"
        supabase
          .from("recebimentos_caixa")
          .select("id")
          .eq("caixa_id", caixaId)
          .eq("solicitacao_id", solicitacaoId)
          .maybeSingle()
          .then(({ data: existing }) => {
            if (existing) return;

            supabase
              .from("recebimentos_caixa")
              .insert({
                caixa_id: caixaId,
                solicitacao_id: solicitacaoId,
                rota_id: null,
                forma_pagamento_id: null,
                valor,
                pertence_a: "operacao" as const,
                observacao: `${solicitacaoCodigo} - ${clienteNome}`,
              })
              .select("id, created_at")
              .then(({ data: rows, error }) => {
                if (error) {
                  // Insert falhou (RLS, índice único, rede) — avisa em vez de fingir sucesso
                  addLog({
                    categoria: "financeiro",
                    acao: "recebimento_falhou",
                    entidade_id: entregadorId,
                    descricao: `Falha ao registrar recebimento de ${formatCurrency(valor)} (${solicitacaoCodigo}) no caixa — ${error.message}`,
                    detalhes: { solicitacaoId, solicitacaoCodigo, clienteNome, valor, error: error.message },
                  });
                  window.dispatchEvent(
                    new CustomEvent("recebimento-sem-caixa", {
                      detail: {
                        entregadorId,
                        solicitacaoCodigo,
                        clienteNome,
                        valor,
                        message: `Falha ao registrar ${formatCurrency(valor)} de ${solicitacaoCodigo} no caixa — verifique manualmente`,
                      },
                    })
                  );
                  return;
                }

                const inserted = rows?.[0];
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
                  const idx = prev.findIndex((c) => c.id === caixaId);
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

                addLog({
                  categoria: "financeiro",
                  acao: "recebimento_caixa",
                  entidade_id: entregadorId,
                  descricao: `Recebimento de ${formatCurrency(valor)} registrado automaticamente no caixa (${solicitacaoCodigo})`,
                  detalhes: { solicitacao: solicitacaoCodigo, cliente: clienteNome, valor },
                });
              });
          });
      };

      // Busca qualquer caixa aberto — sem restrição de data, pois o admin pode ter deixado
      // o caixa do dia anterior aberto e deve fechá-lo antes de abrir um novo
      const caixa = caixas.find(
        (c) => c.entregador_id === entregadorId && c.status === "aberto"
      );

      if (caixa) {
        registrarEm(caixa.id);
        return;
      }

      // Sem caixa aberto: abre um automaticamente com troco zero em vez de
      // descartar o recebimento — o dinheiro nunca pode ficar sem registro
      const entNome = entregadoresCache[entregadorId] ?? entregadorId;
      const hoje = new Date().toISOString().split("T")[0];
      const observacaoAutoAbertura = "Aberto automaticamente ao registrar recebimento sem caixa aberto";

      supabase
        .from("caixas_entregadores")
        .insert({
          entregador_id: entregadorId,
          data: hoje,
          troco_inicial: 0,
          valor_devolvido: null,
          diferenca: null,
          justificativa_divergencia: null,
          observacoes: observacaoAutoAbertura,
          status: "aberto",
          aberto_por_id: null,
          fechado_por_id: null,
        })
        .select("id")
        .then(({ data: rows, error }) => {
          if (error || !rows?.[0]) {
            addLog({
              categoria: "financeiro",
              acao: "recebimento_falhou",
              entidade_id: entregadorId,
              descricao: `Falha ao abrir caixa automático para registrar ${formatCurrency(valor)} (${solicitacaoCodigo})`,
              detalhes: { solicitacaoId, solicitacaoCodigo, clienteNome, valor, error: error?.message },
            });
            window.dispatchEvent(
              new CustomEvent("recebimento-sem-caixa", {
                detail: {
                  entregadorId,
                  solicitacaoCodigo,
                  clienteNome,
                  valor,
                  message: `Falha ao abrir caixa automático para ${formatCurrency(valor)} de ${solicitacaoCodigo} — verifique manualmente`,
                },
              })
            );
            return;
          }

          const novoCaixaId = rows[0].id;
          const novoCaixa: CaixaEntregador = {
            id: novoCaixaId,
            entregador_id: entregadorId,
            entregador_nome: entNome,
            data: hoje,
            troco_inicial: 0,
            recebimentos: [],
            total_recebido: 0,
            total_esperado: 0,
            valor_devolvido: null,
            diferenca: null,
            status: "aberto",
            observacoes: observacaoAutoAbertura,
            created_at: new Date().toISOString(),
            closed_at: null,
          };
          setCaixas((prev) => [novoCaixa, ...prev]);
          addLog({
            categoria: "financeiro",
            acao: "caixa_aberto_automatico",
            entidade_id: entregadorId,
            descricao: `Caixa aberto automaticamente para ${entNome} — sem caixa aberto ao registrar recebimento de ${formatCurrency(valor)} (${solicitacaoCodigo})`,
            detalhes: { solicitacaoId, solicitacaoCodigo, clienteNome, valor },
          });

          registrarEm(novoCaixaId);
        });
    },
    [addLog, caixas, entregadoresCache]
  );

  const removeRecebimento = useCallback(async (caixaId: string, recebimentoId: string) => {
    await supabase.from("recebimentos_caixa").delete().eq("id", recebimentoId);
    setCaixas((prev) =>
      prev.map((c) => {
        if (c.id !== caixaId) return c;
        const novosRec = c.recebimentos.filter((r) => r.id !== recebimentoId);
        const novoTotal = novosRec.reduce((s, r) => s + r.valor_recebido, 0);
        return { ...c, recebimentos: novosRec, total_recebido: novoTotal, total_esperado: c.troco_inicial + novoTotal };
      })
    );
  }, []);

  const getCaixasByEntregador = useCallback(
    (entregadorId: string) =>
      caixas.filter((c) => c.entregador_id === entregadorId).sort((a, b) => b.data.localeCompare(a.data)),
    [caixas]
  );

  const getCaixaAberto = useCallback(
    (entregadorId: string) =>
      caixas.find((c) => c.entregador_id === entregadorId && c.status === "aberto"),
    [caixas]
  );

  const value = useMemo<CaixaStoreContextType>(
    () => ({
      caixas,
      abrirCaixa,
      fecharCaixa,
      editarCaixa,
      deleteCaixa,
      justificarDivergencia,
      addRecebimentoAutomatico,
      removeRecebimento,
      getCaixasByEntregador,
      getCaixaAberto,
      ensureLoaded,
    }),
    [caixas, abrirCaixa, fecharCaixa, editarCaixa, deleteCaixa, justificarDivergencia, addRecebimentoAutomatico, removeRecebimento, getCaixasByEntregador, getCaixaAberto, ensureLoaded]
  );

  return <CaixaStoreContext.Provider value={value}>{children}</CaixaStoreContext.Provider>;
}

export function useCaixaStore(): CaixaStoreContextType {
  const ctx = useContext(CaixaStoreContext);
  if (!ctx) throw new Error("useCaixaStore must be used within CaixaStoreProvider");
  ctx.ensureLoaded();
  return ctx;
}

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import { MOCK_CAIXAS, type CaixaEntregador, type StatusCaixa, type RecebimentoDinheiro } from "@/data/mockCaixas";
import { MOCK_ENTREGADORES } from "@/data/mockEntregadores";
import { formatCurrency } from "@/lib/formatters";
import { useLogStore } from "@/contexts/LogStore";

interface CaixaStoreContextType {
  caixas: CaixaEntregador[];
  abrirCaixa: (entregadorId: string, trocoInicial: number) => boolean;
  fecharCaixa: (caixaId: string, valorDevolvido: number, observacoes: string) => void;
  editarCaixa: (caixaId: string, trocoInicial: number, observacoes: string) => void;
  justificarDivergencia: (caixaId: string, justificativa: string) => void;
  addRecebimentoAutomatico: (entregadorId: string, solicitacaoCodigo: string, clienteNome: string, valor: number) => void;
  getCaixasByEntregador: (entregadorId: string) => CaixaEntregador[];
  getCaixaAberto: (entregadorId: string) => CaixaEntregador | undefined;
}

const CaixaStoreContext = createContext<CaixaStoreContextType | null>(null);

export function CaixaStoreProvider({ children }: { children: ReactNode }) {
  const { addLog } = useLogStore();
  const [caixas, setCaixas] = useState<CaixaEntregador[]>(MOCK_CAIXAS);

  const abrirCaixa = useCallback((entregadorId: string, trocoInicial: number) => {
    const ent = MOCK_ENTREGADORES.find((e) => e.id === entregadorId);
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
      entregador_nome: ent?.nome ?? entregadorId,
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
      descricao: `Caixa aberto para ${ent?.nome} com troco de ${formatCurrency(trocoInicial)}`,
      detalhes: { troco_inicial: trocoInicial },
    });
    return true;
  }, [addLog, caixas]);

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
        return {
          ...c,
          valor_devolvido: valorDevolvido,
          diferenca,
          status: novoStatus,
          observacoes: observacoes || c.observacoes,
          closed_at: new Date().toISOString(),
        };
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
        return {
          ...c,
          troco_inicial: trocoInicial,
          total_esperado: novoEsperado,
          diferenca: novaDiferenca,
          status: novoStatus,
          observacoes: observacoes || c.observacoes,
        };
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
        return { ...c, observacoes: justificativa };
      })
    );
  }, [addLog]);

  // Auto-add recebimento when a solicitação with cash payment is concluded
  const addRecebimentoAutomatico = useCallback(
    (entregadorId: string, solicitacaoCodigo: string, clienteNome: string, valor: number) => {
      const hoje = new Date().toISOString().split("T")[0];
      setCaixas((prev) => {
        const caixaIndex = prev.findIndex(
          (c) => c.entregador_id === entregadorId && c.status === "aberto" && c.data === hoje
        );
        if (caixaIndex === -1) return prev; // No open caixa for this driver today

        const caixa = prev[caixaIndex];
        const novoRecebimento: RecebimentoDinheiro = {
          id: `rec-${Date.now()}`,
          solicitacao_codigo: solicitacaoCodigo,
          cliente_nome: clienteNome,
          valor_recebido: valor,
          hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        };

        const novoTotalRecebido = caixa.total_recebido + valor;
        const novoTotalEsperado = caixa.troco_inicial + novoTotalRecebido;

        const updated: CaixaEntregador = {
          ...caixa,
          recebimentos: [...caixa.recebimentos, novoRecebimento],
          total_recebido: novoTotalRecebido,
          total_esperado: novoTotalEsperado,
        };

        const result = [...prev];
        result[caixaIndex] = updated;
        return result;
      });

      addLog({
        categoria: "financeiro",
        acao: "recebimento_caixa",
        entidade_id: entregadorId,
        descricao: `Recebimento de ${formatCurrency(valor)} registrado automaticamente no caixa (${solicitacaoCodigo})`,
        detalhes: { solicitacao: solicitacaoCodigo, cliente: clienteNome, valor },
      });
    },
    [addLog]
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
    }),
    [caixas, abrirCaixa, fecharCaixa, editarCaixa, justificarDivergencia, addRecebimentoAutomatico, getCaixasByEntregador, getCaixaAberto]
  );

  return <CaixaStoreContext.Provider value={value}>{children}</CaixaStoreContext.Provider>;
}

export function useCaixaStore(): CaixaStoreContextType {
  const ctx = useContext(CaixaStoreContext);
  if (!ctx) throw new Error("useCaixaStore must be used within CaixaStoreProvider");
  return ctx;
}

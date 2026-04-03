import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import type { Solicitacao, Rota, PagamentoSolicitacao, Fatura, StatusSolicitacao, HistoricoEvento, RecargaPrePago } from "@/types/database";
import { MOCK_SOLICITACOES, MOCK_ROTAS, MOCK_PAGAMENTOS_SOLICITACAO, getClienteName, getEntregadorName } from "@/data/mockSolicitacoes";
import { MOCK_FATURAS, MOCK_LANCAMENTOS, MOCK_AJUSTES } from "@/data/mockFaturas";
import { MOCK_CLIENTES } from "@/data/mockClientes";
import type { EntregaFatura } from "@/data/mockFaturas";
import { formatCurrency } from "@/lib/formatters";
import { useLogStore } from "@/contexts/LogStore";
import { useSettingsStore } from "@/contexts/SettingsStore";

// Fix inconsistent historico for sol-005 and sol-010
function fixMockHistorico(sols: Solicitacao[]): Solicitacao[] {
  return sols.map((s) => {
    if (s.id === "sol-005" && s.historico.length === 2) {
      return {
        ...s,
        historico: [
          { tipo: "criacao", timestamp: "2026-03-14T14:00:00Z", descricao: "Solicitação criada" },
          { tipo: "aceita", status_anterior: "pendente", status_novo: "aceita", timestamp: "2026-03-14T14:10:00Z", descricao: "Aceita e atribuída a Lucas Pereira" },
          { tipo: "em_andamento", status_anterior: "aceita", status_novo: "em_andamento", timestamp: "2026-03-14T14:20:00Z", descricao: "Entregador iniciou coleta" },
          { tipo: "concluida", status_anterior: "em_andamento", status_novo: "concluida", timestamp: "2026-03-14T15:30:00Z", descricao: "Entrega concluída e conciliada" },
        ],
      };
    }
    if (s.id === "sol-010" && s.historico.length === 2) {
      return {
        ...s,
        historico: [
          { tipo: "criacao", timestamp: "2026-03-14T09:00:00Z", descricao: "Solicitação criada" },
          { tipo: "aceita", status_anterior: "pendente", status_novo: "aceita", timestamp: "2026-03-14T09:10:00Z", descricao: "Aceita e atribuída a Ricardo Oliveira" },
          { tipo: "em_andamento", status_anterior: "aceita", status_novo: "em_andamento", timestamp: "2026-03-14T09:20:00Z", descricao: "Entregador iniciou coleta" },
          { tipo: "concluida", status_anterior: "em_andamento", status_novo: "concluida", timestamp: "2026-03-14T10:45:00Z", descricao: "Entrega concluída e conciliada" },
        ],
      };
    }
    return s;
  });
}

interface GlobalStoreContextType {
  // State
  solicitacoes: Solicitacao[];
  rotas: Rota[];
  pagamentos: PagamentoSolicitacao[];
  faturas: Fatura[];
  entregasFatura: Record<string, EntregaFatura[]>;
  recargas: RecargaPrePago[];

  // Solicitacao actions
  addSolicitacao: (sol: Solicitacao, novasRotas?: Rota[]) => void;
  updateSolicitacao: (id: string, updater: (s: Solicitacao) => Solicitacao) => void;

  // Pagamentos actions
  addPagamentos: (pags: PagamentoSolicitacao[]) => void;
  getPagamentosByRota: (rotaId: string) => PagamentoSolicitacao[];
  getPagamentosBySolicitacao: (solId: string) => PagamentoSolicitacao[];

  // Rotas
  getRotasBySolicitacao: (solId: string) => Rota[];

  // Faturas actions
  updateFatura: (id: string, updater: (f: Fatura) => Fatura) => void;
  addFatura: (f: Fatura) => void;
  addEntregaToFatura: (faturaId: string, entrega: EntregaFatura) => void;

  // High-level actions
  concluirSolicitacaoComFatura: (solId: string) => { success: boolean; error?: string };

  // Validação pré-pago
  verificarSaldoPrePago: (solId: string) => { ok: boolean; saldo: number; taxas: number };

  // Helpers
  getClienteSaldo: (clienteId: string) => number;

  // Recargas pré-pago
  addRecarga: (recarga: RecargaPrePago) => void;
  getRecargasByCliente: (clienteId: string) => RecargaPrePago[];
}

const GlobalStoreContext = createContext<GlobalStoreContextType | null>(null);

export function GlobalStoreProvider({ children }: { children: ReactNode }) {
  const { addLog } = useLogStore();
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>(() => fixMockHistorico(MOCK_SOLICITACOES));
  const [rotas, setRotas] = useState<Rota[]>(MOCK_ROTAS);
  const [pagamentos, setPagamentos] = useState<PagamentoSolicitacao[]>(MOCK_PAGAMENTOS_SOLICITACAO);
  const [faturas, setFaturas] = useState<Fatura[]>(MOCK_FATURAS);
  const [entregasFatura, setEntregasFatura] = useState<Record<string, EntregaFatura[]>>({});
  const [recargas, setRecargas] = useState<RecargaPrePago[]>([]);

  const addSolicitacao = useCallback((sol: Solicitacao, novasRotas?: Rota[]) => {
    setSolicitacoes((prev) => [sol, ...prev]);
    if (novasRotas?.length) {
      setRotas((prev) => [...prev, ...novasRotas]);
    }
    addLog({
      categoria: "solicitacao",
      acao: "criada",
      entidade_id: sol.codigo ?? sol.id,
      descricao: `Solicitação ${sol.codigo} criada para ${getClienteName(sol.cliente_id)}`,
      detalhes: { rotas: novasRotas?.length ?? 0, tipo_operacao: sol.tipo_operacao },
    });
  }, [addLog]);

  const updateSolicitacao = useCallback((id: string, updater: (s: Solicitacao) => Solicitacao) => {
    setSolicitacoes((prev) => prev.map((s) => {
      if (s.id !== id) return s;
      const updated = updater(s);
      if (updated.status !== s.status) {
        addLog({
          categoria: "solicitacao",
          acao: "status_alterado",
          entidade_id: updated.codigo ?? id,
          descricao: `Status alterado de ${s.status} para ${updated.status}`,
          detalhes: { anterior: s.status, novo: updated.status },
        });
      }
      return updated;
    }));
  }, [addLog]);

  const addPagamentos = useCallback((pags: PagamentoSolicitacao[]) => {
    setPagamentos((prev) => {
      if (pags.length > 0) {
        const solId = pags[0].solicitacao_id;
        const filtered = prev.filter((p) => p.solicitacao_id !== solId);
        addLog({
          categoria: "solicitacao",
          acao: "conciliacao_registrada",
          entidade_id: solId,
          descricao: `${pags.length} pagamento(s) registrado(s) na conciliação`,
          detalhes: { total_pagamentos: pags.length, valor_total: pags.reduce((s, p) => s + p.valor, 0) },
        });
        return [...filtered, ...pags];
      }
      return prev;
    });
  }, [addLog]);

  const getPagamentosByRota = useCallback(
    (rotaId: string) => pagamentos.filter((p) => p.rota_id === rotaId),
    [pagamentos]
  );

  const getPagamentosBySolicitacao = useCallback(
    (solId: string) => pagamentos.filter((p) => p.solicitacao_id === solId),
    [pagamentos]
  );

  const getRotasBySolicitacao = useCallback(
    (solId: string) => rotas.filter((r) => r.solicitacao_id === solId),
    [rotas]
  );

  const updateFatura = useCallback((id: string, updater: (f: Fatura) => Fatura) => {
    setFaturas((prev) => prev.map((f) => {
      if (f.id !== id) return f;
      const updated = updater(f);
      addLog({
        categoria: "fatura",
        acao: "atualizada",
        entidade_id: updated.numero ?? id,
        descricao: `Fatura ${updated.numero} atualizada`,
        detalhes: { status_anterior: f.status_geral, status_novo: updated.status_geral },
      });
      return updated;
    }));
  }, [addLog]);

  const addFatura = useCallback((f: Fatura) => {
    setFaturas((prev) => [f, ...prev]);
    addLog({
      categoria: "fatura",
      acao: "criada",
      entidade_id: f.numero ?? f.id,
      descricao: `Fatura ${f.numero} criada para ${f.cliente_nome}`,
      detalhes: { cliente: f.cliente_nome, valor_taxas: f.valor_taxas },
    });
  }, [addLog]);

  const addEntregaToFatura = useCallback((faturaId: string, entrega: EntregaFatura) => {
    setEntregasFatura((prev) => ({
      ...prev,
      [faturaId]: [...(prev[faturaId] || []), entrega],
    }));
    setFaturas((prev) =>
      prev.map((f) => {
        if (f.id !== faturaId) return f;
        addLog({
          categoria: "fatura",
          acao: "entrega_adicionada",
          entidade_id: f.numero ?? faturaId,
          descricao: `Entrega ${entrega.codigo} adicionada à fatura ${f.numero}`,
          detalhes: { solicitacao: entrega.codigo, valor_taxas: entrega.valor_taxas },
        });
        return {
          ...f,
          total_entregas: f.total_entregas + 1,
          valor_taxas: (f.valor_taxas ?? 0) + entrega.valor_taxas,
          total_creditos_loja: (f.total_creditos_loja ?? 0) + entrega.valor_recebido_cliente,
          total_debitos_loja: (f.total_debitos_loja ?? 0) + entrega.valor_taxas,
          saldo_liquido: ((f.total_creditos_loja ?? 0) + entrega.valor_recebido_cliente) - ((f.total_debitos_loja ?? 0) + entrega.valor_taxas),
          updated_at: new Date().toISOString(),
        };
      })
    );
  }, [addLog]);

  // Dynamic prepaid balance calculation (base deposit + recargas - taxas)
  const getClienteSaldo = useCallback(
    (clienteId: string) => {
      const cliente = MOCK_CLIENTES.find((c) => c.id === clienteId);
      if (!cliente || cliente.modalidade !== "pre_pago") return 0;
      const baseDeposit = 600;
      const totalRecargas = recargas
        .filter((r) => r.cliente_id === clienteId)
        .reduce((sum, r) => sum + r.valor, 0);
      const taxasCobradas = solicitacoes
        .filter((s) => s.cliente_id === clienteId && s.status === "concluida")
        .reduce((sum, s) => sum + (s.valor_total_taxas ?? 0), 0);
      return baseDeposit + totalRecargas - taxasCobradas;
    },
    [solicitacoes, recargas]
  );

  // Recargas pré-pago
  const addRecarga = useCallback((recarga: RecargaPrePago) => {
    setRecargas((prev) => [recarga, ...prev]);
    const cliente = MOCK_CLIENTES.find((c) => c.id === recarga.cliente_id);
    addLog({
      categoria: "financeiro",
      acao: "recarga_pre_pago",
      entidade_id: recarga.cliente_id,
      descricao: `Recarga de ${formatCurrency(recarga.valor)} para ${cliente?.nome ?? recarga.cliente_id}`,
      detalhes: { valor: recarga.valor, observacao: recarga.observacao },
    });
  }, [addLog]);

  const getRecargasByCliente = useCallback(
    (clienteId: string) => recargas.filter((r) => r.cliente_id === clienteId),
    [recargas]
  );

  // Verifica se cliente pré-pago tem saldo suficiente para concluir
  const verificarSaldoPrePago = useCallback(
    (solId: string): { ok: boolean; saldo: number; taxas: number } => {
      const sol = solicitacoes.find((s) => s.id === solId);
      if (!sol) return { ok: false, saldo: 0, taxas: 0 };

      const cliente = MOCK_CLIENTES.find((c) => c.id === sol.cliente_id);
      if (!cliente || cliente.modalidade !== "pre_pago") return { ok: true, saldo: 0, taxas: 0 };

      const solRotas = rotas.filter((r) => r.solicitacao_id === solId);
      const totalTaxas = solRotas.reduce((s, r) => s + (r.taxa_resolvida ?? 0), 0);
      const saldo = getClienteSaldo(sol.cliente_id);

      return { ok: saldo >= totalTaxas, saldo, taxas: totalTaxas };
    },
    [solicitacoes, rotas, getClienteSaldo]
  );

  // Conclude solicitação and auto-link to fatura for faturado clients
  const concluirSolicitacaoComFatura = useCallback(
    (solId: string): { success: boolean; error?: string } => {
      const sol = solicitacoes.find((s) => s.id === solId);
      if (!sol) return { success: false, error: "Solicitação não encontrada." };

      // ── Validação de saldo pré-pago ──
      const cliente = MOCK_CLIENTES.find((c) => c.id === sol.cliente_id);
      if (cliente?.modalidade === "pre_pago") {
        const { ok, saldo, taxas } = verificarSaldoPrePago(solId);
        if (!ok) {
          const faltante = (taxas - saldo).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          const saldoFmt = saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          return {
            success: false,
            error: `Saldo insuficiente. Saldo atual: ${saldoFmt} — faltam ${faltante}. Solicite uma recarga antes de concluir.`,
          };
        }
      }

      // ── Notificação de saldo baixo pré-pago ──
      if (cliente?.modalidade === "pre_pago") {
        const { saldo, taxas } = verificarSaldoPrePago(solId);
        const saldoApos = saldo - taxas;
        const LIMITE_MINIMO = useSettingsStore.getState().limite_saldo_pre_pago;
        if (saldoApos < LIMITE_MINIMO && saldoApos >= 0) {
          // Dispara após o state update para não bloquear
          setTimeout(() => {
            const saldoFmt = saldoApos.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
            const limiteFmt = LIMITE_MINIMO.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
            window.dispatchEvent(new CustomEvent("saldo-baixo-pre-pago", {
              detail: {
                clienteId: sol.cliente_id,
                clienteNome: cliente.nome,
                saldoApos,
                limite: LIMITE_MINIMO,
                message: `⚠️ Saldo baixo: ${cliente.nome} ficará com ${saldoFmt} (limite: ${limiteFmt}). Solicite uma recarga.`,
              },
            }));
          }, 0);
        }
      }

      const now = new Date().toISOString();
      // Update solicitação status
      updateSolicitacao(solId, (s) => ({
        ...s,
        status: "concluida" as StatusSolicitacao,
        data_conclusao: now,
        historico: [
          ...s.historico,
          { tipo: "concluida", status_anterior: "em_andamento", status_novo: "concluida", timestamp: now, descricao: "Entrega concluída e conciliada" },
        ],
      }));

      if (!cliente || cliente.modalidade !== "faturado") return { success: true };

      // Find or create active fatura for this client
      const solRotas = rotas.filter((r) => r.solicitacao_id === solId);
      const totalTaxas = solRotas.reduce((s, r) => s + (r.taxa_resolvida ?? 0), 0);
      const totalRecebido = solRotas.filter((r) => r.receber_do_cliente).reduce((s, r) => s + (r.valor_a_receber ?? 0), 0);

      const entrega: EntregaFatura = {
        solicitacao_id: solId,
        codigo: sol.codigo,
        entregador_nome: getEntregadorName(sol.entregador_id),
        data_conclusao: now,
        total_rotas: solRotas.length,
        valor_taxas: totalTaxas,
        valor_recebido_cliente: totalRecebido,
        status: "concluida",
        ponto_coleta: sol.ponto_coleta,
        rotas: solRotas.map((r) => ({
          bairro_destino: r.bairro_destino_id,
          responsavel: r.responsavel,
          telefone: r.telefone,
          taxa: r.taxa_resolvida ?? 0,
          valor_receber: r.valor_a_receber ?? null,
          status: "concluida" as const,
        })),
      };

      // Try to find existing open fatura
      let activeFatura = faturas.find(
        (f) => f.cliente_id === sol.cliente_id && (f.status_geral === "Aberta")
      );

      if (activeFatura) {
        addEntregaToFatura(activeFatura.id, entrega);
      } else {
        // Create new fatura
        const fatId = `fat-${Date.now()}`;
        const vencimento = new Date();
        vencimento.setDate(vencimento.getDate() + 7);
        const novaFatura: Fatura = {
          id: fatId,
          numero: `FAT-${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(faturas.length + 1).padStart(3, "0")}`,
          cliente_id: sol.cliente_id,
          cliente_nome: cliente.nome,
          tipo_faturamento: cliente.frequencia_faturamento ?? "manual",
          total_entregas: 1,
          data_emissao: now,
          data_vencimento: vencimento.toISOString(),
          valor_taxas: totalTaxas,
          valor_repasse: null,
          total_creditos_loja: totalRecebido,
          total_debitos_loja: totalTaxas,
          saldo_liquido: totalRecebido - totalTaxas,
          status_geral: "Aberta",
          status_taxas: "Pendente",
          status_repasse: "Pendente",
          status_cobranca: "Nao_aplicavel",
          observacoes: null,
          historico: [
            { tipo: "criacao", timestamp: now, descricao: "Fatura gerada automaticamente" },
          ],
          created_at: now,
          updated_at: now,
        };
        addFatura(novaFatura);
        setEntregasFatura((prev) => ({ ...prev, [fatId]: [entrega] }));
      }

      return { success: true };
    },
    [solicitacoes, rotas, faturas, updateSolicitacao, addEntregaToFatura, addFatura, verificarSaldoPrePago, getClienteSaldo]
  );

  const value = useMemo<GlobalStoreContextType>(
    () => ({
      solicitacoes,
      rotas,
      pagamentos,
      faturas,
      entregasFatura,
      recargas,
      addSolicitacao,
      updateSolicitacao,
      addPagamentos,
      getPagamentosByRota,
      getPagamentosBySolicitacao,
      getRotasBySolicitacao,
      updateFatura,
      addFatura,
      addEntregaToFatura,
      concluirSolicitacaoComFatura,
      verificarSaldoPrePago,
      getClienteSaldo,
      addRecarga,
      getRecargasByCliente,
    }),
    [solicitacoes, rotas, pagamentos, faturas, entregasFatura, recargas, addSolicitacao, updateSolicitacao, addPagamentos, getPagamentosByRota, getPagamentosBySolicitacao, getRotasBySolicitacao, updateFatura, addFatura, addEntregaToFatura, concluirSolicitacaoComFatura, verificarSaldoPrePago, getClienteSaldo, addRecarga, getRecargasByCliente]
  );

  return <GlobalStoreContext.Provider value={value}>{children}</GlobalStoreContext.Provider>;
}

export function useGlobalStore(): GlobalStoreContextType {
  const ctx = useContext(GlobalStoreContext);
  if (!ctx) throw new Error("useGlobalStore must be used within GlobalStoreProvider");
  return ctx;
}

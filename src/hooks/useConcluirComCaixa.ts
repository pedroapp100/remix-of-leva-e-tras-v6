import { useCallback } from "react";
import { useSolicitacoes, useUpdateSolicitacao, useUpdateRotasBulk } from "@/hooks/useSolicitacoes";
import { fetchRotasBySolicitacao, fetchTaxasExtrasByRotaIds } from "@/services/solicitacoes";
import { rowToRota } from "@/lib/mappers";
import { useClientes, useClienteSaldoMap } from "@/hooks/useClientes";
import { useEntregadores } from "@/hooks/useEntregadores";
import { useFaturas, useConcluirFaturaEntrega, useUpdateFatura } from "@/hooks/useFaturas";
import { useCaixaStore } from "@/contexts/CaixaStore";
import { useSettingsStore } from "@/contexts/SettingsStore";
import { notificarEntregaConcluida, notificarFaturaGerada, notificarFaturaFechada, notificarSaldoBaixo } from "@/services/whatsapp";
import type { SolicitacaoUpdate } from "@/services/solicitacoes";
import { useCreateReceita } from "@/hooks/useFinanceiro";
import { useCreateHistoricoFatura } from "@/hooks/useFaturas";
import { buildReceitaFromFatura } from "@/lib/faturaReceita";

/**
 * Hook that concludes a solicitação, auto-creates/updates fatura for
 * faturado clients, checks pre-paid balance, and auto-adds cash
 * recebimentos to the driver's open caixa.
 *
 * Returns an async function { success, error? }.
 */
export function useConcluirComCaixa() {
  const { data: solicitacoes = [] } = useSolicitacoes();
  const { data: clientes = [] } = useClientes();
  const { data: entregadores = [] } = useEntregadores();
  const { data: faturas = [] } = useFaturas();
  const { getClienteSaldo } = useClienteSaldoMap();

  const updateSolMut = useUpdateSolicitacao();
  const updateRotasBulkMut = useUpdateRotasBulk();
  const concluirFaturaMut = useConcluirFaturaEntrega();
  const updateFaturaMut = useUpdateFatura();
  const createReceita = useCreateReceita();
  const createHistoricoFatura = useCreateHistoricoFatura();

  const { addRecebimentoAutomatico } = useCaixaStore();

  const concluirComCaixa = useCallback(
    async (solId: string, options?: { skipFatura?: boolean }): Promise<{ success: boolean; error?: string }> => {
      const sol = solicitacoes.find((s) => s.id === solId);
      if (!sol) return { success: false, error: "Solicitação não encontrada." };

      const cliente = clientes.find((c) => c.id === sol.cliente_id);

      // Fetch rotas fresh at action-time (never stale, uses idx_rotas_sol)
      let solRotas: ReturnType<typeof rowToRota>[];
      let taxasExtrasMap: Map<string, { nome: string; valor: number }[]>;
      try {
        const rawRotas = await fetchRotasBySolicitacao(solId);
        solRotas = rawRotas.map(rowToRota);
        taxasExtrasMap = await fetchTaxasExtrasByRotaIds(rawRotas.map((r) => r.id));
      } catch {
        return { success: false, error: "Erro ao carregar rotas da solicitação." };
      }

      // Helper: soma taxa base + todas as extras de uma rota
      const getRotaTotal = (r: (typeof solRotas)[0]) =>
        (r.taxa_resolvida ?? 0) + (taxasExtrasMap.get(r.id) ?? []).reduce((a, t) => a + t.valor, 0);

      // For invoiced clients: routes marked 'faturar' go to fatura.
      // Also includes pago_na_hora routes paid via maquina_loja — the loja kept the
      // operation fee and must be billed (money never reached the empresa).
      const isFaturavelRoute = (r: (typeof solRotas)[0]) =>
        r.pagamento_operacao === "faturar" ||
        (r.pagamento_operacao === "pago_na_hora" && r.meios_pagamento_operacao?.includes("maquina_loja"));
      const totalTaxasFaturar = solRotas
        .filter(isFaturavelRoute)
        .reduce((s, r) => s + getRotaTotal(r), 0);

      // For pre-paid clients: routes marked 'descontar_saldo' debit from balance
      const totalTaxasPrePago = solRotas
        .filter((r) => r.pagamento_operacao === "descontar_saldo")
        .reduce((s, r) => s + getRotaTotal(r), 0);

      // ── Pre-paid balance validation ──
      if (cliente?.modalidade === "pre_pago") {
        const saldo = getClienteSaldo(sol.cliente_id);
        if (saldo < totalTaxasPrePago) {
          const faltante = (totalTaxasPrePago - saldo).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          const saldoFmt = saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          return {
            success: false,
            error: `Saldo insuficiente. Saldo atual: ${saldoFmt} — faltam ${faltante}. Solicite uma recarga antes de concluir.`,
          };
        }

        // Low balance warning
        const saldoApos = saldo - totalTaxasPrePago;
        const LIMITE_MINIMO = useSettingsStore.getState().limite_saldo_pre_pago;
        if (saldoApos < LIMITE_MINIMO && saldoApos >= 0) {
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

            // WhatsApp: saldo baixo
            if (cliente.telefone) {
              notificarSaldoBaixo(cliente.telefone, {
                cliente_nome: cliente.nome,
                saldo: saldoFmt,
                limite: limiteFmt,
              }).catch(() => {/* fire-and-forget */});
            }
          }, 0);
        }
      }

      const now = new Date().toISOString();

      // ── Update solicitação status (persisted to DB) ──
      const patch: SolicitacaoUpdate = {
        status: "concluida",
        data_conclusao: now,
      };

      try {
        await updateSolMut.mutateAsync({ id: solId, patch });
      } catch {
        return { success: false, error: "Erro ao concluir solicitação." };
      }

      // ── Update rotas status to 'concluida' (fire-and-forget, non-fatal) ──
      updateRotasBulkMut.mutateAsync({ solicitacaoId: solId, status: "concluida" }).catch(() => {});

      // ── WhatsApp: entrega concluída ──
      if (cliente?.telefone) {
        const entregadorNome = sol.entregador_id
          ? entregadores.find((e) => e.id === sol.entregador_id)?.nome
          : undefined;
        notificarEntregaConcluida(cliente.telefone, {
          cliente_nome: cliente.nome,
          codigo: sol.codigo,
          entregador_nome: entregadorNome,
        }).catch(() => {/* fire-and-forget */});
      }

      // ── Auto-add cash to driver's caixa ──
      if (sol.entregador_id) {
        const recebimentosDinheiro = solRotas.filter((r) => r.receber_do_cliente && r.valor_a_receber);
        const totalDinheiro = recebimentosDinheiro.reduce((s, r) => s + (r.valor_a_receber ?? 0), 0);
        if (totalDinheiro > 0) {
          const clienteNome = clientes.find((c) => c.id === sol.cliente_id)?.nome ?? sol.cliente_id;
          addRecebimentoAutomatico(sol.entregador_id, solId, sol.codigo, clienteNome, totalDinheiro);
        }
      }

      // ── Fatura creation/update for faturado clients (persisted to DB) ──
      // skipFatura=true when called by the driver — invoicing is the admin's responsibility
      if (options?.skipFatura) return { success: true };

      // ── Pre-paid: gera fatura por entrega (status Paga) + lançamento via RPC ──
      if (cliente?.modalidade === "pre_pago") {
        const numRotasPrePago = solRotas.filter((r) => r.pagamento_operacao === "descontar_saldo").length;
        if (totalTaxasPrePago > 0) {
          try {
            const result = await concluirFaturaMut.mutateAsync({
              p_fatura_id: null,         // sempre nova fatura por entrega
              p_sol_id: solId,
              p_cliente_id: sol.cliente_id,
              p_cliente_nome: cliente.nome,
              p_tipo_faturamento: "por_entrega",
              p_total_taxas: totalTaxasPrePago,
              p_total_recebido: 0,       // sem repasse em dinheiro — saldo pré-pago
              p_sol_codigo: sol.codigo,
              p_num_rotas: numRotasPrePago,
            });

            if (!result.success) {
              return { success: true, error: result.error ?? "Erro ao gerar fatura pré-paga." };
            }

            // Marca a fatura como Paga imediatamente (saldo já foi debitado no ato)
            if (result.fatura_id) {
              await updateFaturaMut.mutateAsync({
                id: result.fatura_id,
                patch: { status_geral: "Paga", status_taxas: "Paga" },
              });
              // Lança receita automática para clientes pré-pagos
              const receitaPrePago = buildReceitaFromFatura({
                faturaId: result.fatura_id,
                faturaNumero: result.fatura_numero ?? "",
                clienteId: sol.cliente_id,
                valor: totalTaxasPrePago,
                tipo: "pagamento",
              });
              if (receitaPrePago) {
                createReceita.mutate(receitaPrePago, {
                  onSuccess: () => {
                    createHistoricoFatura.mutate({
                      fatura_id: result.fatura_id!,
                      tipo: "receita_lancada",
                      descricao: `Receita de ${totalTaxasPrePago.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} lançada automaticamente (pré-pago)`,
                      usuario_id: null,
                      valor_anterior: null,
                      valor_novo: totalTaxasPrePago,
                      metadata: null,
                    });
                  },
                });
              }
            }

            // Notifica nova fatura pré-paga
            if (result.fatura_numero) {
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent("nova-fatura-gerada", {
                  detail: {
                    faturaNumero: result.fatura_numero,
                    clienteNome: cliente.nome,
                    message: `Fatura ${result.fatura_numero} gerada para ${cliente.nome} (Pré-pago — saldo debitado).`,
                  },
                }));
              }, 0);

              // WhatsApp: nova fatura pré-paga
              if (cliente.telefone) {
                const valorFmt = totalTaxasPrePago.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                notificarFaturaGerada(cliente.telefone, {
                  cliente_nome: cliente.nome,
                  fatura_numero: result.fatura_numero,
                  valor: valorFmt,
                }).catch(() => {/* fire-and-forget */});
              }
            }
          } catch {
            return { success: true, error: "Solicitação concluída, mas houve erro ao gerar fatura pré-paga." };
          }
        }
        return { success: true };
      }

      if (!cliente || cliente.modalidade !== "faturado") return { success: true };

      // Apenas rotas onde o dinheiro passou pela empresa geram credito_loja.
      // maquina_loja, pix_loja e dinheiro+devolver_loja → lojista já recebeu direto.
      const totalRecebido = solRotas
        .filter((r) => {
          if (!r.receber_do_cliente) return false;
          if (r.meio_cobranca_destino === "pix_empresa") return true;
          if (r.meio_cobranca_destino === "dinheiro" && r.destino_dinheiro === "repassar_empresa") return true;
          return false;
        })
        .reduce((s, r) => s + (r.valor_a_receber ?? 0), 0);

      // Guard: skip fatura creation when nothing to invoice (all routes are pago_na_hora)
      if (totalTaxasFaturar === 0 && totalRecebido === 0) return { success: true };

      const activeFatura = faturas.find(
        (f) => f.cliente_id === sol.cliente_id && f.status_geral === "Aberta"
      );

      try {
        const result = await concluirFaturaMut.mutateAsync({
          p_fatura_id: activeFatura?.id ?? null,
          p_sol_id: solId,
          p_cliente_id: sol.cliente_id,
          p_cliente_nome: cliente.nome,
          p_tipo_faturamento: (cliente.frequencia_faturamento as string) ?? "manual",
          p_total_taxas: totalTaxasFaturar,
          p_total_recebido: totalRecebido,
          p_sol_codigo: sol.codigo,
          p_num_rotas: solRotas.filter(isFaturavelRoute).length,
        });

        if (!result.success) {
          return { success: true, error: result.error ?? "Erro ao gerar/atualizar fatura." };
        }

        // Dispatch notification for new faturas
        if (!activeFatura && result.fatura_numero) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("nova-fatura-gerada", {
              detail: {
                faturaNumero: result.fatura_numero,
                clienteNome: cliente.nome,
                message: `Fatura ${result.fatura_numero} gerada para ${cliente.nome}.`,
              },
            }));
          }, 0);

          // WhatsApp: nova fatura
          if (cliente.telefone) {
            const valorFmt = totalTaxas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
            notificarFaturaGerada(cliente.telefone, {
              cliente_nome: cliente.nome,
              fatura_numero: result.fatura_numero,
              valor: valorFmt,
            }).catch(() => {/* fire-and-forget */});
          }
        }

        // Notify if fatura was auto-closed by por_entrega threshold
        if (result.auto_fechada) {
          const threshold = cliente.numero_de_entregas_para_faturamento;
          const faturaNum = activeFatura?.numero ?? result.fatura_numero ?? "";
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("fatura-auto-fechada", {
              detail: {
                faturaId: result.fatura_id,
                clienteNome: cliente.nome,
                totalEntregas: result.total_entregas,
                message: `Fatura ${faturaNum} fechada automaticamente — ${result.total_entregas}/${threshold} entregas atingidas para ${cliente.nome}.`,
              },
            }));
          }, 0);

          // WhatsApp: fatura auto-fechada
          if (cliente.telefone) {
            notificarFaturaFechada(cliente.telefone, {
              cliente_nome: cliente.nome,
              fatura_numero: faturaNum,
              total_entregas: String(result.total_entregas ?? 0),
            }).catch(() => {/* fire-and-forget */});
          }
        }
      } catch {
        return { success: true, error: "Solicitação concluída, mas houve erro ao gerar/atualizar fatura." };
      }

      return { success: true };
    },
    [solicitacoes, clientes, entregadores, faturas, getClienteSaldo, updateSolMut, updateRotasBulkMut, concluirFaturaMut, updateFaturaMut, createReceita, createHistoricoFatura, addRecebimentoAutomatico]
  );

  return concluirComCaixa;
}

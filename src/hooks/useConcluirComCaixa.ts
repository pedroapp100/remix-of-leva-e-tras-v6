import { useCallback } from "react";
import { useSolicitacoes, useUpdateSolicitacao } from "@/hooks/useSolicitacoes";
import { fetchRotasBySolicitacao } from "@/services/solicitacoes";
import { rowToRota } from "@/lib/mappers";
import { useClientes, useClienteSaldoMap } from "@/hooks/useClientes";
import { useEntregadores } from "@/hooks/useEntregadores";
import { useFaturas, useConcluirFaturaEntrega } from "@/hooks/useFaturas";
import { useCaixaStore } from "@/contexts/CaixaStore";
import { useSettingsStore } from "@/contexts/SettingsStore";
import { notificarEntregaConcluida, notificarFaturaGerada, notificarFaturaFechada, notificarSaldoBaixo } from "@/services/whatsapp";
import type { SolicitacaoUpdate } from "@/services/solicitacoes";

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
  const concluirFaturaMut = useConcluirFaturaEntrega();

  const { addRecebimentoAutomatico } = useCaixaStore();

  const concluirComCaixa = useCallback(
    async (solId: string): Promise<{ success: boolean; error?: string }> => {
      const sol = solicitacoes.find((s) => s.id === solId);
      if (!sol) return { success: false, error: "Solicitação não encontrada." };

      const cliente = clientes.find((c) => c.id === sol.cliente_id);

      // Fetch rotas fresh at action-time (never stale, uses idx_rotas_sol)
      let solRotas: ReturnType<typeof rowToRota>[];
      try {
        const rawRotas = await fetchRotasBySolicitacao(solId);
        solRotas = rawRotas.map(rowToRota);
      } catch {
        return { success: false, error: "Erro ao carregar rotas da solicitação." };
      }

      const totalTaxas = solRotas.reduce((s, r) => s + (r.taxa_resolvida ?? 0), 0);

      // ── Pre-paid balance validation ──
      if (cliente?.modalidade === "pre_pago") {
        const saldo = getClienteSaldo(sol.cliente_id);
        if (saldo < totalTaxas) {
          const faltante = (totalTaxas - saldo).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          const saldoFmt = saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
          return {
            success: false,
            error: `Saldo insuficiente. Saldo atual: ${saldoFmt} — faltam ${faltante}. Solicite uma recarga antes de concluir.`,
          };
        }

        // Low balance warning
        const saldoApos = saldo - totalTaxas;
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
      if (!cliente || cliente.modalidade !== "faturado") return { success: true };

      const totalRecebido = solRotas.filter((r) => r.receber_do_cliente).reduce((s, r) => s + (r.valor_a_receber ?? 0), 0);
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
          p_total_taxas: totalTaxas,
          p_total_recebido: totalRecebido,
          p_sol_codigo: sol.codigo,
          p_num_rotas: solRotas.length,
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
    [solicitacoes, clientes, entregadores, faturas, getClienteSaldo, updateSolMut, concluirFaturaMut, addRecebimentoAutomatico]
  );

  return concluirComCaixa;
}

import { useCallback } from "react";
import { useGlobalStore } from "@/contexts/GlobalStore";
import { useCaixaStore } from "@/contexts/CaixaStore";
import { getClienteName } from "@/data/mockSolicitacoes";

/**
 * Hook that wraps concluirSolicitacaoComFatura and auto-adds
 * cash recebimentos to the driver's open caixa.
 */
export function useConcluirComCaixa() {
  const { solicitacoes, rotas, concluirSolicitacaoComFatura } = useGlobalStore();
  const { addRecebimentoAutomatico } = useCaixaStore();

  const concluirComCaixa = useCallback(
    (solId: string) => {
      const sol = solicitacoes.find((s) => s.id === solId);
      if (!sol || !sol.entregador_id) {
        concluirSolicitacaoComFatura(solId);
        return;
      }

      // Get cash recebimentos from rotas (receber_do_cliente = true)
      const solRotas = rotas.filter((r) => r.solicitacao_id === solId);
      const recebimentosDinheiro = solRotas.filter((r) => r.receber_do_cliente && r.valor_a_receber);
      const totalDinheiro = recebimentosDinheiro.reduce((s, r) => s + (r.valor_a_receber ?? 0), 0);

      // Conclude the solicitação (fatura logic)
      concluirSolicitacaoComFatura(solId);

      // Auto-add cash to driver's caixa
      if (totalDinheiro > 0 && sol.entregador_id) {
        const clienteNome = getClienteName(sol.cliente_id);
        addRecebimentoAutomatico(
          sol.entregador_id,
          sol.codigo,
          clienteNome,
          totalDinheiro
        );
      }
    },
    [solicitacoes, rotas, concluirSolicitacaoComFatura, addRecebimentoAutomatico]
  );

  return concluirComCaixa;
}

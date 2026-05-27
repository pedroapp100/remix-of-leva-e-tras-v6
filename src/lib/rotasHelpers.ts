import type { Rota } from "@/types/database";

/**
 * Retorna verdadeiro se a rota gera dinheiro físico que deve entrar no caixa do entregador.
 *
 * Dois casos:
 * 1. pago_na_hora — entregador cobra a taxa de operação em dinheiro no destino.
 * 2. Cobrança da loja em dinheiro com destino repassar_empresa — entregador arrecada
 *    dinheiro do cliente da loja e repassa à empresa.
 */
export function isRotaDinheiroNoCaixa(
  rota: Rota,
  dinheiroPagamentoIds: Set<string>
): boolean {
  const taxaPagoNaHoraEmDinheiro =
    rota.pagamento_operacao === "pago_na_hora" &&
    (rota.taxa_resolvida ?? 0) > 0 &&
    rota.meios_pagamento_operacao?.some((id) => dinheiroPagamentoIds.has(id));

  const cobrancaLojaEmDinheiro =
    rota.receber_do_cliente &&
    (rota.valor_a_receber ?? 0) > 0 &&
    rota.meio_cobranca_destino === "dinheiro" &&
    rota.destino_dinheiro === "repassar_empresa";

  return !!(taxaPagoNaHoraEmDinheiro || cobrancaLojaEmDinheiro);
}

/**
 * Soma o total em dinheiro físico que o entregador deve entregar ao caixa ao
 * concluir uma solicitação.
 *
 * Cada parcela é somada individualmente:
 * - Taxa: só quando pago_na_hora E a forma de pagamento é dinheiro
 * - Loja: só quando cobrança em dinheiro E destino é repassar_empresa
 *
 * Não assume que as duas parcelas entram só porque uma delas entra.
 */
export function calcTotalDinheiroNoCaixa(
  rotas: Rota[],
  dinheiroPagamentoIds: Set<string>
): number {
  return rotas
    .filter((r) => isRotaDinheiroNoCaixa(r, dinheiroPagamentoIds))
    .reduce((soma, r) => {
      const taxaEmDinheiro =
        r.pagamento_operacao === "pago_na_hora" &&
        (r.taxa_resolvida ?? 0) > 0 &&
        r.meios_pagamento_operacao?.some((id) => dinheiroPagamentoIds.has(id));
      const taxa = taxaEmDinheiro ? (r.taxa_resolvida ?? 0) : 0;

      const lojaEmDinheiro =
        r.receber_do_cliente &&
        (r.valor_a_receber ?? 0) > 0 &&
        r.meio_cobranca_destino === "dinheiro" &&
        r.destino_dinheiro === "repassar_empresa";
      const loja = lojaEmDinheiro ? (r.valor_a_receber ?? 0) : 0;

      return soma + taxa + loja;
    }, 0);
}

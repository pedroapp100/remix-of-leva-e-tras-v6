import type { FormaPagamento, PagamentoSolicitacao, Rota } from "@/types/database";

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

/**
 * Quanto de uma rota deve virar crédito da loja na fatura.
 *
 * Fonte de verdade: pagamentos_solicitacao (o que foi REALMENTE conciliado),
 * cruzado com formas_pagamento.retido_pela_loja para saber se aquele
 * pagamento específico já ficou com a loja (ex: Máquina da Loja — não gera
 * crédito) ou passou pela empresa (gera crédito).
 *
 * Só cai para a estimativa de rotas.meio_cobranca_destino/destino_dinheiro
 * quando a rota ainda não tem nenhuma conciliação registrada — antes disso
 * não existe realidade pra consultar, só o plano feito na criação da rota.
 */
export function calcularCreditoLojaRota(
  rota: Pick<Rota, "id" | "receber_do_cliente" | "valor_a_receber" | "meio_cobranca_destino" | "destino_dinheiro">,
  pagamentosDaRota: Pick<PagamentoSolicitacao, "pertence_a" | "valor" | "forma_pagamento_id">[],
  formasPagamento: Pick<FormaPagamento, "id" | "retido_pela_loja">[],
  sentinelDevolverLojaId?: string
): number {
  if (!rota.receber_do_cliente) return 0;

  const pagamentosLoja = pagamentosDaRota.filter(
    (p) => p.pertence_a === "loja" && p.forma_pagamento_id !== sentinelDevolverLojaId
  );

  if (pagamentosLoja.length > 0) {
    return pagamentosLoja
      .filter((p) => !(formasPagamento.find((f) => f.id === p.forma_pagamento_id)?.retido_pela_loja ?? false))
      .reduce((soma, p) => soma + p.valor, 0);
  }

  // Nenhuma conciliação ainda — usa o plano só como estimativa provisória.
  if (rota.meio_cobranca_destino === "pix_empresa") return rota.valor_a_receber ?? 0;
  if (rota.meio_cobranca_destino === "dinheiro" && rota.destino_dinheiro === "repassar_empresa") {
    return rota.valor_a_receber ?? 0;
  }
  return 0;
}

/**
 * Soma calcularCreditoLojaRota de uma lista de rotas, cruzando com os
 * pagamentos de cada uma (agrupados por rota_id).
 */
export function calcularCreditoLojaTotal(
  rotas: Pick<Rota, "id" | "receber_do_cliente" | "valor_a_receber" | "meio_cobranca_destino" | "destino_dinheiro">[],
  pagamentos: (Pick<PagamentoSolicitacao, "pertence_a" | "valor" | "forma_pagamento_id"> & { rota_id: string })[],
  formasPagamento: Pick<FormaPagamento, "id" | "retido_pela_loja">[],
  sentinelDevolverLojaId?: string
): number {
  return rotas.reduce((soma, rota) => {
    const pagamentosDaRota = pagamentos.filter((p) => p.rota_id === rota.id);
    return soma + calcularCreditoLojaRota(rota, pagamentosDaRota, formasPagamento, sentinelDevolverLojaId);
  }, 0);
}

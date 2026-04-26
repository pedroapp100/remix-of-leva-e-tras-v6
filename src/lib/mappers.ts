/**
 * lib/mappers.ts
 * Row → Domain type mappers used by React Query hooks.
 */
import type { Solicitacao, Rota, PagamentoSolicitacao, Fatura } from "@/types/database";
import type { SolicitacaoRow, RotaRow, PagamentoRow } from "@/services/solicitacoes";
import type { FaturaRow } from "@/services/faturas";

export function rowToSolicitacao(row: SolicitacaoRow): Solicitacao {
  return {
    id: row.id,
    codigo: row.codigo,
    cliente_id: row.cliente_id,
    entregador_id: row.entregador_id,
    entregador_nome: (row as unknown as { entregadores?: { nome: string } | null }).entregadores?.nome ?? null,
    cliente_nome: (row as unknown as { clientes?: { nome: string } | null }).clientes?.nome ?? null,
    status: row.status,
    tipo_operacao: row.tipo_operacao,
    ponto_coleta: row.ponto_coleta,
    data_solicitacao: row.data_solicitacao,
    data_inicio: row.data_inicio,
    data_conclusao: row.data_conclusao,
    admin_conciliada_at: row.admin_conciliada_at,
    valor_total_taxas: null,
    valor_total_repasse: null,
    justificativa: row.justificativa,
    retroativo: row.retroativo,
    historico: [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function rowToRota(row: RotaRow): Rota {
  return {
    id: row.id,
    solicitacao_id: row.solicitacao_id,
    bairro_destino_id: row.bairro_destino_id,
    responsavel: row.responsavel,
    telefone: row.telefone,
    observacoes: row.observacoes,
    receber_do_cliente: row.receber_do_cliente,
    valor_a_receber: row.valor_a_receber,
    taxa_resolvida: row.taxa_resolvida,
    regra_preco_id: row.regra_preco_id,
    pagamento_operacao: (row.pagamento_operacao as "faturar" | "pago_na_hora" | "descontar_saldo") ?? "faturar",
    meios_pagamento_operacao: (row.meios_pagamento_operacao as string[]) ?? [],
    status: row.status,
  };
}

export function rowToPagamento(row: PagamentoRow): PagamentoSolicitacao {
  return {
    id: row.id,
    solicitacao_id: row.solicitacao_id,
    rota_id: row.rota_id,
    forma_pagamento_id: row.forma_pagamento_id,
    valor: row.valor,
    pertence_a: row.pertence_a,
    observacao: row.observacao,
    created_by: row.created_by,
    created_at: row.created_at,
  };
}

export function rowToFatura(row: FaturaRow): Fatura {
  return {
    id: row.id,
    numero: row.numero,
    cliente_id: row.cliente_id,
    cliente_nome: row.cliente_nome,
    tipo_faturamento: row.tipo_faturamento,
    total_entregas: row.total_entregas,
    data_emissao: row.data_emissao,
    data_vencimento: row.data_vencimento,
    valor_taxas: row.saldo_liquido,
    valor_repasse: null,
    total_creditos_loja: row.total_creditos_loja,
    total_debitos_loja: row.total_debitos_loja,
    saldo_liquido: row.saldo_liquido,
    status_geral: row.status_geral,
    status_taxas: row.status_taxas,
    status_repasse: row.status_repasse,
    status_cobranca: row.status_cobranca,
    observacoes: row.observacoes,
    historico: [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

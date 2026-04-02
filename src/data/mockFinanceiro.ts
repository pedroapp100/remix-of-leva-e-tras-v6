import type { Despesa, Receita, LancamentoFinanceiro } from "@/types/database";

// ── Despesas Mock ──
export const MOCK_DESPESAS: Despesa[] = [
  {
    id: "desp-001", descricao: "Aluguel do escritório", categoria: "Aluguel",
    fornecedor: "Imobiliária Central", vencimento: "2026-03-10", valor: 3500,
    status: "Pago", data_pagamento: "2026-03-09", usuario_pagou_id: "user-admin",
    observacao: null, created_at: "2026-03-01T10:00:00Z", updated_at: "2026-03-09T10:00:00Z",
  },
  {
    id: "desp-002", descricao: "Combustível - Frota", categoria: "Combustível",
    fornecedor: "Posto Shell Centro", vencimento: "2026-03-15", valor: 1850,
    status: "Pago", data_pagamento: "2026-03-14", usuario_pagou_id: "user-admin",
    observacao: null, created_at: "2026-03-01T10:00:00Z", updated_at: "2026-03-14T10:00:00Z",
  },
  {
    id: "desp-003", descricao: "Manutenção motos", categoria: "Manutenção",
    fornecedor: "Oficina Rápida", vencimento: "2026-03-20", valor: 980,
    status: "Pendente", data_pagamento: null, usuario_pagou_id: null,
    observacao: "3 motos com revisão pendente", created_at: "2026-03-05T10:00:00Z", updated_at: "2026-03-05T10:00:00Z",
  },
  {
    id: "desp-004", descricao: "Internet + Telefonia", categoria: "Telecomunicações",
    fornecedor: "Vivo Empresas", vencimento: "2026-03-18", valor: 450,
    status: "Pendente", data_pagamento: null, usuario_pagou_id: null,
    observacao: null, created_at: "2026-03-01T10:00:00Z", updated_at: "2026-03-01T10:00:00Z",
  },
  {
    id: "desp-005", descricao: "Seguro da frota", categoria: "Seguros",
    fornecedor: "Porto Seguro", vencimento: "2026-03-05", valor: 2200,
    status: "Pago", data_pagamento: "2026-03-04", usuario_pagou_id: "user-admin",
    observacao: null, created_at: "2026-02-25T10:00:00Z", updated_at: "2026-03-04T10:00:00Z",
  },
  {
    id: "desp-006", descricao: "Material de escritório", categoria: "Materiais",
    fornecedor: "Kalunga", vencimento: "2026-03-12", valor: 320,
    status: "Pago", data_pagamento: "2026-03-12", usuario_pagou_id: "user-admin",
    observacao: null, created_at: "2026-03-10T10:00:00Z", updated_at: "2026-03-12T10:00:00Z",
  },
  {
    id: "desp-007", descricao: "Contador", categoria: "Serviços",
    fornecedor: "Contabilidade Express", vencimento: "2026-03-25", valor: 1200,
    status: "Pendente", data_pagamento: null, usuario_pagou_id: null,
    observacao: null, created_at: "2026-03-01T10:00:00Z", updated_at: "2026-03-01T10:00:00Z",
  },
  {
    id: "desp-008", descricao: "Licença software rastreamento", categoria: "Software",
    fornecedor: "TrackMoto SaaS", vencimento: "2026-02-28", valor: 590,
    status: "Atrasado", data_pagamento: null, usuario_pagou_id: null,
    observacao: "Vencida! Regularizar urgente", created_at: "2026-02-01T10:00:00Z", updated_at: "2026-03-01T10:00:00Z",
  },
  {
    id: "desp-009", descricao: "Energia elétrica", categoria: "Utilidades",
    fornecedor: "Enel Ceará", vencimento: "2026-03-22", valor: 680,
    status: "Pendente", data_pagamento: null, usuario_pagou_id: null,
    observacao: null, created_at: "2026-03-05T10:00:00Z", updated_at: "2026-03-05T10:00:00Z",
  },
  {
    id: "desp-010", descricao: "Marketing digital", categoria: "Marketing",
    fornecedor: "Agência Digital CE", vencimento: "2026-03-30", valor: 1500,
    status: "Pendente", data_pagamento: null, usuario_pagou_id: null,
    observacao: "Campanha de março", created_at: "2026-03-10T10:00:00Z", updated_at: "2026-03-10T10:00:00Z",
  },
];

// ── Receitas (lancamentos tipo receita_operacao) ──
export const MOCK_RECEITAS: Receita[] = [
  { id: "rec-001", descricao: "Taxas de entrega - João Silva", categoria: "Taxas de Entrega", cliente_id: "cli-001", data_recebimento: "2026-03-01", valor: 580, observacao: null, created_at: "2026-03-01T10:00:00Z" },
  { id: "rec-002", descricao: "Taxas de entrega - Padaria Pão Quente", categoria: "Taxas de Entrega", cliente_id: "cli-002", data_recebimento: "2026-03-03", valor: 420, observacao: null, created_at: "2026-03-03T10:00:00Z" },
  { id: "rec-003", descricao: "Taxas de entrega - Farmácia Saúde", categoria: "Taxas de Entrega", cliente_id: "cli-003", data_recebimento: "2026-03-05", valor: 310, observacao: null, created_at: "2026-03-05T10:00:00Z" },
  { id: "rec-004", descricao: "Taxas express - João Silva", categoria: "Taxas Express", cliente_id: "cli-001", data_recebimento: "2026-03-06", valor: 250, observacao: "Entregas express", created_at: "2026-03-06T10:00:00Z" },
  { id: "rec-005", descricao: "Taxas de entrega - Restaurante Sabor & Arte", categoria: "Taxas de Entrega", cliente_id: "cli-004", data_recebimento: "2026-03-08", valor: 890, observacao: null, created_at: "2026-03-08T10:00:00Z" },
  { id: "rec-006", descricao: "Taxas de entrega - João Silva", categoria: "Taxas de Entrega", cliente_id: "cli-001", data_recebimento: "2026-03-10", valor: 640, observacao: null, created_at: "2026-03-10T10:00:00Z" },
  { id: "rec-007", descricao: "Taxas de entrega - Padaria Pão Quente", categoria: "Taxas de Entrega", cliente_id: "cli-002", data_recebimento: "2026-03-12", valor: 380, observacao: null, created_at: "2026-03-12T10:00:00Z" },
  { id: "rec-008", descricao: "Taxas express - Restaurante Sabor & Arte", categoria: "Taxas Express", cliente_id: "cli-004", data_recebimento: "2026-03-14", valor: 560, observacao: null, created_at: "2026-03-14T10:00:00Z" },
];

// ── Dados para gráficos ──
export const FLUXO_CAIXA_MENSAL = [
  { mes: "Out/25", receitas: 8200, despesas: 6800 },
  { mes: "Nov/25", receitas: 9100, despesas: 7200 },
  { mes: "Dez/25", receitas: 11500, despesas: 8900 },
  { mes: "Jan/26", receitas: 9800, despesas: 7600 },
  { mes: "Fev/26", receitas: 10200, despesas: 8100 },
  { mes: "Mar/26", receitas: 12300, despesas: 9500 },
];

export const DESPESAS_POR_CATEGORIA = [
  { categoria: "Aluguel", valor: 3500, fill: "hsl(var(--primary))" },
  { categoria: "Combustível", valor: 1850, fill: "hsl(var(--chart-2))" },
  { categoria: "Seguros", valor: 2200, fill: "hsl(var(--chart-4))" },
  { categoria: "Marketing", valor: 1500, fill: "hsl(var(--chart-3))" },
  { categoria: "Serviços", valor: 1200, fill: "hsl(var(--chart-5))" },
  { categoria: "Outros", valor: 3020, fill: "hsl(var(--muted-foreground))" },
];

// ── Comissões por entregador (calculadas sobre receita_operacao) ──
export const MOCK_COMISSOES = [
  { id: "com-001", entregador_id: "ent-001", nome: "Carlos Silva", entregas: 42, valor_gerado: 2520, tipo_comissao: "percentual" as const, taxa: 15, comissao: 378 },
  { id: "com-002", entregador_id: "ent-002", nome: "Ricardo Oliveira", entregas: 38, valor_gerado: 2280, tipo_comissao: "fixo" as const, taxa: 5, comissao: 190 },
  { id: "com-003", entregador_id: "ent-003", nome: "Fernando Santos", entregas: 35, valor_gerado: 1890, tipo_comissao: "percentual" as const, taxa: 12, comissao: 226.80 },
  { id: "com-004", entregador_id: "ent-004", nome: "Lucas Pereira", entregas: 28, valor_gerado: 1540, tipo_comissao: "fixo" as const, taxa: 6, comissao: 168 },
  { id: "com-005", entregador_id: "ent-005", nome: "André Costa", entregas: 22, valor_gerado: 1210, tipo_comissao: "percentual" as const, taxa: 15, comissao: 181.50 },
];

// ── Livro Caixa (entradas e saídas consolidadas) ──
export interface LivroCaixaEntry {
  id: string;
  data: string;
  tipo: "entrada" | "saida";
  descricao: string;
  categoria: string;
  valor: number;
  saldo_acumulado: number;
}

export const MOCK_LIVRO_CAIXA: LivroCaixaEntry[] = [
  { id: "lc-001", data: "2026-03-01", tipo: "entrada", descricao: "Taxas de entrega - João Silva", categoria: "Receita Operação", valor: 580, saldo_acumulado: 580 },
  { id: "lc-002", data: "2026-03-03", tipo: "entrada", descricao: "Taxas de entrega - Padaria Pão Quente", categoria: "Receita Operação", valor: 420, saldo_acumulado: 1000 },
  { id: "lc-003", data: "2026-03-04", tipo: "saida", descricao: "Seguro da frota - Porto Seguro", categoria: "Seguros", valor: 2200, saldo_acumulado: -1200 },
  { id: "lc-004", data: "2026-03-05", tipo: "entrada", descricao: "Taxas de entrega - Farmácia Saúde", categoria: "Receita Operação", valor: 310, saldo_acumulado: -890 },
  { id: "lc-005", data: "2026-03-06", tipo: "entrada", descricao: "Taxas express - João Silva", categoria: "Receita Express", valor: 250, saldo_acumulado: -640 },
  { id: "lc-006", data: "2026-03-08", tipo: "entrada", descricao: "Taxas de entrega - Restaurante Sabor & Arte", categoria: "Receita Operação", valor: 890, saldo_acumulado: 250 },
  { id: "lc-007", data: "2026-03-09", tipo: "saida", descricao: "Aluguel do escritório", categoria: "Aluguel", valor: 3500, saldo_acumulado: -3250 },
  { id: "lc-008", data: "2026-03-10", tipo: "entrada", descricao: "Taxas de entrega - João Silva", categoria: "Receita Operação", valor: 640, saldo_acumulado: -2610 },
  { id: "lc-009", data: "2026-03-12", tipo: "saida", descricao: "Material de escritório - Kalunga", categoria: "Materiais", valor: 320, saldo_acumulado: -2930 },
  { id: "lc-010", data: "2026-03-12", tipo: "entrada", descricao: "Taxas de entrega - Padaria Pão Quente", categoria: "Receita Operação", valor: 380, saldo_acumulado: -2550 },
  { id: "lc-011", data: "2026-03-14", tipo: "saida", descricao: "Combustível - Frota", categoria: "Combustível", valor: 1850, saldo_acumulado: -4400 },
  { id: "lc-012", data: "2026-03-14", tipo: "entrada", descricao: "Taxas express - Restaurante Sabor & Arte", categoria: "Receita Express", valor: 560, saldo_acumulado: -3840 },
];

// ── Status despesa variant map ──
export const STATUS_DESPESA_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  Pendente: "outline",
  Pago: "default",
  Atrasado: "destructive",
};

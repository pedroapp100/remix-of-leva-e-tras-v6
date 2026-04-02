import type {
  Fatura,
  LancamentoFinanceiro,
  AjusteFinanceiro,
  StatusGeral,
} from "@/types/database";

// ── Faturas Mock ──
export const MOCK_FATURAS: Fatura[] = [
  {
    id: "fat-001",
    numero: "FAT-2026/03-001",
    cliente_id: "cli-002",
    cliente_nome: "Padaria Pão Quente",
    tipo_faturamento: "semanal",
    total_entregas: 12,
    data_emissao: "2026-03-10T00:00:00Z",
    data_vencimento: "2026-03-17T00:00:00Z",
    valor_taxas: 144.00,
    valor_repasse: null,
    total_creditos_loja: 540.00,
    total_debitos_loja: 144.00,
    saldo_liquido: 396.00,
    status_geral: "Aberta",
    status_taxas: "Pendente",
    status_repasse: "Pendente",
    status_cobranca: "Nao_aplicavel",
    observacoes: null,
    historico: [
      { tipo: "criacao", timestamp: "2026-03-10T08:00:00Z", descricao: "Fatura gerada automaticamente (semanal)" },
    ],
    created_at: "2026-03-10T08:00:00Z",
    updated_at: "2026-03-10T08:00:00Z",
  },
  {
    id: "fat-002",
    numero: "FAT-2026/03-002",
    cliente_id: "cli-003",
    cliente_nome: "Farmácia Saúde",
    tipo_faturamento: "mensal",
    total_entregas: 28,
    data_emissao: "2026-03-01T00:00:00Z",
    data_vencimento: "2026-03-10T00:00:00Z",
    valor_taxas: 308.00,
    valor_repasse: null,
    total_creditos_loja: 1260.00,
    total_debitos_loja: 308.00,
    saldo_liquido: 952.00,
    status_geral: "Vencida",
    status_taxas: "Vencida",
    status_repasse: "Pendente",
    status_cobranca: "Pendente",
    observacoes: "Aguardando contato com o cliente",
    historico: [
      { tipo: "criacao", timestamp: "2026-03-01T08:00:00Z", descricao: "Fatura gerada automaticamente (mensal)" },
      { tipo: "vencida", timestamp: "2026-03-11T00:00:00Z", descricao: "Fatura vencida sem pagamento" },
    ],
    created_at: "2026-03-01T08:00:00Z",
    updated_at: "2026-03-11T00:00:00Z",
  },
  {
    id: "fat-003",
    numero: "FAT-2026/03-003",
    cliente_id: "cli-004",
    cliente_nome: "Restaurante Sabor & Arte",
    tipo_faturamento: "diario",
    total_entregas: 5,
    data_emissao: "2026-03-15T00:00:00Z",
    data_vencimento: "2026-03-16T00:00:00Z",
    valor_taxas: 62.50,
    valor_repasse: null,
    total_creditos_loja: 230.00,
    total_debitos_loja: 62.50,
    saldo_liquido: 167.50,
    status_geral: "Aberta",
    status_taxas: "Pendente",
    status_repasse: "Pendente",
    status_cobranca: "Nao_aplicavel",
    observacoes: null,
    historico: [
      { tipo: "criacao", timestamp: "2026-03-15T22:00:00Z", descricao: "Fatura gerada automaticamente (diário)" },
    ],
    created_at: "2026-03-15T22:00:00Z",
    updated_at: "2026-03-15T22:00:00Z",
  },
  {
    id: "fat-004",
    numero: "FAT-2026/02-015",
    cliente_id: "cli-005",
    cliente_nome: "Maria Oliveira",
    tipo_faturamento: "semanal",
    total_entregas: 8,
    data_emissao: "2026-02-24T00:00:00Z",
    data_vencimento: "2026-03-03T00:00:00Z",
    valor_taxas: 96.00,
    valor_repasse: null,
    total_creditos_loja: 320.00,
    total_debitos_loja: 96.00,
    saldo_liquido: -45.00,
    status_geral: "Fechada",
    status_taxas: "Paga",
    status_repasse: "Repassado",
    status_cobranca: "Cobrado",
    observacoes: null,
    historico: [
      { tipo: "criacao", timestamp: "2026-02-24T08:00:00Z", descricao: "Fatura gerada automaticamente" },
      { tipo: "fechada", timestamp: "2026-03-03T10:00:00Z", descricao: "Fatura fechada" },
      { tipo: "cobranca", timestamp: "2026-03-05T14:00:00Z", descricao: "Cobrança registrada — R$ 45,00" },
    ],
    created_at: "2026-02-24T08:00:00Z",
    updated_at: "2026-03-05T14:00:00Z",
  },
  {
    id: "fat-005",
    numero: "FAT-2026/02-010",
    cliente_id: "cli-002",
    cliente_nome: "Padaria Pão Quente",
    tipo_faturamento: "semanal",
    total_entregas: 15,
    data_emissao: "2026-02-17T00:00:00Z",
    data_vencimento: "2026-02-24T00:00:00Z",
    valor_taxas: 180.00,
    valor_repasse: null,
    total_creditos_loja: 675.00,
    total_debitos_loja: 180.00,
    saldo_liquido: 0,
    status_geral: "Finalizada",
    status_taxas: "Paga",
    status_repasse: "Repassado",
    status_cobranca: "Nao_aplicavel",
    observacoes: null,
    historico: [
      { tipo: "criacao", timestamp: "2026-02-17T08:00:00Z", descricao: "Fatura gerada automaticamente" },
      { tipo: "fechada", timestamp: "2026-02-24T10:00:00Z", descricao: "Fatura fechada" },
      { tipo: "repasse", timestamp: "2026-02-25T09:00:00Z", descricao: "Repasse de R$ 495,00 realizado" },
      { tipo: "finalizada", timestamp: "2026-02-25T09:00:00Z", descricao: "Fatura finalizada — saldo zerado" },
    ],
    created_at: "2026-02-17T08:00:00Z",
    updated_at: "2026-02-25T09:00:00Z",
  },
  {
    id: "fat-006",
    numero: "FAT-2026/02-008",
    cliente_id: "cli-006",
    cliente_nome: "Floricultura Jardim Encantado",
    tipo_faturamento: "por_entrega",
    total_entregas: 10,
    data_emissao: "2026-02-20T00:00:00Z",
    data_vencimento: "2026-02-27T00:00:00Z",
    valor_taxas: 125.00,
    valor_repasse: null,
    total_creditos_loja: 450.00,
    total_debitos_loja: 125.00,
    saldo_liquido: 0,
    status_geral: "Finalizada",
    status_taxas: "Paga",
    status_repasse: "Repassado",
    status_cobranca: "Nao_aplicavel",
    observacoes: null,
    historico: [
      { tipo: "criacao", timestamp: "2026-02-20T10:00:00Z", descricao: "Fatura gerada (por_entrega: 10 entregas)" },
      { tipo: "finalizada", timestamp: "2026-02-28T11:00:00Z", descricao: "Fatura finalizada" },
    ],
    created_at: "2026-02-20T10:00:00Z",
    updated_at: "2026-02-28T11:00:00Z",
  },
];

// ── Lançamentos Financeiros Mock ──
export const MOCK_LANCAMENTOS: LancamentoFinanceiro[] = [
  // fat-001
  { id: "lanc-001", solicitacao_id: "sol-001", cliente_id: "cli-002", fatura_id: "fat-001", tipo: "credito_loja", valor: 45.00, sinal: "credito", status_liquidacao: "pendente", descricao: "Crédito loja — Sol LT-20260315-00001", referencia_origem: "sol-001", usuario_id: null, created_at: "2026-03-15T10:15:00Z" },
  { id: "lanc-002", solicitacao_id: "sol-001", cliente_id: "cli-002", fatura_id: "fat-001", tipo: "receita_operacao", valor: 22.00, sinal: "credito", status_liquidacao: "pendente", descricao: "Taxa entrega — Sol LT-20260315-00001", referencia_origem: "sol-001", usuario_id: null, created_at: "2026-03-15T10:15:00Z" },
  { id: "lanc-003", solicitacao_id: "sol-005", cliente_id: "cli-002", fatura_id: "fat-001", tipo: "credito_loja", valor: 35.00, sinal: "credito", status_liquidacao: "pendente", descricao: "Crédito loja — Sol LT-20260315-00005", referencia_origem: "sol-005", usuario_id: null, created_at: "2026-03-15T14:00:00Z" },
  { id: "lanc-004", solicitacao_id: "sol-005", cliente_id: "cli-002", fatura_id: "fat-001", tipo: "receita_operacao", valor: 9.50, sinal: "credito", status_liquidacao: "pendente", descricao: "Taxa entrega — Sol LT-20260315-00005", referencia_origem: "sol-005", usuario_id: null, created_at: "2026-03-15T14:00:00Z" },
  // fat-002
  { id: "lanc-005", solicitacao_id: null, cliente_id: "cli-003", fatura_id: "fat-002", tipo: "credito_loja", valor: 1260.00, sinal: "credito", status_liquidacao: "pendente", descricao: "Créditos loja consolidados — Fev/2026", referencia_origem: null, usuario_id: null, created_at: "2026-03-01T08:00:00Z" },
  { id: "lanc-006", solicitacao_id: null, cliente_id: "cli-003", fatura_id: "fat-002", tipo: "debito_loja", valor: 308.00, sinal: "debito", status_liquidacao: "pendente", descricao: "Taxas de entrega — Fev/2026", referencia_origem: null, usuario_id: null, created_at: "2026-03-01T08:00:00Z" },
];

// ── Ajustes Financeiros Mock ──
export const MOCK_AJUSTES: AjusteFinanceiro[] = [
  {
    id: "aj-001",
    fatura_id: "fat-002",
    solicitacao_id: null,
    tipo: "debito",
    valor: 25.00,
    motivo: "Desconto por atraso na entrega — Sol LT-20260302-00012",
    usuario_id: "user-admin",
    created_at: "2026-03-05T16:00:00Z",
  },
  {
    id: "aj-002",
    fatura_id: "fat-004",
    solicitacao_id: null,
    tipo: "credito",
    valor: 15.00,
    motivo: "Bonificação por volume — mês de fevereiro",
    usuario_id: "user-admin",
    created_at: "2026-03-03T11:00:00Z",
  },
];

// ── Rotas de entregas vinculadas a faturas ──
export interface RotaEntregaFatura {
  bairro_destino: string;
  responsavel: string;
  telefone: string;
  taxa: number;
  valor_receber: number | null;
  status: "concluida" | "cancelada";
}

// ── Entregas vinculadas a faturas (resumo para exibição) ──
export interface EntregaFatura {
  solicitacao_id: string;
  codigo: string;
  entregador_nome: string;
  data_conclusao: string;
  total_rotas: number;
  valor_taxas: number;
  valor_recebido_cliente: number;
  status: "concluida" | "cancelada";
  ponto_coleta: string;
  rotas: RotaEntregaFatura[];
}

const MOCK_ENTREGAS_FATURA: Record<string, EntregaFatura[]> = {
  "fat-001": [
    { solicitacao_id: "sol-001", codigo: "LT-20260310-00001", entregador_nome: "Carlos Silva", data_conclusao: "2026-03-10T10:15:00Z", total_rotas: 2, valor_taxas: 22.00, valor_recebido_cliente: 45.00, status: "concluida", ponto_coleta: "Padaria Pão Quente — R. das Flores, 120", rotas: [
      { bairro_destino: "Centro", responsavel: "Maria Santos", telefone: "(11) 99111-2233", taxa: 12.00, valor_receber: 25.00, status: "concluida" },
      { bairro_destino: "Jardim América", responsavel: "João Souza", telefone: "(11) 99222-3344", taxa: 10.00, valor_receber: 20.00, status: "concluida" },
    ]},
    { solicitacao_id: "sol-012", codigo: "LT-20260310-00002", entregador_nome: "Ricardo Oliveira", data_conclusao: "2026-03-10T11:30:00Z", total_rotas: 1, valor_taxas: 12.00, valor_recebido_cliente: 30.00, status: "concluida", ponto_coleta: "Padaria Pão Quente — R. das Flores, 120", rotas: [
      { bairro_destino: "Vila Nova", responsavel: "Ana Lima", telefone: "(11) 99333-4455", taxa: 12.00, valor_receber: 30.00, status: "concluida" },
    ]},
    { solicitacao_id: "sol-013", codigo: "LT-20260311-00003", entregador_nome: "Carlos Silva", data_conclusao: "2026-03-11T09:45:00Z", total_rotas: 3, valor_taxas: 28.00, valor_recebido_cliente: 95.00, status: "concluida", ponto_coleta: "Padaria Pão Quente — R. das Flores, 120", rotas: [
      { bairro_destino: "Centro", responsavel: "Pedro Costa", telefone: "(11) 99444-5566", taxa: 10.00, valor_receber: 35.00, status: "concluida" },
      { bairro_destino: "Bela Vista", responsavel: "Lúcia Ferreira", telefone: "(11) 99555-6677", taxa: 10.00, valor_receber: 30.00, status: "concluida" },
      { bairro_destino: "Jardim América", responsavel: "Carlos Mendes", telefone: "(11) 99666-7788", taxa: 8.00, valor_receber: 30.00, status: "concluida" },
    ]},
    { solicitacao_id: "sol-014", codigo: "LT-20260311-00004", entregador_nome: "Fernando Santos", data_conclusao: "2026-03-11T14:20:00Z", total_rotas: 1, valor_taxas: 10.00, valor_recebido_cliente: 40.00, status: "concluida", ponto_coleta: "Padaria Pão Quente — R. das Flores, 120", rotas: [
      { bairro_destino: "Vila Nova", responsavel: "Roberto Alves", telefone: "(11) 99777-8899", taxa: 10.00, valor_receber: 40.00, status: "concluida" },
    ]},
    { solicitacao_id: "sol-015", codigo: "LT-20260312-00005", entregador_nome: "Lucas Pereira", data_conclusao: "2026-03-12T10:00:00Z", total_rotas: 2, valor_taxas: 18.00, valor_recebido_cliente: 55.00, status: "concluida", ponto_coleta: "Padaria Pão Quente — R. das Flores, 120", rotas: [
      { bairro_destino: "Centro", responsavel: "Fernanda Dias", telefone: "(11) 99888-9900", taxa: 10.00, valor_receber: 30.00, status: "concluida" },
      { bairro_destino: "Bela Vista", responsavel: "Marcos Silva", telefone: "(11) 99999-0011", taxa: 8.00, valor_receber: 25.00, status: "concluida" },
    ]},
    { solicitacao_id: "sol-016", codigo: "LT-20260312-00006", entregador_nome: "Ricardo Oliveira", data_conclusao: "2026-03-12T16:30:00Z", total_rotas: 1, valor_taxas: 9.50, valor_recebido_cliente: 35.00, status: "concluida", ponto_coleta: "Padaria Pão Quente — R. das Flores, 120", rotas: [
      { bairro_destino: "Jardim América", responsavel: "Patrícia Rocha", telefone: "(11) 98111-2233", taxa: 9.50, valor_receber: 35.00, status: "concluida" },
    ]},
    { solicitacao_id: "sol-017", codigo: "LT-20260313-00007", entregador_nome: "Carlos Silva", data_conclusao: "2026-03-13T08:50:00Z", total_rotas: 2, valor_taxas: 15.00, valor_recebido_cliente: 60.00, status: "concluida", ponto_coleta: "Padaria Pão Quente — R. das Flores, 120", rotas: [
      { bairro_destino: "Vila Nova", responsavel: "Daniela Nunes", telefone: "(11) 98222-3344", taxa: 8.00, valor_receber: 35.00, status: "concluida" },
      { bairro_destino: "Centro", responsavel: "Gustavo Pereira", telefone: "(11) 98333-4455", taxa: 7.00, valor_receber: 25.00, status: "concluida" },
    ]},
    { solicitacao_id: "sol-018", codigo: "LT-20260313-00008", entregador_nome: "André Costa", data_conclusao: "2026-03-13T12:00:00Z", total_rotas: 1, valor_taxas: 8.00, valor_recebido_cliente: 25.00, status: "concluida", ponto_coleta: "Padaria Pão Quente — R. das Flores, 120", rotas: [
      { bairro_destino: "Bela Vista", responsavel: "Juliana Martins", telefone: "(11) 98444-5566", taxa: 8.00, valor_receber: 25.00, status: "concluida" },
    ]},
    { solicitacao_id: "sol-019", codigo: "LT-20260314-00009", entregador_nome: "Fernando Santos", data_conclusao: "2026-03-14T09:15:00Z", total_rotas: 1, valor_taxas: 7.50, valor_recebido_cliente: 50.00, status: "concluida", ponto_coleta: "Padaria Pão Quente — R. das Flores, 120", rotas: [
      { bairro_destino: "Jardim América", responsavel: "Renata Oliveira", telefone: "(11) 98555-6677", taxa: 7.50, valor_receber: 50.00, status: "concluida" },
    ]},
    { solicitacao_id: "sol-005", codigo: "LT-20260314-00005", entregador_nome: "Lucas Pereira", data_conclusao: "2026-03-14T15:30:00Z", total_rotas: 1, valor_taxas: 9.50, valor_recebido_cliente: 35.00, status: "concluida", ponto_coleta: "Padaria Pão Quente — R. das Flores, 120", rotas: [
      { bairro_destino: "Centro", responsavel: "Sérgio Lima", telefone: "(11) 98666-7788", taxa: 9.50, valor_receber: 35.00, status: "concluida" },
    ]},
    { solicitacao_id: "sol-020", codigo: "LT-20260315-00010", entregador_nome: "Paulo Mendes", data_conclusao: "2026-03-15T11:00:00Z", total_rotas: 2, valor_taxas: 14.00, valor_recebido_cliente: 70.00, status: "concluida", ponto_coleta: "Padaria Pão Quente — R. das Flores, 120", rotas: [
      { bairro_destino: "Vila Nova", responsavel: "Carla Ribeiro", telefone: "(11) 98777-8899", taxa: 7.00, valor_receber: 35.00, status: "concluida" },
      { bairro_destino: "Bela Vista", responsavel: "Thiago Santos", telefone: "(11) 98888-9900", taxa: 7.00, valor_receber: 35.00, status: "concluida" },
    ]},
    { solicitacao_id: "sol-021", codigo: "LT-20260316-00011", entregador_nome: "Carlos Silva", data_conclusao: "2026-03-16T10:30:00Z", total_rotas: 1, valor_taxas: 10.50, valor_recebido_cliente: 0, status: "concluida", ponto_coleta: "Padaria Pão Quente — R. das Flores, 120", rotas: [
      { bairro_destino: "Centro", responsavel: "Bruno Cardoso", telefone: "(11) 98999-0011", taxa: 10.50, valor_receber: null, status: "concluida" },
    ]},
  ],
  "fat-002": [
    { solicitacao_id: "sol-030", codigo: "LT-20260301-00001", entregador_nome: "Carlos Silva", data_conclusao: "2026-03-01T09:30:00Z", total_rotas: 2, valor_taxas: 11.00, valor_recebido_cliente: 45.00, status: "concluida", ponto_coleta: "Farmácia Saúde Total — Av. Brasil, 500", rotas: [
      { bairro_destino: "Centro", responsavel: "Amanda Souza", telefone: "(11) 97111-2233", taxa: 6.00, valor_receber: 25.00, status: "concluida" },
      { bairro_destino: "Vila Nova", responsavel: "Felipe Costa", telefone: "(11) 97222-3344", taxa: 5.00, valor_receber: 20.00, status: "concluida" },
    ]},
    { solicitacao_id: "sol-031", codigo: "LT-20260301-00002", entregador_nome: "Ricardo Oliveira", data_conclusao: "2026-03-01T14:00:00Z", total_rotas: 1, valor_taxas: 11.00, valor_recebido_cliente: 45.00, status: "concluida", ponto_coleta: "Farmácia Saúde Total — Av. Brasil, 500", rotas: [
      { bairro_destino: "Jardim América", responsavel: "Rafaela Dias", telefone: "(11) 97333-4455", taxa: 11.00, valor_receber: 45.00, status: "concluida" },
    ]},
    { solicitacao_id: "sol-032", codigo: "LT-20260302-00003", entregador_nome: "Fernando Santos", data_conclusao: "2026-03-02T10:15:00Z", total_rotas: 3, valor_taxas: 11.00, valor_recebido_cliente: 45.00, status: "concluida", ponto_coleta: "Farmácia Saúde Total — Av. Brasil, 500", rotas: [
      { bairro_destino: "Bela Vista", responsavel: "Diego Almeida", telefone: "(11) 97444-5566", taxa: 4.00, valor_receber: 15.00, status: "concluida" },
      { bairro_destino: "Centro", responsavel: "Vanessa Rocha", telefone: "(11) 97555-6677", taxa: 4.00, valor_receber: 15.00, status: "concluida" },
      { bairro_destino: "Vila Nova", responsavel: "Eduardo Lima", telefone: "(11) 97666-7788", taxa: 3.00, valor_receber: 15.00, status: "concluida" },
    ]},
    { solicitacao_id: "sol-033", codigo: "LT-20260302-00004", entregador_nome: "Lucas Pereira", data_conclusao: "2026-03-02T15:45:00Z", total_rotas: 1, valor_taxas: 11.00, valor_recebido_cliente: 45.00, status: "concluida", ponto_coleta: "Farmácia Saúde Total — Av. Brasil, 500", rotas: [
      { bairro_destino: "Jardim América", responsavel: "Camila Ferreira", telefone: "(11) 97777-8899", taxa: 11.00, valor_receber: 45.00, status: "concluida" },
    ]},
  ],
  "fat-003": [
    { solicitacao_id: "sol-040", codigo: "LT-20260315-00001", entregador_nome: "André Costa", data_conclusao: "2026-03-15T10:00:00Z", total_rotas: 1, valor_taxas: 12.50, valor_recebido_cliente: 50.00, status: "concluida", ponto_coleta: "Restaurante Sabor da Terra — R. Boa Vista, 45", rotas: [
      { bairro_destino: "Centro", responsavel: "Rodrigo Nunes", telefone: "(11) 96111-2233", taxa: 12.50, valor_receber: 50.00, status: "concluida" },
    ]},
    { solicitacao_id: "sol-041", codigo: "LT-20260315-00002", entregador_nome: "Carlos Silva", data_conclusao: "2026-03-15T11:30:00Z", total_rotas: 2, valor_taxas: 12.50, valor_recebido_cliente: 40.00, status: "concluida", ponto_coleta: "Restaurante Sabor da Terra — R. Boa Vista, 45", rotas: [
      { bairro_destino: "Bela Vista", responsavel: "Isabela Martins", telefone: "(11) 96222-3344", taxa: 7.00, valor_receber: 20.00, status: "concluida" },
      { bairro_destino: "Vila Nova", responsavel: "Leonardo Santos", telefone: "(11) 96333-4455", taxa: 5.50, valor_receber: 20.00, status: "concluida" },
    ]},
    { solicitacao_id: "sol-042", codigo: "LT-20260315-00003", entregador_nome: "Paulo Mendes", data_conclusao: "2026-03-15T14:00:00Z", total_rotas: 1, valor_taxas: 12.50, valor_recebido_cliente: 55.00, status: "concluida", ponto_coleta: "Restaurante Sabor da Terra — R. Boa Vista, 45", rotas: [
      { bairro_destino: "Jardim América", responsavel: "Beatriz Oliveira", telefone: "(11) 96444-5566", taxa: 12.50, valor_receber: 55.00, status: "concluida" },
    ]},
    { solicitacao_id: "sol-043", codigo: "LT-20260315-00004", entregador_nome: "Ricardo Oliveira", data_conclusao: "2026-03-15T16:00:00Z", total_rotas: 1, valor_taxas: 12.50, valor_recebido_cliente: 45.00, status: "concluida", ponto_coleta: "Restaurante Sabor da Terra — R. Boa Vista, 45", rotas: [
      { bairro_destino: "Centro", responsavel: "Henrique Pereira", telefone: "(11) 96555-6677", taxa: 12.50, valor_receber: 45.00, status: "concluida" },
    ]},
    { solicitacao_id: "sol-044", codigo: "LT-20260315-00005", entregador_nome: "Fernando Santos", data_conclusao: "2026-03-15T18:00:00Z", total_rotas: 2, valor_taxas: 12.50, valor_recebido_cliente: 40.00, status: "concluida", ponto_coleta: "Restaurante Sabor da Terra — R. Boa Vista, 45", rotas: [
      { bairro_destino: "Bela Vista", responsavel: "Mariana Costa", telefone: "(11) 96666-7788", taxa: 7.00, valor_receber: 20.00, status: "concluida" },
      { bairro_destino: "Vila Nova", responsavel: "Gabriel Alves", telefone: "(11) 96777-8899", taxa: 5.50, valor_receber: 20.00, status: "concluida" },
    ]},
  ],
};

// ── Helpers ──
export function getLancamentosByFatura(faturaId: string): LancamentoFinanceiro[] {
  return MOCK_LANCAMENTOS.filter((l) => l.fatura_id === faturaId);
}

export function getAjustesByFatura(faturaId: string): AjusteFinanceiro[] {
  return MOCK_AJUSTES.filter((a) => a.fatura_id === faturaId);
}

export function getEntregasByFatura(faturaId: string): EntregaFatura[] {
  return MOCK_ENTREGAS_FATURA[faturaId] ?? [];
}

export const TIPO_FATURAMENTO_LABELS: Record<string, string> = {
  por_entrega: "Por Entrega",
  semanal: "Semanal",
  mensal: "Mensal",
  diario: "Diário",
  manual: "Manual",
};

export const STATUS_GERAL_VARIANT: Record<StatusGeral, "default" | "secondary" | "outline" | "destructive"> = {
  Aberta: "outline",
  Fechada: "secondary",
  Paga: "default",
  Finalizada: "default",
  Vencida: "destructive",
};

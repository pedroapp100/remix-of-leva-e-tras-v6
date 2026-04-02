import type { Solicitacao, Rota, StatusSolicitacao, PagamentoSolicitacao } from "@/types/database";

// ── Rotas Mock ──
export const MOCK_ROTAS: Rota[] = [
  { id: "rota-001", solicitacao_id: "sol-001", bairro_destino_id: "bairro-3", responsavel: "Maria Santos", telefone: "(85) 98888-1111", observacoes: null, receber_do_cliente: true, valor_a_receber: 45.00, taxa_resolvida: 10.00, regra_preco_id: "tp-1", status: "concluida" },
  { id: "rota-002", solicitacao_id: "sol-001", bairro_destino_id: "bairro-5", responsavel: "Pedro Lima", telefone: "(85) 98888-2222", observacoes: "Entregar na portaria", receber_do_cliente: false, valor_a_receber: null, taxa_resolvida: 12.00, regra_preco_id: "tp-3", status: "concluida" },
  { id: "rota-003", solicitacao_id: "sol-002", bairro_destino_id: "bairro-1", responsavel: "Ana Costa", telefone: "(85) 98888-3333", observacoes: null, receber_do_cliente: true, valor_a_receber: 30.00, taxa_resolvida: 8.00, regra_preco_id: "tp-1", status: "ativa" },
  { id: "rota-004", solicitacao_id: "sol-003", bairro_destino_id: "bairro-4", responsavel: "Lucas Ferreira", telefone: "(85) 98888-4444", observacoes: null, receber_do_cliente: false, valor_a_receber: null, taxa_resolvida: 11.00, regra_preco_id: null, status: "ativa" },
  { id: "rota-005", solicitacao_id: "sol-003", bairro_destino_id: "bairro-6", responsavel: "Carla Mendes", telefone: "(85) 98888-5555", observacoes: "Ligar antes", receber_do_cliente: true, valor_a_receber: 60.00, taxa_resolvida: 12.50, regra_preco_id: "tp-3", status: "ativa" },
  { id: "rota-006", solicitacao_id: "sol-004", bairro_destino_id: "bairro-7", responsavel: "Roberto Alves", telefone: "(85) 98888-6666", observacoes: null, receber_do_cliente: true, valor_a_receber: 25.00, taxa_resolvida: 15.00, regra_preco_id: null, status: "ativa" },
  { id: "rota-007", solicitacao_id: "sol-005", bairro_destino_id: "bairro-2", responsavel: "Juliana Rocha", telefone: "(85) 98888-7777", observacoes: null, receber_do_cliente: false, valor_a_receber: null, taxa_resolvida: 9.50, regra_preco_id: "tp-1", status: "concluida" },
  { id: "rota-008", solicitacao_id: "sol-006", bairro_destino_id: "bairro-8", responsavel: "Marcos Pinto", telefone: "(85) 98888-8888", observacoes: "Prédio comercial, 3º andar", receber_do_cliente: true, valor_a_receber: 80.00, taxa_resolvida: 16.00, regra_preco_id: null, status: "ativa" },
  { id: "rota-009", solicitacao_id: "sol-007", bairro_destino_id: "bairro-9", responsavel: "Fernanda Dias", telefone: "(85) 98888-9999", observacoes: null, receber_do_cliente: true, valor_a_receber: 35.00, taxa_resolvida: 14.00, regra_preco_id: null, status: "cancelada" },
  { id: "rota-010", solicitacao_id: "sol-008", bairro_destino_id: "bairro-10", responsavel: "Thiago Souza", telefone: "(85) 98889-0000", observacoes: null, receber_do_cliente: false, valor_a_receber: null, taxa_resolvida: 9.00, regra_preco_id: "tp-1", status: "ativa" },
  { id: "rota-011", solicitacao_id: "sol-009", bairro_destino_id: "bairro-1", responsavel: "Patrícia Lopes", telefone: "(85) 98889-1111", observacoes: "Urgente", receber_do_cliente: true, valor_a_receber: 50.00, taxa_resolvida: 8.00, regra_preco_id: "tp-1", status: "ativa" },
  { id: "rota-012", solicitacao_id: "sol-010", bairro_destino_id: "bairro-5", responsavel: "Diego Nunes", telefone: "(85) 98889-2222", observacoes: null, receber_do_cliente: true, valor_a_receber: 70.00, taxa_resolvida: 12.00, regra_preco_id: "tp-3", status: "concluida" },
];

// ── Solicitações Mock ──
export const MOCK_SOLICITACOES: Solicitacao[] = [
  {
    id: "sol-001", codigo: "LT-20260315-00001", cliente_id: "cli-001", entregador_id: "ent-001",
    status: "concluida", tipo_operacao: "tipo-comercial", ponto_coleta: "Rua das Flores, 123 - Centro",
    data_solicitacao: "2026-03-15T08:30:00Z", data_inicio: "2026-03-15T09:00:00Z", data_conclusao: "2026-03-15T10:15:00Z",
    valor_total_taxas: 22.00, valor_total_repasse: null, justificativa: null,
    historico: [
      { tipo: "criacao", timestamp: "2026-03-15T08:30:00Z", descricao: "Solicitação criada" },
      { tipo: "aceita", status_anterior: "pendente", status_novo: "aceita", timestamp: "2026-03-15T08:45:00Z", descricao: "Aceita e atribuída a Carlos Silva" },
      { tipo: "em_andamento", status_anterior: "aceita", status_novo: "em_andamento", timestamp: "2026-03-15T09:00:00Z", descricao: "Entregador iniciou coleta" },
      { tipo: "concluida", status_anterior: "em_andamento", status_novo: "concluida", timestamp: "2026-03-15T10:15:00Z", descricao: "Entrega concluída e conciliada" },
    ],
    created_at: "2026-03-15T08:30:00Z", updated_at: "2026-03-15T10:15:00Z",
  },
  {
    id: "sol-002", codigo: "LT-20260315-00002", cliente_id: "cli-002", entregador_id: "ent-002",
    status: "em_andamento", tipo_operacao: "tipo-comercial", ponto_coleta: "Av. Santos Dumont, 500 - Aldeota",
    data_solicitacao: "2026-03-15T09:15:00Z", data_inicio: "2026-03-15T09:45:00Z", data_conclusao: null,
    valor_total_taxas: 8.00, valor_total_repasse: null, justificativa: null,
    historico: [
      { tipo: "criacao", timestamp: "2026-03-15T09:15:00Z", descricao: "Solicitação criada" },
      { tipo: "aceita", status_anterior: "pendente", status_novo: "aceita", timestamp: "2026-03-15T09:30:00Z", descricao: "Aceita e atribuída a Ricardo Oliveira" },
      { tipo: "em_andamento", status_anterior: "aceita", status_novo: "em_andamento", timestamp: "2026-03-15T09:45:00Z", descricao: "Entregador iniciou coleta" },
    ],
    created_at: "2026-03-15T09:15:00Z", updated_at: "2026-03-15T09:45:00Z",
  },
  {
    id: "sol-003", codigo: "LT-20260315-00003", cliente_id: "cli-003", entregador_id: "ent-003",
    status: "aceita", tipo_operacao: "tipo-noturno", ponto_coleta: "Rua Barão de Aracati, 200 - Meireles",
    data_solicitacao: "2026-03-15T10:00:00Z", data_inicio: null, data_conclusao: null,
    valor_total_taxas: 23.50, valor_total_repasse: null, justificativa: null,
    historico: [
      { tipo: "criacao", timestamp: "2026-03-15T10:00:00Z", descricao: "Solicitação criada" },
      { tipo: "aceita", status_anterior: "pendente", status_novo: "aceita", timestamp: "2026-03-15T10:10:00Z", descricao: "Aceita e atribuída a Fernando Santos" },
    ],
    created_at: "2026-03-15T10:00:00Z", updated_at: "2026-03-15T10:10:00Z",
  },
  {
    id: "sol-004", codigo: "LT-20260315-00004", cliente_id: "cli-004", entregador_id: "ent-001",
    status: "aceita", tipo_operacao: "tipo-comercial", ponto_coleta: "Av. Washington Soares, 1000 - Messejana",
    data_solicitacao: "2026-03-15T10:30:00Z", data_inicio: null, data_conclusao: null,
    valor_total_taxas: 15.00, valor_total_repasse: null, justificativa: null,
    historico: [
      { tipo: "criacao", timestamp: "2026-03-15T10:30:00Z", descricao: "Solicitação criada" },
      { tipo: "aceita", status_anterior: "pendente", status_novo: "aceita", timestamp: "2026-03-15T10:45:00Z", descricao: "Atribuída a Carlos Silva" },
    ],
    created_at: "2026-03-15T10:30:00Z", updated_at: "2026-03-15T10:30:00Z",
  },
  {
    id: "sol-005", codigo: "LT-20260314-00005", cliente_id: "cli-001", entregador_id: "ent-004",
    status: "concluida", tipo_operacao: "tipo-fds", ponto_coleta: "Rua das Flores, 123 - Centro",
    data_solicitacao: "2026-03-14T14:00:00Z", data_inicio: "2026-03-14T14:20:00Z", data_conclusao: "2026-03-14T15:30:00Z",
    valor_total_taxas: 9.50, valor_total_repasse: null, justificativa: null,
    historico: [
      { tipo: "criacao", timestamp: "2026-03-14T14:00:00Z", descricao: "Solicitação criada" },
      { tipo: "concluida", status_anterior: "em_andamento", status_novo: "concluida", timestamp: "2026-03-14T15:30:00Z", descricao: "Concluída" },
    ],
    created_at: "2026-03-14T14:00:00Z", updated_at: "2026-03-14T15:30:00Z",
  },
  {
    id: "sol-006", codigo: "LT-20260315-00006", cliente_id: "cli-005", entregador_id: null,
    status: "pendente", tipo_operacao: "tipo-feriado", ponto_coleta: "Rua Padre Valdevino, 800 - Joaquim Távora",
    data_solicitacao: "2026-03-15T11:00:00Z", data_inicio: null, data_conclusao: null,
    valor_total_taxas: 16.00, valor_total_repasse: null, justificativa: null,
    historico: [
      { tipo: "criacao", timestamp: "2026-03-15T11:00:00Z", descricao: "Solicitação criada" },
    ],
    created_at: "2026-03-15T11:00:00Z", updated_at: "2026-03-15T11:00:00Z",
  },
  {
    id: "sol-007", codigo: "LT-20260314-00007", cliente_id: "cli-002", entregador_id: "ent-001",
    status: "cancelada", tipo_operacao: "tipo-comercial", ponto_coleta: "Av. Santos Dumont, 500 - Aldeota",
    data_solicitacao: "2026-03-14T16:00:00Z", data_inicio: null, data_conclusao: null,
    valor_total_taxas: 14.00, valor_total_repasse: null, justificativa: "Cliente cancelou por indisponibilidade",
    historico: [
      { tipo: "criacao", timestamp: "2026-03-14T16:00:00Z", descricao: "Solicitação criada" },
      { tipo: "cancelada", status_anterior: "pendente", status_novo: "cancelada", timestamp: "2026-03-14T16:30:00Z", descricao: "Cancelada: Cliente cancelou por indisponibilidade" },
    ],
    created_at: "2026-03-14T16:00:00Z", updated_at: "2026-03-14T16:30:00Z",
  },
  {
    id: "sol-008", codigo: "LT-20260315-00008", cliente_id: "cli-003", entregador_id: "ent-006",
    status: "em_andamento", tipo_operacao: "tipo-noturno", ponto_coleta: "Rua Barão de Aracati, 200 - Meireles",
    data_solicitacao: "2026-03-15T11:30:00Z", data_inicio: "2026-03-15T12:00:00Z", data_conclusao: null,
    valor_total_taxas: 9.00, valor_total_repasse: null, justificativa: null,
    historico: [
      { tipo: "criacao", timestamp: "2026-03-15T11:30:00Z", descricao: "Solicitação criada" },
      { tipo: "em_andamento", status_anterior: "aceita", status_novo: "em_andamento", timestamp: "2026-03-15T12:00:00Z", descricao: "Em andamento" },
    ],
    created_at: "2026-03-15T11:30:00Z", updated_at: "2026-03-15T12:00:00Z",
  },
  {
    id: "sol-009", codigo: "LT-20260315-00009", cliente_id: "cli-004", entregador_id: "ent-001",
    status: "em_andamento", tipo_operacao: "tipo-comercial", ponto_coleta: "Av. Washington Soares, 1000 - Messejana",
    data_solicitacao: "2026-03-15T12:00:00Z", data_inicio: "2026-03-15T12:15:00Z", data_conclusao: null,
    valor_total_taxas: 8.00, valor_total_repasse: null, justificativa: null,
    historico: [
      { tipo: "criacao", timestamp: "2026-03-15T12:00:00Z", descricao: "Solicitação criada" },
      { tipo: "aceita", status_anterior: "pendente", status_novo: "aceita", timestamp: "2026-03-15T12:10:00Z", descricao: "Atribuída a Carlos Silva" },
      { tipo: "em_andamento", status_anterior: "aceita", status_novo: "em_andamento", timestamp: "2026-03-15T12:15:00Z", descricao: "Entregador iniciou coleta" },
    ],
    created_at: "2026-03-15T12:00:00Z", updated_at: "2026-03-15T12:00:00Z",
  },
  {
    id: "sol-010", codigo: "LT-20260314-00010", cliente_id: "cli-005", entregador_id: "ent-002",
    status: "concluida", tipo_operacao: "tipo-fds", ponto_coleta: "Rua Padre Valdevino, 800 - Joaquim Távora",
    data_solicitacao: "2026-03-14T09:00:00Z", data_inicio: "2026-03-14T09:20:00Z", data_conclusao: "2026-03-14T10:45:00Z",
    valor_total_taxas: 12.00, valor_total_repasse: null, justificativa: null,
    historico: [
      { tipo: "criacao", timestamp: "2026-03-14T09:00:00Z", descricao: "Solicitação criada" },
      { tipo: "concluida", status_anterior: "em_andamento", status_novo: "concluida", timestamp: "2026-03-14T10:45:00Z", descricao: "Concluída" },
    ],
    created_at: "2026-03-14T09:00:00Z", updated_at: "2026-03-14T10:45:00Z",
  },
  {
    id: "sol-011", codigo: "LT-20260314-00011", cliente_id: "cli-001", entregador_id: "ent-003",
    status: "rejeitada", tipo_operacao: "tipo-comercial", ponto_coleta: "Rua das Flores, 123 - Centro",
    data_solicitacao: "2026-03-14T11:00:00Z", data_inicio: null, data_conclusao: null,
    valor_total_taxas: null, valor_total_repasse: null, justificativa: "Endereço fora da área de cobertura",
    historico: [
      { tipo: "criacao", timestamp: "2026-03-14T11:00:00Z", descricao: "Solicitação criada" },
      { tipo: "rejeitada", status_anterior: "pendente", status_novo: "rejeitada", timestamp: "2026-03-14T11:15:00Z", descricao: "Rejeitada: Endereço fora da área de cobertura" },
    ],
    created_at: "2026-03-14T11:00:00Z", updated_at: "2026-03-14T11:15:00Z",
  },
];

// ── Helpers ──
export const getClienteName = (id: string): string => {
  const map: Record<string, string> = {
    "cli-001": "João Silva",
    "cli-002": "Padaria Pão Quente",
    "cli-003": "Farmácia Saúde",
    "cli-004": "Restaurante Sabor & Arte",
    "cli-005": "Maria Oliveira",
  };
  return map[id] ?? "Cliente desconhecido";
};

export const getEntregadorName = (id: string | null | undefined): string => {
  if (!id) return "—";
  const map: Record<string, string> = {
    "ent-001": "Carlos Silva",
    "ent-002": "Ricardo Oliveira",
    "ent-003": "Fernando Santos",
    "ent-004": "Lucas Pereira",
    "ent-005": "André Costa",
    "ent-006": "Paulo Mendes",
    "ent-007": "Diego Almeida",
    "ent-008": "Marcos Ribeiro",
  };
  return map[id] ?? "—";
};

export const getRotasBySolicitacao = (solicitacaoId: string): Rota[] =>
  MOCK_ROTAS.filter((r) => r.solicitacao_id === solicitacaoId);

// ── Pagamentos Mock (conciliação realizada) ──
export const MOCK_PAGAMENTOS_SOLICITACAO: PagamentoSolicitacao[] = [
  // sol-001 (concluida, cli-001 = pre_pago, João Silva)
  // rota-001: taxa 10, receber_do_cliente 45
  { id: "pag-001", solicitacao_id: "sol-001", rota_id: "rota-001", forma_pagamento_id: "fp-1", valor: 10.00, pertence_a: "operacao", observacao: null, created_by: null, created_at: "2026-03-15T10:15:00Z" },
  { id: "pag-002", solicitacao_id: "sol-001", rota_id: "rota-001", forma_pagamento_id: "fp-1", valor: 45.00, pertence_a: "loja", observacao: null, created_by: null, created_at: "2026-03-15T10:15:00Z" },
  // rota-002: taxa 12, sem receber
  { id: "pag-003", solicitacao_id: "sol-001", rota_id: "rota-002", forma_pagamento_id: "fp-1", valor: 12.00, pertence_a: "operacao", observacao: null, created_by: null, created_at: "2026-03-15T10:15:00Z" },
  // sol-005 (concluida, cli-001 = pre_pago)
  // rota-007: taxa 9.50, sem receber
  { id: "pag-004", solicitacao_id: "sol-005", rota_id: "rota-007", forma_pagamento_id: "fp-2", valor: 9.50, pertence_a: "operacao", observacao: null, created_by: null, created_at: "2026-03-14T15:30:00Z" },
  // sol-010 (concluida, cli-005 = pre_pago, Maria Oliveira)
  // rota-012: taxa 12, receber 70
  { id: "pag-005", solicitacao_id: "sol-010", rota_id: "rota-012", forma_pagamento_id: "fp-2", valor: 12.00, pertence_a: "operacao", observacao: null, created_by: null, created_at: "2026-03-14T10:45:00Z" },
  { id: "pag-006", solicitacao_id: "sol-010", rota_id: "rota-012", forma_pagamento_id: "fp-1", valor: 70.00, pertence_a: "loja", observacao: null, created_by: null, created_at: "2026-03-14T10:45:00Z" },
];

export const getPagamentosByRota = (rotaId: string): PagamentoSolicitacao[] =>
  MOCK_PAGAMENTOS_SOLICITACAO.filter((p) => p.rota_id === rotaId);

export const getPagamentosBySolicitacao = (solicitacaoId: string): PagamentoSolicitacao[] =>
  MOCK_PAGAMENTOS_SOLICITACAO.filter((p) => p.solicitacao_id === solicitacaoId);

export const STATUS_TABS: { value: StatusSolicitacao | "todas"; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "pendente", label: "Pendentes" },
  { value: "aceita", label: "Aceitas" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "concluida", label: "Concluídas" },
  { value: "cancelada", label: "Canceladas" },
  { value: "rejeitada", label: "Rejeitadas" },
];

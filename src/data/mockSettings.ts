import type {
  Regiao, Bairro, FormaPagamento, Cargo, TabelaPrecoCliente,
  TipoPreco, TipoComissao, TipoOperacaoConfig, Feriado,
} from "@/types/database";

// ── Regiões ──
export const MOCK_REGIOES: Regiao[] = [
  { id: "reg-1", name: "Centro", description: "Região central da cidade" },
  { id: "reg-2", name: "Zona Norte", description: "Bairros da zona norte" },
  { id: "reg-3", name: "Zona Sul", description: "Bairros da zona sul" },
  { id: "reg-4", name: "Zona Leste", description: "Bairros da zona leste" },
  { id: "reg-5", name: "Zona Oeste", description: "Bairros da zona oeste" },
];

// ── Bairros ──
export const MOCK_BAIRROS: Bairro[] = [
  { id: "bairro-1", nome: "Centro", region_id: "reg-1", taxa_entrega: 8.00 },
  { id: "bairro-2", nome: "Boa Vista", region_id: "reg-1", taxa_entrega: 9.50 },
  { id: "bairro-3", nome: "Aldeota", region_id: "reg-2", taxa_entrega: 10.00 },
  { id: "bairro-4", nome: "Meireles", region_id: "reg-2", taxa_entrega: 11.00 },
  { id: "bairro-5", nome: "Papicu", region_id: "reg-3", taxa_entrega: 12.00 },
  { id: "bairro-6", nome: "Cocó", region_id: "reg-3", taxa_entrega: 12.50 },
  { id: "bairro-7", nome: "Messejana", region_id: "reg-4", taxa_entrega: 15.00 },
  { id: "bairro-8", nome: "Mondubim", region_id: "reg-5", taxa_entrega: 16.00 },
  { id: "bairro-9", nome: "Parangaba", region_id: "reg-5", taxa_entrega: 14.00 },
  { id: "bairro-10", nome: "Fátima", region_id: "reg-1", taxa_entrega: 9.00 },
];

// ── Formas de Pagamento ──
export const MOCK_FORMAS_PAGAMENTO: FormaPagamento[] = [
  { id: "fp-1", name: "Dinheiro", description: "Pagamento em espécie", enabled: true, order: 1 },
  { id: "fp-2", name: "PIX", description: "Transferência instantânea", enabled: true, order: 2 },
  { id: "fp-3", name: "Cartão de Crédito", description: "Visa, Mastercard, Elo", enabled: true, order: 3 },
  { id: "fp-4", name: "Cartão de Débito", description: "Visa, Mastercard, Elo", enabled: true, order: 4 },
  { id: "fp-5", name: "Boleto", description: "Boleto bancário", enabled: false, order: 5 },
];

// ── Cargos ──
export const MOCK_CARGOS: Cargo[] = [
  {
    id: "cargo-1",
    name: "Administrador Geral",
    description: "Acesso total ao sistema",
    permissions: [
      "dashboard.view", "solicitacoes.view", "solicitacoes.create", "solicitacoes.edit", "solicitacoes.delete",
      "clientes.view", "clientes.create", "clientes.edit", "clientes.delete",
      "entregadores.view", "entregadores.create", "entregadores.edit", "entregadores.delete",
      "faturas.view", "faturas.create", "faturas.edit",
      "financeiro.view", "financeiro.edit",
      "relatorios.view", "relatorios.export",
      "logs.view", "logs.export",
      "configuracoes.view", "configuracoes.edit",
      "usuarios.view", "usuarios.create", "usuarios.edit", "usuarios.delete",
    ],
  },
  {
    id: "cargo-2",
    name: "Operador",
    description: "Gestão de solicitações e entregas",
    permissions: [
      "dashboard.view", "solicitacoes.view", "solicitacoes.create", "solicitacoes.edit",
      "clientes.view", "entregadores.view", "faturas.view",
    ],
  },
  {
    id: "cargo-3",
    name: "Financeiro",
    description: "Gestão financeira e faturas",
    permissions: [
      "dashboard.view", "faturas.view", "faturas.create", "faturas.edit",
      "financeiro.view", "financeiro.edit", "relatorios.view", "relatorios.export",
    ],
  },
];

// ── Mapa de Permissões por Módulo ──
export const PERMISSION_MODULES = [
  {
    module: "Dashboard",
    permissions: [{ key: "dashboard.view", label: "Visualizar" }],
  },
  {
    module: "Solicitações",
    permissions: [
      { key: "solicitacoes.view", label: "Visualizar" },
      { key: "solicitacoes.create", label: "Criar" },
      { key: "solicitacoes.edit", label: "Editar" },
      { key: "solicitacoes.delete", label: "Excluir" },
    ],
  },
  {
    module: "Clientes",
    permissions: [
      { key: "clientes.view", label: "Visualizar" },
      { key: "clientes.create", label: "Criar" },
      { key: "clientes.edit", label: "Editar" },
      { key: "clientes.delete", label: "Excluir" },
    ],
  },
  {
    module: "Entregadores",
    permissions: [
      { key: "entregadores.view", label: "Visualizar" },
      { key: "entregadores.create", label: "Criar" },
      { key: "entregadores.edit", label: "Editar" },
      { key: "entregadores.delete", label: "Excluir" },
    ],
  },
  {
    module: "Faturas",
    permissions: [
      { key: "faturas.view", label: "Visualizar" },
      { key: "faturas.create", label: "Criar" },
      { key: "faturas.edit", label: "Editar" },
    ],
  },
  {
    module: "Financeiro",
    permissions: [
      { key: "financeiro.view", label: "Visualizar" },
      { key: "financeiro.edit", label: "Editar" },
    ],
  },
  {
    module: "Relatórios",
    permissions: [
      { key: "relatorios.view", label: "Visualizar" },
      { key: "relatorios.export", label: "Exportar" },
    ],
  },
  {
    module: "Logs",
    permissions: [
      { key: "logs.view", label: "Visualizar" },
      { key: "logs.export", label: "Exportar" },
    ],
  },
  {
    module: "Configurações",
    permissions: [
      { key: "configuracoes.view", label: "Visualizar" },
      { key: "configuracoes.edit", label: "Editar" },
    ],
  },
  {
    module: "Usuários",
    permissions: [
      { key: "usuarios.view", label: "Visualizar" },
      { key: "usuarios.create", label: "Criar" },
      { key: "usuarios.edit", label: "Editar" },
      { key: "usuarios.delete", label: "Excluir" },
    ],
  },
];

// ── Tabela de Preços (mock) ──
export const MOCK_TABELA_PRECOS: TabelaPrecoCliente[] = [
  {
    id: "tp-1",
    cliente_id: "mock-cliente-001",
    bairro_destino_id: "bairro-1",
    regiao_id: null,
    tipo_operacao: "tipo-comercial",
    taxa_base: 10.00,
    taxa_retorno: 5.00,
    taxa_espera: 3.00,
    taxa_urgencia: 8.00,
    ativo: true,
    prioridade: 1,
    observacao: "Tarifa padrão centro",
    created_at: "2025-01-01",
    updated_at: "2025-01-01",
  },
  {
    id: "tp-2",
    cliente_id: "mock-cliente-001",
    bairro_destino_id: "bairro-3",
    regiao_id: "reg-2",
    tipo_operacao: "tipo-noturno",
    taxa_base: 18.00,
    taxa_retorno: 7.00,
    taxa_espera: 5.00,
    taxa_urgencia: 12.00,
    ativo: true,
    prioridade: 2,
    observacao: null,
    created_at: "2025-01-01",
    updated_at: "2025-01-01",
  },
  {
    id: "tp-3",
    cliente_id: "mock-cliente-001",
    bairro_destino_id: null,
    regiao_id: "reg-3",
    tipo_operacao: "todos",
    taxa_base: 14.00,
    taxa_retorno: 6.00,
    taxa_espera: 4.00,
    taxa_urgencia: 10.00,
    ativo: true,
    prioridade: 3,
    observacao: "Cobertura geral Zona Sul",
    created_at: "2025-01-01",
    updated_at: "2025-01-01",
  },
  {
    id: "tp-4",
    cliente_id: "mock-cliente-001",
    bairro_destino_id: "bairro-7",
    regiao_id: "reg-4",
    tipo_operacao: "tipo-fds",
    taxa_base: 20.00,
    taxa_retorno: 8.00,
    taxa_espera: 5.00,
    taxa_urgencia: 15.00,
    ativo: false,
    prioridade: 4,
    observacao: "Desativada temporariamente",
    created_at: "2025-01-01",
    updated_at: "2025-01-01",
  },
];

// ── Taxas Extras ──
import type { TaxaExtraConfig } from "@/types/database";

export const MOCK_TAXAS_EXTRAS: TaxaExtraConfig[] = [
  { id: "te-cfg-1", nome: "Taxa de Espera", valor_padrao: 5.00, ativo: true },
  { id: "te-cfg-2", nome: "Taxa de Retorno", valor_padrao: 7.00, ativo: true },
  { id: "te-cfg-3", nome: "Taxa de Urgência", valor_padrao: 10.00, ativo: true },
  { id: "te-cfg-4", nome: "Taxa Noturna", valor_padrao: 8.00, ativo: false },
];

// ── Mock Clientes simplificado (para select na aba de preços) ──
export const MOCK_CLIENTES_SELECT = [
  { id: "mock-cliente-001", nome: "João Silva" },
  { id: "mock-cliente-002", nome: "Padaria Pão Quente" },
  { id: "mock-cliente-003", nome: "Farmácia Saúde" },
  { id: "mock-cliente-004", nome: "Restaurante Sabor & Arte" },
];

// ── Tipos de Operação ──
export const MOCK_TIPOS_OPERACAO: TipoOperacaoConfig[] = [
  {
    id: "tipo-comercial", nome: "Horário Comercial", descricao: "Entregas durante o horário comercial em dias úteis",
    dias_semana: ["seg", "ter", "qua", "qui", "sex"], horario_inicio: "08:00", horario_fim: "18:00",
    aplica_feriado: false, cor: "#3b82f6", ativo: true, prioridade: 1,
    created_at: "2025-01-01", updated_at: "2025-01-01",
  },
  {
    id: "tipo-noturno", nome: "Noturno", descricao: "Entregas noturnas com taxa diferenciada",
    dias_semana: ["seg", "ter", "qua", "qui", "sex"], horario_inicio: "18:00", horario_fim: "23:59",
    aplica_feriado: false, cor: "#6366f1", ativo: true, prioridade: 2,
    created_at: "2025-01-01", updated_at: "2025-01-01",
  },
  {
    id: "tipo-fds", nome: "Fim de Semana", descricao: "Entregas aos sábados e domingos",
    dias_semana: ["sab", "dom"], horario_inicio: null, horario_fim: null,
    aplica_feriado: false, cor: "#f59e0b", ativo: true, prioridade: 3,
    created_at: "2025-01-01", updated_at: "2025-01-01",
  },
  {
    id: "tipo-feriado", nome: "Feriado", descricao: "Entregas em feriados nacionais e locais",
    dias_semana: [], horario_inicio: null, horario_fim: null,
    aplica_feriado: true, cor: "#ef4444", ativo: true, prioridade: 4,
    created_at: "2025-01-01", updated_at: "2025-01-01",
  },
  {
    id: "tipo-madrugada", nome: "Madrugada", descricao: "Entregas de madrugada",
    dias_semana: ["seg", "ter", "qua", "qui", "sex", "sab", "dom"], horario_inicio: "00:00", horario_fim: "06:00",
    aplica_feriado: false, cor: "#8b5cf6", ativo: false, prioridade: 5,
    created_at: "2025-01-01", updated_at: "2025-01-01",
  },
];

// ── Feriados ──
export const MOCK_FERIADOS: Feriado[] = [
  { id: "fer-1", nome: "Ano Novo", data: "2025-01-01", recorrente: true, ativo: true, created_at: "2025-01-01" },
  { id: "fer-2", nome: "Carnaval", data: "2025-03-04", recorrente: false, ativo: true, created_at: "2025-01-01" },
  { id: "fer-3", nome: "Sexta-feira Santa", data: "2025-04-18", recorrente: false, ativo: true, created_at: "2025-01-01" },
  { id: "fer-4", nome: "Tiradentes", data: "2025-04-21", recorrente: true, ativo: true, created_at: "2025-01-01" },
  { id: "fer-5", nome: "Dia do Trabalho", data: "2025-05-01", recorrente: true, ativo: true, created_at: "2025-01-01" },
  { id: "fer-6", nome: "Independência do Brasil", data: "2025-09-07", recorrente: true, ativo: true, created_at: "2025-01-01" },
  { id: "fer-7", nome: "Nossa Sra. Aparecida", data: "2025-10-12", recorrente: true, ativo: true, created_at: "2025-01-01" },
  { id: "fer-8", nome: "Finados", data: "2025-11-02", recorrente: true, ativo: true, created_at: "2025-01-01" },
  { id: "fer-9", nome: "Proclamação da República", data: "2025-11-15", recorrente: true, ativo: true, created_at: "2025-01-01" },
  { id: "fer-10", nome: "Natal", data: "2025-12-25", recorrente: true, ativo: true, created_at: "2025-01-01" },
];

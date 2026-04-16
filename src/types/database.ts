// =============================================================================
// TIPOS TYPESCRIPT — LEVA E TRAZ v2.0
// Derivados do schema.prisma
// =============================================================================

// ── Enums ──

export type Role = "admin" | "cliente" | "entregador";

export type StatusSolicitacao =
  | "pendente"
  | "aceita"
  | "em_andamento"
  | "concluida"
  | "cancelada"
  | "rejeitada";

export type TipoOperacao = string; // Dynamic — references TipoOperacaoConfig.id

export type Modalidade = "pre_pago" | "faturado";

export type FrequenciaFaturamento = "diario" | "semanal" | "mensal" | "por_entrega";

export type DiaSemana =
  | "domingo" | "segunda" | "terca" | "quarta"
  | "quinta" | "sexta" | "sabado";

export type TipoComissao = "percentual" | "fixo";

export type TipoVeiculo = "moto" | "carro" | "bicicleta" | "a_pe";

export type StatusGeral = "Aberta" | "Fechada" | "Paga" | "Finalizada" | "Vencida";

export type StatusTaxas = "Pendente" | "Paga" | "Vencida";

export type StatusRepasse = "Pendente" | "Repassado";

export type StatusCobranca =
  | "Nao_aplicavel" | "Pendente" | "Cobrado" | "Inadimplente";

export type TipoFaturamento = "por_entrega" | "semanal" | "mensal" | "diario" | "manual";

export type StatusDespesa = "Pendente" | "Atrasado" | "Pago";

export type PertenceA = "operacao" | "loja";

export type TipoLancamento =
  | "receita_operacao" | "credito_loja" | "debito_loja" | "ajuste";

export type SinalLancamento = "credito" | "debito";

export type StatusLiquidacao = "pendente" | "liquidado" | "estornado";

export type TipoAjuste = "credito" | "debito";

export type TipoPreco = string; // Now dynamic, references TipoOperacaoConfig.id

export type DiaSemanaConfig = "seg" | "ter" | "qua" | "qui" | "sex" | "sab" | "dom";

export interface TipoOperacaoConfig {
  id: string;
  nome: string;
  descricao?: string | null;
  dias_semana: DiaSemanaConfig[];
  horario_inicio?: string | null; // "HH:mm"
  horario_fim?: string | null;    // "HH:mm"
  aplica_feriado: boolean;
  cor: string; // hex or tailwind color
  ativo: boolean;
  prioridade: number;
  created_at: string;
  updated_at: string;
}

export interface Feriado {
  id: string;
  nome: string;
  data: string; // "YYYY-MM-DD"
  recorrente: boolean; // repete todo ano
  ativo: boolean;
  created_at: string;
}

// ── Interfaces ──

export interface Profile {
  id: string;
  nome: string;
  email: string;
  role: Role;
  avatar?: string | null;
  cargo_id?: string | null;
  permissions: string[];
  created_at: string;
}

export interface Cargo {
  id: string;
  name: string;
  description?: string | null;
  permissions: string[];
  sistema?: boolean;
}

export interface Cliente {
  id: string;
  nome: string;
  tipo: "pessoa_fisica" | "pessoa_juridica";
  email: string;
  telefone: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  chave_pix?: string | null;
  status: "ativo" | "inativo" | "bloqueado";
  modalidade: Modalidade;
  ativar_faturamento_automatico: boolean;
  frequencia_faturamento?: FrequenciaFaturamento | null;
  numero_de_entregas_para_faturamento?: number | null;
  dia_da_semana_faturamento?: DiaSemana | null;
  dia_do_mes_faturamento?: number | null;
  prazo_vencimento_dias?: number;
  logo_url?: string | null;
  exibir_logo_landing?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Entregador {
  id: string;
  nome: string;
  documento: string;
  email: string;
  telefone: string;
  cidade: string;
  bairro: string;
  veiculo: TipoVeiculo;
  status: "ativo" | "inativo";
  avatar?: string | null;
  tipo_comissao: TipoComissao;
  valor_comissao: number;
  created_at: string;
  updated_at: string;
}

export interface Regiao {
  id: string;
  name: string;
  description?: string | null;
}

export interface Bairro {
  id: string;
  nome: string;
  region_id: string;
  taxa_entrega: number;
}

export interface FormaPagamento {
  id: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  order: number;
}

export interface TaxaExtraConfig {
  id: string;
  nome: string;
  valor_padrao: number;
  ativo: boolean;
}

export interface TaxaExtra {
  id: string;
  nome: string;
  valor: number;
}

export interface TabelaPrecoCliente {
  id: string;
  cliente_id: string;
  bairro_destino_id?: string | null;
  regiao_id?: string | null;
  tipo_operacao: TipoPreco;
  taxa_base: number;
  taxa_retorno: number;
  taxa_espera: number;
  taxa_urgencia: number;
  ativo: boolean;
  prioridade: number;
  observacao?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Solicitacao {
  id: string;
  codigo: string;
  cliente_id: string;
  entregador_id?: string | null;
  entregador_nome?: string | null;
  cliente_nome?: string | null;
  status: StatusSolicitacao;
  tipo_operacao: TipoOperacao;
  ponto_coleta: string;
  data_solicitacao: string;
  data_inicio?: string | null;
  data_conclusao?: string | null;
  admin_conciliada_at?: string | null;
  valor_total_taxas?: number | null;
  valor_total_repasse?: number | null;
  justificativa?: string | null;
  retroativo?: boolean;
  historico: HistoricoEvento[];
  created_at: string;
  updated_at: string;
}

export interface Rota {
  id: string;
  solicitacao_id: string;
  bairro_destino_id: string;
  responsavel: string;
  telefone: string;
  observacoes?: string | null;
  receber_do_cliente: boolean;
  valor_a_receber?: number | null;
  taxa_resolvida?: number | null;
  regra_preco_id?: string | null;
  status: "ativa" | "concluida" | "cancelada";
}

export interface PagamentoSolicitacao {
  id: string;
  solicitacao_id: string;
  rota_id: string;
  forma_pagamento_id: string;
  valor: number;
  pertence_a: PertenceA;
  observacao?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface LancamentoFinanceiro {
  id: string;
  solicitacao_id?: string | null;
  cliente_id: string;
  fatura_id?: string | null;
  tipo: TipoLancamento;
  valor: number;
  sinal: SinalLancamento;
  status_liquidacao: StatusLiquidacao;
  descricao?: string | null;
  referencia_origem?: string | null;
  usuario_id?: string | null;
  created_at: string;
}

export interface Fatura {
  id: string;
  numero: string;
  cliente_id: string;
  cliente_nome: string;
  tipo_faturamento: TipoFaturamento;
  total_entregas: number;
  data_emissao: string;
  data_vencimento: string;
  valor_taxas?: number | null;
  valor_repasse?: number | null;
  total_creditos_loja?: number | null;
  total_debitos_loja?: number | null;
  saldo_liquido?: number | null;
  status_geral: StatusGeral;
  status_taxas: StatusTaxas;
  status_repasse: StatusRepasse;
  status_cobranca: StatusCobranca;
  observacoes?: string | null;
  historico: HistoricoEvento[];
  created_at: string;
  updated_at: string;
}

export interface Despesa {
  id: string;
  descricao: string;
  categoria_id: string | null;
  fornecedor: string;
  vencimento: string;
  valor: number;
  status: StatusDespesa;
  data_pagamento?: string | null;
  usuario_pagou_id?: string | null;
  observacao?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Receita {
  id: string;
  descricao: string;
  categoria_id: string | null;
  cliente_id?: string | null;
  data_recebimento: string;
  valor: number;
  observacao?: string | null;
  created_at: string;
}

export interface AjusteFinanceiro {
  id: string;
  fatura_id: string;
  solicitacao_id?: string | null;
  tipo: TipoAjuste;
  valor: number;
  motivo: string;
  usuario_id: string;
  created_at: string;
}

export interface AuditoriaFinanceira {
  id: string;
  entidade: string;
  entidade_id: string;
  campo?: string | null;
  valor_anterior?: unknown;
  valor_novo?: unknown;
  motivo: string;
  usuario_id: string;
  created_at: string;
}

export interface SystemSetting {
  key: string;
  value?: string | null;
  updated_by?: string | null;
  updated_at: string;
}

export interface UserPreference {
  user_id: string;
  key: string;
  value: unknown;
}

// ── Fatura entrega types ──────────────────────────────────────────────────────

export interface RotaEntregaFatura {
  bairro_destino: string;
  responsavel: string;
  telefone: string;
  taxa: number;
  valor_receber: number | null;
  status: "concluida" | "cancelada";
}

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

// ── Logs / Auditoria ──

export type LogCategoria =
  | "solicitacao" | "fatura" | "financeiro"
  | "cliente" | "entregador" | "configuracao" | "autenticacao";

export interface LogEntry {
  id: string;
  timestamp: string;
  usuario_id: string;
  usuario_nome: string;
  categoria: LogCategoria;
  acao: string;
  entidade_id: string;
  descricao: string;
  detalhes: Record<string, unknown> | null;
}

// ── Helpers ──

export interface HistoricoEvento {
  tipo: string;
  status_anterior?: string;
  status_novo?: string;
  usuarioId?: string;
  timestamp: string;
  descricao: string;
}

// ── Status Maps ──

export const STATUS_SOLICITACAO_LABELS: Record<StatusSolicitacao, string> = {
  pendente: "Pendente",
  aceita: "Aceita",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
  rejeitada: "Rejeitada",
};

export const STATUS_GERAL_LABELS: Record<StatusGeral, string> = {
  Aberta: "Aberta",
  Fechada: "Fechada",
  Paga: "Paga",
  Finalizada: "Finalizada",
  Vencida: "Vencida",
};

// TIPO_OPERACAO_LABELS removed — use getTipoOperacaoLabel() from TipoOperacaoBadge instead

export const TIPO_VEICULO_LABELS: Record<TipoVeiculo, string> = {
  moto: "Moto",
  carro: "Carro",
  bicicleta: "Bicicleta",
  a_pe: "A pé",
};

// ── Recarga Pré-Pago ──

export interface RecargaPrePago {
  id: string;
  cliente_id: string;
  valor: number;
  observacao: string;
  registrado_por: string;
  created_at: string;
}

// ── Livro Caixa ──

export interface LivroCaixaEntry {
  id: string;
  data: string;
  tipo: "entrada" | "saida";
  descricao: string;
  categoria: string;
  valor: number;
  saldo_acumulado: number;
}

// ── Caixa de Entregadores ──

export type StatusCaixa = "aberto" | "fechado" | "divergente";

export interface RecebimentoDinheiro {
  id: string;
  solicitacao_codigo: string;
  cliente_nome: string;
  valor_recebido: number;
  hora: string;
}

export interface CaixaEntregador {
  id: string;
  entregador_id: string;
  entregador_nome: string;
  data: string;
  troco_inicial: number;
  recebimentos: RecebimentoDinheiro[];
  total_recebido: number;
  total_esperado: number;
  valor_devolvido: number | null;
  diferenca: number | null;
  status: StatusCaixa;
  observacoes: string | null;
  created_at: string;
  closed_at: string | null;
}

// ── Gestão de Usuários ──

export type UserStatus = "ativo" | "inativo";

export interface UserAccount {
  id: string;
  email: string;
  password: string;
  nome: string;
  role: Role;
  cargo_id?: string | null;
  status: UserStatus;
  avatarUrl?: string | null;
  created_at: string;
  updated_at: string;
}

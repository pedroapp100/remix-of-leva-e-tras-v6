// =============================================================================
// TIPOS SUPABASE — LEVA E TRAZ v2.0
// Gerado manualmente a partir do SPEC.md
//
// ⚠️  SUBSTITUIR pelo arquivo gerado automaticamente após executar o SPEC.md:
//   npx supabase gen types typescript --project-id SEU_PROJECT_REF > src/types/supabase.ts
//
// Referência de geração: https://supabase.com/docs/reference/cli/supabase-gen-types
// =============================================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ── Enums ──────────────────────────────────────────────────────────────────

export type DbRole = "admin" | "cliente" | "entregador";
export type DbModalidade = "pre_pago" | "faturado";
export type DbFrequenciaFaturamento = "diario" | "semanal" | "mensal" | "por_entrega";
export type DbDiaSemana = "domingo" | "segunda" | "terca" | "quarta" | "quinta" | "sexta" | "sabado";
export type DbTipoComissao = "percentual" | "fixo";
export type DbTipoVeiculo = "moto" | "carro" | "bicicleta" | "a_pe";
export type DbStatusSolicitacao = "pendente" | "aceita" | "em_andamento" | "concluida" | "cancelada" | "rejeitada";
export type DbPertenceA = "operacao" | "loja";
export type DbTipoLancamento = "receita_operacao" | "credito_loja" | "debito_loja" | "ajuste";
export type DbSinalLancamento = "credito" | "debito";
export type DbStatusLiquidacao = "pendente" | "liquidado" | "estornado";
export type DbTipoAjuste = "credito" | "debito";
export type DbStatusGeral = "Aberta" | "Fechada" | "Paga" | "Finalizada" | "Vencida";
export type DbStatusTaxas = "Pendente" | "Paga" | "Vencida";
export type DbStatusRepasse = "Pendente" | "Repassado";
export type DbStatusCobranca = "Nao_aplicavel" | "Pendente" | "Cobrado" | "Inadimplente";
export type DbTipoFaturamento = "por_entrega" | "semanal" | "mensal" | "diario" | "manual";
export type DbStatusDespesa = "Pendente" | "Atrasado" | "Pago";
export type DbStatusCaixa = "aberto" | "fechado" | "divergente";

// ── Row types — leitura ─────────────────────────────────────────────────────

export interface Tables {
  ajustes_financeiros: {
    Row: {
      id: string;
      fatura_id: string;
      solicitacao_id: string | null;
      tipo: DbTipoAjuste;
      valor: number;
      motivo: string;
      usuario_id: string;
      created_at: string;
    };
    Insert: Omit<Tables["ajustes_financeiros"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
    Update: Partial<Tables["ajustes_financeiros"]["Insert"]>;
  };
  auditoria_financeira: {
    Row: {
      id: string;
      entidade: string;
      entidade_id: string;
      campo: string | null;
      valor_anterior: Json | null;
      valor_novo: Json | null;
      motivo: string;
      usuario_id: string;
      created_at: string;
    };
    Insert: Omit<Tables["auditoria_financeira"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
    Update: Partial<Tables["auditoria_financeira"]["Insert"]>;
  };
  bairros: {
    Row: {
      id: string;
      nome: string;
      region_id: string;
      taxa_entrega: number;
      created_at: string;
      updated_at: string;
    };
    Insert: Omit<Tables["bairros"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
    Update: Partial<Tables["bairros"]["Insert"]>;
  };
  caixas_entregadores: {
    Row: {
      id: string;
      entregador_id: string;
      data: string;
      troco_inicial: number;
      valor_devolvido: number | null;
      diferenca: number | null;
      status: DbStatusCaixa;
      justificativa_divergencia: string | null;
      observacoes: string | null;
      aberto_por_id: string | null;
      fechado_por_id: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: Omit<Tables["caixas_entregadores"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
    Update: Partial<Tables["caixas_entregadores"]["Insert"]>;
  };
  cargos: {
    Row: {
      id: string;
      name: string;
      description: string | null;
      permissions: string[];
      sistema: boolean;
      created_at: string;
    };
    Insert: Omit<Tables["cargos"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
    Update: Partial<Tables["cargos"]["Insert"]>;
  };
  categorias_financeiras: {
    Row: {
      id: string;
      nome: string;
      tipo: "despesa" | "receita" | "ambos";
      ativo: boolean;
      created_at: string;
    };
    Insert: Omit<Tables["categorias_financeiras"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
    Update: Partial<Tables["categorias_financeiras"]["Insert"]>;
  };
  clientes: {
    Row: {
      id: string;
      profile_id: string | null;
      nome: string;
      tipo: "pessoa_fisica" | "pessoa_juridica";
      documento: string | null;
      email: string;
      telefone: string;
      endereco: string;
      bairro: string;
      cidade: string;
      uf: string;
      chave_pix: string | null;
      status: "ativo" | "inativo" | "bloqueado";
      modalidade: DbModalidade;
      ativar_faturamento_automatico: boolean;
      frequencia_faturamento: DbFrequenciaFaturamento | null;
      numero_de_entregas_para_faturamento: number | null;
      dia_da_semana_faturamento: DbDiaSemana | null;
      dia_do_mes_faturamento: number | null;
      created_at: string;
      updated_at: string;
    };
    Insert: Omit<Tables["clientes"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
    Update: Partial<Tables["clientes"]["Insert"]>;
  };
  despesas: {
    Row: {
      id: string;
      descricao: string;
      categoria_id: string | null;
      fornecedor: string;
      vencimento: string;
      valor: number;
      status: DbStatusDespesa;
      data_pagamento: string | null;
      usuario_pagou_id: string | null;
      observacao: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: Omit<Tables["despesas"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
    Update: Partial<Tables["despesas"]["Insert"]>;
  };
  despesas_recorrentes: {
    Row: {
      id: string;
      descricao: string;
      categoria: string;
      valor_mensal: number;
      proximo_vencimento: string;
      ativo: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: Omit<Tables["despesas_recorrentes"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
    Update: Partial<Tables["despesas_recorrentes"]["Insert"]>;
  };
  entregadores: {
    Row: {
      id: string;
      profile_id: string | null;
      nome: string;
      documento: string;
      email: string;
      telefone: string;
      cidade: string;
      bairro: string;
      veiculo: DbTipoVeiculo;
      status: "ativo" | "inativo";
      avatar: string | null;
      tipo_comissao: DbTipoComissao;
      valor_comissao: number;
      created_at: string;
      updated_at: string;
    };
    Insert: Omit<Tables["entregadores"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
    Update: Partial<Tables["entregadores"]["Insert"]>;
  };
  faturas: {
    Row: {
      id: string;
      numero: string;
      cliente_id: string;
      cliente_nome: string;
      tipo_faturamento: DbTipoFaturamento;
      total_entregas: number;
      data_emissao: string;
      data_vencimento: string;
      total_creditos_loja: number;
      total_debitos_loja: number;
      saldo_liquido: number;
      status_geral: DbStatusGeral;
      status_taxas: DbStatusTaxas;
      status_repasse: DbStatusRepasse;
      status_cobranca: DbStatusCobranca;
      observacoes: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: Omit<Tables["faturas"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
    Update: Partial<Tables["faturas"]["Insert"]>;
  };
  feriados: {
    Row: {
      id: string;
      nome: string;
      data: string;
      recorrente: boolean;
      ativo: boolean;
      created_at: string;
    };
    Insert: Omit<Tables["feriados"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
    Update: Partial<Tables["feriados"]["Insert"]>;
  };
  formas_pagamento: {
    Row: {
      id: string;
      name: string;
      description: string | null;
      enabled: boolean;
      order: number;
      created_at: string;
    };
    Insert: Omit<Tables["formas_pagamento"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
    Update: Partial<Tables["formas_pagamento"]["Insert"]>;
  };
  logs_auditoria: {
    Row: {
      id: string;
      categoria: string;
      acao: string;
      entidade_id: string;
      descricao: string;
      detalhes: Json | null;
      usuario_id: string | null;
      usuario_nome: string;
      created_at: string;
    };
    Insert: Omit<Tables["logs_auditoria"]["Row"], "id" | "created_at" | "usuario_nome"> & { id?: string; created_at?: string; usuario_nome?: string };
    Update: never;
  };
  historico_faturas: {
    Row: {
      id: string;
      fatura_id: string;
      tipo: string;
      usuario_id: string | null;
      descricao: string | null;
      valor_anterior: number | null;
      valor_novo: number | null;
      metadata: Json | null;
      created_at: string;
    };
    Insert: Omit<Tables["historico_faturas"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
    Update: Partial<Tables["historico_faturas"]["Insert"]>;
  };
  historico_solicitacoes: {
    Row: {
      id: string;
      solicitacao_id: string;
      tipo: string;
      status_anterior: string | null;
      status_novo: string | null;
      usuario_id: string | null;
      descricao: string | null;
      metadata: Json | null;
      created_at: string;
    };
    Insert: Omit<Tables["historico_solicitacoes"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
    Update: Partial<Tables["historico_solicitacoes"]["Insert"]>;
  };
  integracoes: {
    Row: {
      id: string;
      nome: string;
      descricao: string | null;
      categoria: string;
      icone: string | null;
      status: string;
      ativo: boolean;
      api_key: string | null;
      config: Json;
      created_at: string;
      updated_at: string;
    };
    Insert: Omit<Tables["integracoes"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
    Update: Partial<Tables["integracoes"]["Insert"]>;
  };
  lancamentos_financeiros: {
    Row: {
      id: string;
      solicitacao_id: string | null;
      cliente_id: string;
      fatura_id: string | null;
      tipo: DbTipoLancamento;
      valor: number;
      sinal: DbSinalLancamento;
      status_liquidacao: DbStatusLiquidacao;
      descricao: string | null;
      referencia_origem: string | null;
      usuario_id: string | null;
      created_at: string;
    };
    Insert: Omit<Tables["lancamentos_financeiros"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
    // Sem Update intencional — tabela é imutável (trigger no DB)
    Update: never;
  };
  notification_templates: {
    Row: {
      id: string;
      evento: string;
      evento_label: string;
      categoria: string;
      titulo: string;
      mensagem: string;
      canal: string;
      variaveis: string[];
      ativo: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: Omit<Tables["notification_templates"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
    Update: Partial<Tables["notification_templates"]["Insert"]>;
  };
  notifications: {
    Row: {
      id: string;
      user_id: string;
      title: string;
      message: string;
      type: "warning" | "error" | "info" | "success";
      read: boolean;
      link: string | null;
      created_at: string;
    };
    Insert: Omit<Tables["notifications"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
    Update: Partial<Tables["notifications"]["Insert"]>;
  };
  pagamentos_solicitacao: {
    Row: {
      id: string;
      solicitacao_id: string;
      rota_id: string;
      forma_pagamento_id: string;
      valor: number;
      pertence_a: DbPertenceA;
      observacao: string | null;
      created_by: string | null;
      created_at: string;
    };
    Insert: Omit<Tables["pagamentos_solicitacao"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
    Update: Partial<Tables["pagamentos_solicitacao"]["Insert"]>;
  };
  profiles: {
    Row: {
      id: string;
      nome: string;
      email: string;
      role: DbRole;
      avatar: string | null;
      cargo_id: string | null;
      ativo: boolean;
      created_at: string;
    };
    Insert: Omit<Tables["profiles"]["Row"], "created_at"> & { created_at?: string };
    Update: Partial<Omit<Tables["profiles"]["Insert"], "id">>;
  };
  recargas_pre_pago: {
    Row: {
      id: string;
      cliente_id: string;
      valor: number;
      observacao: string | null;
      registrado_por_id: string;
      created_at: string;
    };
    Insert: Omit<Tables["recargas_pre_pago"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
    Update: Partial<Tables["recargas_pre_pago"]["Insert"]>;
  };
  receitas: {
    Row: {
      id: string;
      descricao: string;
      categoria_id: string | null;
      cliente_id: string | null;
      data_recebimento: string;
      valor: number;
      observacao: string | null;
      created_at: string;
    };
    Insert: Omit<Tables["receitas"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
    Update: Partial<Tables["receitas"]["Insert"]>;
  };
  recebimentos_caixa: {
    Row: {
      id: string;
      caixa_id: string;
      solicitacao_id: string | null;
      rota_id: string | null;
      forma_pagamento_id: string | null;
      valor: number;
      pertence_a: DbPertenceA;
      observacao: string | null;
      created_at: string;
    };
    Insert: Omit<Tables["recebimentos_caixa"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
    Update: Partial<Tables["recebimentos_caixa"]["Insert"]>;
  };
  regioes: {
    Row: {
      id: string;
      name: string;
      description: string | null;
      created_at: string;
    };
    Insert: Omit<Tables["regioes"]["Row"], "id" | "created_at"> & { id?: string; created_at?: string };
    Update: Partial<Tables["regioes"]["Insert"]>;
  };
  rotas: {
    Row: {
      id: string;
      solicitacao_id: string;
      bairro_destino_id: string;
      responsavel: string;
      telefone: string;
      observacoes: string | null;
      receber_do_cliente: boolean;
      valor_a_receber: number | null;
      taxa_resolvida: number | null;
      regra_preco_id: string | null;
      status: "ativa" | "concluida" | "cancelada";
      created_at: string;
      updated_at: string;
    };
    Insert: Omit<Tables["rotas"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
    Update: Partial<Tables["rotas"]["Insert"]>;
  };
  rota_forma_pagamento: {
    Row: { rota_id: string; forma_pagamento_id: string };
    Insert: Tables["rota_forma_pagamento"]["Row"];
    Update: Partial<Tables["rota_forma_pagamento"]["Row"]>;
  };
  rota_taxa_extra: {
    Row: { rota_id: string; taxa_extra_id: string; valor: number };
    Insert: Tables["rota_taxa_extra"]["Row"];
    Update: Partial<Tables["rota_taxa_extra"]["Row"]>;
  };
  solicitacoes: {
    Row: {
      id: string;
      codigo: string;
      cliente_id: string;
      entregador_id: string | null;
      status: DbStatusSolicitacao;
      tipo_operacao: string;
      ponto_coleta: string;
      data_solicitacao: string;
      data_inicio: string | null;
      data_conclusao: string | null;
      justificativa: string | null;
      retroativo: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: Omit<Tables["solicitacoes"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
    Update: Partial<Tables["solicitacoes"]["Insert"]>;
  };
  system_settings: {
    Row: { key: string; value: string | null; updated_by: string | null; updated_at: string };
    Insert: Omit<Tables["system_settings"]["Row"], "updated_at"> & { updated_at?: string };
    Update: Partial<Tables["system_settings"]["Insert"]>;
  };
  tabela_precos_cliente: {
    Row: {
      id: string;
      cliente_id: string;
      bairro_destino_id: string | null;
      regiao_id: string | null;
      tipo_operacao: string;
      taxa_base: number;
      taxa_retorno: number;
      taxa_espera: number;
      taxa_urgencia: number;
      ativo: boolean;
      prioridade: number;
      observacao: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: Omit<Tables["tabela_precos_cliente"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
    Update: Partial<Tables["tabela_precos_cliente"]["Insert"]>;
  };
  taxas_extras_config: {
    Row: {
      id: string;
      nome: string;
      valor_padrao: number;
      ativo: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: Omit<Tables["taxas_extras_config"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
    Update: Partial<Tables["taxas_extras_config"]["Insert"]>;
  };
  tipos_operacao_config: {
    Row: {
      id: string;
      nome: string;
      descricao: string | null;
      dias_semana: string[];
      horario_inicio: string | null;
      horario_fim: string | null;
      aplica_feriado: boolean;
      cor: string;
      ativo: boolean;
      prioridade: number;
      created_at: string;
      updated_at: string;
    };
    Insert: Omit<Tables["tipos_operacao_config"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
    Update: Partial<Tables["tipos_operacao_config"]["Insert"]>;
  };
  user_preferences: {
    Row: { user_id: string; key: string; value: Json };
    Insert: Tables["user_preferences"]["Row"];
    Update: Partial<Tables["user_preferences"]["Row"]>;
  };
  webhooks: {
    Row: {
      id: string;
      nome: string;
      url: string;
      secret_hash: string | null;
      eventos: string[];
      status: "ativo" | "inativo" | "erro";
      ultimo_erro: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: Omit<Tables["webhooks"]["Row"], "id" | "created_at" | "updated_at"> & { id?: string; created_at?: string; updated_at?: string };
    Update: Partial<Tables["webhooks"]["Insert"]>;
  };
}

// ── Database root type (compatível com createClient<Database>) ─────────────

export interface Database {
  public: {
    Tables: {
      [K in keyof Tables]: {
        Row: Tables[K]["Row"];
        Insert: Tables[K]["Insert"];
        Update: Tables[K]["Update"];
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      gerar_codigo_solicitacao: { Args: Record<never, never>; Returns: string };
      gerar_numero_fatura: { Args: Record<never, never>; Returns: string };
      is_admin: { Args: Record<never, never>; Returns: boolean };
      auth_role: { Args: Record<never, never>; Returns: string };
      cliente_id_atual: { Args: Record<never, never>; Returns: string };
      entregador_id_atual: { Args: Record<never, never>; Returns: string };
      concluir_fatura_entrega: {
        Args: {
          p_fatura_id: string | null;
          p_sol_id: string;
          p_cliente_id: string;
          p_cliente_nome: string;
          p_tipo_faturamento: string;
          p_total_taxas: number;
          p_total_recebido: number;
          p_sol_codigo: string;
          p_num_rotas: number;
        };
        Returns: Json;
      };
    };
    Enums: {
      role: DbRole;
      modalidade: DbModalidade;
      frequencia_faturamento: DbFrequenciaFaturamento;
      dia_semana: DbDiaSemana;
      tipo_comissao: DbTipoComissao;
      tipo_veiculo: DbTipoVeiculo;
      status_solicitacao: DbStatusSolicitacao;
      pertence_a: DbPertenceA;
      tipo_lancamento: DbTipoLancamento;
      sinal_lancamento: DbSinalLancamento;
      status_liquidacao: DbStatusLiquidacao;
      tipo_ajuste: DbTipoAjuste;
      status_geral: DbStatusGeral;
      status_taxas: DbStatusTaxas;
      status_repasse: DbStatusRepasse;
      status_cobranca: DbStatusCobranca;
      tipo_faturamento: DbTipoFaturamento;
      status_despesa: DbStatusDespesa;
      status_caixa: DbStatusCaixa;
    };
    CompositeTypes: Record<string, never>;
  };
}

// ── Helpers de conveniência ─────────────────────────────────────────────────

/** Row type para qualquer tabela do banco */
export type TableRow<T extends keyof Tables> = Tables[T]["Row"];

/** Insert type para qualquer tabela do banco */
export type TableInsert<T extends keyof Tables> = Tables[T]["Insert"];

/** Update type para qualquer tabela do banco */
export type TableUpdate<T extends keyof Tables> = Tables[T]["Update"];

/** Atalhos comuns */
export type Profile = TableRow<"profiles">;
export type Cliente = TableRow<"clientes">;
export type Entregador = TableRow<"entregadores">;
export type Solicitacao = TableRow<"solicitacoes">;
export type Rota = TableRow<"rotas">;
export type Fatura = TableRow<"faturas">;
export type Lancamento = TableRow<"lancamentos_financeiros">;
export type CaixaEntregador = TableRow<"caixas_entregadores">;
export type Cargo = TableRow<"cargos">;
export type Bairro = TableRow<"bairros">;
export type Regiao = TableRow<"regioes">;

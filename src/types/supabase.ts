export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Relationships: []
      }
      ajustes_financeiros: {
        Row: {
          created_at: string
          fatura_id: string
          id: string
          motivo: string
          solicitacao_id: string | null
          tipo: Database["public"]["Enums"]["tipo_ajuste"]
          usuario_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          fatura_id: string
          id?: string
          motivo: string
          solicitacao_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_ajuste"]
          usuario_id: string
          valor: number
        }
        Update: {
          created_at?: string
          fatura_id?: string
          id?: string
          motivo?: string
          solicitacao_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_ajuste"]
          usuario_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "ajustes_financeiros_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_financeiros_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_financeiros_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_financeira: {
        Row: {
          campo: string | null
          created_at: string
          entidade: string
          entidade_id: string
          id: string
          motivo: string
          usuario_id: string
          valor_anterior: Json | null
          valor_novo: Json | null
        }
        Insert: {
          campo?: string | null
          created_at?: string
          entidade: string
          entidade_id: string
          id?: string
          motivo: string
          usuario_id: string
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Update: {
          campo?: string | null
          created_at?: string
          entidade?: string
          entidade_id?: string
          id?: string
          motivo?: string
          usuario_id?: string
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_financeira_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bairros: {
        Row: {
          created_at: string
          id: string
          nome: string
          region_id: string
          taxa_entrega: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          region_id: string
          taxa_entrega?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          region_id?: string
          taxa_entrega?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bairros_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regioes"
            referencedColumns: ["id"]
          },
        ]
      }
      caixas_entregadores: {
        Row: {
          aberto_por_id: string | null
          created_at: string
          data: string
          diferenca: number | null
          entregador_id: string
          fechado_por_id: string | null
          id: string
          justificativa_divergencia: string | null
          observacoes: string | null
          status: Database["public"]["Enums"]["status_caixa"]
          troco_inicial: number
          updated_at: string
          valor_devolvido: number | null
        }
        Insert: {
          aberto_por_id?: string | null
          created_at?: string
          data?: string
          diferenca?: number | null
          entregador_id: string
          fechado_por_id?: string | null
          id?: string
          justificativa_divergencia?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_caixa"]
          troco_inicial?: number
          updated_at?: string
          valor_devolvido?: number | null
        }
        Update: {
          aberto_por_id?: string | null
          created_at?: string
          data?: string
          diferenca?: number | null
          entregador_id?: string
          fechado_por_id?: string | null
          id?: string
          justificativa_divergencia?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_caixa"]
          troco_inicial?: number
          updated_at?: string
          valor_devolvido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "caixas_entregadores_aberto_por_id_fkey"
            columns: ["aberto_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixas_entregadores_entregador_id_fkey"
            columns: ["entregador_id"]
            isOneToOne: false
            referencedRelation: "entregadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixas_entregadores_fechado_por_id_fkey"
            columns: ["fechado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cargos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          permissions: string[]
          sistema: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          permissions?: string[]
          sistema?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          permissions?: string[]
          sistema?: boolean
        }
        Relationships: []
      }
      categorias_financeiras: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          tipo: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: []
      }
      ciclos_comissao_meta: {
        Row: {
          comissao_calculada: number
          created_at: string
          criado_por: string
          entregador_id: string
          fechado_em: string
          id: string
          mes_referencia: string
          meta_modo_calculo: string
          total_entregas: number
        }
        Insert: {
          comissao_calculada?: number
          created_at?: string
          criado_por?: string
          entregador_id: string
          fechado_em?: string
          id?: string
          mes_referencia: string
          meta_modo_calculo: string
          total_entregas?: number
        }
        Update: {
          comissao_calculada?: number
          created_at?: string
          criado_por?: string
          entregador_id?: string
          fechado_em?: string
          id?: string
          mes_referencia?: string
          meta_modo_calculo?: string
          total_entregas?: number
        }
        Relationships: [
          {
            foreignKeyName: "ciclos_comissao_meta_entregador_id_fkey"
            columns: ["entregador_id"]
            isOneToOne: false
            referencedRelation: "entregadores"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativar_faturamento_automatico: boolean
          bairro: string
          chave_pix: string | null
          cidade: string
          created_at: string
          dia_da_semana_faturamento:
            | Database["public"]["Enums"]["dia_semana"]
            | null
          dia_do_mes_faturamento: number | null
          documento: string | null
          email: string
          endereco: string
          exibir_logo_landing: boolean
          frequencia_faturamento:
            | Database["public"]["Enums"]["frequencia_faturamento"]
            | null
          id: string
          logo_url: string | null
          modalidade: Database["public"]["Enums"]["modalidade"]
          nome: string
          numero_de_entregas_para_faturamento: number | null
          prazo_vencimento_dias: number
          profile_id: string | null
          status: string
          telefone: string
          tipo: string
          uf: string
          updated_at: string
        }
        Insert: {
          ativar_faturamento_automatico?: boolean
          bairro: string
          chave_pix?: string | null
          cidade: string
          created_at?: string
          dia_da_semana_faturamento?:
            | Database["public"]["Enums"]["dia_semana"]
            | null
          dia_do_mes_faturamento?: number | null
          documento?: string | null
          email: string
          endereco: string
          exibir_logo_landing?: boolean
          frequencia_faturamento?:
            | Database["public"]["Enums"]["frequencia_faturamento"]
            | null
          id?: string
          logo_url?: string | null
          modalidade?: Database["public"]["Enums"]["modalidade"]
          nome: string
          numero_de_entregas_para_faturamento?: number | null
          prazo_vencimento_dias?: number
          profile_id?: string | null
          status?: string
          telefone: string
          tipo: string
          uf: string
          updated_at?: string
        }
        Update: {
          ativar_faturamento_automatico?: boolean
          bairro?: string
          chave_pix?: string | null
          cidade?: string
          created_at?: string
          dia_da_semana_faturamento?:
            | Database["public"]["Enums"]["dia_semana"]
            | null
          dia_do_mes_faturamento?: number | null
          documento?: string | null
          email?: string
          endereco?: string
          exibir_logo_landing?: boolean
          frequencia_faturamento?:
            | Database["public"]["Enums"]["frequencia_faturamento"]
            | null
          id?: string
          logo_url?: string | null
          modalidade?: Database["public"]["Enums"]["modalidade"]
          nome?: string
          numero_de_entregas_para_faturamento?: number | null
          prazo_vencimento_dias?: number
          profile_id?: string | null
          status?: string
          telefone?: string
          tipo?: string
          uf?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comissao_faixas: {
        Row: {
          ate: number
          created_at: string
          de: number
          entregador_id: string
          id: string
          updated_at: string
          valor_por_entrega: number
        }
        Insert: {
          ate: number
          created_at?: string
          de: number
          entregador_id: string
          id?: string
          updated_at?: string
          valor_por_entrega: number
        }
        Update: {
          ate?: number
          created_at?: string
          de?: number
          entregador_id?: string
          id?: string
          updated_at?: string
          valor_por_entrega?: number
        }
        Relationships: [
          {
            foreignKeyName: "comissao_faixas_entregador_id_fkey"
            columns: ["entregador_id"]
            isOneToOne: false
            referencedRelation: "entregadores"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas: {
        Row: {
          categoria_id: string | null
          created_at: string
          data_pagamento: string | null
          descricao: string
          fornecedor: string
          id: string
          observacao: string | null
          status: Database["public"]["Enums"]["status_despesa"]
          updated_at: string
          usuario_pagou_id: string | null
          valor: number
          vencimento: string
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          descricao: string
          fornecedor: string
          id?: string
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_despesa"]
          updated_at?: string
          usuario_pagou_id?: string | null
          valor: number
          vencimento: string
        }
        Update: {
          categoria_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          descricao?: string
          fornecedor?: string
          id?: string
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_despesa"]
          updated_at?: string
          usuario_pagou_id?: string | null
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "despesas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_usuario_pagou_id_fkey"
            columns: ["usuario_pagou_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas_recorrentes: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          descricao: string
          id: string
          proximo_vencimento: string
          updated_at: string
          valor_mensal: number
        }
        Insert: {
          ativo?: boolean
          categoria: string
          created_at?: string
          descricao: string
          id?: string
          proximo_vencimento: string
          updated_at?: string
          valor_mensal?: number
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          descricao?: string
          id?: string
          proximo_vencimento?: string
          updated_at?: string
          valor_mensal?: number
        }
        Relationships: []
      }
      entregadores: {
        Row: {
          avatar: string | null
          bairro: string
          cidade: string
          created_at: string
          documento: string
          email: string
          id: string
          meta_modo_calculo: string | null
          nome: string
          profile_id: string | null
          status: string
          telefone: string
          tipo_comissao: Database["public"]["Enums"]["tipo_comissao"]
          updated_at: string
          valor_comissao: number
          veiculo: Database["public"]["Enums"]["tipo_veiculo"]
        }
        Insert: {
          avatar?: string | null
          bairro: string
          cidade: string
          created_at?: string
          documento: string
          email: string
          id?: string
          meta_modo_calculo?: string | null
          nome: string
          profile_id?: string | null
          status?: string
          telefone: string
          tipo_comissao: Database["public"]["Enums"]["tipo_comissao"]
          updated_at?: string
          valor_comissao: number
          veiculo: Database["public"]["Enums"]["tipo_veiculo"]
        }
        Update: {
          avatar?: string | null
          bairro?: string
          cidade?: string
          created_at?: string
          documento?: string
          email?: string
          id?: string
          meta_modo_calculo?: string | null
          nome?: string
          profile_id?: string | null
          status?: string
          telefone?: string
          tipo_comissao?: Database["public"]["Enums"]["tipo_comissao"]
          updated_at?: string
          valor_comissao?: number
          veiculo?: Database["public"]["Enums"]["tipo_veiculo"]
        }
        Relationships: [
          {
            foreignKeyName: "entregadores_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      faturas: {
        Row: {
          cliente_id: string
          cliente_nome: string
          created_at: string
          data_emissao: string
          data_vencimento: string
          id: string
          numero: string
          observacoes: string | null
          saldo_liquido: number
          status_cobranca: Database["public"]["Enums"]["status_cobranca"]
          status_geral: Database["public"]["Enums"]["status_geral"]
          status_repasse: Database["public"]["Enums"]["status_repasse"]
          status_taxas: Database["public"]["Enums"]["status_taxas"]
          tipo_faturamento: Database["public"]["Enums"]["tipo_faturamento"]
          total_creditos_loja: number
          total_debitos_loja: number
          total_entregas: number
          updated_at: string
        }
        Insert: {
          cliente_id: string
          cliente_nome: string
          created_at?: string
          data_emissao: string
          data_vencimento: string
          id?: string
          numero: string
          observacoes?: string | null
          saldo_liquido?: number
          status_cobranca?: Database["public"]["Enums"]["status_cobranca"]
          status_geral?: Database["public"]["Enums"]["status_geral"]
          status_repasse?: Database["public"]["Enums"]["status_repasse"]
          status_taxas?: Database["public"]["Enums"]["status_taxas"]
          tipo_faturamento: Database["public"]["Enums"]["tipo_faturamento"]
          total_creditos_loja?: number
          total_debitos_loja?: number
          total_entregas?: number
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          cliente_nome?: string
          created_at?: string
          data_emissao?: string
          data_vencimento?: string
          id?: string
          numero?: string
          observacoes?: string | null
          saldo_liquido?: number
          status_cobranca?: Database["public"]["Enums"]["status_cobranca"]
          status_geral?: Database["public"]["Enums"]["status_geral"]
          status_repasse?: Database["public"]["Enums"]["status_repasse"]
          status_taxas?: Database["public"]["Enums"]["status_taxas"]
          tipo_faturamento?: Database["public"]["Enums"]["tipo_faturamento"]
          total_creditos_loja?: number
          total_debitos_loja?: number
          total_entregas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faturas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      feriados: {
        Row: {
          ativo: boolean
          created_at: string
          data: string
          id: string
          nome: string
          recorrente: boolean
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data: string
          id?: string
          nome: string
          recorrente?: boolean
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data?: string
          id?: string
          nome?: string
          recorrente?: boolean
        }
        Relationships: []
      }
      formas_pagamento: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          name: string
          order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name: string
          order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
          order?: number
        }
        Relationships: []
      }
      historico_faturas: {
        Row: {
          created_at: string
          descricao: string | null
          fatura_id: string
          id: string
          metadata: Json | null
          tipo: string
          usuario_id: string | null
          valor_anterior: number | null
          valor_novo: number | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          fatura_id: string
          id?: string
          metadata?: Json | null
          tipo: string
          usuario_id?: string | null
          valor_anterior?: number | null
          valor_novo?: number | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          fatura_id?: string
          id?: string
          metadata?: Json | null
          tipo?: string
          usuario_id?: string | null
          valor_anterior?: number | null
          valor_novo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_faturas_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_faturas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_solicitacoes: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          metadata: Json | null
          solicitacao_id: string
          status_anterior: string | null
          status_novo: string | null
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          metadata?: Json | null
          solicitacao_id: string
          status_anterior?: string | null
          status_novo?: string | null
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          metadata?: Json | null
          solicitacao_id?: string
          status_anterior?: string | null
          status_novo?: string | null
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_solicitacoes_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_solicitacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integracoes: {
        Row: {
          api_key: string | null
          ativo: boolean
          categoria: string
          config: Json
          created_at: string
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          status: string
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          ativo?: boolean
          categoria?: string
          config?: Json
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          status?: string
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          ativo?: boolean
          categoria?: string
          config?: Json
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      lancamentos_financeiros: {
        Row: {
          cliente_id: string
          created_at: string
          descricao: string | null
          fatura_id: string | null
          id: string
          referencia_origem: string | null
          sinal: Database["public"]["Enums"]["sinal_lancamento"]
          solicitacao_id: string | null
          status_liquidacao: Database["public"]["Enums"]["status_liquidacao"]
          tipo: Database["public"]["Enums"]["tipo_lancamento"]
          usuario_id: string | null
          valor: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          descricao?: string | null
          fatura_id?: string | null
          id?: string
          referencia_origem?: string | null
          sinal: Database["public"]["Enums"]["sinal_lancamento"]
          solicitacao_id?: string | null
          status_liquidacao?: Database["public"]["Enums"]["status_liquidacao"]
          tipo: Database["public"]["Enums"]["tipo_lancamento"]
          usuario_id?: string | null
          valor: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          descricao?: string | null
          fatura_id?: string | null
          id?: string
          referencia_origem?: string | null
          sinal?: Database["public"]["Enums"]["sinal_lancamento"]
          solicitacao_id?: string | null
          status_liquidacao?: Database["public"]["Enums"]["status_liquidacao"]
          tipo?: Database["public"]["Enums"]["tipo_lancamento"]
          usuario_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_lancamentos_faturas"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_auditoria: {
        Row: {
          acao: string
          categoria: string
          created_at: string
          descricao: string
          detalhes: Json | null
          entidade_id: string
          id: string
          search_vector: unknown
          usuario_id: string | null
          usuario_nome: string
        }
        Insert: {
          acao: string
          categoria: string
          created_at?: string
          descricao: string
          detalhes?: Json | null
          entidade_id: string
          id?: string
          search_vector?: unknown
          usuario_id?: string | null
          usuario_nome?: string
        }
        Update: {
          acao?: string
          categoria?: string
          created_at?: string
          descricao?: string
          detalhes?: Json | null
          entidade_id?: string
          id?: string
          search_vector?: unknown
          usuario_id?: string | null
          usuario_nome?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          ativo: boolean
          canal: string
          categoria: string
          created_at: string
          evento: string
          evento_label: string | null
          id: string
          mensagem: string
          titulo: string | null
          updated_at: string
          variaveis: string[]
        }
        Insert: {
          ativo?: boolean
          canal?: string
          categoria: string
          created_at?: string
          evento: string
          evento_label?: string | null
          id?: string
          mensagem: string
          titulo?: string | null
          updated_at?: string
          variaveis?: string[]
        }
        Update: {
          ativo?: boolean
          canal?: string
          categoria?: string
          created_at?: string
          evento?: string
          evento_label?: string | null
          id?: string
          mensagem?: string
          titulo?: string | null
          updated_at?: string
          variaveis?: string[]
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos_solicitacao: {
        Row: {
          created_at: string
          created_by: string | null
          forma_pagamento_id: string
          id: string
          observacao: string | null
          pertence_a: Database["public"]["Enums"]["pertence_a"]
          rota_id: string
          solicitacao_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          forma_pagamento_id: string
          id?: string
          observacao?: string | null
          pertence_a: Database["public"]["Enums"]["pertence_a"]
          rota_id: string
          solicitacao_id: string
          valor: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          forma_pagamento_id?: string
          id?: string
          observacao?: string | null
          pertence_a?: Database["public"]["Enums"]["pertence_a"]
          rota_id?: string
          solicitacao_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_solicitacao_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_solicitacao_forma_pagamento_id_fkey"
            columns: ["forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_solicitacao_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_solicitacao_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar: string | null
          cargo_id: string | null
          created_at: string
          documento: string | null
          email: string
          id: string
          nome: string
          role: Database["public"]["Enums"]["role"]
        }
        Insert: {
          ativo?: boolean
          avatar?: string | null
          cargo_id?: string | null
          created_at?: string
          documento?: string | null
          email: string
          id: string
          nome: string
          role?: Database["public"]["Enums"]["role"]
        }
        Update: {
          ativo?: boolean
          avatar?: string | null
          cargo_id?: string | null
          created_at?: string
          documento?: string | null
          email?: string
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
        ]
      }
      recargas_pre_pago: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          observacao: string | null
          registrado_por_id: string
          valor: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          observacao?: string | null
          registrado_por_id: string
          valor: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          observacao?: string | null
          registrado_por_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "recargas_pre_pago_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recargas_pre_pago_registrado_por_id_fkey"
            columns: ["registrado_por_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recebimentos_caixa: {
        Row: {
          caixa_id: string
          created_at: string
          forma_pagamento_id: string | null
          id: string
          observacao: string | null
          pertence_a: Database["public"]["Enums"]["pertence_a"]
          rota_id: string | null
          solicitacao_id: string | null
          valor: number
        }
        Insert: {
          caixa_id: string
          created_at?: string
          forma_pagamento_id?: string | null
          id?: string
          observacao?: string | null
          pertence_a: Database["public"]["Enums"]["pertence_a"]
          rota_id?: string | null
          solicitacao_id?: string | null
          valor: number
        }
        Update: {
          caixa_id?: string
          created_at?: string
          forma_pagamento_id?: string | null
          id?: string
          observacao?: string | null
          pertence_a?: Database["public"]["Enums"]["pertence_a"]
          rota_id?: string | null
          solicitacao_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "recebimentos_caixa_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "caixas_entregadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimentos_caixa_forma_pagamento_id_fkey"
            columns: ["forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimentos_caixa_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimentos_caixa_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      receitas: {
        Row: {
          categoria_id: string | null
          cliente_id: string | null
          created_at: string
          data_recebimento: string
          descricao: string
          id: string
          observacao: string | null
          valor: number
        }
        Insert: {
          categoria_id?: string | null
          cliente_id?: string | null
          created_at?: string
          data_recebimento: string
          descricao: string
          id?: string
          observacao?: string | null
          valor: number
        }
        Update: {
          categoria_id?: string | null
          cliente_id?: string | null
          created_at?: string
          data_recebimento?: string
          descricao?: string
          id?: string
          observacao?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "receitas_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receitas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      regioes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      rota_forma_pagamento: {
        Row: {
          forma_pagamento_id: string
          rota_id: string
        }
        Insert: {
          forma_pagamento_id: string
          rota_id: string
        }
        Update: {
          forma_pagamento_id?: string
          rota_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rota_forma_pagamento_forma_pagamento_id_fkey"
            columns: ["forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rota_forma_pagamento_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas"
            referencedColumns: ["id"]
          },
        ]
      }
      rota_taxa_extra: {
        Row: {
          rota_id: string
          taxa_extra_id: string
          valor: number
        }
        Insert: {
          rota_id: string
          taxa_extra_id: string
          valor: number
        }
        Update: {
          rota_id?: string
          taxa_extra_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "rota_taxa_extra_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rota_taxa_extra_taxa_extra_id_fkey"
            columns: ["taxa_extra_id"]
            isOneToOne: false
            referencedRelation: "taxas_extras_config"
            referencedColumns: ["id"]
          },
        ]
      }
      rotas: {
        Row: {
          bairro_destino_id: string
          created_at: string
          id: string
          meios_pagamento_operacao: string[]
          observacoes: string | null
          pagamento_operacao: string
          receber_do_cliente: boolean
          regra_preco_id: string | null
          responsavel: string
          solicitacao_id: string
          status: string
          taxa_resolvida: number | null
          telefone: string
          updated_at: string
          valor_a_receber: number | null
        }
        Insert: {
          bairro_destino_id: string
          created_at?: string
          id?: string
          meios_pagamento_operacao?: string[]
          observacoes?: string | null
          pagamento_operacao?: string
          receber_do_cliente?: boolean
          regra_preco_id?: string | null
          responsavel: string
          solicitacao_id: string
          status?: string
          taxa_resolvida?: number | null
          telefone: string
          updated_at?: string
          valor_a_receber?: number | null
        }
        Update: {
          bairro_destino_id?: string
          created_at?: string
          id?: string
          meios_pagamento_operacao?: string[]
          observacoes?: string | null
          pagamento_operacao?: string
          receber_do_cliente?: boolean
          regra_preco_id?: string | null
          responsavel?: string
          solicitacao_id?: string
          status?: string
          taxa_resolvida?: number | null
          telefone?: string
          updated_at?: string
          valor_a_receber?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rotas_bairro_destino_id_fkey"
            columns: ["bairro_destino_id"]
            isOneToOne: false
            referencedRelation: "bairros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_regra_preco_id_fkey"
            columns: ["regra_preco_id"]
            isOneToOne: false
            referencedRelation: "tabela_precos_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes: {
        Row: {
          admin_conciliada_at: string | null
          cliente_id: string
          codigo: string
          created_at: string
          data_conclusao: string | null
          data_inicio: string | null
          data_solicitacao: string
          entregador_id: string | null
          id: string
          justificativa: string | null
          ponto_coleta: string
          retroativo: boolean
          status: Database["public"]["Enums"]["status_solicitacao"]
          tipo_coleta: "loja_cliente" | "cliente_loja" | "ponto_ponto"
          tipo_operacao: string
          updated_at: string
        }
        Insert: {
          admin_conciliada_at?: string | null
          cliente_id: string
          codigo: string
          created_at?: string
          data_conclusao?: string | null
          data_inicio?: string | null
          data_solicitacao?: string
          entregador_id?: string | null
          id?: string
          justificativa?: string | null
          ponto_coleta: string
          retroativo?: boolean
          status?: Database["public"]["Enums"]["status_solicitacao"]
          tipo_coleta?: "loja_cliente" | "cliente_loja" | "ponto_ponto"
          tipo_operacao: string
          updated_at?: string
        }
        Update: {
          admin_conciliada_at?: string | null
          cliente_id?: string
          codigo?: string
          created_at?: string
          data_conclusao?: string | null
          data_inicio?: string | null
          data_solicitacao?: string
          entregador_id?: string | null
          id?: string
          justificativa?: string | null
          ponto_coleta?: string
          retroativo?: boolean
          status?: Database["public"]["Enums"]["status_solicitacao"]
          tipo_coleta?: "loja_cliente" | "cliente_loja" | "ponto_ponto"
          tipo_operacao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_entregador_id_fkey"
            columns: ["entregador_id"]
            isOneToOne: false
            referencedRelation: "entregadores"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_system_settings_profile"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tabela_precos_cliente: {
        Row: {
          ativo: boolean
          bairro_destino_id: string | null
          cliente_id: string
          created_at: string
          id: string
          observacao: string | null
          prioridade: number
          regiao_id: string | null
          taxa_base: number
          taxa_espera: number
          taxa_retorno: number
          taxa_urgencia: number
          tipo_operacao: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro_destino_id?: string | null
          cliente_id: string
          created_at?: string
          id?: string
          observacao?: string | null
          prioridade?: number
          regiao_id?: string | null
          taxa_base: number
          taxa_espera?: number
          taxa_retorno?: number
          taxa_urgencia?: number
          tipo_operacao?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro_destino_id?: string | null
          cliente_id?: string
          created_at?: string
          id?: string
          observacao?: string | null
          prioridade?: number
          regiao_id?: string | null
          taxa_base?: number
          taxa_espera?: number
          taxa_retorno?: number
          taxa_urgencia?: number
          tipo_operacao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tabela_precos_cliente_bairro_destino_id_fkey"
            columns: ["bairro_destino_id"]
            isOneToOne: false
            referencedRelation: "bairros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tabela_precos_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tabela_precos_cliente_regiao_id_fkey"
            columns: ["regiao_id"]
            isOneToOne: false
            referencedRelation: "regioes"
            referencedColumns: ["id"]
          },
        ]
      }
      taxas_extras_config: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          updated_at: string
          valor_padrao: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
          valor_padrao?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
          valor_padrao?: number
        }
        Relationships: []
      }
      tipos_operacao_config: {
        Row: {
          aplica_feriado: boolean
          ativo: boolean
          cor: string
          created_at: string
          descricao: string | null
          dias_semana: string[]
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          nome: string
          prioridade: number
          updated_at: string
        }
        Insert: {
          aplica_feriado?: boolean
          ativo?: boolean
          cor?: string
          created_at?: string
          descricao?: string | null
          dias_semana?: string[]
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          nome: string
          prioridade?: number
          updated_at?: string
        }
        Update: {
          aplica_feriado?: boolean
          ativo?: boolean
          cor?: string
          created_at?: string
          descricao?: string | null
          dias_semana?: string[]
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          nome?: string
          prioridade?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          key: string
          user_id: string
          value: Json
        }
        Insert: {
          key: string
          user_id: string
          value: Json
        }
        Update: {
          key?: string
          user_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          eventos: string[]
          id: string
          nome: string
          secret_hash: string | null
          status: string
          ultimo_erro: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          eventos?: string[]
          id?: string
          nome: string
          secret_hash?: string | null
          status?: string
          ultimo_erro?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          eventos?: string[]
          id?: string
          nome?: string
          secret_hash?: string | null
          status?: string
          ultimo_erro?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_role: { Args: never; Returns: string }
      calcular_comissao_meta: {
        Args: {
          p_entregador_id: string
          p_modo: string
          p_total_entregas: number
        }
        Returns: number
      }
      cliente_id_atual: { Args: never; Returns: string }
      concluir_fatura_entrega: {
        Args: {
          p_cliente_id: string
          p_cliente_nome: string
          p_fatura_id: string
          p_num_rotas: number
          p_sol_codigo: string
          p_sol_id: string
          p_tipo_faturamento: string
          p_total_recebido: number
          p_total_taxas: number
        }
        Returns: Json
      }
      dispatch_webhook_event: {
        Args: { p_evento: string; p_payload: Json }
        Returns: undefined
      }
      entregador_id_atual: { Args: never; Returns: string }
      fechar_ciclos_comissao_meta: {
        Args: { p_criado_por?: string }
        Returns: number
      }
      fechar_faturas_por_calendario: { Args: never; Returns: number }
      fn_current_user_nome: { Args: never; Returns: string }
      fn_expire_old_logs: { Args: never; Returns: undefined }
      gerar_codigo_solicitacao: { Args: never; Returns: string }
      gerar_numero_fatura: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      lookup_email_by_documento: {
        Args: { doc_input: string }
        Returns: string
      }
      marcar_faturas_vencidas: { Args: never; Returns: number }
      notify_role: {
        Args: {
          p_link?: string
          p_message: string
          p_role: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      dia_semana:
        | "domingo"
        | "segunda"
        | "terca"
        | "quarta"
        | "quinta"
        | "sexta"
        | "sabado"
      frequencia_faturamento: "diario" | "semanal" | "mensal" | "por_entrega"
      modalidade: "pre_pago" | "faturado"
      pertence_a: "operacao" | "loja"
      role: "admin" | "cliente" | "entregador"
      sinal_lancamento: "credito" | "debito"
      status_caixa: "aberto" | "fechado" | "divergente"
      status_cobranca: "Nao_aplicavel" | "Pendente" | "Cobrado" | "Inadimplente"
      status_despesa: "Pendente" | "Atrasado" | "Pago"
      status_geral: "Aberta" | "Fechada" | "Paga" | "Finalizada" | "Vencida"
      status_liquidacao: "pendente" | "liquidado" | "estornado"
      status_repasse: "Pendente" | "Repassado"
      status_solicitacao:
        | "pendente"
        | "aceita"
        | "em_andamento"
        | "concluida"
        | "cancelada"
        | "rejeitada"
      status_taxas: "Pendente" | "Paga" | "Vencida"
      tipo_ajuste: "credito" | "debito"
      tipo_comissao: "percentual" | "fixo" | "meta"
      tipo_faturamento:
        | "por_entrega"
        | "semanal"
        | "mensal"
        | "diario"
        | "manual"
      tipo_lancamento:
        | "receita_operacao"
        | "credito_loja"
        | "debito_loja"
        | "ajuste"
      tipo_veiculo: "moto" | "carro" | "bicicleta" | "a_pe"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      dia_semana: [
        "domingo",
        "segunda",
        "terca",
        "quarta",
        "quinta",
        "sexta",
        "sabado",
      ],
      frequencia_faturamento: ["diario", "semanal", "mensal", "por_entrega"],
      modalidade: ["pre_pago", "faturado"],
      pertence_a: ["operacao", "loja"],
      role: ["admin", "cliente", "entregador"],
      sinal_lancamento: ["credito", "debito"],
      status_caixa: ["aberto", "fechado", "divergente"],
      status_cobranca: ["Nao_aplicavel", "Pendente", "Cobrado", "Inadimplente"],
      status_despesa: ["Pendente", "Atrasado", "Pago"],
      status_geral: ["Aberta", "Fechada", "Paga", "Finalizada", "Vencida"],
      status_liquidacao: ["pendente", "liquidado", "estornado"],
      status_repasse: ["Pendente", "Repassado"],
      status_solicitacao: [
        "pendente",
        "aceita",
        "em_andamento",
        "concluida",
        "cancelada",
        "rejeitada",
      ],
      status_taxas: ["Pendente", "Paga", "Vencida"],
      tipo_ajuste: ["credito", "debito"],
      tipo_comissao: ["percentual", "fixo", "meta"],
      tipo_faturamento: [
        "por_entrega",
        "semanal",
        "mensal",
        "diario",
        "manual",
      ],
      tipo_lancamento: [
        "receita_operacao",
        "credito_loja",
        "debito_loja",
        "ajuste",
      ],
      tipo_veiculo: ["moto", "carro", "bicicleta", "a_pe"],
    },
  },
} as const

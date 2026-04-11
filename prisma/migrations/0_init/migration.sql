-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'cliente', 'entregador');

-- CreateEnum
CREATE TYPE "Modalidade" AS ENUM ('pre_pago', 'faturado');

-- CreateEnum
CREATE TYPE "FrequenciaFaturamento" AS ENUM ('diario', 'semanal', 'mensal', 'por_entrega');

-- CreateEnum
CREATE TYPE "TipoVeiculo" AS ENUM ('moto', 'carro', 'bicicleta', 'a_pe');

-- CreateEnum
CREATE TYPE "TipoComissao" AS ENUM ('percentual', 'fixo');

-- CreateEnum
CREATE TYPE "StatusSolicitacao" AS ENUM ('pendente', 'aceita', 'em_andamento', 'concluida', 'cancelada', 'rejeitada');

-- CreateEnum
CREATE TYPE "PertenceA" AS ENUM ('operacao', 'loja');

-- CreateEnum
CREATE TYPE "TipoLancamento" AS ENUM ('receita_operacao', 'credito_loja', 'debito_loja', 'ajuste');

-- CreateEnum
CREATE TYPE "SinalLancamento" AS ENUM ('credito', 'debito');

-- CreateEnum
CREATE TYPE "StatusLiquidacao" AS ENUM ('pendente', 'liquidado', 'estornado');

-- CreateEnum
CREATE TYPE "TipoAjuste" AS ENUM ('credito', 'debito');

-- CreateEnum
CREATE TYPE "StatusDespesa" AS ENUM ('Pendente', 'Atrasado', 'Pago');

-- CreateEnum
CREATE TYPE "StatusCaixa" AS ENUM ('aberto', 'fechado', 'divergente');

-- CreateEnum
CREATE TYPE "StatusGeral" AS ENUM ('Aberta', 'Fechada', 'Paga', 'Finalizada', 'Vencida');

-- CreateEnum
CREATE TYPE "StatusTaxas" AS ENUM ('Pendente', 'Paga', 'Vencida');

-- CreateEnum
CREATE TYPE "StatusRepasse" AS ENUM ('Pendente', 'Repassado');

-- CreateEnum
CREATE TYPE "StatusCobranca" AS ENUM ('Nao_aplicavel', 'Pendente', 'Cobrado', 'Inadimplente');

-- CreateEnum
CREATE TYPE "TipoFaturamento" AS ENUM ('por_entrega', 'semanal', 'mensal', 'diario', 'manual');

-- CreateTable
CREATE TABLE "cargos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[],
    "sistema" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cargos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regioes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regioes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bairros" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" TEXT NOT NULL,
    "region_id" UUID,
    "taxa_entrega" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bairros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formas_pagamento" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "formas_pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taxas_extras_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" TEXT NOT NULL,
    "valor_padrao" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "taxas_extras_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_operacao_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "dias_semana" INTEGER[],
    "horario_inicio" TIME(6),
    "horario_fim" TIME(6),
    "aplica_feriado" BOOLEAN NOT NULL DEFAULT false,
    "cor" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "prioridade" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_operacao_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feriados" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "recorrente" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feriados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_financeiras" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_financeiras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "variables" JSONB,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "events" TEXT[],
    "secret" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'cliente',
    "cargo_id" UUID,
    "telefone" TEXT,
    "avatar_url" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "tema" TEXT NOT NULL DEFAULT 'light',
    "idioma" TEXT NOT NULL DEFAULT 'pt-BR',
    "notificacoes_email" BOOLEAN NOT NULL DEFAULT true,
    "notificacoes_push" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "razao_social" TEXT NOT NULL,
    "nome_fantasia" TEXT,
    "cnpj_cpf" TEXT,
    "telefone" TEXT,
    "endereco" TEXT,
    "modalidade" "Modalidade" NOT NULL DEFAULT 'faturado',
    "frequencia_faturamento" "FrequenciaFaturamento" NOT NULL DEFAULT 'mensal',
    "saldo_pre_pago" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "limite_credito" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entregadores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "razao_social" TEXT,
    "cpf" TEXT,
    "tipo_veiculo" "TipoVeiculo" NOT NULL DEFAULT 'moto',
    "placa" TEXT,
    "tipo_comissao" "TipoComissao" NOT NULL DEFAULT 'percentual',
    "valor_comissao" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entregadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabela_precos_cliente" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cliente_id" UUID NOT NULL,
    "bairro_destino_id" UUID,
    "regiao_id" UUID,
    "tipo_operacao" TEXT NOT NULL DEFAULT 'todos',
    "taxa_base" DECIMAL(10,2) NOT NULL,
    "taxa_retorno" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxa_espera" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxa_urgencia" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "prioridade" INTEGER NOT NULL DEFAULT 100,
    "observacao" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tabela_precos_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "codigo" TEXT NOT NULL,
    "cliente_id" UUID NOT NULL,
    "entregador_id" UUID,
    "status" "StatusSolicitacao" NOT NULL DEFAULT 'pendente',
    "tipo_operacao" TEXT NOT NULL,
    "ponto_coleta" TEXT NOT NULL,
    "data_solicitacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_inicio" TIMESTAMPTZ(6),
    "data_conclusao" TIMESTAMPTZ(6),
    "justificativa" TEXT,
    "retroativo" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_solicitacoes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "solicitacao_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "status_anterior" TEXT,
    "status_novo" TEXT,
    "usuario_id" UUID,
    "descricao" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_solicitacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rotas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "solicitacao_id" UUID NOT NULL,
    "bairro_destino_id" UUID NOT NULL,
    "responsavel" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "observacoes" TEXT,
    "receber_do_cliente" BOOLEAN NOT NULL DEFAULT false,
    "valor_a_receber" DECIMAL(10,2),
    "taxa_resolvida" DECIMAL(10,2),
    "regra_preco_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rota_forma_pagamento" (
    "rota_id" UUID NOT NULL,
    "forma_pagamento_id" UUID NOT NULL,

    CONSTRAINT "rota_forma_pagamento_pkey" PRIMARY KEY ("rota_id","forma_pagamento_id")
);

-- CreateTable
CREATE TABLE "rota_taxa_extra" (
    "rota_id" UUID NOT NULL,
    "taxa_extra_id" UUID NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "rota_taxa_extra_pkey" PRIMARY KEY ("rota_id","taxa_extra_id")
);

-- CreateTable
CREATE TABLE "pagamentos_solicitacao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "solicitacao_id" UUID NOT NULL,
    "rota_id" UUID NOT NULL,
    "forma_pagamento_id" UUID NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "pertence_a" "PertenceA" NOT NULL,
    "observacao" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_solicitacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lancamentos_financeiros" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "solicitacao_id" UUID,
    "cliente_id" UUID NOT NULL,
    "fatura_id" UUID,
    "tipo" "TipoLancamento" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "sinal" "SinalLancamento" NOT NULL,
    "status_liquidacao" "StatusLiquidacao" NOT NULL DEFAULT 'pendente',
    "descricao" TEXT,
    "referencia_origem" TEXT,
    "usuario_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lancamentos_financeiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recargas_pre_pago" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cliente_id" UUID NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "observacao" TEXT,
    "registrado_por_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recargas_pre_pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despesas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "descricao" TEXT NOT NULL,
    "categoria_id" UUID,
    "fornecedor" TEXT NOT NULL,
    "vencimento" DATE NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "status" "StatusDespesa" NOT NULL DEFAULT 'Pendente',
    "data_pagamento" DATE,
    "usuario_pagou_id" UUID,
    "observacao" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "despesas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receitas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "descricao" TEXT NOT NULL,
    "categoria_id" UUID,
    "cliente_id" UUID,
    "data_recebimento" DATE NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "observacao" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receitas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caixas_entregadores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entregador_id" UUID NOT NULL,
    "data" DATE NOT NULL,
    "troco_inicial" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valor_devolvido" DECIMAL(10,2),
    "diferenca" DECIMAL(10,2),
    "status" "StatusCaixa" NOT NULL DEFAULT 'aberto',
    "justificativa_divergencia" TEXT,
    "observacoes" TEXT,
    "aberto_por_id" UUID,
    "fechado_por_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caixas_entregadores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recebimentos_caixa" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caixa_id" UUID NOT NULL,
    "solicitacao_id" UUID,
    "rota_id" UUID,
    "forma_pagamento_id" UUID,
    "valor" DECIMAL(10,2) NOT NULL,
    "pertence_a" "PertenceA" NOT NULL,
    "observacao" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recebimentos_caixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faturas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "numero" TEXT NOT NULL,
    "cliente_id" UUID NOT NULL,
    "cliente_nome" TEXT NOT NULL,
    "tipo_faturamento" "TipoFaturamento" NOT NULL,
    "total_entregas" INTEGER NOT NULL DEFAULT 0,
    "data_emissao" DATE NOT NULL,
    "data_vencimento" DATE NOT NULL,
    "total_creditos_loja" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_debitos_loja" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "saldo_liquido" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status_geral" "StatusGeral" NOT NULL DEFAULT 'Aberta',
    "status_taxas" "StatusTaxas" NOT NULL DEFAULT 'Pendente',
    "status_repasse" "StatusRepasse" NOT NULL DEFAULT 'Pendente',
    "status_cobranca" "StatusCobranca" NOT NULL DEFAULT 'Nao_aplicavel',
    "observacoes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_faturas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fatura_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "usuario_id" UUID,
    "descricao" TEXT,
    "valor_anterior" DECIMAL(10,2),
    "valor_novo" DECIMAL(10,2),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_faturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ajustes_financeiros" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fatura_id" UUID NOT NULL,
    "solicitacao_id" UUID,
    "tipo" "TipoAjuste" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "motivo" TEXT NOT NULL,
    "usuario_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ajustes_financeiros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria_financeira" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entidade" TEXT NOT NULL,
    "entidade_id" UUID NOT NULL,
    "campo" TEXT,
    "valor_anterior" JSONB,
    "valor_novo" JSONB,
    "motivo" TEXT NOT NULL,
    "usuario_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_financeira_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_profile_id_key" ON "clientes"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cnpj_cpf_key" ON "clientes"("cnpj_cpf");

-- CreateIndex
CREATE UNIQUE INDEX "entregadores_profile_id_key" ON "entregadores"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "entregadores_cpf_key" ON "entregadores"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "solicitacoes_codigo_key" ON "solicitacoes"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "caixas_entregadores_entregador_id_data_key" ON "caixas_entregadores"("entregador_id", "data");

-- CreateIndex
CREATE UNIQUE INDEX "faturas_numero_key" ON "faturas"("numero");

-- AddForeignKey
ALTER TABLE "bairros" ADD CONSTRAINT "bairros_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regioes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_cargo_id_fkey" FOREIGN KEY ("cargo_id") REFERENCES "cargos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entregadores" ADD CONSTRAINT "entregadores_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabela_precos_cliente" ADD CONSTRAINT "tabela_precos_cliente_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabela_precos_cliente" ADD CONSTRAINT "tabela_precos_cliente_bairro_destino_id_fkey" FOREIGN KEY ("bairro_destino_id") REFERENCES "bairros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes" ADD CONSTRAINT "solicitacoes_entregador_id_fkey" FOREIGN KEY ("entregador_id") REFERENCES "entregadores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_solicitacoes" ADD CONSTRAINT "historico_solicitacoes_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_solicitacoes" ADD CONSTRAINT "historico_solicitacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rotas" ADD CONSTRAINT "rotas_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rotas" ADD CONSTRAINT "rotas_bairro_destino_id_fkey" FOREIGN KEY ("bairro_destino_id") REFERENCES "bairros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rotas" ADD CONSTRAINT "rotas_regra_preco_id_fkey" FOREIGN KEY ("regra_preco_id") REFERENCES "tabela_precos_cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota_forma_pagamento" ADD CONSTRAINT "rota_forma_pagamento_rota_id_fkey" FOREIGN KEY ("rota_id") REFERENCES "rotas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota_forma_pagamento" ADD CONSTRAINT "rota_forma_pagamento_forma_pagamento_id_fkey" FOREIGN KEY ("forma_pagamento_id") REFERENCES "formas_pagamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota_taxa_extra" ADD CONSTRAINT "rota_taxa_extra_rota_id_fkey" FOREIGN KEY ("rota_id") REFERENCES "rotas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota_taxa_extra" ADD CONSTRAINT "rota_taxa_extra_taxa_extra_id_fkey" FOREIGN KEY ("taxa_extra_id") REFERENCES "taxas_extras_config"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos_solicitacao" ADD CONSTRAINT "pagamentos_solicitacao_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos_solicitacao" ADD CONSTRAINT "pagamentos_solicitacao_rota_id_fkey" FOREIGN KEY ("rota_id") REFERENCES "rotas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos_solicitacao" ADD CONSTRAINT "pagamentos_solicitacao_forma_pagamento_id_fkey" FOREIGN KEY ("forma_pagamento_id") REFERENCES "formas_pagamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_solicitacao_id_fkey" FOREIGN KEY ("solicitacao_id") REFERENCES "solicitacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_fatura_id_fkey" FOREIGN KEY ("fatura_id") REFERENCES "faturas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lancamentos_financeiros" ADD CONSTRAINT "lancamentos_financeiros_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recargas_pre_pago" ADD CONSTRAINT "recargas_pre_pago_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recargas_pre_pago" ADD CONSTRAINT "recargas_pre_pago_registrado_por_id_fkey" FOREIGN KEY ("registrado_por_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_financeiras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_usuario_pagou_id_fkey" FOREIGN KEY ("usuario_pagou_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receitas" ADD CONSTRAINT "receitas_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias_financeiras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receitas" ADD CONSTRAINT "receitas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caixas_entregadores" ADD CONSTRAINT "caixas_entregadores_entregador_id_fkey" FOREIGN KEY ("entregador_id") REFERENCES "entregadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caixas_entregadores" ADD CONSTRAINT "caixas_entregadores_aberto_por_id_fkey" FOREIGN KEY ("aberto_por_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caixas_entregadores" ADD CONSTRAINT "caixas_entregadores_fechado_por_id_fkey" FOREIGN KEY ("fechado_por_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimentos_caixa" ADD CONSTRAINT "recebimentos_caixa_caixa_id_fkey" FOREIGN KEY ("caixa_id") REFERENCES "caixas_entregadores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimentos_caixa" ADD CONSTRAINT "recebimentos_caixa_rota_id_fkey" FOREIGN KEY ("rota_id") REFERENCES "rotas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_faturas" ADD CONSTRAINT "historico_faturas_fatura_id_fkey" FOREIGN KEY ("fatura_id") REFERENCES "faturas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_faturas" ADD CONSTRAINT "historico_faturas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajustes_financeiros" ADD CONSTRAINT "ajustes_financeiros_fatura_id_fkey" FOREIGN KEY ("fatura_id") REFERENCES "faturas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ajustes_financeiros" ADD CONSTRAINT "ajustes_financeiros_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_financeira" ADD CONSTRAINT "auditoria_financeira_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


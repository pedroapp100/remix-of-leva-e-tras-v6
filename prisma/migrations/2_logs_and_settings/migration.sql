-- Audit log table for system events
CREATE TABLE "logs_auditoria" (
    "id"           UUID           NOT NULL DEFAULT gen_random_uuid(),
    "categoria"    TEXT           NOT NULL,
    "acao"         TEXT           NOT NULL,
    "entidade_id"  TEXT           NOT NULL,
    "descricao"    TEXT           NOT NULL,
    "detalhes"     JSONB,
    "usuario_id"   UUID,
    "usuario_nome" TEXT           NOT NULL DEFAULT 'Sistema',
    "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_auditoria_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "logs_auditoria_created_at_idx" ON "logs_auditoria" ("created_at" DESC);
CREATE INDEX "logs_auditoria_categoria_idx" ON "logs_auditoria" ("categoria");

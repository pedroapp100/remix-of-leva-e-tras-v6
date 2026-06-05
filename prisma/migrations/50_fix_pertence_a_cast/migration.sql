-- ============================================================
-- Migration 50: Fix cast do tipo pertence_a no RPC
--
-- PROBLEMA:
--   O RPC admin_upsert_pagamentos_solicitacao (migration 48)
--   usava (elem->>'pertence_a')::"PertenceA" — nome Prisma/PascalCase.
--   O tipo real no banco Supabase é pertence_a (minúsculo),
--   então toda chamada ao RPC falhava com:
--   "type PertenceA does not exist"
--
-- SOLUÇÃO:
--   Recriar o RPC com o cast correto: ::pertence_a
-- ============================================================

CREATE OR REPLACE FUNCTION admin_upsert_pagamentos_solicitacao(
  p_sol_id      uuid,
  p_pagamentos  jsonb,
  p_usuario_id  uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete + Insert atômicos na mesma transação.
  -- Se o INSERT falhar, o DELETE é revertido automaticamente.
  DELETE FROM pagamentos_solicitacao
  WHERE solicitacao_id = p_sol_id;

  INSERT INTO pagamentos_solicitacao (
    solicitacao_id,
    rota_id,
    forma_pagamento_id,
    valor,
    pertence_a,
    observacao,
    created_by
  )
  SELECT
    p_sol_id,
    (elem->>'rota_id')::uuid,
    (elem->>'forma_pagamento_id')::uuid,
    (elem->>'valor')::decimal(10,2),
    (elem->>'pertence_a')::pertence_a,
    elem->>'observacao',
    p_usuario_id
  FROM jsonb_array_elements(p_pagamentos) AS elem
  WHERE (elem->>'rota_id')            IS NOT NULL
    AND (elem->>'forma_pagamento_id')  IS NOT NULL
    AND (elem->>'valor')::decimal(10,2) > 0;
END;
$$;

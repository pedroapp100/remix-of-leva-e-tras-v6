-- ─────────────────────────────────────────────────────────────────────────────
-- Diagnóstico (SOMENTE LEITURA) — faturas com débito salvo divergente das rotas
--
-- Compara, para cada fatura ainda em aberto (não Paga/Finalizada/Cancelada):
--   • total salvo:      faturas.total_debitos_loja (razão contábil congelado)
--   • total das rotas:  soma de taxa_resolvida + taxas extras das rotas
--                        faturáveis HOJE (pagamento_operacao <> 'pago_na_hora'
--                        e status <> 'cancelada') das solicitações lançadas
--                        naquela fatura
--
-- Mesma lógica do cálculo "ao vivo" do frontend (useEntregasByFatura,
-- src/hooks/useFaturas.ts:350-355). Divergência > 0,01 indica um caso como o
-- da FAT-202607-00020: rota reclassificada após faturamento sem reversão.
--
-- Créditos ficam fora de propósito: dependem de pagamentos_solicitacao
-- conciliados e gerariam falsos positivos.
--
-- Cada fatura listada deve ser corrigida caso a caso com o mesmo padrão de
-- scripts/sql/fix_FAT-202607-00020.sql (ajuste compensatório + recálculo),
-- depois de confirmar o histórico da entrega envolvida.
-- ─────────────────────────────────────────────────────────────────────────────

WITH rotas_faturaveis AS (
  -- Débito "real" por (fatura, solicitação), a partir do estado atual das rotas
  SELECT
    lf.fatura_id,
    lf.solicitacao_id,
    COALESCE(SUM(
      COALESCE(r.taxa_resolvida, 0)
      + COALESCE((SELECT SUM(rte.valor) FROM rota_taxa_extra rte WHERE rte.rota_id = r.id), 0)
    ), 0) AS debito_rotas
  FROM lancamentos_financeiros lf
  LEFT JOIN rotas r
    ON r.solicitacao_id = lf.solicitacao_id
   AND r.status <> 'cancelada'
   AND r.pagamento_operacao <> 'pago_na_hora'
  WHERE lf.tipo = 'debito_loja'
    AND lf.fatura_id IS NOT NULL
  GROUP BY lf.fatura_id, lf.solicitacao_id
),
debito_por_fatura AS (
  SELECT fatura_id, SUM(debito_rotas) AS debito_calculado
  FROM rotas_faturaveis
  GROUP BY fatura_id
)
SELECT
  f.numero,
  f.cliente_nome,
  f.status_geral,
  f.total_debitos_loja                                   AS debito_salvo,
  COALESCE(d.debito_calculado, 0)                        AS debito_pelas_rotas,
  f.total_debitos_loja - COALESCE(d.debito_calculado, 0) AS diferenca
FROM faturas f
LEFT JOIN debito_por_fatura d ON d.fatura_id = f.id
WHERE f.status_geral NOT IN ('Paga', 'Finalizada', 'Cancelada')
  AND ABS(f.total_debitos_loja - COALESCE(d.debito_calculado, 0)) > 0.01
ORDER BY ABS(f.total_debitos_loja - COALESCE(d.debito_calculado, 0)) DESC;

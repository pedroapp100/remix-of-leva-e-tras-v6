# Reabertura de Entrega Faturada — Plano de Implementação

## Contexto

Quando uma solicitação de entrega faturada é conciliada (tela "Conciliação ADM") e a fatura
é gerada/fechada automaticamente, hoje não existe nenhuma forma segura de desfazer isso se a
conciliação foi feita errada — por exemplo, taxa de R$13,00 cobrada da loja sem o entregador
ter confirmado o recebimento do cliente. O botão "Reabrir Entrega" que já existe
(`src/hooks/useSolicitacoes.ts:364-392`) só limpa o lado operacional (pagamentos, caixa,
rotas) — ele nunca toca em `lancamentos_financeiros`/`faturas`. Pior: ao reconciliar depois,
a função `concluir_fatura_entrega` detecta que já existe lançamento para aquela solicitação e
**silenciosamente não atualiza nada**, mostrando sucesso mesmo sem corrigir a fatura.

Esta investigação foi feita com leitura direta do banco Postgres real (projeto Supabase
`qbumfnkrqqsthmsgrhfi`, via MCP), não só dos arquivos locais — porque os arquivos locais em
`prisma/migrations/` estão desincronizados do banco real (existem migrations aplicadas que não
têm arquivo local, e uma função órfã criada via SQL ad-hoc, ver achado crítico abaixo).

**Objetivo:** adicionar um ícone em "Entregas Incluídas" (modal da fatura) que reverte o
efeito financeiro de uma entrega conciliada errada e devolve a solicitação para
"Em andamento", permitindo reconciliar do jeito certo — sem corromper a integridade
financeira da fatura.

## Tipo de Projeto

WEB — nova funcionalidade em aplicação existente (React 18 + TS + Vite + Supabase). Implementação
direta nesta sessão (sem multiagentes externos). Na fase de certificação final, uso os skills
nativos do Claude Code (`run`/`verify`) para validar no navegador com as credenciais fornecidas.

---

## Achados críticos da auditoria no banco real (que mudam o desenho)

1. **`lancamentos_financeiros` é imutável por trigger** (`trg_lancamentos_immutable` →
   `prevent_lancamentos_mutation()`): qualquer UPDATE/DELETE é bloqueado com a mensagem
   *"lancamentos_financeiros é imutável. Para corrigir, crie um lançamento de estorno."*
   → A correção **nunca** toca essa tabela. Tudo passa por `ajustes_financeiros` (mesma tabela
   já usada pelo botão "Adicionar Ajuste" e pelo lápis de editar em
   `FaturaDetailsModal.tsx:384-463`).
   → Isso também significa que **não preciso alterar `concluir_fatura_entrega` nem o índice
   único `uq_lancamentos_sol_tipo`** — zero risco de regressão na rotina de faturamento mais
   crítica do sistema.

2. **Existe uma função órfã `admin_reabrir_conciliacao(p_sol_id, p_motivo, p_usuario_id)` viva
   no banco**, criada via SQL direto (não está em nenhum arquivo de `prisma/migrations/`) e já
   foi usada manualmente em produção pelo menos uma vez (rastro em `historico_solicitacoes`).
   Ela só limpa `admin_conciliada_at` — não reverte lançamentos nem totais da fatura, então é
   um beco sem saída funcional (reabre a UI mas a fatura continua errada). Vou **removê-la
   explicitamente** (`DROP FUNCTION`) e substituí-la pela nova função completa, documentando o
   motivo na própria migration.

3. **`faturas.total_creditos_loja` / `total_debitos_loja` / `total_entregas` são contadores
   absolutos**, não somas calculadas — só são tocados aritmeticamente por `concluir_fatura_entrega`
   e por correções manuais (ex.: `admin_corrigir_credito_loja`, migration 42). Se a reversão só
   ajustar `saldo_liquido` (como no meu rascunho inicial) e não esses três campos, a tela e o PDF
   da fatura continuam mostrando números inflados. → A nova função ajusta os três campos,
   replicando o padrão já usado em `admin_corrigir_credito_loja`.

4. **Reabrir uma fatura `Fechada` → `Aberta` pode cair na varredura diária de
   `marcar_faturas_vencidas`** (`prisma/migrations/21_marcar_faturas_vencidas/migration.sql`) se
   a `data_vencimento` já estiver no passado, gerando notificação de "fatura vencida" ao cliente
   por engano. → A nova função empurra `data_vencimento` para `CURRENT_DATE + 7` quando reabre
   uma fatura fechada (mesma regra usada na criação da fatura).

5. **Permissão**: o botão "Reabrir Entrega" hoje está sob `PermissionGuard
   permission="solicitacoes.edit"` (não `solicitacoes.delete`, como eu havia assumido
   inicialmente). Como esta nova ação reverte dinheiro (mais sensível que editar uma
   solicitação comum), vou usar a permissão mais específica e já existente
   **`financeiro.edit`** (`src/lib/permissions.ts:11`), criando um guard explícito — hoje o
   resto do `EntregaCard` (lápis/lixeira) não tem guard nenhum.

6. **O ícone de lixeira em "Entregas Incluídas" é decorativo hoje**
   (`FaturaDetailsModal.tsx:620-622` só dá `toast.success(...)`, sem nenhuma ação real). Não é
   bloqueante, mas o novo ícone vai, na prática, ser mais funcional que a lixeira ao lado dele —
   deixo registrado, sem expandir o escopo para corrigi-la agora.

7. **Achado correlato (fora do escopo, reportar mas não corrigir silenciosamente):**
   `canEdit={fatura.status_geral !== "Finalizada" && !viewOnly}` (`FaturaDetailsModal.tsx:603`)
   permite editar uma entrega mesmo em fatura `'Paga'` — provavelmente um descuido. Incluí como
   tarefa **opcional** separada (3.3) para decisão explícita, já que vou estar exatamente nessa
   linha de código.

---

## Critérios de Sucesso

- [x] Ícone novo (RotateCcw) em "Entregas Incluídas", ao lado do lápis/lixeira, visível só
      quando a fatura não está `Paga`/`Finalizada`.
- [x] Exige justificativa (≥10 caracteres) via `JustificationDialog` já existente.
- [x] Ao confirmar, em uma única transação atômica: cria ajuste(s) compensatório(s),
      corrige `total_creditos_loja`/`total_debitos_loja`/`total_entregas`/`saldo_liquido`,
      reabre a fatura se estava `Fechada` (com `data_vencimento` futura), limpa
      `pagamentos_solicitacao`/`recebimentos_caixa`, reativa rotas, volta a solicitação para
      `em_andamento` e registra histórico (na fatura e na solicitação).
- [x] Bloqueia com mensagem clara se a fatura já estiver `Paga`/`Finalizada`. (validado por revisão de código — o `IF status_geral IN ('Paga','Finalizada')` roda antes de qualquer mutação; teste ao vivo desse caminho específico foi adiado por decisão do usuário, ver nota abaixo)
- [x] Função órfã `admin_reabrir_conciliacao` removida e documentada. Migration aplicada em produção.
- [x] `npm run build`, `npm run lint` e `npm run test` continuam passando.
- [x] Validado via chamada real da RPC no banco de produção, com fixture de teste descartável e os mesmos parâmetros que o app envia (ver "Validação" abaixo). Teste 100% visual no navegador (clique no ícone) não foi possível neste ambiente — Playwright sem Chromium instalado e o download travou; por decisão do usuário, não foi reinstalado.

## Stack

React 18 + TS + Vite, shadcn/ui, TanStack Query v5, Supabase (Postgres + RPC), Zod, lucide-react.
Sem bibliotecas novas.

## Estrutura de Arquivos

- **Criado:** `prisma/migrations/52_reabrir_entrega_faturada/migration.sql`
- **Modificado:** `src/services/faturas.ts` (nova função de serviço)
- **Modificado:** `src/hooks/useFaturas.ts` (novo hook `useReabrirEntregaFaturada`)
- **Modificado:** `src/pages/admin/faturas/FaturaDetailsModal.tsx` (novo ícone + dialog + guard)
- **Reaproveitados sem alteração:** `src/components/shared/JustificationDialog.tsx`,
  `src/components/shared/PermissionGuard`, `src/lib/permissions.ts`

---

## Status de execução — CONCLUÍDO

1. Migration local — feito (`52_reabrir_entrega_faturada`, `53_..._security_hardening`).
2. Serviço + hook TS — feito.
3. UI no `FaturaDetailsModal.tsx` — feito.
4. `tsc --noEmit`, `eslint`, `vitest run` (125 testes), `npm run build` — todos verdes.
5. Migrations aplicadas no banco de produção (Supabase `qbumfnkrqqsthmsgrhfi`), com
   confirmação explícita do usuário antes de cada uma.

### Achado e correção extra durante a verificação (fora do plano original)

O check de advisors (Fase 1.3) encontrou que `reabrir_entrega_faturada` ficou chamável
pelo papel `anon` (usuário não autenticado) via `/rest/v1/rpc/...` — o Supabase concede
EXECUTE por padrão a `anon`/`authenticated`/`service_role` em toda função nova, e o
`GRANT TO authenticated` da migration 52 não bastou para bloquear isso. Migration 53
revoga explicitamente de `PUBLIC` e de `anon`, fixa `search_path`, e confirmou via
`pg_proc.proacl` que só `authenticated`/`service_role`/`prisma`/`postgres` mantêm acesso.

### Validação (sem teste visual no navegador)

Tentativa de teste end-to-end no navegador via Playwright foi bloqueada porque o
Chromium não estava instalado neste ambiente e o download travou (~4,7MB de
~150-300MB esperados). Por decisão do usuário, a instalação não foi repetida.

Validação alternativa feita via chamada real da RPC no banco de produção, com fixture
de teste descartável (cliente "TESTE QA Reversao", solicitação `QA-TESTE-00001`,
fatura `FAT-202606-00161`), usando exatamente os parâmetros que o app envia
(`p_solicitacao_id`, `p_motivo`, `p_usuario_id` = id real do admin pedroaps100@gmail.com):

| Campo | Antes | Depois |
|---|---|---|
| `faturas.status_geral` | Fechada | Aberta |
| `faturas.total_debitos_loja` | 10.00 | 0.00 |
| `faturas.saldo_liquido` | -10.00 | 0.00 |
| `faturas.total_entregas` | 1 | 0 |
| `faturas.data_vencimento` | (original) | empurrada para hoje+7 |
| `solicitacoes.status` | concluida | em_andamento |
| `solicitacoes.admin_conciliada_at` | definido | NULL |
| `rotas.status` | concluida | ativa |
| `ajustes_financeiros` | — | 1 linha nova (crédito R$10, motivo correto) |
| `historico_faturas` | — | 1 linha nova (tipo "correcao") |
| `historico_solicitacoes` | — | 1 linha nova (tipo "edicao") |

Todos os campos mudaram exatamente como esperado, em uma única chamada atômica.

O bloqueio para fatura `Paga`/`Finalizada` **não foi testado ao vivo** — validado só por
revisão de código (a verificação `IF status_geral IN ('Paga','Finalizada')` roda antes
de qualquer mutação na função). O usuário decidiu que o teste do caminho de reversão já
era suficiente e que testar o bloqueio não justificava criar outro lançamento permanente
de teste.

**Dados de teste remanescentes no banco (permanentes, por causa da imutabilidade de
`lancamentos_financeiros`):** cliente "TESTE QA Reversao", solicitação `QA-TESTE-00001`,
fatura `FAT-202606-00161` — claramente identificáveis como teste, sem efeito real.

Ver também o desenho técnico completo (SQL da migration) em
`prisma/migrations/52_reabrir_entrega_faturada/migration.sql`.

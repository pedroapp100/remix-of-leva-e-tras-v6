# Plano de Implementação — Fix: Tipo de Operação travado em vazio no Simulador

## Overview

**O que:** o Simulador de Operações mostra "Sem regra" / R$ 0,00 para bairros que **têm** regra de preço cadastrada (ex.: cliente "Casa barroco" → bairro "Munir Calixto" tem R$ 18,00 ativo, mas a simulação não encontra).

**Por quê:** `tipoOperacao` é inicializado com `useState(TIPOS_ATIVOS[0]?.id ?? "")` em [SimuladorOperacoes.tsx:42](src/components/shared/SimuladorOperacoes.tsx#L42). Esse valor só é lido **uma vez**, no primeiro render. Se a query `useTiposOperacao()` ainda não respondeu nesse instante (cache frio — primeira vez que o componente monta na sessão), `TIPOS_ATIVOS` está vazio e `tipoOperacao` fica travado em `""` para sempre, mesmo depois dos dados chegarem. Como nenhuma regra real tem `tipo_operacao === ""`, `findPrecoRegra` ([SimuladorOperacoes.tsx:65-94](src/components/shared/SimuladorOperacoes.tsx#L65-L94)) nunca encontra match em nenhum dos 3 níveis (bairro / região / geral).

Causa raiz confirmada por evidência (não suposição):
- Capturas de tela mostram a seção "Tipo de Operação" **vazia** (sem nenhum botão renderizado) no momento do "Sem regra".
- Na mesma janela de tempo, a aba Tabela de Preços mostrava o UUID cru (`63982e71-...`) no lugar do nome "Horário Comercial" — sintoma do mesmo atraso de carregamento de `useTiposOperacao()`, só que ali é cosmético porque o label é recalculado via `useMemo` a cada render.
- Consulta direta ao banco confirmou: a regra "Munir Calixto" do cliente "Casa barroco" está ativa, com `taxa_base = 18.00` e `tipo_operacao` = UUID válido do tipo "Horário Comercial" (ativo).

O mesmo padrão frágil existe em [LaunchSolicitacaoDialog.tsx:185](src/pages/admin/solicitacoes/LaunchSolicitacaoDialog.tsx#L185) (`useState(tiposAtivos[0]?.id ?? "")`), usado no fluxo real de criação de pedido. Lá o sintoma é mascarado porque `matchTipo` ([linha 50](src/pages/admin/solicitacoes/LaunchSolicitacaoDialog.tsx#L50)) trata `tipoOp` vazio como "sem filtro" (`!tipoOp || ...`) em vez de "não encontrado" — mas a fragilidade estrutural é a mesma.

## Project Type

**WEB** — React 18 + TypeScript (SPA existente). Nenhuma mudança de schema, API nova ou infraestrutura.

## Success Criteria

1. Abrindo o Simulador a frio (sem cache prévio de `tipos_operacao` na sessão), selecionar cliente "Casa barroco" + bairro "Munir Calixto" exibe **R$ 18,00**, badge "Bairro específico", não "Sem regra".
2. A seção "Tipo de Operação" sempre exibe o botão do tipo ativo assim que os dados chegam — nunca fica permanentemente vazia.
3. O mesmo cenário de cache frio no fluxo de criação de pedido (`LaunchSolicitacaoDialog`) não deixa `tipoOperacao` vazio de forma persistente.
4. `npm run build`, `npx tsc --noEmit` e a suíte `vitest` passam sem novas falhas.
5. Nenhuma migração de banco, nenhuma mudança de contrato de API.

## Tech Stack

Sem mudança de stack — usa o que já existe no projeto:
- **React 18 + `useEffect`** para sincronizar estado local com dado assíncrono do TanStack Query (padrão já presente no projeto, ver `coding-standards.md` — "Estado Sem Mutação Direta" / atualização funcional `setX(prev => ...)`).
- **TanStack Query** (`useTiposOperacao`) — já existe em `src/hooks/useSettings.ts`, não muda.
- **Vitest + @testing-library/react** (já são devDependencies do projeto) para o teste de regressão.

## File Structure

Nenhum arquivo novo é criado. Arquivos alterados:

```
src/
├── components/shared/
│   └── SimuladorOperacoes.tsx        # fix principal (crítico)
├── pages/admin/solicitacoes/
│   └── LaunchSolicitacaoDialog.tsx   # mesma correção, por consistência (preventivo)
└── components/shared/
    └── SimuladorOperacoes.test.tsx   # NOVO — teste de regressão
```

## Task Breakdown

### T1 — Corrigir sincronização de `tipoOperacao` no Simulador (CRÍTICO)
- **Agent:** `claude` (edição direta, não precisa de subagente)
- **Skill de referência:** `coding-standards.md` (atualização de estado via função, não mutação direta)
- **Dependências:** nenhuma
- **INPUT:** `SimuladorOperacoes.tsx:42` — `useState(TIPOS_ATIVOS[0]?.id ?? "")` travado
- **OUTPUT:**
  ```tsx
  const [tipoOperacao, setTipoOperacao] = useState("");

  useEffect(() => {
    if (!tipoOperacao && TIPOS_ATIVOS.length > 0) {
      setTipoOperacao(TIPOS_ATIVOS[0].id);
    }
  }, [TIPOS_ATIVOS, tipoOperacao]);
  ```
  (mesmo ajuste no `resetForm`, que hoje também faz `setTipoOperacao(TIPOS_ATIVOS[0]?.id ?? "")` de forma síncrona — ali não há o bug porque `TIPOS_ATIVOS` já está carregado nesse ponto, mas vale manter consistente.)
- **VERIFY:** com cache do React Query limpo (refresh da página), abrir o diálogo do Simulador, escolher "Casa barroco" → "Munir Calixto" → resultado deve ser R$ 18,00.
- **Rollback:** reverter o arquivo único via git; nenhuma dependência externa.

### T2 — Aplicar a mesma correção em `LaunchSolicitacaoDialog.tsx` (preventivo)
- **Agent:** `claude`
- **Skill de referência:** `coding-standards.md`
- **Dependências:** nenhuma (paralelo a T1 — arquivos diferentes)
- **INPUT:** `LaunchSolicitacaoDialog.tsx:185` — mesmo padrão `useState(tiposAtivos[0]?.id ?? "")`
- **OUTPUT:** mesmo `useEffect` de sincronização; **não** remover o `!tipoOp ||` em `matchTipo` (linha 50) — isso é uma decisão de produto (com tipo vazio, ignora o filtro) que pode ficar como rede de segurança adicional, não como única defesa.
- **VERIFY:** logar com sessão nova (cache frio), abrir "Nova Solicitação" imediatamente, confirmar que o botão do tipo aparece pré-selecionado e que a tarifa calculada bate com a tabela de preços do cliente escolhido.
- **Rollback:** reverter arquivo único via git.

### T3 — Teste de regressão (vitest)
- **Agent:** `claude`
- **Skill de referência:** `systematic-debugging` (Phase 4, passo 1 — "Create Failing Test Case" antes de declarar resolvido)
- **Dependências:** depende de T1 (testa o comportamento corrigido)
- **INPUT:** nenhum teste hoje cobre `SimuladorOperacoes` (confirmado — busca por `*.test.ts*` não retornou nada para o componente)
- **OUTPUT:** `SimuladorOperacoes.test.tsx` com um `QueryClientProvider` de teste onde `useTiposOperacao` resolve **depois** do primeiro render (ex.: `queryFn` com `await new Promise(r => setTimeout(r, 0))`), confirmando que, após o `tipos_operacao` resolver, o tipo correto fica selecionado e uma regra de bairro conhecida aparece no resultado.
- **VERIFY:** `npm run test` (vitest run) passa; sem o fix de T1, esse teste deve falhar (prova que ele cobre o bug real).
- **Rollback:** arquivo de teste novo, remoção segura se necessário.

### T4 — Verificação manual end-to-end
- **Agent:** `claude` usando a skill `verify`
- **Dependências:** T1, T2, T3
- **INPUT:** app rodando localmente
- **OUTPUT:** confirmação visual no browser real (não só teste automatizado) de que o cenário do bug (cache frio + "Casa barroco"/"Munir Calixto") está resolvido
- **VERIFY:** captura de tela mostrando R$ 18,00 em vez de "Sem regra"

## Phase X — Verificação Final

- [ ] `npx tsc --noEmit` sem erros novos
- [ ] `npm run build` sem warnings/erros novos
- [ ] `npm run test` (vitest) — inclui o novo `SimuladorOperacoes.test.tsx` passando
- [ ] Verificação manual (T4) com captura de tela do cenário antes quebrado
- [ ] Nenhuma migração de banco, nenhuma mudança de RLS — não se aplica scan de segurança/schema

## Riscos e Notas

- **Escopo intencionalmente pequeno:** 2 arquivos de produção + 1 teste. Não inclui a remoção do recurso "Tipo de Operação" discutida anteriormente (essa é uma decisão de produto maior, separada, com impacto em ~19 arquivos e 2 tabelas — fora do escopo deste fix).
- **Edge case aceito:** se um tipo de operação for desativado *depois* de já ter sido selecionado, o `useEffect` proposto não força a reseleção (só preenche quando `tipoOperacao` está vazio). Comportamento já existente, não regride.

# Supabase / Postgres — Performance e Segurança

Guia de referência para queries SQL, RLS, índices e configurações Supabase. Mostre sempre com exemplos Antes → Depois em PT-BR.

---

## Categorias por Prioridade

| Prioridade | Área | Impacto |
|---|---|---|
| 1 | Performance de Queries | CRÍTICO |
| 2 | Conexões e Pooling | CRÍTICO |
| 3 | Segurança (RLS) | CRÍTICO |
| 4 | Design de Schema | ALTO |
| 5 | Concorrência e Locks | MÉDIO-ALTO |
| 6 | Padrões de Acesso a Dados | MÉDIO |

---

## 1. Performance de Queries

### Nunca use `SELECT *`

**Como está agora:**
```sql
-- Traz 40 colunas quando só precisa de 3. Lento e desperdiça memória.
SELECT * FROM solicitacoes WHERE status = 'pendente';
```

**Como vai ficar:**
```sql
-- Só os campos que o componente realmente usa
SELECT id, status, criado_em, cliente_id FROM solicitacoes WHERE status = 'pendente';
```

---

### Índices em Colunas de Filtro e JOIN

**Como está agora:**
```sql
-- Sem índice: Postgres varre TODA a tabela para achar os pedidos do entregador
SELECT * FROM solicitacoes WHERE entregador_id = $1;
-- Com 10.000 linhas: ~800ms
```

**Como vai ficar:**
```sql
-- Cria o índice uma vez:
CREATE INDEX idx_solicitacoes_entregador_id ON solicitacoes(entregador_id);

-- A mesma query agora usa o índice:
SELECT id, status FROM solicitacoes WHERE entregador_id = $1;
-- Com 10.000 linhas: ~5ms
```

**Regra:** Toda coluna usada em `WHERE`, `JOIN ON`, ou `ORDER BY` frequentemente deve ter índice.

---

### Índice Parcial — Para Filtros Frequentes de Subconjunto

**Como está agora:**
```sql
-- Índice na coluna inteira, mas você só filtra pendentes
CREATE INDEX idx_status ON solicitacoes(status);
```

**Como vai ficar:**
```sql
-- Índice só nos pendentes = menor, mais rápido
CREATE INDEX idx_solicitacoes_pendentes ON solicitacoes(criado_em)
WHERE status = 'pendente';
```

---

### Evitar N+1 Queries

**Como está agora (N+1 — uma query por entregador):**
```typescript
// Para 50 entregadores: faz 51 queries ao banco
const entregadores = await supabase.from('entregadores').select('id, nome')
for (const e of entregadores.data) {
  const solicitacoes = await supabase
    .from('solicitacoes')
    .select('id')
    .eq('entregador_id', e.id)
}
```

**Como vai ficar (1 query com JOIN):**
```typescript
// Uma única query com tudo junto
const { data } = await supabase
  .from('entregadores')
  .select(`
    id,
    nome,
    solicitacoes (id, status, criado_em)
  `)
```

---

### Paginação com `range()` — Não Carregue Tudo

**Como está agora:**
```typescript
// Carrega TODOS os 5.000 registros para mostrar 20
const { data } = await supabase.from('solicitacoes').select('*')
const pagina = data.slice(0, 20)
```

**Como vai ficar:**
```typescript
// Carrega só os 20 da página atual
const pagina = 1
const limite = 20
const { data, count } = await supabase
  .from('solicitacoes')
  .select('id, status, criado_em', { count: 'exact' })
  .range((pagina - 1) * limite, pagina * limite - 1)
  .order('criado_em', { ascending: false })
```

---

### Upsert em vez de Insert + Update Separados

**Como está agora:**
```typescript
// Verifica se existe, depois insere ou atualiza — 2 roundtrips
const { data: existing } = await supabase.from('config').select().eq('chave', 'taxa').single()
if (existing) {
  await supabase.from('config').update({ valor: '15' }).eq('chave', 'taxa')
} else {
  await supabase.from('config').insert({ chave: 'taxa', valor: '15' })
}
```

**Como vai ficar:**
```typescript
// Um único roundtrip
await supabase.from('config').upsert({ chave: 'taxa', valor: '15' }, { onConflict: 'chave' })
```

---

## 2. Segurança — RLS (Row Level Security)

### RLS é Obrigatória em Toda Tabela com Dados de Usuários

**Como está agora:**
```sql
-- Tabela sem RLS: QUALQUER usuário autenticado lê todos os dados
CREATE TABLE solicitacoes (id uuid, cliente_id uuid, descricao text);
-- Problema: entregador A pode ver pedidos do cliente B
```

**Como vai ficar:**
```sql
-- Ativa RLS
ALTER TABLE solicitacoes ENABLE ROW LEVEL SECURITY;

-- Clientes só veem suas próprias solicitações
CREATE POLICY "cliente_ver_proprias" ON solicitacoes
  FOR SELECT
  USING (cliente_id = auth.uid());

-- Entregadores veem só as atribuídas a eles
CREATE POLICY "entregador_ver_atribuidas" ON solicitacoes
  FOR SELECT
  USING (entregador_id = auth.uid());
```

---

### RLS com Roles — Verificar o Papel do Usuário

**Como está agora:**
```sql
-- Policy que não considera o papel — admin vê só os seus
CREATE POLICY "ver_solicitacoes" ON solicitacoes
  FOR SELECT USING (cliente_id = auth.uid());
```

**Como vai ficar:**
```sql
-- Admin vê tudo, cliente vê só as suas
CREATE POLICY "ver_solicitacoes" ON solicitacoes
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR cliente_id = auth.uid()
  );
```

---

### Performance de RLS — Evite Subqueries Lentas

**Como está agora (lento — subquery em toda linha):**
```sql
CREATE POLICY "ver_solicitacoes" ON solicitacoes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR cliente_id = auth.uid()
  );
```

**Como vai ficar (rápido — `security definer` function cacheada):**
```sql
-- Função que busca o role uma vez
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- Policy usa a função cacheada
CREATE POLICY "ver_solicitacoes" ON solicitacoes
  FOR SELECT USING (
    auth.user_role() = 'admin' OR cliente_id = auth.uid()
  );
```

---

## 3. Design de Schema

### Tipos de Dados Corretos

**Como está agora:**
```sql
-- Usando text para tudo — desperdiça espaço e perde validação
CREATE TABLE solicitacoes (
  id text,
  valor text,           -- deveria ser numeric
  status text,          -- deveria ser enum
  criado_em text        -- deveria ser timestamptz
);
```

**Como vai ficar:**
```sql
CREATE TYPE status_solicitacao AS ENUM ('pendente', 'em_andamento', 'concluida', 'cancelada');

CREATE TABLE solicitacoes (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  valor       numeric(10,2) NOT NULL CHECK (valor > 0),
  status      status_solicitacao NOT NULL DEFAULT 'pendente',
  criado_em   timestamptz NOT NULL DEFAULT now(),
  cliente_id  uuid NOT NULL REFERENCES clientes(id)
);
```

---

### Sempre Indexe Chaves Estrangeiras

**Como está agora:**
```sql
-- FK sem índice: JOIN de solicitacoes com clientes faz full scan
ALTER TABLE solicitacoes ADD CONSTRAINT fk_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id);
-- Sem índice na coluna!
```

**Como vai ficar:**
```sql
ALTER TABLE solicitacoes ADD CONSTRAINT fk_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id);
CREATE INDEX idx_solicitacoes_cliente_id ON solicitacoes(cliente_id);
```

---

## 4. Conexões — Connection Pooling

**Como está agora:**
```
Cada request abre uma nova conexão ao Postgres.
Com 100 usuários simultâneos = 100 conexões abertas.
Postgres tem limite (geralmente 100-500) e cai.
```

**Como vai ficar:**
```
Usar Supabase com PgBouncer (Transaction Mode):
- Pool de conexões reutilizadas
- 100 usuários → 10-20 conexões reais no Postgres
- Configuração na URL: ?pgbouncer=true&connection_limit=1
```

---

## 5. Monitoramento — EXPLAIN ANALYZE

Quando uma query estiver lenta, execute antes de otimizar:

```sql
EXPLAIN ANALYZE
SELECT s.id, s.status, c.nome
FROM solicitacoes s
JOIN clientes c ON c.id = s.cliente_id
WHERE s.status = 'pendente'
ORDER BY s.criado_em DESC
LIMIT 20;
```

**O que procurar no resultado:**
- `Seq Scan` = varredura total (ruim) → precisa de índice
- `Index Scan` = usando índice (ótimo)
- `cost=` alto = query cara
- `actual time=` alto = query lenta na prática

---

## Checklist Rápido de Schema Novo

Sempre que criar uma tabela nova no projeto:

- [ ] `id uuid DEFAULT gen_random_uuid() PRIMARY KEY`
- [ ] `criado_em timestamptz DEFAULT now()`
- [ ] `atualizado_em timestamptz DEFAULT now()` (com trigger)
- [ ] RLS ativada: `ALTER TABLE x ENABLE ROW LEVEL SECURITY`
- [ ] Policies para cada role que acessa
- [ ] Índice em cada FK: `CREATE INDEX ON x(coluna_fk)`
- [ ] Índice em colunas de filtro frequente
- [ ] Tipos corretos (uuid, numeric, timestamptz, enum)
- [ ] Constraints de validação (`CHECK`, `NOT NULL`)

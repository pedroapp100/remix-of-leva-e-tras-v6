# Padrões de Código — TypeScript / React / Node.js

Guia de referência rápida. Mostre sempre com exemplos Antes → Depois em PT-BR.

---

## Princípios Base

| Princípio | Significado prático |
|---|---|
| **Legibilidade primeiro** | Nome de variável claro vale mais que comentário |
| **KISS** | A solução mais simples que funciona é a certa |
| **DRY** | Se copiou o mesmo código duas vezes, extraia uma função |
| **YAGNI** | Não construa o que não é pedido hoje |

---

## Nomeação de Variáveis e Funções

**Como está agora (errado):**
```typescript
const q = 'entregador'
const flag = true
async function market(id) { }
```

**Como vai ficar (correto):**
```typescript
const searchQuery = 'entregador'
const isUserAuthenticated = true
async function fetchSolicitacao(solicitacaoId: string) { }
```

**Regra:** funções = verbo + substantivo (`fetchEntregador`, `calculateFatura`, `isValidCPF`)

---

## TypeScript — Sem `any`, Sempre Tipado

**Como está agora:**
```typescript
function getEntregador(id: any): Promise<any> { }
```

**Como vai ficar:**
```typescript
interface Entregador {
  id: string
  nome: string
  status: 'ativo' | 'inativo' | 'pendente'
  cpf: string
}

async function getEntregador(id: string): Promise<Entregador> { }
```

---

## React — Componentes com Props Tipadas

**Como está agora:**
```typescript
export function CardSolicitacao(props) {
  return <div onClick={props.onClick}>{props.children}</div>
}
```

**Como vai ficar:**
```typescript
interface CardSolicitacaoProps {
  solicitacaoId: string
  status: 'pendente' | 'em_andamento' | 'concluida'
  onClick: () => void
  children: React.ReactNode
}

export function CardSolicitacao({ solicitacaoId, status, onClick, children }: CardSolicitacaoProps) {
  return (
    <div onClick={onClick} data-status={status}>
      {children}
    </div>
  )
}
```

---

## React — Estado Sem Mutação Direta

**Como está agora (causa bugs silenciosos):**
```typescript
// ❌ Mutação direta
entregadores.push(novoEntregador)
setEntregadores(entregadores)

solicitacao.status = 'concluida'
setSolicitacao(solicitacao)
```

**Como vai ficar:**
```typescript
// ✅ Spread operator — cria novo objeto/array
setEntregadores(prev => [...prev, novoEntregador])
setSolicitacao(prev => ({ ...prev, status: 'concluida' }))
```

---

## React — Atualização de Estado Baseada no Valor Anterior

**Como está agora:**
```typescript
// ❌ Pode estar desatualizado em operações assíncronas
setCount(count + 1)
```

**Como vai ficar:**
```typescript
// ✅ Função garante o valor mais recente
setCount(prev => prev + 1)
```

---

## React — Renderização Condicional

**Como está agora (difícil de ler):**
```typescript
{isLoading ? <Spinner /> : error ? <Erro /> : dados ? <Lista dados={dados} /> : null}
```

**Como vai ficar:**
```typescript
{isLoading && <Spinner />}
{!isLoading && error && <Erro mensagem={error.message} />}
{!isLoading && !error && dados && <ListaSolicitacoes dados={dados} />}
```

---

## Async/Await — Execução em Paralelo

**Como está agora (lento — espera um de cada vez):**
```typescript
const entregadores = await fetchEntregadores()
const solicitacoes = await fetchSolicitacoes()
const clientes = await fetchClientes()
// Demora: soma dos 3 tempos
```

**Como vai ficar (rápido — todos ao mesmo tempo):**
```typescript
const [entregadores, solicitacoes, clientes] = await Promise.all([
  fetchEntregadores(),
  fetchSolicitacoes(),
  fetchClientes()
])
// Demora: só o mais lento dos 3
```

---

## Tratamento de Erros

**Como está agora:**
```typescript
async function fetchFatura(id: string) {
  const response = await fetch(`/api/faturas/${id}`)
  return response.json() // explode silenciosamente se der 500
}
```

**Como vai ficar:**
```typescript
async function fetchFatura(id: string) {
  try {
    const response = await fetch(`/api/faturas/${id}`)
    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${response.statusText}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Falha ao buscar fatura:', error)
    throw new Error('Não foi possível carregar a fatura')
  }
}
```

---

## Validação de Entrada com Zod

**Como está agora:**
```typescript
async function POST(request: Request) {
  const body = await request.json()
  // usa diretamente sem validar — risco de segurança
  await criarSolicitacao(body)
}
```

**Como vai ficar:**
```typescript
import { z } from 'zod'

const SolicitacaoSchema = z.object({
  clienteId: z.string().uuid(),
  descricao: z.string().min(1).max(500),
  enderecoEntrega: z.string().min(5),
  valor: z.number().positive()
})

async function POST(request: Request) {
  const body = await request.json()
  const validated = SolicitacaoSchema.safeParse(body)

  if (!validated.success) {
    return Response.json({ erro: 'Dados inválidos', detalhes: validated.error.errors }, { status: 400 })
  }

  await criarSolicitacao(validated.data)
}
```

---

## Hooks Customizados — Extraia Lógica Repetida

**Como está agora (mesmo código em vários componentes):**
```typescript
// Copiado em ListaSolicitacoes, CardEntregador, PainelAdmin...
const [query, setQuery] = useState('')
const [debouncedQuery, setDebouncedQuery] = useState('')
useEffect(() => {
  const timer = setTimeout(() => setDebouncedQuery(query), 500)
  return () => clearTimeout(timer)
}, [query])
```

**Como vai ficar (um hook, usado em todos):**
```typescript
// hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// Uso em qualquer componente
const debouncedQuery = useDebounce(searchQuery, 500)
```

---

## Resposta de API — Formato Consistente

Sempre use esta estrutura em toda API do projeto:

```typescript
// Sucesso
return Response.json({
  success: true,
  data: solicitacoes,
  meta: { total: 42, pagina: 1, limite: 20 }
})

// Erro
return Response.json({
  success: false,
  erro: 'Solicitação não encontrada'
}, { status: 404 })
```

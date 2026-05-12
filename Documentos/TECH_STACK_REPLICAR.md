# Stack Técnica — Leva e Traz
> Guia de replicação do design system e arquitetura do app para novos projetos.

---

## 1. Visão Geral da Stack

| Camada | Tecnologia |
|---|---|
| Framework UI | React 18 + TypeScript |
| Build Tool | Vite (com plugin SWC — `@vitejs/plugin-react-swc`) |
| Estilização | Tailwind CSS v3 |
| Componentes | **shadcn/ui** (Radix UI como primitivos) |
| Animações | **Framer Motion** |
| Backend / DB | **Supabase** (Postgres + Auth + Realtime) |
| Fetching / Cache | **TanStack Query v5** (React Query) |
| Formulários | React Hook Form + **Zod** |
| Roteamento | React Router DOM v6 |
| Estado global | React Context + Zustand |
| Ícones | **Lucide React** |
| Fonte | **Poppins** via `@fontsource/poppins` |
| PWA | `vite-plugin-pwa` |
| Notificações (toasts) | **Sonner** |
| Gráficos | Recharts |
| PDF | jsPDF + jspdf-autotable |

---

## 2. Design System — "Matte Ceramic"

### Filosofia

- **Dark-first** — tema escuro como padrão, light mode suportado
- **Matte surfaces** — sem gradientes ou brilhos; profundidade criada por variação de luminosidade HSL
- **Spring Blue accent** — cor primária `hsl(231 75% 60%)`
- **Tipografia única** — Poppins nos pesos 300, 400, 500, 600 e 700

---

### 2.1 Paleta de Cores (CSS custom properties HSL)

#### Dark Mode (padrão do app)

```css
--background:  230 35% 12%;   /* navy profundo — fundo principal */
--foreground:  220 20% 95%;   /* texto principal */
--card:        230 30% 15%;   /* superfície de cards */
--card-foreground: 220 20% 95%;
--primary:     231 75% 60%;   /* spring blue — accent principal */
--primary-foreground: 0 0% 100%;
--secondary:   230 25% 20%;
--muted:       230 25% 20%;
--muted-foreground: 220 15% 60%;
--border:      230 20% 22%;
--input:       230 20% 22%;
--ring:        231 75% 60%;
--destructive: 0 72% 50%;
```

#### Light Mode

```css
--background:  220 20% 93%;   /* slate cloud */
--foreground:  240 30% 10%;
--card:        220 20% 98%;
--primary:     231 75% 55%;
--secondary:   220 16% 88%;
--muted:       220 16% 90%;
--muted-foreground: 220 12% 44%;
--border:      220 16% 86%;
--input:       220 18% 78%;
--ring:        231 75% 55%;
```

#### Tokens de Status (semânticos — usados em badges e ícones)

```css
--status-pending:     38 95% 55%;   /* âmbar */
--status-accepted:    231 75% 60%;  /* azul */
--status-in-progress: 270 85% 62%;  /* roxo */
--status-completed:   152 76% 48%;  /* verde */
--status-cancelled:   0 75% 50%;    /* vermelho */
--status-rejected:    350 85% 58%;  /* rosa */
--status-overdue:     20 90% 52%;   /* laranja */
```

#### Tokens de Sidebar

```css
--sidebar-background: 230 30% 13%;
--sidebar-foreground: 220 20% 85%;
--sidebar-primary:    231 75% 60%;
--sidebar-accent:     230 25% 18%;
--sidebar-border:     230 20% 20%;
```

#### Charts

```css
--chart-1: 231 75% 60%;  /* azul */
--chart-2: 152 76% 48%;  /* verde */
--chart-3: 38 95% 55%;   /* âmbar */
--chart-4: 270 85% 62%;  /* roxo */
--chart-5: 350 85% 58%;  /* rosa */
```

---

### 2.2 Border Radius

```css
--radius:       0.5rem;    /* base (md) */
--radius-inner: 0.5rem;    /* elementos internos */
--radius-outer: 1.25rem;   /* cartões e modais grandes */
```

No `tailwind.config.ts`:

```ts
borderRadius: {
  lg:    "var(--radius)",
  md:    "calc(var(--radius) - 2px)",
  sm:    "calc(var(--radius) - 4px)",
  inner: "var(--radius-inner)",
  outer: "var(--radius-outer)",
},
```

---

### 2.3 Tipografia

```ts
// tailwind.config.ts
fontFamily: {
  sans: ["Poppins", "system-ui", "sans-serif"],
  mono: ["ui-monospace", "monospace"],
},
fontSize: {
  xs:   ["0.75rem",  { lineHeight: "1rem" }],
  sm:   ["0.875rem", { lineHeight: "1.25rem" }],
  base: ["1rem",     { lineHeight: "1.5rem" }],
  lg:   ["1.125rem", { lineHeight: "1.75rem" }],
  xl:   ["1.25rem",  { lineHeight: "1.75rem" }],
  "2xl":["1.5rem",   { lineHeight: "2rem" }],
},
```

Imports no `index.css`:

```css
@import '@fontsource/poppins/300.css';
@import '@fontsource/poppins/400.css';
@import '@fontsource/poppins/500.css';
@import '@fontsource/poppins/600.css';
@import '@fontsource/poppins/700.css';
```

---

### 2.4 Animações Customizadas

```ts
// tailwind.config.ts
keyframes: {
  "fade-in": {
    from: { opacity: "0", transform: "translateY(8px)" },
    to:   { opacity: "1", transform: "translateY(0)" },
  },
  "scale-in": {
    from: { opacity: "0", transform: "scale(0.95)" },
    to:   { opacity: "1", transform: "scale(1)" },
  },
  "accordion-down": {
    from: { height: "0" },
    to:   { height: "var(--radix-accordion-content-height)" },
  },
  "accordion-up": {
    from: { height: "var(--radix-accordion-content-height)" },
    to:   { height: "0" },
  },
},
animation: {
  "fade-in":       "fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  "scale-in":      "scale-in 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  "accordion-down":"accordion-down 0.2s ease-out",
  "accordion-up":  "accordion-up 0.2s ease-out",
},
```

---

## 3. Configuração Inicial (passo a passo)

### 3.1 Criar o projeto

```bash
npm create vite@latest meu-app -- --template react-ts
cd meu-app
```

### 3.2 Tailwind CSS

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 3.3 shadcn/ui

```bash
npx shadcn@latest init
```

Opções recomendadas:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **yes**
- Tailwind prefix: **(nenhum)**

### 3.4 Dependências principais

```bash
npm install \
  @fontsource/poppins \
  framer-motion \
  lucide-react \
  @tanstack/react-query \
  react-router-dom \
  @supabase/supabase-js \
  react-hook-form \
  zod \
  @hookform/resolvers \
  sonner \
  recharts \
  next-themes \
  date-fns \
  clsx \
  tailwind-merge \
  class-variance-authority
```

### 3.5 PWA (opcional)

```bash
npm install -D vite-plugin-pwa
```

---

## 4. Estrutura de Pastas

```
src/
├── components/
│   ├── ui/           # Componentes gerados pelo CLI shadcn
│   ├── shared/       # Componentes reutilizáveis do projeto
│   └── layouts/      # Layouts por role (admin, entregador, cliente)
├── contexts/         # AuthContext, ThemeProvider, stores globais
├── hooks/            # Custom hooks (wrappers useQuery por entidade)
├── lib/
│   ├── supabase.ts   # Client Supabase com timeout
│   ├── utils.ts      # cn(), formatters
│   └── permissions.ts
├── pages/            # Páginas organizadas por role
├── services/         # Funções de acesso ao banco (RPC, queries)
├── types/            # database.ts — todas as interfaces TypeScript
└── index.css         # Design tokens CSS (variáveis HSL)
```

---

## 5. Componentes Shared Essenciais

Esses componentes foram construídos do zero no projeto e valem ser reaproveitados:

| Componente | Descrição |
|---|---|
| `MetricCard` | Card de KPI com ícone, valor, delta opcional e skeleton de loading |
| `DataTable` | Tabela genérica com paginação, busca e colunas configuráveis por `Column<T>[]` |
| `SearchInput` | Input com debounce via `useRef` — sem lag de digitação |
| `PageContainer` | Wrapper de página com título, subtítulo e padding padrão |
| `StatusBadge` | Badge semântico que mapeia status → cor automaticamente via tokens |
| `EmptyState` | Estado vazio com ícone, título e subtítulo configuráveis |
| `ConfirmDialog` | Dialog de confirmação reutilizável com `onConfirm` / `onCancel` |
| `BrandedLoader` | Tela de loading com logo e animação da identidade visual |
| `ErrorBoundary` | Class component boundary com UI de fallback |
| `CurrencyInput` | Input formatado para valores monetários em BRL |
| `PhoneInput` | Input com máscara de telefone brasileiro |

---

## 6. Padrões de Código

### Debounce sem lag (useRef, nunca useState para o timer)

O problema de usar `useState` para o timer é que cada `setState` gera um re-render, e o valor do timer fica desatualizado no closure do `useCallback`. Com `useRef`, o timer é mutado diretamente sem re-render.

```tsx
import { useState, useCallback, useRef } from "react";

function SearchInput({ onChange }: { onChange: (v: string) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [internalValue, setInternalValue] = useState("");

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInternalValue(v);                        // atualiza display imediatamente
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(v), 300);
  }, [onChange]);

  // SEMPRE usar internalValue no value= — nunca o prop controlado
  return <input value={internalValue} onChange={handleChange} />;
}
```

### Animação de lista com Framer Motion

```tsx
import { motion } from "framer-motion";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// Uso
<motion.div variants={stagger} initial="hidden" animate="show" className="grid gap-4">
  {items.map((item) => (
    <motion.div key={item.id} variants={fadeUp}>
      <Card>{/* conteúdo */}</Card>
    </motion.div>
  ))}
</motion.div>
```

### Cores sempre via tokens CSS (nunca hardcodar)

```tsx
// ✅ Correto — responsivo ao tema automaticamente
className="bg-card text-foreground border-border"
className="text-primary hover:bg-primary/10"
className="text-muted-foreground"
className="bg-destructive/10 text-destructive"

// ❌ Errado — quebra no light mode
className="bg-[#1a1f3c] text-white border-[#2a2f5c]"
```

### Responsividade mobile-first

```tsx
// Grid oculto em mobile, visível a partir de 640px
className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4"

// Padding responsivo
className="p-3 sm:p-5"

// Texto responsivo
className="text-xs sm:text-sm"
```

### Lazy loading de páginas

```tsx
import { lazy, Suspense } from "react";

// Retry automático em caso de falha de chunk (útil em deploys)
function lazyWithRetry<T extends React.ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(() =>
    factory().catch(() =>
      factory().catch(() => {
        window.location.reload();
        return Promise.reject(new Error("Chunk load failed"));
      })
    )
  );
}

const AdminPage = lazyWithRetry(() => import("./pages/AdminPage"));
```

### Seções colapsáveis

```tsx
const [aberto, setAberto] = useState(!isDriverView); // admin: aberto, motorista: fechado

<button
  type="button"
  onClick={() => setAberto((v) => !v)}
  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
>
  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${aberto ? "rotate-180" : ""}`} />
  {aberto ? "Ocultar detalhes" : "Ver mais detalhes"}
</button>

{aberto && <div className="mt-3">{/* conteúdo */}</div>}
```

---

## 7. Supabase

### Variáveis de ambiente (`.env.local`)

```
VITE_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=SEU_ANON_KEY
```

### Client com timeout (previne hang em rede lenta)

```ts
// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: (url, opts) => {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 10_000); // 10s
      return fetch(url, { ...opts, signal: ctrl.signal })
        .finally(() => clearTimeout(timeout));
    },
  },
});
```

### Padrão de hook com React Query

```ts
// src/hooks/useClientes.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useClientes() {
  return useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}
```

### Setup no main.tsx

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 2 },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
```

---

## 8. Theme Provider

```tsx
// src/contexts/ThemeProvider.tsx
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("meu-app-theme") as Theme) || "dark";
  });

  const resolvedTheme = theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme;

  useEffect(() => {
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(resolvedTheme);
    localStorage.setItem("meu-app-theme", theme);
  }, [theme, resolvedTheme]);

  // expor via context...
}
```

---

## 9. Autenticação (Supabase Auth)

Fluxo implementado no projeto:

1. Login com email + senha via `supabase.auth.signInWithPassword()`
2. **Rate limiting no cliente**: 5 tentativas / 5 minutos antes de chamar o servidor
3. Roles (`admin`, `entregador`, `cliente`) armazenadas em tabela `profiles` — não em JWT claims
4. Redirecionamento automático por role após login via `ROLE_REDIRECTS`
5. Mensagens de erro em PT-BR mapeadas de códigos Supabase

```ts
const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Email ou senha incorretos.",
  email_not_confirmed:  "Confirme seu email antes de entrar.",
  too_many_requests:    "Muitas tentativas. Tente novamente em 5 minutos.",
};
```

---

## 10. PWA — vite.config.ts

```ts
import { VitePWA } from "vite-plugin-pwa";

VitePWA({
  registerType: "autoUpdate",
  manifest: {
    name: "Meu App",
    short_name: "App",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
})
```

Ícones necessários: 72, 96, 128, 144, 152, 192, 384, 512px + 1 maskable 512px.

---

## 11. Checklist para Novo Projeto

### Infraestrutura
- [ ] Criar projeto Vite + React + TypeScript
- [ ] Configurar Tailwind CSS
- [ ] Inicializar shadcn/ui (dark, CSS variables)
- [ ] Instalar todas as dependências da seção 3.4

### Design System
- [ ] Copiar o bloco de variáveis HSL do `index.css` (dark + light + status + sidebar + charts)
- [ ] Copiar extensões do `tailwind.config.ts` (cores, radius, fontFamily, fontSize, animações)
- [ ] Importar Poppins nos 5 pesos no `index.css`

### Arquitetura
- [ ] Criar estrutura de pastas conforme seção 4
- [ ] Configurar cliente Supabase com timeout customizado
- [ ] Configurar `QueryClientProvider` no `main.tsx`
- [ ] Criar `ThemeProvider` (padrão dark, persistência em localStorage)
- [ ] Criar `AuthContext` com rate limiting e mapeamento de erros PT-BR
- [ ] Configurar React Router DOM com rotas protegidas por role

### Componentes
- [ ] Copiar componentes shared essenciais (seção 5)
- [ ] Adicionar `<Toaster />` do Sonner no root da app
- [ ] Adicionar `<TooltipProvider />` no root

### PWA
- [ ] Configurar `vite-plugin-pwa` com manifest
- [ ] Gerar ícones em todos os tamanhos necessários
- [ ] Adicionar `_headers` no `/public` para cache control

---

## 12. Versões Usadas no Projeto

```json
{
  "react": "^18.3.1",
  "vite": "^5.4.x",
  "@vitejs/plugin-react-swc": "latest",
  "tailwindcss": "^3.x",
  "framer-motion": "^12.x",
  "@tanstack/react-query": "^5.83.0",
  "@supabase/supabase-js": "^2.102.1",
  "react-router-dom": "^6.30.1",
  "react-hook-form": "^7.61.1",
  "zod": "^4.3.6",
  "lucide-react": "^0.462.0",
  "sonner": "^1.7.4",
  "recharts": "^2.15.4",
  "jspdf": "^4.2.1",
  "date-fns": "^3.6.0",
  "zustand": "^5.0.12"
}
```

# Design System - Leva e Traz v2.0

Este documento define as diretrizes visuais e padrões de interface oficiais do sistema "Leva e Traz". Todas as páginas e componentes devem seguir estas regras para garantir consistência.

---

## 🎨 Fundamentos

### Estética: Matte Ceramic + Deep Navy
- **Dark-first**: O modo escuro é a experiência principal
- **Superfícies matte**: Sem brilhos excessivos, texturas suaves
- **Acentos Spring Blue**: Azul royal/indigo como cor de destaque
- **Espaçamento**: Sistema de 8px (Tailwind: 1, 2, 3, 4, 6, 8...)

---

## 🎨 Paleta de Cores (HSL)

### Light Mode

| Token | HSL | Uso |
| :--- | :--- | :--- |
| `--background` | `220 14% 96%` | Fundo principal |
| `--foreground` | `240 30% 10%` | Texto principal |
| `--card` | `0 0% 100%` | Superfície de cards |
| `--primary` | `231 75% 55%` | Botões, estados ativos, acentos |
| `--secondary` | `220 14% 92%` | Fundos secundários |
| `--muted` | `220 14% 95%` | Fundos sutis |
| `--muted-foreground` | `220 10% 46%` | Texto secundário |
| `--accent` | `231 75% 55%` | Hover, destaques |
| `--destructive` | `0 72% 51%` | Ações destrutivas |
| `--border` | `220 14% 90%` | Bordas |

### Dark Mode (Deep Navy)

| Token | HSL | Uso |
| :--- | :--- | :--- |
| `--background` | `230 35% 12%` | Fundo principal |
| `--foreground` | `220 20% 95%` | Texto principal |
| `--card` | `230 30% 15%` | Superfície de cards |
| `--primary` | `231 75% 60%` | Botões, estados ativos |
| `--secondary` | `230 25% 20%` | Fundos secundários |
| `--muted` | `230 25% 20%` | Fundos sutis |
| `--muted-foreground` | `220 15% 60%` | Texto secundário |
| `--accent` | `230 25% 22%` | Hover em ícones/ações |
| `--destructive` | `0 72% 50%` | Ações destrutivas |
| `--border` | `230 20% 22%` | Bordas |
| `--sidebar-background` | `230 40% 9%` | Sidebar |
| `--sidebar-accent` | `230 30% 16%` | Item ativo na sidebar |

---

## ✏️ Tipografia

- **Fonte Principal**: Poppins (Sans-serif)
- **Pesos**: 300 (Light), 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
- **Escala**:
  - `h1`: text-2xl/text-3xl (Bold) — Títulos de página
  - `h2`: text-xl (Semibold) — Títulos de seção/cards
  - `body`: text-base (16px, Regular) — Texto padrão, células de tabela
  - `caption`: text-sm (Medium) — Labels, badges

---

## 🧩 Componentes Padrão

### Abas (Tabs)

Padrão oficial para navegação por abas em páginas como Configurações:

```tsx
<div className="overflow-x-auto scrollbar-hide border-b border-border pb-0">
  <TabsList className="inline-flex h-auto gap-0 bg-transparent p-0 rounded-none whitespace-nowrap w-full">
    <TabsTrigger className="flex items-center gap-2 rounded-none border-b-2 border-transparent px-3 py-2.5 text-base font-medium text-muted-foreground transition-all duration-200 hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none sm:px-4">
      <Icon className="h-5 w-5" />
      Label
    </TabsTrigger>
  </TabsList>
</div>
```

**Regras**:
- Todas as abas em **1 linha** com scroll horizontal invisível (`scrollbar-hide`)
- Aba ativa: **underline com cor primary** (`border-b-2 border-primary`)
- Aba inativa: sem borda, texto `muted-foreground`
- Ícone (h-5 w-5) à esquerda do label
- Fonte: `text-base font-medium`
- Hover: `hover:text-foreground` (sem mudança de fundo)

### Tabelas (DataTable)

```tsx
// Cabeçalho
<TableHead className="h-12 px-4 text-base font-medium text-muted-foreground">

// Célula
<TableCell className="h-14 px-4 text-base">

// Linha
<TableRow className="border-b border-border/50 hover:bg-muted/30 transition-colors duration-200">
```

**Regras**:
- Cabeçalho: **capitalização normal** (NÃO usar uppercase)
- Fonte do header: `text-base font-medium text-muted-foreground`
- Fundo do header: **transparente** (sem `bg-muted`)
- Separador: `border-b border-border` fino
- Células: `text-base` (16px)
- A última coluna de ações DEVE ter o header "Ações"

### Ícones de Ação em Tabelas

```tsx
// Editar
<Button variant="ghost" size="icon" 
  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-200">
  <Pencil className="h-4 w-4" />
</Button>

// Excluir
<Button variant="ghost" size="icon" 
  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/30 transition-colors duration-200">
  <Trash2 className="h-4 w-4" />
</Button>
```

**Regras**:
- Estado padrão: `text-muted-foreground` (ícone sutil)
- Hover editar: `hover:text-foreground hover:bg-accent`
- Hover excluir: `hover:text-destructive hover:bg-destructive/30`
- Transição: `transition-colors duration-200`

### Cards de Configuração

```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-lg">Título</CardTitle>
    <CardDescription className="text-sm">Descrição</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Conteúdo */}
  </CardContent>
</Card>
```

### Botões

- **Radius**: `rounded-md` (padrão shadcn)
- **Tamanho padrão**: `size="sm"` para ações em cards
- **Feedback**: Estado de loading durante ações assíncronas
- **Hover no header**: Neutro/sutil (`hover:bg-muted/50`)

---

## 📐 Layout

### Header
- Efeitos de hover neutros e sutis (muted gray)
- Cantos arredondados (`rounded-lg/xl`)
- Transições suaves de 200ms

### Sidebar
- Background mais escuro que o conteúdo principal
- Item ativo com `bg-sidebar-accent`
- Transições suaves

### Páginas
- Container: `PageContainer` com title + subtitle
- Espaçamento entre seções: `space-y-6`

---

## 🔧 Utilitários CSS

```css
/* Scroll sem scrollbar visível */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* Transição suave */
.transition-smooth {
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

/* Superfície com glass effect */
.glass-surface {
  @apply bg-card/80 backdrop-blur-sm border border-border/50;
}
```

---

## 🚦 Diretrizes de UX

- **Prevenção de Erros**: Campos calculados devem tratar `null/undefined/zero` para evitar `NaN`
- **Feedbacks**: Uso obrigatório de `sonner` para toasts
- **Skeleton Screens**: Usar durante carregamento de tabelas e dashboards
- **Empty States**: Toda tabela deve exibir um EmptyState com ícone e CTA quando vazia
- **Confirmação**: Ações destrutivas exigem `ConfirmDialog`

---

## 📋 Status Colors

| Status | Light HSL | Dark HSL |
| :--- | :--- | :--- |
| Pendente | `38 95% 50%` | `38 95% 55%` |
| Aceito | `231 75% 55%` | `231 75% 60%` |
| Em Progresso | `270 85% 58%` | `270 85% 62%` |
| Concluído | `152 76% 42%` | `152 76% 48%` |
| Cancelado | `0 75% 50%` | `0 75% 50%` |
| Rejeitado | `350 85% 55%` | `350 85% 58%` |
| Atrasado | `20 90% 50%` | `20 90% 52%` |

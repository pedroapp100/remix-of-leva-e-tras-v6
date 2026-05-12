# Frontend Studio — UI, Animações e Assets

Guia de referência para construir interfaces visuais, landing pages, dashboards e componentes com Tailwind, Framer Motion e geração de assets com Minimax. Mostre sempre com exemplos Antes → Depois em PT-BR.

---

## Workflow de Construção Visual

Siga esta sequência para qualquer tarefa frontend:

```
1. Arquitetura de Design   → O que mostrar e como organizar
2. Arquitetura de Motion   → Quais partes animam e como
3. Geração de Assets       → Imagens/vídeo/áudio reais com Minimax
4. Copywriting             → Textos reais (nunca "Lorem ipsum")
5. Build da UI             → Código + assets + textos integrados
6. Quality Gates           → Checklist final antes de entregar
```

---

## 1. Design Engineering

### Configuração Base por Tipo de Página

| Tipo | Variância de Design | Intensidade de Motion |
|---|---|---|
| Landing page marketing | Alta (8/10) | Alta (7/10) |
| Dashboard admin | Baixa (3/10) | Baixa (2/10) |
| Página de login | Média (5/10) | Mínima (1/10) |
| Página de produto | Alta (7/10) | Média (5/10) |

---

### Tailwind — Padrões Corretos

**Como está agora (layout quebrado no mobile):**
```tsx
// ❌ Sem responsividade — coloca tudo em linha no celular
<div className="flex gap-4">
  <Card />
  <Card />
  <Card />
</div>
```

**Como vai ficar:**
```tsx
// ✅ 1 coluna no mobile, 2 no tablet, 3 no desktop
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card />
  <Card />
  <Card />
</div>
```

---

### Tailwind — Cores e Temas Consistentes

**Como está agora:**
```tsx
// Cores espalhadas e inconsistentes
<button className="bg-blue-600 hover:bg-blue-700">Confirmar</button>
<button className="bg-blue-500 hover:bg-blue-600">Salvar</button>
```

**Como vai ficar — tokens semânticos:**
```tsx
// tailwind.config.ts — define uma vez, usa em todo lugar
theme: {
  extend: {
    colors: {
      primary: { DEFAULT: '#1D4ED8', hover: '#1E40AF' },
      danger: { DEFAULT: '#DC2626', hover: '#B91C1C' },
      success: { DEFAULT: '#16A34A', hover: '#15803D' },
    }
  }
}

// Uso consistente
<button className="bg-primary hover:bg-primary-hover">Confirmar</button>
<button className="bg-danger hover:bg-danger-hover">Cancelar</button>
```

---

### Componentes de Layout — Estrutura Recomendada

```
src/components/
├── ui/             ← Átomos reutilizáveis (Button, Card, Badge, Input)
├── sections/       ← Seções de página (HeroSection, FeatureList, CTABanner)
└── motion/         ← Wrappers de animação (RevealSection, StaggerGrid, FadeIn)
```

---

## 2. Animações com Framer Motion

### Instalação
```bash
npm install framer-motion
```

### Padrão de Entrada — FadeIn + SlideUp

**Como está agora (sem animação — aparece abruptamente):**
```tsx
<div className="p-4">
  <ListaSolicitacoes />
</div>
```

**Como vai ficar:**
```tsx
import { motion } from 'framer-motion'

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, ease: 'easeOut' }}
  className="p-4"
>
  <ListaSolicitacoes />
</motion.div>
```

---

### Animação em Lista — Stagger (Filhos Entram em Sequência)

**Como está agora (todos os cards aparecem juntos):**
```tsx
{solicitacoes.map(s => <CardSolicitacao key={s.id} {...s} />)}
```

**Como vai ficar (cards entram um por vez):**
```tsx
import { motion } from 'framer-motion'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 }
}

<motion.ul variants={container} initial="hidden" animate="show">
  {solicitacoes.map(s => (
    <motion.li key={s.id} variants={item}>
      <CardSolicitacao {...s} />
    </motion.li>
  ))}
</motion.ul>
```

---

### Regras de Performance de Animação

- Anime APENAS `opacity`, `transform` (translate, scale, rotate) — esses usam GPU
- NUNCA anime `width`, `height`, `top`, `left`, `margin`, `padding` diretamente — causam repaint/reflow
- Use `will-change: transform` com moderação
- Respeite `prefers-reduced-motion`:

```tsx
import { useReducedMotion } from 'framer-motion'

function AnimatedCard() {
  const shouldReduceMotion = useReducedMotion()
  return (
    <motion.div
      animate={{ opacity: 1, y: shouldReduceMotion ? 0 : [20, 0] }}
    />
  )
}
```

---

## 3. Geração de Assets com Minimax

Use os scripts em `.cursor/skills/minimax-ai-skills-frontend-dev/scripts/` para gerar assets reais.

**NUNCA use URLs externas de placeholder** (unsplash, picsum, placeholder.com). Gere os assets locais.

### Imagem
```bash
python scripts/minimax_image.py \
  --prompt "Entregador em moto em São Paulo, foto profissional, estilo corporativo" \
  --ratio "16:9" \
  --output "public/assets/images/hero-entregador.webp"
```

### Áudio / TTS
```bash
python scripts/minimax_tts.py \
  --text "Bem-vindo ao Leva e Traz. Sua entrega rápida e confiável." \
  --voice "Brazilian_Portuguese_Female" \
  --output "public/assets/audio/welcome.mp3"
```

### Nomenclatura de Assets
```
{tipo}-{descrição}-{timestamp}.{ext}
Ex: hero-entregador-1746612345.webp
    bg-mapa-cidade-1746612346.webp
    icon-entrega-1746612347.webp
```

---

## 4. Copywriting para UI

Nunca use "Lorem ipsum" nem textos genéricos. Escreva copy real seguindo frameworks:

### AIDA — Para Páginas de Marketing
- **A**tenção: Headline impactante (problema ou transformação)
- **I**nteresse: Mostre por que importa (contexto, dados)
- **D**esejo: Benefícios concretos (não features, mas resultados)
- **A**ção: CTA claro e direto

**Exemplo para o Leva e Traz:**
```
Headline (Atenção):   "Suas entregas organizadas, seus clientes satisfeitos"
Subtítulo (Interesse): "Gerencie pedidos, entregadores e faturas em um só lugar"
Lista (Desejo):        ✓ Rastreio em tempo real  ✓ Fatura automática  ✓ Zero planilha
CTA (Ação):            "Começar agora — é grátis"
```

### PAS — Para Mensagens de Erro e Estado Vazio
- **P**roblema: O que aconteceu
- **A**gitação: Por que é ruim para o usuário
- **S**olução: O que fazer agora

**Exemplo — estado vazio de lista:**
```
❌ Sem PAS: "Nenhuma solicitação encontrada"
✅ Com PAS: "Ainda não há solicitações por aqui. Compartilhe seu link com clientes para receber os primeiros pedidos."
```

---

## 5. Quality Gates — Checklist Final

Antes de entregar qualquer componente ou página:

### Responsividade
- [ ] Testado nos breakpoints: mobile (375px), tablet (768px), desktop (1280px)
- [ ] Grid/flex com classes `sm:`, `md:`, `lg:`
- [ ] Imagens com `max-w-full` ou `object-cover`

### Performance
- [ ] Imagens com `loading="lazy"` (exceto acima do fold)
- [ ] Animações só em `opacity` e `transform`
- [ ] Sem re-renders desnecessários (memo/useCallback quando necessário)

### Acessibilidade
- [ ] Botões têm `aria-label` quando sem texto visível
- [ ] Imagens têm `alt` descritivo
- [ ] Contraste de cor: mínimo 4.5:1 para texto normal
- [ ] Foco visível em elementos interativos

### Assets
- [ ] Sem URLs externas de placeholder
- [ ] Assets no diretório `public/assets/`
- [ ] Nomenclatura seguindo o padrão `{tipo}-{desc}-{timestamp}.{ext}`

### Textos
- [ ] Zero "Lorem ipsum"
- [ ] Zero textos genéricos como "Clique aqui" ou "Saiba mais" sem contexto
- [ ] CTAs com verbo de ação claro

---

## Receitas Rápidas de Componentes

### Badge de Status
```tsx
const statusStyles = {
  pendente:      'bg-yellow-100 text-yellow-800',
  em_andamento:  'bg-blue-100 text-blue-800',
  concluida:     'bg-green-100 text-green-800',
  cancelada:     'bg-red-100 text-red-800',
}

function BadgeStatus({ status }: { status: keyof typeof statusStyles }) {
  const labels = { pendente: 'Pendente', em_andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada' }
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status]}`}>
      {labels[status]}
    </span>
  )
}
```

### Card com Hover Animado
```tsx
<motion.div
  whileHover={{ y: -4, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
  transition={{ duration: 0.2 }}
  className="bg-white rounded-xl p-4 border border-gray-100 cursor-pointer"
>
  {children}
</motion.div>
```

### Loading Skeleton
```tsx
function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white rounded-xl p-4 space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
      <div className="h-8 bg-gray-200 rounded" />
    </div>
  )
}
```

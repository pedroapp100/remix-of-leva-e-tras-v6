# Plano de Implementação - Melhorias de Design e UX

Este plano descreve as ações para aplicar o novo Design System "Industrial Premium" e corrigir inconsistências identificadas na auditoria visual.

## User Review Required

> [!IMPORTANT]
> A geometria dos componentes será alterada de `rounded-md` (8px) para `rounded-sm` (2px). Isso dará ao app um visual mais técnico, limpo e industrial, alinhado com o setor de logística.

---

## Proposed Changes

### [Frontend] Estética e UX

#### [MODIFY] [LoginPage.tsx](file:///c:/Users/TRABALHO/Documents/Leva%20e%20tras%20estrutura%20%21/zlevaetrasApha-main/src/pages/auth/LoginPage.tsx)
- Substituir a URL da imagem por uma mais estável ou um componente visual estilizado.
- Aplicar `rounded-sm` nos campos de input e no botão principal.

#### [MODIFY] [Dashboard.tsx](file:///c:/Users/TRABALHO/Documents/Leva%20e%20tras%20estrutura%20%21/zlevaetrasApha-main/src/components/dashboard/Dashboard.tsx)
- Corrigir o cálculo da porcentagem (`percentage`) para tratar divisões por zero e evitar `NaN%`.

#### [MODIFY] [MetricCard.tsx](file:///c:/Users/TRABALHO/Documents/Leva%20e%20tras%20estrutura%20%21/zlevaetrasApha-main/src/components/dashboard/MetricCard.tsx)
- Ajustar arredondamento dos cards para `rounded-sm`.

#### [MODIFY] [button.tsx](file:///c:/Users/TRABALHO/Documents/Leva%20e%20tras%20estrutura%20%21/zlevaetrasApha-main/src/components/ui/button.tsx) & [input.tsx](file:///c:/Users/TRABALHO/Documents/Leva%20e%20tras%20estrutura%20%21/zlevaetrasApha-main/src/components/ui/input.tsx)
- Alterar o valor padrão de `rounded-md` para `rounded-sm` nos componentes base do Shadcn para garantir consistência global.

---

## Verification Plan

### Automated Tests
- N/A (O foco é visual e UX)

### Manual Verification (Browser)
1. **Login:** Verificar se a imagem agora carrega e se os botões estão com as bordas "afiadas".
2. **Dashboard:** Verificar se o indicador de porcentagem exibe `0%` em vez de `NaN%` quando não há dados de comparação.
3. **Consistência:** Navegar por "Clientes" e "Entregas" para garantir que todos os botões e cards herdaram o novo estilo.

## Transferência de Entregador (Solicitação em Andamento)

### Problema
Quando um entregador tem uma pane (ex: moto quebrou), não há como transferir a solicitação para outro entregador. Hoje o botão "Atribuir entregador" só aparece no status `pendente`.

### Análise do Código Atual

**Fluxo de atribuição existente:**
- `handleAssign()` em `SolicitacoesPage.tsx` (linha 206): muda `entregador_id`, status → `aceita`, adiciona histórico
- `AssignDriverDialog` (arquivo próprio): lista entregadores ativos, chama `onAssign(entregadorId)`
- `renderActions()` (linha 274): botão "Atribuir" só aparece quando `status === "pendente"`

**Portal do entregador:**
- `EntregadorSolicitacoesPage.tsx` (linha 30): filtra por `ENTREGADOR_ID = "ent-001"` fixo
- Mostra apenas solicitações onde `entregador_id` corresponde ao entregador logado

### Plano de Implementação

#### 1. Adicionar botão "Transferir" nas ações (SolicitacoesPage.tsx)
- No `renderActions()`, dentro do bloco `sol.status === "em_andamento"`, adicionar um novo `ActionButton` com ícone `RefreshCw` (ou `ArrowLeftRight`) e tooltip "Transferir entregador"
- Esse botão abre o `AssignDriverDialog` existente (reutilizar)
- Criar um novo state `transferTarget` para distinguir de `assignTarget`

#### 2. Criar função `handleTransfer()` (SolicitacoesPage.tsx)
Nova função que:
- Salva o `entregador_id` anterior para o histórico
- Atualiza `entregador_id` com o novo entregador
- Muda o status de volta para `aceita` (o novo entregador precisa "reiniciar" a entrega)
- Reseta `data_inicio` para `null` (a entrega não começou para o novo entregador)
- Adiciona evento no histórico: `"Transferida de [nome anterior] para [nome novo]: motivo"`
- Envia notificação ao novo entregador

#### 3. Adicionar justificativa na transferência
- Reutilizar o `JustificationDialog` existente para pedir o motivo da transferência (ex: "pane na moto")
- Fluxo: clica "Transferir" → pede justificativa → abre seleção de entregador → confirma

#### 4. Filtrar entregador atual no dialog
- Passar o `entregador_id` atual como prop opcional ao `AssignDriverDialog`
- Filtrar para não mostrar o entregador que já está atribuído (não faz sentido transferir para o mesmo)

#### 5. Impacto no portal do entregador
- **Nenhuma alteração necessária** — o portal já filtra por `entregador_id`. Ao trocar o `entregador_id`, a solicitação automaticamente:
  - Desaparece do painel do entregador anterior ✅
  - Aparece como "Aceita" no painel do novo entregador ✅

### Arquivos a Modificar
| Arquivo | Alteração |
|---------|-----------|
| `SolicitacoesPage.tsx` | State `transferTarget`, função `handleTransfer()`, botão na `renderActions()` |
| `AssignDriverDialog.tsx` | Prop opcional `excludeEntregadorId` para filtrar o atual |

### Fluxo Visual
```
Admin vê solicitação "Em Andamento"
  → Clica ícone "Transferir" (↔)
  → JustificationDialog pede motivo
  → AssignDriverDialog mostra lista (sem o atual)
  → Seleciona novo entregador
  → Status volta para "Aceita", entregador_id atualizado
  → Histórico registra transferência com motivo
  → Notificação enviada ao novo entregador
  → Solicitação some do painel do antigo, aparece no novo como "Aceita"
```

### Considerações
- O status volta para **"aceita"** (não "em_andamento") para que o novo entregador possa clicar "Iniciar entrega" quando estiver pronto
- O `data_inicio` é resetado para que o tempo médio reflita corretamente
- A justificativa fica registrada no histórico, não no campo `justificativa` da solicitação (que é para cancelamento/rejeição)

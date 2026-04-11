# 🔧 ANÁLISE: Mensagens de Teste Não Chegam Via Z-API

## 📋 Resumo Executivo

As mensagens testadas no admin **parecem ser enviadas**, mas não chegam no WhatsApp real. A causa pode estar em 3 camadas:

1. **Frontend** ← Envia requisição (PARCIALMENTE corrigido em Fix #2)
2. **Edge Function** ← Recebe e processa (AGORA COM LOGS melhores)
3. **Z-API** ← Integração com WhatsApp (REQUER CONFIGURAÇÃO)

---

## 🔍 Checklist de Diagnóstico (Em Ordem)

### 1️⃣ **VERIFICAR: Z-API Está Configurada?**

```
📍 Ir para: Admin → Configurações → Integrações
```

Procure por **"WhatsApp via Z-API"**

- [ ] **Status**: Deve estar ✅ **ATIVO** (botão toggle à direita)
- [ ] **API Key** (campo acima): Deve estar preenchido
- [ ] **Config.instance_id**: Deve estar preenchido
- [ ] **Config.token**: Deve estar preenchido  
- [ ] **Config.client_token**: Pode estar vazio (opcional)

**Se algum campo está VAZIO → ISSO É O PROBLEMA!**

```
✅ CORRETO:
├─ Status: [✓] ATIVO
├─ API Key: ***_VcX1w2nD9kL4mP5q8oR3s
├─ Instance ID: 60a3e9b7-2f8c-4d1a-9e5b-8c2a1d6f3p9x
├─ Token: eFg9hIj2kLm5nOp8qRs1tUv4wXy7zA0B
└─ Client Token: (deixe em branco é ok)
```

**Onde obter essas informações:**
1. Acesse seu dashboard Z-API: https://dashboard.z-api.io
2. Copie a **Instance ID** e **Token**
3. Cole em Integrações

---

### 2️⃣ **TESTE: Enviar Mensagem de Teste**

```
📍 Ir para: Admin → Configurações → Notificações
```

1. Escolha um evento (ex: "Solicitação criada")
2. Clique no botão ✉️ **"Enviar Teste"**
3. Digite um **número WhatsApp válido** seu (ex: 85988889999)
4. Clique **"Enviar Teste"**

**Observe 3 coisas:**

#### A) Toast (aviso amarelo/verde/vermelho)
- `✅ Verde "Mensagem enviada com sucesso!"` → Ir para #3
- `❌ Vermelho "Erro ao enviar: ..."` → **LER O ERRO** e ir para #4
- `⏳ Cinza "Testando conexão..."` → Espere mais

#### B) Console do Navegador (F12)
Abra Developer Tools (F12) → Console → Procure por mensagens com `[TestSend]`:

```
🚀 [TestSend] Iniciando envio: {
  telefone: "85988889999",
  evento: "solicitacao.criada",
  url: "https://seu-projeto.supabase.co/functions/v1/enviar-whatsapp"
}

📡 [TestSend] Resposta da Edge Function: {
  status: 200,  ← ✅ BOM (ou 422, 502, 401, 404)
  statusText: "OK"
}

📦 [TestSend] Dados da resposta: {
  success: true,
  zapiMessageId: "WAM123456"  ← ✅ Enviado para Z-API!
}
```

#### C) Histórico de Testes
Clique 📋 **"Histórico"** no mesmo evento. Deve listar seu envio:
- Data/hora
- Número
- Status: `✅ sucesso` ou `❌ falha`

---

### 3️⃣ **SUCESSO: Se Status for 200 com `success: true`**

A mensagem **foi entregue à Z-API com sucesso**. Mas...

```
📱 VERIFIQUE NO WHATSAPP:
```

- [ ] A mensagem **chegou no seu WhatsApp**?
  - **SIM** → ✅ **FIM! Sistema funciona corretamente!**
  - **NÃO** → Ir para #5

---

### 4️⃣ **ERRO: Se Console Mostrar Erro**

Procure no console a mensagem de erro. Exemplos:

```
❌ "[TestSend] Erro ao enviar: Integração WhatsApp não configurada"
   → Ir para #1 (Z-API não está ativa/configurada)

❌ "[TestSend] Erro ao enviar: Credenciais Z-API incompletas"
   → Ir para #1 (Faltam campos em Integrações)

❌ "[TestSend] Erro ao enviar: Z-API retornou status 401"
   → Token Z-API expirou ou está incorreto → Renove em dashboard.z-api.io

❌ "[TestSend] Erro ao enviar: Z-API retornou status 403"
   → Instance ID incorreto ou desativada

❌ "[TestSend] Erro ao enviar: Erro de conexão. Verifique sua internet"
   → Problema de rede ou Edge Function offline
```

---

### 5️⃣ **MENSAGEM NÃO CHEGOU: Se Status 200 mas Sem Mensagem**

O sistema enviou para Z-API, mas WhatsApp não recebeu. Causas comuns:

#### A) **Número Formatado Incorretamente**

A função `formatPhone()` tenta converter:
- `85988889999` → `5585988889999` ✅
- `(85) 98888-9999` → `5585988889999` ✅
- `+55 85 98888-9999` → `5585988889999` ✅

**Teste**: Clique em "Teste de conexão" em Integrações. Se funcionar, número está ok.

#### B) **Instância WhatsApp não Ativa**

No dashboard Z-API:
- [ ] Instância está "Conectada"?
- [ ] QR Code foi escaneado?
- [ ] WhatsApp não foi deslogado?

#### C) **Z-API Respondeu com Erro**

Verifique console para detalhes da resposta Z-API:

```json
{
  "success": false,
  "zapiStatus": 400,
  "zapiResponse": {
    "text": "Invalid phone number format",
    "code": "ERR_INVALID_PHONE"
  }
}
```

Se vir isso → Número está em formato errado.

---

## 🛠️ Script de Teste Automático

Para testar sem usar interface web:

### Opção 1: Node.js
```bash
node debug_test_send.js 85988889999
```

Output esperado:
```
✅ Edge Function respondeu com sucesso!
   ✅ Mensagem foi enviada para Z-API!
   📨 ID da mensagem: WAM123456
```

### Opção 2: Python
```bash
python debug_test_send.py
# Vai pedir: SUPABASE_URL, ANON_KEY, número
```

---

## 📊 Análise de Logs da Edge Function

Se ainda não funcionar, verifique logs em **Supabase Dashboard**:

```
📍 Supabase Dashboard → Edge Functions → enviar-whatsapp → Logs
```

Procure por linhas com `[enviar-whatsapp]`:

```log
[enviar-whatsapp] 🔍 Buscando credenciais Z-API...
[enviar-whatsapp] 📋 Resultado: found: true
[enviar-whatsapp] 🔐 Credenciais carregadas: instance_id: ✅, token: ✅
[enviar-whatsapp] 📤 Enviando para Z-API: {
  url: "https://api.z-api.io/instances/60a3e.../token/.../send-text",
  phoneFormatted: "5585988889999",
  messageLength: 235
}
[enviar-whatsapp] 📡 Resposta Z-API: { status: 200, statusText: "OK" }
[enviar-whatsapp] 📦 Dados Z-API: { messageId: "WAM123456" }
[enviar-whatsapp] ✅ Mensagem enviada com sucesso!
```

**Se vir `📋 Resultado: found: false`** → Z-API não está configurada.

**Se vir `❌ Network error` → Z-API fora do ar ou URL incorreta.

---

## 🚀 Passo-a-Passo Completo (Do Zero)

Se nada funcionou ainda:

### 1. Criar/Configurar Z-API

```
1. Acesse: https://z-api.io/
2. Crie/acesse sua conta
3. Crie uma nova "Instância"
4. Escaneie QR Code com seu WhatsApp
5. Aguarde "Conectada"
6. Copie Instance ID e Token
```

### 2. Adicionar em Integrações

```
📍 Admin → Configurações → Integrações
1. Encontre "WhatsApp via Z-API"
2. Clique para editar
3. Cole API Key (Token) e Instance ID
4. Ative o toggle
5. Clique "Testar Conexão"
   → Deve dizer "Conexão estabelecida com sucesso!"
```

### 3. Testar

```
📍 Admin → Configurações → Notificações
1. Escolha um evento
2. Envie teste
3. Verifique WhatsApp
```

---

## 📞 Problemas Comuns & Soluções

| Problema | Solução |
|----------|---------|
| "Integração não configurada" | Verifique #1 do checklist |
| "Credenciais incompletas" | Preencha todos os campos em Integrações |
| "Z-API retornou 401" | Token expirou → Renove no dashboard Z-API |
| "Z-API retornou 403" | Instance ID incorreto ou desativada |
| "Mensagem enviada mas não chega" | Verifique #5 do checklist |
| "Telefone inválido" | Use formato: 85988889999 (sem símbolos) |

---

## ✅ Checklist Final

Quando tudo funcionar:

- [ ] Toast verde "Mensagem enviada com sucesso!"
- [ ] Console mostra `📦 success: true`
- [ ] Histórico de testes mostra status ✅
- [ ] WhatsApp recebe a mensagem em 5-10 segundos
- [ ] Pode testar com diferentes números

---

## 🐛 Se Ainda Tiver Erro

Reporte com essas informações:

1. Erro exato do toast/console
2. Output do `debug_test_send.js`
3. Print da tela de Integrações (sem credenciais)
4. Logs da Edge Function (Supabase Dashboard → Logs)
5. Status da instância Z-API (dashboard.z-api.io)

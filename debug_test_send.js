/**
 * Debug Script: Teste de Conexão com Edge Function
 * Simula o que o frontend faz quando clica "Enviar Teste"
 * 
 * Uso:
 *   npm run debug:testsend
 *   ou
 *   node debug_test_send.js
 */

import fetch from 'node-fetch';

// Configurar variáveis
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://seu-projeto.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sua-chave-anon';
const TEST_PHONE = process.argv[2] || '85988889999';

console.log('\n' + '='.repeat(70));
console.log('🧪 DEBUG: Teste de Conexão com Edge Function');
console.log('='.repeat(70));

// URL da Edge Function
const url = `${SUPABASE_URL}/functions/v1/enviar-whatsapp`;

// Payload
const payload = {
  telefone: TEST_PHONE,
  evento: 'solicitacao.criada',
  variaveis: {
    cliente_nome: 'Cliente Teste Debug',
    solicitacao_id: 'DEBUG-001',
    endereco_coleta: 'Rua de Teste, 123',
    endereco_entrega: 'Avenida Teste, 456',
    valor_total: 'R$ 100,00',
  },
};

console.log('\n📤 REQUISIÇÃO');
console.log(`URL: ${url}`);
console.log(`Método: POST`);
console.log(`Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer ${SUPABASE_ANON_KEY.substring(0, 10)}..."
}`);
console.log(`Body: ${JSON.stringify(payload, null, 2)}`);

// Fazer requisição
console.log('\n⏳ Enviando requisição...');

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  },
  body: JSON.stringify(payload),
})
  .then(response => {
    console.log('\n📡 RESPOSTA');
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Headers:`, {
      contentType: response.headers.get('content-type'),
      cors: response.headers.get('access-control-allow-origin'),
    });

    return response.json().then(data => ({ response, data }));
  })
  .then(({ response, data }) => {
    console.log(`Body: ${JSON.stringify(data, null, 2)}`);

    console.log('\n🔍 ANÁLISE');

    // Análise por status
    if (response.status === 200) {
      console.log('✅ Edge Function respondeu com sucesso!');

      if (data.success) {
        console.log('   ✅ Mensagem foi enviada para Z-API!');
        console.log(`   📨 ID da mensagem: ${data.zapiMessageId}`);
      } else {
        console.log(`   ❌ Erro no envio: ${data.error}`);
        if (data.zapiStatus) {
          console.log(`   📡 Status Z-API: ${data.zapiStatus}`);
          console.log(`   📦 Resposta Z-API:`, data.zapiResponse);
        }
      }
    } else if (response.status === 422) {
      console.log('⚠️  Configuração incompleta (422)');
      console.log(`   • Erro: ${data.error}`);
      console.log(`   • Código: ${data.errorCode}`);
      if (data.details) {
        console.log(`   • Detalhes:`, data.details);
      }

      console.log('\n💡 AÇÃO NECESSÁRIA');
      if (data.errorCode === 'INTEGRATION_NOT_FOUND') {
        console.log('1. Vá para Configurações > Integrações');
        console.log('2. Configure "WhatsApp via Z-API"');
        console.log('3. Preencha instance_id, token e client_token');
      }
    } else if (response.status === 502) {
      console.log('❌ Erro 502 - Problema ao conectar com Z-API');
      console.log(`   • Erro: ${data.error}`);
      console.log(`   • Status Z-API: ${data.zapiStatus}`);
      console.log(`   • Resposta Z-API:`, data.zapiResponse);

      console.log('\n💡 AÇÃO NECESSÁRIA');
      console.log('1. Verifique se as credenciais Z-API estão corretas');
      console.log('2. Teste em: https://dashboard.z-api.io');
      console.log('3. Verifique se a instância WhatsApp está ativa');
    } else if (response.status === 401) {
      console.log('❌ Erro 401 - Autenticação falhou');
      console.log('   → VITE_SUPABASE_ANON_KEY pode estar incorreta');
    } else if (response.status === 404) {
      console.log('❌ Erro 404 - Edge Function não encontrada');
      console.log(`   → URL: ${url}`);
    } else {
      console.log(`❌ Erro ${response.status}: ${response.statusText}`);
    }

    console.log('\n' + '='.repeat(70));
  })
  .catch(error => {
    console.error('\n❌ ERRO:', error.message);
    console.error('\n💡 VERIFICAÇÕES');
    console.error('• VITE_SUPABASE_URL está correto?');
    console.error('• VITE_SUPABASE_ANON_KEY está correto?');
    console.error('• Sua internet está funcionando?');
    console.error('• Edge Function foi deployada?');
    console.log('\n' + '='.repeat(70));
  });

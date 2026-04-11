#!/usr/bin/env python3
"""
Debug Script: Testar envio de mensagens via Edge Function
Captura o erro real do fluxo: Frontend → Edge Function → Z-API

Uso:
  python debug_test_send.py
"""

import requests
import json
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL") or input("VITE_SUPABASE_URL: ")
SUPABASE_ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY") or input("VITE_SUPABASE_ANON_KEY: ")
TEST_PHONE = input("Número WhatsApp para teste (ex: 85 988889999): ")

print("\n" + "="*70)
print("🧪 DEBUG: Teste de Envio de Mensagem WhatsApp")
print("="*70)

# 1. Informações da requisição
edge_function_url = f"{SUPABASE_URL}/functions/v1/enviar-whatsapp"
headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
}
payload = {
    "telefone": TEST_PHONE,
    "evento": "solicitacao.criada",
    "variaveis": {
        "cliente_nome": "Teste Debug",
        "solicitacao_id": "DEBUG-001",
        "endereco_coleta": "Rua de Teste, 123",
        "endereco_entrega": "Avenida Teste, 456",
        "valor_total": "R$ 100,00",
    },
}

print("\n📤 REQUISIÇÃO")
print(f"URL: {edge_function_url}")
print(f"Método: POST")
print(f"Headers: {json.dumps(headers, indent=2)}")
print(f"Body: {json.dumps(payload, indent=2)}")

# 2. Fazer requisição
print("\n⏳ Enviando requisição...")
try:
    response = requests.post(edge_function_url, json=payload, headers=headers, timeout=30)
    
    print("\n📡 RESPOSTA")
    print(f"Status: {response.status_code} {response.reason}")
    print(f"Headers: {dict(response.headers)}")
    
    try:
        data = response.json()
        print(f"Body: {json.dumps(data, indent=2, ensure_ascii=False)}")
    except:
        print(f"Body (texto): {response.text}")
    
    # 3. Análise
    print("\n🔍 ANÁLISE")
    if response.status_code == 200:
        print("✅ Edge Function respondeu com sucesso!")
        data = response.json()
        if data.get("success"):
            print("   ✅ Mensagem foi enviada para Z-API!")
            print(f"   📨 ID da mensagem: {data.get('zapiMessageId')}")
        else:
            print(f"   ❌ Erro no envio: {data.get('error')}")
            if "Z-API" in str(data.get('error')):
                print("   → Problema com Z-API (credenciais, configuração ou servidor)")
    
    elif response.status_code == 422:
        print("⚠️  Configuração incompleta (422)")
        data = response.json()
        print(f"   • Erro: {data.get('error')}")
        print(f"   • Código: {data.get('errorCode')}")
        if data.get('details'):
            print(f"   • Detalhes: {data.get('details')}")
    
    elif response.status_code == 502:
        print("❌ Erro 502 - Problema ao conectar com Z-API")
        data = response.json()
        print(f"   • Erro: {data.get('error')}")
        print(f"   • Status Z-API: {data.get('zapiStatus')}")
        print(f"   • Resposta Z-API: {data.get('zapiResponse')}")
    
    elif response.status_code == 401:
        print("❌ Erro 401 - Autenticação falhou")
        print("   → Verifique se o VITE_SUPABASE_ANON_KEY está correto")
    
    elif response.status_code == 404:
        print("❌ Erro 404 - Edge Function não encontrada")
        print(f"   → URL: {edge_function_url}")
    
    else:
        print(f"❌ Erro {response.status_code}: {response.reason}")
    
    # 4. Recomendações
    print("\n💡 PRÓXIMOS PASSOS")
    
    if response.status_code == 422:
        print("1. Verifique as Integrações em Configurações")
        print("   • Integração 'WhatsApp via Z-API' deve estar ativa")
        print("   • instance_id e token devem estar preenchidos")
    
    elif "INCOMPLETE_CREDENTIALS" in str(response.json().get('errorCode')):
        print("1. Configure a integração Z-API em Configurações > Integrações")
        print("2. Preencha instance_id, token e client_token")
    
    elif response.status_code == 502:
        print("1. Verifique se as credenciais Z-API estão corretas")
        print("2. Teste a Z-API diretamente em: https://dashboard.z-api.io")
        print("3. Verifique se a instância WhatsApp está ativa")
    
    else:
        print("1. Verifique os logs da Edge Function em Supabase Dashboard")
        print("2. Procure por mensagens [enviar-whatsapp] nos logs")

except requests.exceptions.Timeout:
    print("❌ TIMEOUT - Requisição demorou muito")
    print("   → Edge Function demora > 30s para responder")

except requests.exceptions.ConnectionError as e:
    print(f"❌ ERRO DE CONEXÃO: {e}")
    print(f"   → Verifique URL: {edge_function_url}")

except Exception as e:
    print(f"❌ ERRO: {e}")

print("\n" + "="*70)

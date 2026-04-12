/**
 * Edge Function: enviar-whatsapp
 *
 * Envia mensagens WhatsApp via Z-API.
 * 1. Busca credenciais da Z-API na tabela `integracoes` (categoria = comunicacao, icone = whatsapp)
 * 2. Se `evento` for fornecido, busca o template em `notification_templates`
 * 3. Substitui variáveis no template e envia via Z-API REST API
 *
 * Body esperado:
 *   { telefone: string, mensagem?: string, evento?: string, variaveis?: Record<string, string> }
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ZAPI_BASE_URL = "https://api.z-api.io";

// ── Types ───────────────────────────────────────────────────────────────────

interface RequestBody {
  telefone: string;
  mensagem?: string;
  evento?: string;
  variaveis?: Record<string, string>;
  // Status check action (não envia mensagem — apenas verifica conexão Z-API)
  action?: "status";
  instance_id?: string;
  token?: string;
  client_token?: string;
}

interface ZApiCredentials {
  instance_id: string;
  token: string;
  client_token: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatPhone(phone: string): string {
  // Remove tudo que não é dígito
  const digits = phone.replace(/\D/g, "");
  // Se não começar com 55 (Brasil), adiciona
  if (!digits.startsWith("55")) return `55${digits}`;
  return digits;
}

function substituirVariaveis(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// ── Status Check Helper ──────────────────────────────────────────────────────

async function handleStatusCheck(
  supabase: ReturnType<typeof createClient>,
  overrideCreds?: { instance_id?: string; token?: string; client_token?: string },
): Promise<Response> {
  let instance_id = overrideCreds?.instance_id ?? "";
  let token = overrideCreds?.token ?? "";
  let client_token = overrideCreds?.client_token ?? "";

  // Se não foram fornecidas credenciais, busca do BD
  const needsDb = !instance_id || !token;
  if (needsDb) {
    console.log("[status-check] 🔍 Buscando credenciais do BD...");
    const { data: integ } = await supabase
      .from("integracoes")
      .select("api_key, config, ativo")
      .eq("icone", "whatsapp")
      .limit(1)
      .single();

    if (!integ) {
      return jsonResponse({
        connected: false,
        errorCode: "INTEGRATION_NOT_FOUND",
        error: "Integração Z-API não encontrada. Configure em Integrações.",
      });
    }

    const config = (integ.config ?? {}) as Record<string, string>;
    instance_id = instance_id || config.instance_id || "";
    token = token || integ.api_key || config.token || "";
    client_token = client_token || config.client_token || "";
  }

  if (!instance_id || !token) {
    return jsonResponse({
      connected: false,
      errorCode: "INCOMPLETE_CREDENTIALS",
      error: "Credenciais incompletas: preencha Instance ID e Token.",
    });
  }

  try {
    const statusUrl = `${ZAPI_BASE_URL}/instances/${instance_id}/token/${token}/status`;
    console.log("[status-check] 📡 Verificando status Z-API...");
    const zapiResp = await fetch(statusUrl, {
      headers: { "Client-Token": client_token },
    });

    const zapiData = await zapiResp.json();
    console.log("[status-check] 📋 Resposta Z-API status:", zapiData);

    // Z-API pode retornar connected: true ou status: "CONNECTED"
    const connected =
      zapiData?.connected === true ||
      zapiData?.status === "CONNECTED" ||
      zapiData?.smartphoneConnected === true;

    // Actualiza status no BD (apenas se lemos do BD)
    if (needsDb) {
      await supabase
        .from("integracoes")
        .update({ status: connected ? "conectado" : "desconectado" })
        .eq("icone", "whatsapp");
    }

    return jsonResponse({
      connected,
      smartphoneConnected: zapiData?.smartphoneConnected ?? null,
      session: zapiData?.session ?? null,
      details: zapiData,
    });
  } catch (err) {
    console.error("[status-check] ❌ Erro ao consultar Z-API:", err);
    return jsonResponse({
      connected: false,
      errorCode: "NETWORK_ERROR",
      error: "Erro ao conectar com Z-API. Verifique se o Instance ID é válido.",
      details: err instanceof Error ? err.message : String(err),
    });
  }
}

// ── Handler ─────────────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  // ── GET /enviar-whatsapp → verifica status de conexão Z-API ──────────────
  if (req.method === "GET") {
    return await handleStatusCheck(createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY));
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
  }

  const { telefone, mensagem, evento, variaveis, action, instance_id: bodyInstanceId, token: bodyToken, client_token: bodyClientToken } = body;

  // ── Action: verificar status Z-API (sem enviar mensagem) ──────────────────
  if (action === "status") {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    return await handleStatusCheck(supabase, {
      instance_id: bodyInstanceId,
      token: bodyToken,
      client_token: bodyClientToken,
    });
  }

  if (!telefone) {
    return jsonResponse({ success: false, error: "Campo 'telefone' é obrigatório" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Buscar credenciais Z-API da tabela integracoes
  console.log("[enviar-whatsapp] 🔍 Buscando credenciais Z-API da tabela integracoes...");
  
  const { data: integ, error: integError } = await supabase
    .from("integracoes")
    .select("api_key, config, ativo, status")
    .eq("icone", "whatsapp")
    .eq("ativo", true)
    .limit(1)
    .single();

  console.log("[enviar-whatsapp] 📋 Resultado da busca:", {
    found: !!integ,
    error: integError?.message,
    integData: integ ? { api_key: integ.api_key ? "***" : "null", config: integ.config, ativo: integ.ativo, status: integ.status } : null,
  });

  if (integError || !integ) {
    console.error("[enviar-whatsapp] ❌ Integração WhatsApp não encontrada ou inativa:", integError?.message);
    return jsonResponse({
      success: false,
      error: "Integração WhatsApp não configurada ou inativa. Configure nas Configurações > Integrações.",
      errorCode: "INTEGRATION_NOT_FOUND",
    }, 422);
  }

  const config = (integ.config ?? {}) as Record<string, string>;
  const creds: ZApiCredentials = {
    instance_id: config.instance_id ?? "",
    token: integ.api_key ?? config.token ?? "",
    client_token: config.client_token ?? "",
  };

  console.log("[enviar-whatsapp] 🔐 Credenciais carregadas:", {
    instance_id: creds.instance_id ? "✅ presente" : "❌ faltando",
    token: creds.token ? "✅ presente" : "❌ faltando",
    client_token: creds.client_token ? "✅ presente" : "❌ faltando",
  });

  if (!creds.instance_id || !creds.token) {
    console.error("[enviar-whatsapp] ❌ Credenciais incompletas!");
    return jsonResponse({
      success: false,
      error: "Credenciais Z-API incompletas (instance_id e token são obrigatórios).",
      errorCode: "INCOMPLETE_CREDENTIALS",
      details: {
        instance_id: !!creds.instance_id,
        token: !!creds.token,
        client_token: !!creds.client_token,
      },
    }, 422);
  }

  // 2. Resolver mensagem: template (se evento) ou mensagem direta
  let textoFinal = mensagem ?? "";

  if (evento) {
    const { data: tmpl, error: tmplError } = await supabase
      .from("notification_templates")
      .select("mensagem")
      .eq("evento", evento)
      .eq("canal", "whatsapp")
      .eq("ativo", true)
      .limit(1)
      .single();

    if (tmplError || !tmpl) {
      console.warn(`[enviar-whatsapp] Template não encontrado para evento "${evento}". Usando mensagem direta.`);
    } else {
      textoFinal = substituirVariaveis(tmpl.mensagem, variaveis ?? {});
    }
  }

  if (!textoFinal.trim()) {
    return jsonResponse({ success: false, error: "Nenhuma mensagem para enviar (template vazio ou mensagem não fornecida)." }, 400);
  }

  // 3. Enviar via Z-API
  const phoneFormatted = formatPhone(telefone);
  const zapiUrl = `${ZAPI_BASE_URL}/instances/${creds.instance_id}/token/${creds.token}/send-text`;

  console.log("[enviar-whatsapp] 📤 Enviando para Z-API:", {
    url: zapiUrl,
    phoneFormatted,
    messageLength: textoFinal.length,
    messagePreview: textoFinal.substring(0, 50) + "...",
  });

  try {
    const zapiResp = await fetch(zapiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": creds.client_token,
      },
      body: JSON.stringify({
        phone: phoneFormatted,
        message: textoFinal,
      }),
    });

    console.log("[enviar-whatsapp] 📡 Resposta Z-API:", {
      status: zapiResp.status,
      statusText: zapiResp.statusText,
      headers: Object.fromEntries(zapiResp.headers.entries()),
    });

    const zapiData = await zapiResp.json();
    console.log("[enviar-whatsapp] 📦 Dados Z-API:", zapiData);

    if (!zapiResp.ok) {
      console.error("[enviar-whatsapp] ❌ Z-API error:", zapiData);
      // Atualiza status da integração para erro
      await supabase
        .from("integracoes")
        .update({ status: "erro" })
        .eq("icone", "whatsapp")
        .eq("ativo", true);

      return jsonResponse({
        success: false,
        error: zapiData?.message ?? `Z-API retornou status ${zapiResp.status}`,
        zapiStatus: zapiResp.status,
        zapiResponse: zapiData,
      }, 502);
    }

    console.log("[enviar-whatsapp] ✅ Mensagem enviada com sucesso!");
    return jsonResponse({
      success: true,
      zapiMessageId: zapiData?.messageId ?? zapiData?.id ?? null,
    });
  } catch (err) {
    console.error("[enviar-whatsapp] ❌ Network error:", err);
    if (err instanceof Error) {
      console.error("   • Mensagem:", err.message);
      console.error("   • Stack:", err.stack);
    }
    return jsonResponse({ 
      success: false, 
      error: "Erro de conexão com Z-API",
      errorDetails: err instanceof Error ? err.message : String(err),
    }, 502);
  }
});

// ── Response helper ─────────────────────────────────────────────────────────

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

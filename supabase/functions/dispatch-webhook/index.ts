/**
 * Edge Function: dispatch-webhook
 *
 * Recebe um evento + payload, busca os webhooks ativos inscritos
 * nesse evento na tabela `webhooks` e faz HTTP POST para cada URL,
 * assinando o body com HMAC-SHA256 quando secret_hash estiver configurado.
 *
 * Chamado pelos triggers PostgreSQL via pg_net após mudanças em
 * `solicitacoes` e `faturas`.
 *
 * Autenticação: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 * (configurado no trigger via app.service_role_key)
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

// Variáveis injetadas automaticamente pelo runtime Supabase Edge Functions
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ── HMAC-SHA256 ──────────────────────────────────────────────────────────────

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return Array.from(new Uint8Array(sig), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

// ── Tipos ────────────────────────────────────────────────────────────────────

interface WebhookRow {
  id: string;
  url: string;
  secret_hash: string | null;
}

interface RequestBody {
  evento: string;
  payload: Record<string, unknown>;
}

// ── Handler ──────────────────────────────────────────────────────────────────

serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Valida que a requisição vem de um caller interno (trigger via pg_net)
  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: RequestBody;
  try {
    body = await req.json() as RequestBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { evento, payload } = body;
  if (!evento || typeof evento !== "string") {
    return new Response("Missing or invalid 'evento'", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Busca todos os webhooks ativos inscritos nesse evento
  const { data: webhooks, error } = await supabase
    .from("webhooks")
    .select("id, url, secret_hash")
    .eq("status", "ativo")
    .contains("eventos", [evento]);

  if (error) {
    console.error("[dispatch-webhook] Erro ao buscar webhooks:", error.message);
    return new Response("Internal Server Error", { status: 500 });
  }

  if (!webhooks?.length) {
    return new Response(
      JSON.stringify({ evento, dispatched: 0, total: 0 }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  // Body serializado uma só vez — mesmo string para todos os destinos
  const bodyStr = JSON.stringify({
    evento,
    data: payload,
    timestamp: new Date().toISOString(),
  });

  let successCount = 0;

  await Promise.allSettled(
    webhooks.map(async (wh: WebhookRow) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Webhook-Event": evento,
        "X-Webhook-Timestamp": new Date().toISOString(),
        "User-Agent": "LevaETraz-Webhooks/1.0",
      };

      // Assina o body com HMAC-SHA256 se secret_hash configurado
      if (wh.secret_hash) {
        const sig = await hmacSha256Hex(wh.secret_hash, bodyStr);
        headers["X-Webhook-Signature"] = `sha256=${sig}`;
      }

      try {
        const response = await fetch(wh.url, {
          method: "POST",
          headers,
          body: bodyStr,
          signal: AbortSignal.timeout(10_000),
        });

        if (response.ok) {
          successCount++;
          // Limpa erro anterior se o destino voltou a responder
          await supabase
            .from("webhooks")
            .update({ status: "ativo", ultimo_erro: null })
            .eq("id", wh.id);
        } else {
          const text = await response.text().catch(() => "");
          const errMsg = `HTTP ${response.status}: ${text}`.slice(0, 500);
          console.warn(`[dispatch-webhook] Destino ${wh.id} retornou erro: ${errMsg}`);
          await supabase
            .from("webhooks")
            .update({ status: "erro", ultimo_erro: errMsg })
            .eq("id", wh.id);
        }
      } catch (err) {
        const errMsg = (err instanceof Error ? err.message : String(err)).slice(0, 500);
        console.error(`[dispatch-webhook] Exceção ao chamar ${wh.id}: ${errMsg}`);
        await supabase
          .from("webhooks")
          .update({ status: "erro", ultimo_erro: errMsg })
          .eq("id", wh.id);
      }
    }),
  );

  console.info(
    `[dispatch-webhook] evento="${evento}" total=${webhooks.length} sucesso=${successCount}`,
  );

  return new Response(
    JSON.stringify({
      evento,
      dispatched: successCount,
      total: webhooks.length,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});

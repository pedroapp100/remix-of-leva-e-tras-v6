/**
 * Edge Function: create-user
 *
 * Cria um usuário via Admin API do Supabase (usando service_role key).
 * Só pode ser chamada por um usuário com role 'admin' autenticado.
 *
 * Body esperado:
 *   {
 *     email: string,
 *     password: string,
 *     nome: string,
 *     role: 'admin' | 'cliente' | 'entregador',
 *     documento?: string,   // CPF/CNPJ — só dígitos
 *     cargo_id?: string,    // UUID — apenas para admins
 *   }
 */
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-api-version",
};

serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Verificar autenticação do chamador ────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header ausente." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Criar cliente com a chave do chamador para verificar quem é
    const callerClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Token inválido ou expirado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verificar se o chamador é admin
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role, ativo")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || callerProfile.role !== "admin" || callerProfile.ativo === false) {
      return new Response(
        JSON.stringify({ error: "Acesso negado. Apenas administradores podem criar usuários." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 2. Validar o body da requisição ─────────────────────────────────────
    const body = await req.json();
    const { email, password, nome, role, documento, cargo_id } = body;

    if (!email || !password || !nome || !role) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: email, password, nome, role." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const validRoles = ["admin", "cliente", "entregador"];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: `Role inválida. Use: ${validRoles.join(", ")}.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter no mínimo 6 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 3. Criar o usuário via Admin API ────────────────────────────────────
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password.trim(),
      email_confirm: true, // Confirmar email automaticamente (criado por admin)
      user_metadata: {
        nome: nome.trim(),
        role,
        documento: documento || null,
      },
    });

    if (createError) {
      // Traduzir mensagens comuns para português
      let message = createError.message;
      if (message.includes("already been registered") || message.includes("already exists")) {
        message = "Este e-mail já está cadastrado no sistema.";
      }
      return new Response(
        JSON.stringify({ error: message }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 4. Atualizar cargo_id se fornecido (apenas para admins) ─────────────
    if (newUser.user && cargo_id && role === "admin") {
      await adminClient
        .from("profiles")
        .update({ cargo_id })
        .eq("id", newUser.user.id);
    }

    return new Response(
      JSON.stringify({ user: { id: newUser.user?.id, email: newUser.user?.email } }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno inesperado.";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

/**
 * Edge Function: update-user
 *
 * Atualiza senha e/ou dados de perfil de um usuário existente (admin, cliente ou entregador).
 * Se a conta não existir em auth.users (mas existir em profiles), cria-a
 * com o mesmo UUID para manter o vínculo — resolve usuários importados manualmente.
 *
 * Só pode ser chamada por um usuário com role 'admin' autenticado.
 *
 * Body esperado:
 *   {
 *     user_id: string,         // UUID do profile (= auth.users.id)
 *     email: string,           // email do usuário a ser atualizado
 *     password?: string,       // nova senha (mín. 6 chars) — obrigatória se conta não existe
 *     nome: string,
 *     role?: 'admin' | 'cliente' | 'entregador',  // padrão 'admin' — usada só ao criar a conta
 *     cargo_id?: string | null,
 *     ativo: boolean,
 *     documento?: string | null,
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

    const token = authHeader.replace("Bearer ", "");
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Token inválido ou expirado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role, ativo")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || callerProfile.role !== "admin" || callerProfile.ativo === false) {
      return new Response(
        JSON.stringify({ error: "Acesso negado. Apenas administradores podem atualizar usuários." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 2. Validar body ──────────────────────────────────────────────────────
    const body = await req.json();
    const { user_id, email, password, nome, cargo_id, ativo, documento, role } = body;

    if (!user_id || !email || !nome) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: user_id, email, nome." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const validRoles = ["admin", "cliente", "entregador"];
    const targetRole = role ?? "admin";
    if (!validRoles.includes(targetRole)) {
      return new Response(
        JSON.stringify({ error: `Role inválida. Use: ${validRoles.join(", ")}.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const trimmedPassword = password ? String(password).trim() : "";

    if (trimmedPassword && trimmedPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter no mínimo 6 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 3. Verificar se conta existe em auth.users ───────────────────────────
    const { data: existingAuth, error: lookupError } = await adminClient.auth.admin.getUserById(user_id);
    const authUserExists = !lookupError && existingAuth?.user?.id === user_id;

    if (!authUserExists) {
      // Conta não existe — precisa de senha para criar
      if (!trimmedPassword) {
        return new Response(
          JSON.stringify({ error: "Este usuário não possui conta de acesso. Defina uma senha para criá-la." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Criar conta auth com o mesmo UUID do profile para manter o vínculo
      const { error: createError } = await adminClient.auth.admin.createUser({
        id: user_id,
        email: String(email).trim().toLowerCase(),
        password: trimmedPassword,
        email_confirm: true,
        user_metadata: { nome: String(nome).trim(), role: targetRole },
      });

      if (createError) {
        let message = createError.message;
        if (message.includes("already been registered") || message.includes("already exists")) {
          message = "Este e-mail já está cadastrado no sistema.";
        }
        return new Response(
          JSON.stringify({ error: message }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else if (trimmedPassword) {
      // Conta existe — atualizar senha
      const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(user_id, {
        password: trimmedPassword,
      });

      if (updateAuthError) {
        return new Response(
          JSON.stringify({ error: "Não foi possível atualizar a senha. Tente novamente." }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // ── 4. Atualizar dados do profile ────────────────────────────────────────
    const profilePatch: Record<string, unknown> = {
      nome: String(nome).trim(),
      ativo: Boolean(ativo),
      cargo_id: cargo_id || null,
      documento: documento || null,
    };

    const { error: profileError } = await adminClient
      .from("profiles")
      .update(profilePatch)
      .eq("id", user_id);

    if (profileError) {
      return new Response(
        JSON.stringify({ error: "Senha atualizada, mas erro ao salvar dados do perfil: " + profileError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno inesperado.";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

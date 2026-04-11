import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || supabaseUrl.includes("SEU_PROJECT_REF")) {
  console.warn(
    "[Supabase] VITE_SUPABASE_URL não configurado. " +
    "Preencha .env.local com os dados do seu projeto Supabase."
  );
}

if (!supabaseAnonKey || supabaseAnonKey.includes("SEU_ANON_KEY")) {
  console.warn(
    "[Supabase] VITE_SUPABASE_ANON_KEY não configurado. " +
    "Preencha .env.local com os dados do seu projeto Supabase."
  );
}

/**
 * ⚠️ CRITICAL: Custom fetch wrapper com timeout
 *
 * NÃO aplica timeout em endpoints de auth — o Supabase SDK já gerencia internamente
 * o token refresh e requer tempo variável. Aplicar timeout fixo aqui causa o erro
 * "getSession nunca completou" quando o token precisa ser renovado.
 *
 * Para outros endpoints (REST, realtime), aplica timeout de 20s como fallback.
 */
const fetchWithTimeout: typeof fetch = (input, init) => {
  // Detecta se é uma rota de auth — não aplica timeout nelas
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
  const isAuthRequest = url.includes("/auth/v1/");

  if (isAuthRequest) {
    // Deixa o Supabase SDK gerenciar o tempo de auth sem interferência
    return fetch(input, init);
  }

  // Para outros requests, aplica timeout de 20s
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  }, 20000);

  // Se há signal externo (do Supabase SDK), respeita também
  if (init?.signal && !init.signal.aborted) {
    init.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId);
  });
};

/**
 * Cliente Supabase tipado com o schema completo do Leva e Traz.
 * Exportado como singleton — use sempre este cliente, nunca crie um novo.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "lt-auth-session",
  },
  global: {
    fetch: fetchWithTimeout,
    headers: {
      "x-application-name": "leva-e-traz",
      "Accept": "application/json",
    },
  },
});

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
 * ⚠️ CRITICAL: Custom fetch wrapper com timeout para TODAS as chamadas.
 *
 * HISTÓRICO DO BUG RECORRENTE (Fix #1 → #4 → #8 → #9):
 * - O bypass total de auth (`if isAuthRequest return fetch()`) causava hang infinito
 *   quando o token refresh travava (rede lenta, rate limit, token corrupto).
 * - Workarounds no AuthContext (Promise.race, safety timers) só mascaravam o sintoma.
 *
 * SOLUÇÃO DEFINITIVA: Timeout no fetch layer para TODOS os endpoints:
 *   - Auth (/auth/v1/): 10s — suficiente para refresh normal (~200ms), impede hang
 *   - Outros (REST, realtime): 20s — operações maiores como queries pesadas
 *
 * ⛔ NÃO remova o timeout de auth novamente. Isso causa o bug "getSession nunca completou".
 */
const AUTH_TIMEOUT_MS = 10_000;
const DEFAULT_TIMEOUT_MS = 20_000;

const fetchWithTimeout: typeof fetch = (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
  const isAuthRequest = url.includes("/auth/v1/");
  const timeoutMs = isAuthRequest ? AUTH_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  }, timeoutMs);

  // Respeita signal externo (do Supabase SDK) se presente
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

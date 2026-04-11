/**
 * services/whatsapp.ts
 * Service para envio de mensagens WhatsApp via Edge Function + Z-API.
 */
import { supabase } from "@/lib/supabase";

interface SendWhatsAppParams {
  /** Telefone do destinatário (ex: "62981369750") */
  telefone: string;
  /** Mensagem direta (usada se não houver evento/template) */
  mensagem?: string;
  /** Nome do evento para buscar template (ex: "entrega_concluida") */
  evento?: string;
  /** Variáveis para substituição no template */
  variaveis?: Record<string, string>;
}

interface SendWhatsAppResult {
  success: boolean;
  zapiMessageId?: string;
  error?: string;
}

/**
 * Envia mensagem WhatsApp via Edge Function `enviar-whatsapp`.
 * A Edge Function busca as credenciais da Z-API na tabela `integracoes`
 * e o template na `notification_templates` (se evento for fornecido).
 */
export async function enviarWhatsApp(params: SendWhatsAppParams): Promise<SendWhatsAppResult> {
  try {
    const { data, error } = await supabase.functions.invoke("enviar-whatsapp", {
      body: params,
    });

    if (error) {
      console.error("[WhatsApp] Edge function error:", error);
      return { success: false, error: error.message };
    }

    return data as SendWhatsAppResult;
  } catch (err) {
    console.error("[WhatsApp] Unexpected error:", err);
    return { success: false, error: "Erro ao enviar mensagem WhatsApp" };
  }
}

/**
 * Envia notificação WhatsApp de entrega concluída.
 */
export function notificarEntregaConcluida(
  telefoneCliente: string,
  variaveis: { cliente_nome: string; codigo: string; entregador_nome?: string }
) {
  return enviarWhatsApp({
    telefone: telefoneCliente,
    evento: "entrega_concluida",
    variaveis,
  });
}

/**
 * Envia notificação WhatsApp de nova fatura gerada.
 */
export function notificarFaturaGerada(
  telefoneCliente: string,
  variaveis: { cliente_nome: string; fatura_numero: string; valor?: string }
) {
  return enviarWhatsApp({
    telefone: telefoneCliente,
    evento: "fatura_gerada",
    variaveis,
  });
}

/**
 * Envia notificação WhatsApp de fatura fechada automaticamente.
 */
export function notificarFaturaFechada(
  telefoneCliente: string,
  variaveis: { cliente_nome: string; fatura_numero: string; total_entregas: string }
) {
  return enviarWhatsApp({
    telefone: telefoneCliente,
    evento: "fatura_fechada",
    variaveis,
  });
}

/**
 * Envia notificação WhatsApp de saldo baixo (pré-pago).
 */
export function notificarSaldoBaixo(
  telefoneCliente: string,
  variaveis: { cliente_nome: string; saldo: string; limite: string }
) {
  return enviarWhatsApp({
    telefone: telefoneCliente,
    evento: "saldo_baixo",
    variaveis,
  });
}

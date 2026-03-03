import type { SupabaseClient } from "@supabase/supabase-js";

import { EDUCATIONAL_DISCLAIMER } from "@/lib/sat/constants";
import { generateStructuredAnswer } from "@/lib/sat/answer";
import { formatStructuredAnswer } from "@/lib/sat/format";
import { retrieveRelevantChunks } from "@/lib/sat/rag";
import { routeSatQuestion } from "@/lib/sat/router";
import { guardAnswerText } from "@/lib/sat/safety";
import {
  ensureSession,
  ensureUser,
  saveMessage,
  updateSessionTopic,
} from "@/lib/sat/store";
import { checkAndIncrementDailyMessages } from "@/lib/sat/usage";
import type { ChatInput, ChatResult, StructuredAnswer } from "@/lib/sat/types";

function usageLimitAnswer(): StructuredAnswer {
  return {
    summary:
      "Llegaste al límite diario gratuito de 5 mensajes. Intenta mañana para continuar.",
    steps: [
      "Revisa tus dudas prioritarias para aprovechar mejor el siguiente bloque diario.",
      "Si tu caso incluye requerimientos o multas, consulta a un profesional fiscal.",
    ],
    confidence: "Alta",
    sources: [],
    disclaimer: EDUCATIONAL_DISCLAIMER,
  };
}

export async function handleSatChat(
  supabase: SupabaseClient,
  input: ChatInput,
): Promise<ChatResult> {
  const userId = await ensureUser(supabase, input.userId);
  const sessionId = await ensureSession(
    supabase,
    userId,
    input.channel,
    input.sessionId,
  );

  const usage = await checkAndIncrementDailyMessages(supabase, userId);
  if (!usage.allowed) {
    const structured = usageLimitAnswer();
    const text = formatStructuredAnswer(structured);

    await saveMessage(supabase, sessionId, "assistant", text, {
      limited: true,
      usage,
    });

    return {
      userId,
      sessionId,
      topic: "OTRO",
      structured,
      text,
      limited: true,
    };
  }

  await saveMessage(supabase, sessionId, "user", input.message);

  const router = await routeSatQuestion(input.message);
  const ragQuery = [...router.ragQueries, input.message].join(" ");
  const chunks = await retrieveRelevantChunks(supabase, ragQuery, router.topic, 5);
  const structured = await generateStructuredAnswer(input.message, chunks, router);
  const text = await guardAnswerText(formatStructuredAnswer(structured));

  await saveMessage(supabase, sessionId, "assistant", text, {
    topic: router.topic,
    confidence: structured.confidence,
    sources: structured.sources,
  });

  await updateSessionTopic(supabase, sessionId, router.topic);

  return {
    userId,
    sessionId,
    topic: router.topic,
    structured,
    text,
  };
}

export function buildTemplateResponse(caseSummary: string, templateType: string) {
  const checklist = [
    "Define el hecho concreto (qué pasó y cuándo).",
    "Adjunta evidencia: CFDI, acuses, estados de cuenta, capturas del buzón.",
    "Verifica fechas límite y folios de referencia.",
    "Redacta una solicitud breve y objetiva.",
  ];

  const lowerType = templateType.toLowerCase();
  const header =
    lowerType === "aclaracion"
      ? "Solicitud de aclaración"
      : lowerType === "seguimiento"
        ? "Mensaje de seguimiento"
        : "Plantilla sugerida";

  const shortMessages = [
    `${header}: Hola, presento esta solicitud sobre ${caseSummary}.`,
    "Adjunto evidencia y quedo atento(a) a cualquier requerimiento adicional.",
    "Gracias por confirmar recepción y folio de seguimiento.",
  ];

  return {
    checklist,
    short_messages: shortMessages,
    disclaimer: EDUCATIONAL_DISCLAIMER,
  };
}

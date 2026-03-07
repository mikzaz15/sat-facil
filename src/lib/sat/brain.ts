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
import type {
  ChatInput,
  ChatResult,
  RetrievedChunk,
  SatTopic,
  StructuredAnswer,
} from "@/lib/sat/types";

type ChunkIndexRow = {
  id: string;
  chunk_index: number | null;
};

function missingChunkIndexColumn(message: string): boolean {
  return /column/i.test(message) && /chunk_index/i.test(message) && /does not exist/i.test(message);
}

async function loadChunkIndexById(
  supabase: SupabaseClient,
  chunkIds: string[],
): Promise<Map<string, number | null>> {
  if (chunkIds.length === 0) return new Map();

  const { data, error } = await supabase.from("kb_chunks").select("id,chunk_index").in("id", chunkIds);
  if (error) {
    if (missingChunkIndexColumn(error.message)) {
      return new Map();
    }
    console.warn(`[SAT][RAG] Failed to load chunk_index diagnostics: ${error.message}`);
    return new Map();
  }

  const indexById = new Map<string, number | null>();
  for (const row of (data ?? []) as ChunkIndexRow[]) {
    indexById.set(row.id, row.chunk_index);
  }
  return indexById;
}

async function logRetrievalDiagnostics(
  supabase: SupabaseClient,
  context: {
    sessionId: string;
    topic: SatTopic;
    query: string;
    chunks: RetrievedChunk[];
  },
): Promise<void> {
  const chunkIds = context.chunks.map((chunk) => chunk.id);
  const indexById = await loadChunkIndexById(supabase, chunkIds);

  const diagnostics = context.chunks.map((chunk, idx) => ({
    rank: idx + 1,
    score: Number.isFinite(chunk.similarity)
      ? Number(chunk.similarity.toFixed(4))
      : null,
    sourceTitle: chunk.title || "(sin titulo)",
    chunkIndex: indexById.get(chunk.id) ?? null,
    reasons: chunk.retrieval_reasons ?? [],
  }));

  console.info(
    `[SAT][RAG] session=${context.sessionId} topic=${context.topic} retrieved=${context.chunks.length} query="${context.query}" results=${JSON.stringify(diagnostics)}`,
  );
}

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
  await logRetrievalDiagnostics(supabase, {
    sessionId,
    topic: router.topic,
    query: ragQuery,
    chunks,
  });
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

import { CONFIDENCE_THRESHOLDS, EDUCATIONAL_DISCLAIMER } from "@/lib/sat/constants";
import { ANSWER_PROMPT, SYSTEM_PROMPT } from "@/lib/sat/prompts";
import { hasOpenAIConfig, runChatJson } from "@/lib/sat/openai";
import { extractCitations } from "@/lib/sat/rag";
import { applySafetyToStructuredAnswer } from "@/lib/sat/safety";
import type {
  ConfidenceLevel,
  RetrievedChunk,
  RouterResult,
  StructuredAnswer,
} from "@/lib/sat/types";

function getConfidence(chunks: RetrievedChunk[]): ConfidenceLevel {
  if (chunks.length === 0) {
    return "Baja";
  }

  const topSimilarity = chunks[0]?.similarity ?? 0;
  if (topSimilarity >= CONFIDENCE_THRESHOLDS.high) {
    return "Alta";
  }

  if (topSimilarity >= CONFIDENCE_THRESHOLDS.medium) {
    return "Media";
  }

  return "Baja";
}

function hasEnoughSupport(chunks: RetrievedChunk[]): boolean {
  if (chunks.length === 0) {
    return false;
  }

  return (chunks[0]?.similarity ?? 0) >= 0.72;
}

function fallbackAnswer(
  message: string,
  chunks: RetrievedChunk[],
  router: RouterResult,
): StructuredAnswer {
  const citations = extractCitations(chunks);

  if (!hasEnoughSupport(chunks)) {
    return {
      summary:
        "No tengo suficiente soporte documental SAT/gob.mx en la base de conocimiento para darte una respuesta confiable todavía.",
      steps: [
        "Comparte más detalle del trámite (régimen, tipo de operación o pantalla donde te atoras).",
        "Con ese detalle puedo buscar en la base y darte pasos concretos con fuente oficial.",
      ],
      confidence: "Baja",
      sources: citations,
      clarifyingQuestions: router.questions.slice(0, 2),
      disclaimer: EDUCATIONAL_DISCLAIMER,
    };
  }

  const firstChunk = chunks[0]?.chunk_text ?? "";

  return {
    summary: firstChunk.slice(0, 260),
    steps: [
      "Valida tus datos fiscales antes de enviar o timbrar documentos.",
      "Sigue los requisitos oficiales del SAT indicados en las fuentes.",
      "Guarda evidencia documental para declaraciones y aclaraciones.",
    ],
    confidence: getConfidence(chunks),
    sources: citations,
    disclaimer: EDUCATIONAL_DISCLAIMER,
    clarifyingQuestions: router.needMoreInfo ? router.questions.slice(0, 2) : [],
  };
}

function normalizeAnswer(
  model: Partial<StructuredAnswer>,
  chunks: RetrievedChunk[],
): StructuredAnswer {
  const sources = model.sources?.length ? model.sources : extractCitations(chunks);

  const confidence: ConfidenceLevel =
    model.confidence === "Alta" ||
    model.confidence === "Media" ||
    model.confidence === "Baja"
      ? model.confidence
      : getConfidence(chunks);

  return {
    summary: model.summary ?? "Respuesta educativa basada en fuentes SAT disponibles.",
    steps:
      model.steps?.filter(Boolean).slice(0, 6) ?? [
        "Revisa requisitos oficiales del SAT y valida tu caso específico.",
      ],
    confidence,
    sources,
    clarifyingQuestions: model.clarifyingQuestions?.slice(0, 2) ?? [],
    disclaimer: EDUCATIONAL_DISCLAIMER,
  };
}

export async function generateStructuredAnswer(
  message: string,
  chunks: RetrievedChunk[],
  router: RouterResult,
): Promise<StructuredAnswer> {
  if (!hasOpenAIConfig()) {
    return applySafetyToStructuredAnswer(fallbackAnswer(message, chunks, router), message);
  }

  if (!hasEnoughSupport(chunks)) {
    return applySafetyToStructuredAnswer(fallbackAnswer(message, chunks, router), message);
  }

  try {
    const modelResult = await runChatJson<Partial<StructuredAnswer>>([
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n${ANSWER_PROMPT}\nDevuelve JSON con keys: summary, steps, confidence, clarifyingQuestions.`,
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            userQuestion: message,
            retrievedEvidence: chunks.map((chunk) => ({
              title: chunk.title,
              url: chunk.url,
              text: chunk.chunk_text,
              similarity: chunk.similarity,
            })),
            router,
          },
          null,
          2,
        ),
      },
    ]);

    const normalized = normalizeAnswer(modelResult, chunks);
    return applySafetyToStructuredAnswer(normalized, message);
  } catch {
    return applySafetyToStructuredAnswer(fallbackAnswer(message, chunks, router), message);
  }
}

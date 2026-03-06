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
  if (chunks.length === 0) return "Baja";

  const topSimilarity = chunks[0]?.similarity ?? 0;

  // If similarity is missing (text fallback), use a conservative "Media"
  // (you can switch to "Baja" if you prefer stricter UX).
  if (typeof topSimilarity !== "number") return "Media";

  if (topSimilarity >= CONFIDENCE_THRESHOLDS.high) return "Alta";
  if (topSimilarity >= CONFIDENCE_THRESHOLDS.medium) return "Media";
  return "Baja";
}

/**
 * Whether we should let the model answer normally.
 * We keep this helper, but we won't hard-block on it anymore.
 * (We only hard-block when there are 0 chunks.)
 */
function hasEnoughSupport(chunks: RetrievedChunk[]): boolean {
  if (chunks.length === 0) return false;

  const top = chunks[0]?.similarity;

  // If we have real similarity numbers, apply thresholds.
  if (typeof top === "number") {
    if (chunks.length >= 3) return top >= 0.60;
    return top >= 0.68;
  }

  // Text fallback path: accept if we have some evidence.
  return chunks.length >= 2;
}

function fallbackAnswer(
  message: string,
  chunks: RetrievedChunk[],
  router: RouterResult,
): StructuredAnswer {
  const citations = extractCitations(chunks);

  // ✅ Only "I don't have support" when we truly have zero KB evidence.
  if (chunks.length === 0) {
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

  // ✅ If we have chunks but support is weak, still provide a helpful answer
  // grounded in the top chunk + citations, but mark confidence accordingly.
  const firstChunk = chunks[0]?.chunk_text ?? "";
  const weakSupport = !hasEnoughSupport(chunks);

  return {
    summary: firstChunk.slice(0, 260),
    steps: [
      "Revisa los requisitos y pasos en las fuentes oficiales enlazadas.",
      "Asegúrate de contar con RFC activo y e.firma/contraseña según el trámite.",
      "Verifica el régimen fiscal y el tipo de comprobante que corresponde a tu caso.",
      "Si te atoras en un paso específico, dime en qué pantalla/validación falló para guiarte con precisión.",
    ].slice(0, 6),
    confidence: weakSupport ? "Baja" : getConfidence(chunks),
    sources: citations,
    clarifyingQuestions: router.needMoreInfo ? router.questions.slice(0, 2) : [],
    disclaimer: EDUCATIONAL_DISCLAIMER,
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
  // No model available → fallback (still useful if chunks exist)
  if (!hasOpenAIConfig()) {
    return applySafetyToStructuredAnswer(fallbackAnswer(message, chunks, router), message);
  }

  // ✅ Key change: only hard-block if we retrieved ZERO chunks.
  if (chunks.length === 0) {
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
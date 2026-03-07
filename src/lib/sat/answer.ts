import { CONFIDENCE_THRESHOLDS, EDUCATIONAL_DISCLAIMER } from "@/lib/sat/constants";
import { ANSWER_PROMPT, SYSTEM_PROMPT } from "@/lib/sat/prompts";
import { hasOpenAIConfig, runChatJson } from "@/lib/sat/openai";
import { extractCitations } from "@/lib/sat/rag";
import { buildSatRuleGuidance, type SatRuleGuidance } from "@/lib/sat/rules";
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

function reduceConfidence(level: ConfidenceLevel): ConfidenceLevel {
  if (level === "Alta") return "Media";
  if (level === "Media") return "Baja";
  return "Baja";
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function hasToken(tokens: Set<string>, token: string): boolean {
  return tokens.has(token);
}

function sourceMetadataText(chunk: RetrievedChunk): string {
  return normalizeForMatch(
    `${chunk.title} ${chunk.url} ${(chunk.tags ?? []).join(" ")}`,
  );
}

const GENERAL_CFDI_SOURCE_HINTS = [
  "anexo 20",
  "anexo20",
  "cfdi 4.0",
  "cfdi40",
  "guia de llenado",
  "guia_llenado",
  "catalogos cfdi",
  "catalogos_cfdi",
  "preguntas frecuentes cfdi",
  "cfdi faq",
];

const PAYMENT_SOURCE_HINTS = [
  "complemento de pagos",
  "complemento pagos",
  "complemento_pagos",
  "recepcion de pagos",
  "pagos 2.0",
  "pago 2.0",
];

const BUZON_SOURCE_HINTS = ["buzon", "buzon_tributario", "requerimiento", "notificacion"];

function isGeneralCfdiSource(chunk: RetrievedChunk): boolean {
  const text = sourceMetadataText(chunk);
  return includesAny(text, GENERAL_CFDI_SOURCE_HINTS);
}

function hasPaymentSpecificSource(chunks: RetrievedChunk[]): boolean {
  return chunks.some((chunk) =>
    includesAny(sourceMetadataText(chunk), PAYMENT_SOURCE_HINTS),
  );
}

function isBuzonSource(chunk: RetrievedChunk): boolean {
  return includesAny(sourceMetadataText(chunk), BUZON_SOURCE_HINTS);
}

function hasTopicSpecificSource(chunks: RetrievedChunk[], router: RouterResult): boolean {
  const topicHints: Record<RouterResult["topic"], string[]> = {
    FACTURACION_CFDI: [],
    PAGOS_COMPLEMENTO: [
      "complemento de pagos",
      "recepcion de pagos",
      "recibo de pago",
      "ppd",
      "pue",
      "parcialidad",
      "saldo insoluto",
    ],
    RFC_EFIRMA: ["rfc", "efirma", "e.firma", "firma electronica"],
    RESICO: ["resico"],
    DECLARACIONES_DEVOLUCION: ["devolucion", "declaracion", "saldo a favor"],
    BUZON_REQUERIMIENTOS: ["buzon", "requerimiento", "notificacion"],
    OTRO: [],
  };

  const hints = topicHints[router.topic];
  if (hints.length === 0) return false;
  return chunks.some((chunk) => includesAny(sourceMetadataText(chunk), hints));
}

function isPaymentComplementQuestion(message: string): boolean {
  const normalized = normalizeForMatch(message);
  const tokens = new Set(normalized.split(/\s+/).filter(Boolean));
  return (
    includesAny(normalized, [
      "complemento de pagos",
      "recepcion de pagos",
      "pagos 2.0",
      "pago 2.0",
      "parcialidad",
      "pago diferido",
      "saldo insoluto",
    ]) ||
    hasToken(tokens, "ppd") ||
    hasToken(tokens, "pue")
  );
}

function buildQuestionKeywords(message: string): string[] {
  const stop = new Set([
    "que",
    "qué",
    "como",
    "cómo",
    "para",
    "con",
    "sin",
    "una",
    "uno",
    "unos",
    "unas",
    "del",
    "de",
    "la",
    "el",
    "los",
    "las",
    "y",
    "o",
    "en",
    "por",
    "cual",
    "cuál",
    "donde",
    "dónde",
    "cuando",
    "cuándo",
    "es",
    "son",
    "como",
    "metodo",
    "pago",
    "forma",
  ]);

  return normalizeForMatch(message)
    .replace(/[._-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4 && !stop.has(w))
    .slice(0, 8);
}

function keywordCoverageRatio(message: string, chunks: RetrievedChunk[]): number {
  const keywords = buildQuestionKeywords(message);
  if (keywords.length === 0 || chunks.length === 0) return 1;

  const combined = normalizeForMatch(
    chunks
      .slice(0, 3)
      .map((chunk) => `${chunk.title} ${chunk.chunk_text.slice(0, 900)}`)
      .join(" "),
  );

  const matched = keywords.filter((keyword) => combined.includes(keyword)).length;
  return matched / keywords.length;
}

function compactText(value: string): string {
  return value
    .replace(/\r/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function truncate(value: string, max = 280): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function safeText(value: unknown, max = 360): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = compactText(value);
  if (!text) return undefined;
  return truncate(text, max);
}

function safeStringList(value: unknown, maxItems = 4): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const text = truncate(compactText(item), 180);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    items.push(text);
    if (items.length >= maxItems) break;
  }
  return items;
}

function mergeUniqueList(values: string[], maxItems = 6): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const value of values) {
    const normalized = normalizeForMatch(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    merged.push(value);
    if (merged.length >= maxItems) break;
  }

  return merged;
}

function mergeGuidanceSteps(
  guidance: SatRuleGuidance | null,
  primary: string[],
  fallback: string[],
): string[] {
  return mergeUniqueList(
    [
      ...(primary ?? []),
      ...(guidance?.actions ?? []),
      ...(fallback ?? []),
    ].map((item) => truncate(compactText(item), 180)),
    6,
  );
}

function mergeGuidanceErrors(
  guidance: SatRuleGuidance | null,
  primary: string[],
  evidence: string[],
): string[] {
  return mergeUniqueList(
    [
      ...(primary ?? []),
      ...(guidance?.commonErrors ?? []),
      ...(evidence ?? []),
    ].map((item) => truncate(compactText(item), 180)),
    4,
  );
}

function extractSatRuleFromEvidence(chunks: RetrievedChunk[]): string | undefined {
  for (const chunk of chunks.slice(0, 3)) {
    const cleaned = compactText(chunk.chunk_text.replace(/^Seccion:\s*/i, ""));
    if (cleaned.length >= 60) {
      return truncate(cleaned, 300);
    }
  }
  return undefined;
}

function extractExampleFromEvidence(chunks: RetrievedChunk[]): string | undefined {
  for (const chunk of chunks.slice(0, 4)) {
    const cleaned = compactText(chunk.chunk_text);
    if (!/ejemplo|caso practico|caso práctico/i.test(cleaned)) continue;
    return truncate(cleaned, 260);
  }
  return undefined;
}

function extractCommonErrorsFromEvidence(chunks: RetrievedChunk[]): string[] {
  const candidates = chunks
    .slice(0, 4)
    .flatMap((chunk) => chunk.chunk_text.split("\n"))
    .map((line) =>
      truncate(compactText(line.replace(/^[-*]\s*/, "").replace(/^\d+[.)]\s*/, "")), 180),
    )
    .filter(
      (line) =>
        line.length >= 20 &&
        /error|errores|rechazo|inconsisten|validacion|validación|sustitucion|sustitución/i.test(line),
    );

  return safeStringList(candidates, 3);
}

function adjustConfidenceByEvidence(
  base: ConfidenceLevel,
  message: string,
  chunks: RetrievedChunk[],
  router: RouterResult,
): ConfidenceLevel {
  if (chunks.length === 0) return "Baja";

  const topChunks = chunks.slice(0, 3);
  const onlyGeneralSources =
    topChunks.length > 0 && topChunks.every((chunk) => isGeneralCfdiSource(chunk));
  const hasSpecificForTopic = hasTopicSpecificSource(topChunks, router);
  const coverage = keywordCoverageRatio(message, topChunks);
  const looseEvidence = coverage < 0.25;
  let adjusted = base;

  if (
    onlyGeneralSources &&
    !hasSpecificForTopic &&
    router.topic !== "FACTURACION_CFDI"
  ) {
    adjusted = reduceConfidence(adjusted);
  }

  if (onlyGeneralSources && router.topic === "FACTURACION_CFDI") {
    adjusted = reduceConfidence(adjusted);
  }

  if (looseEvidence) {
    adjusted = reduceConfidence(adjusted);
  }

  const isPaymentQuestion = isPaymentComplementQuestion(message);
  const hasPaymentSpecific = hasPaymentSpecificSource(topChunks);
  if (isPaymentQuestion && !hasPaymentSpecific) {
    // Payment-complement questions should rely on payment-specific evidence before "Alta".
    adjusted = adjusted === "Alta" ? "Media" : reduceConfidence(adjusted);
  }

  if (isPaymentQuestion && topChunks.some((chunk) => isBuzonSource(chunk))) {
    adjusted = reduceConfidence(adjusted);
  }

  return adjusted;
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
  const ruleGuidance = buildSatRuleGuidance(message, router);
  const citations = extractCitations(chunks);

  // ✅ Only "I don't have support" when we truly have zero KB evidence.
  if (chunks.length === 0) {
    return {
      summary:
        "No tengo suficiente soporte documental SAT/gob.mx en la base de conocimiento para darte una respuesta confiable todavía.",
      satRule: ruleGuidance ? truncate(ruleGuidance.satRule, 300) : undefined,
      steps: mergeGuidanceSteps(
        ruleGuidance,
        [],
        [
          "Comparte más detalle del trámite (régimen, tipo de operación o pantalla donde te atoras).",
          "Con ese detalle puedo buscar en la base y darte pasos concretos con fuente oficial.",
        ],
      ),
      practicalExample: ruleGuidance?.practicalExample,
      commonErrors: ruleGuidance?.commonErrors?.slice(0, 3),
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
  const satRule =
    (ruleGuidance ? truncate(ruleGuidance.satRule, 320) : undefined) ??
    extractSatRuleFromEvidence(chunks);
  const practicalExample =
    (ruleGuidance ? truncate(ruleGuidance.practicalExample, 280) : undefined) ??
    extractExampleFromEvidence(chunks);
  const commonErrors = mergeGuidanceErrors(
    ruleGuidance,
    [],
    extractCommonErrorsFromEvidence(chunks),
  );

  return {
    summary: truncate(
      compactText(ruleGuidance?.summary ?? firstChunk),
      260,
    ),
    satRule,
    steps: mergeGuidanceSteps(
      ruleGuidance,
      [],
      [
        "Revisa los requisitos y pasos en las fuentes oficiales enlazadas.",
        "Asegúrate de contar con RFC activo y e.firma/contraseña según el trámite.",
        "Verifica el régimen fiscal y el tipo de comprobante que corresponde a tu caso.",
        "Si te atoras en un paso específico, dime en qué pantalla/validación falló para guiarte con precisión.",
      ],
    ),
    practicalExample,
    commonErrors,
    confidence: weakSupport
      ? "Baja"
      : adjustConfidenceByEvidence(getConfidence(chunks), message, chunks, router),
    sources: citations,
    clarifyingQuestions: router.needMoreInfo ? router.questions.slice(0, 2) : [],
    disclaimer: EDUCATIONAL_DISCLAIMER,
  };
}

function normalizeAnswer(
  model: Partial<StructuredAnswer>,
  message: string,
  chunks: RetrievedChunk[],
  router: RouterResult,
): StructuredAnswer {
  const ruleGuidance = buildSatRuleGuidance(message, router);
  const sources = model.sources?.length ? model.sources : extractCitations(chunks);

  const baseConfidence: ConfidenceLevel =
    model.confidence === "Alta" ||
    model.confidence === "Media" ||
    model.confidence === "Baja"
      ? model.confidence
      : getConfidence(chunks);

  const confidence = adjustConfidenceByEvidence(
    baseConfidence,
    message,
    chunks,
    router,
  );

  const satRule =
    safeText(model.satRule, 320) ??
    (ruleGuidance ? truncate(ruleGuidance.satRule, 320) : undefined) ??
    extractSatRuleFromEvidence(chunks);
  const practicalExample =
    safeText(model.practicalExample, 280) ??
    (ruleGuidance ? truncate(ruleGuidance.practicalExample, 280) : undefined) ??
    extractExampleFromEvidence(chunks);
  const commonErrors = safeStringList(model.commonErrors, 4);
  const evidenceErrors = mergeGuidanceErrors(
    ruleGuidance,
    commonErrors,
    extractCommonErrorsFromEvidence(chunks),
  );
  const modelSteps = model.steps?.filter(Boolean).slice(0, 6) ?? [];
  const steps = mergeGuidanceSteps(
    ruleGuidance,
    modelSteps,
    ["Revisa requisitos oficiales del SAT y valida tu caso específico."],
  );

  return {
    summary:
      safeText(model.summary, 280) ??
      (ruleGuidance ? truncate(ruleGuidance.summary, 280) : undefined) ??
      "Respuesta educativa basada en fuentes SAT disponibles.",
    satRule,
    steps,
    practicalExample,
    commonErrors: evidenceErrors,
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

  const ruleGuidance = buildSatRuleGuidance(message, router);

  try {
    const modelResult = await runChatJson<Partial<StructuredAnswer>>([
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n${ANSWER_PROMPT}\nDevuelve JSON con keys: summary, satRule, steps, practicalExample, commonErrors, confidence, clarifyingQuestions.`,
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
            ruleEngineGuidance: ruleGuidance,
            router,
          },
          null,
          2,
        ),
      },
    ]);

    const normalized = normalizeAnswer(modelResult, message, chunks, router);
    return applySafetyToStructuredAnswer(normalized, message);
  } catch {
    return applySafetyToStructuredAnswer(fallbackAnswer(message, chunks, router), message);
  }
}

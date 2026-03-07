import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createEmbedding,
  hasOpenAIConfig,
  toVectorLiteral,
} from "@/lib/sat/openai";
import type { RetrievedChunk, SatTopic, SourceCitation } from "@/lib/sat/types";

type RpcChunkRow = {
  id: string;
  source_id: string;
  chunk_text: string;
  tags: string[] | null;
  similarity: number | null;
  url: string | null;
  title: string | null;
  publisher: string | null;
};

type SourceRow = {
  url: string | null;
  title: string | null;
  publisher: string | null;
};

type FallbackChunkRow = {
  id: string;
  source_id: string;
  chunk_text: string;
  tags: string[] | null;
  kb_sources: SourceRow | SourceRow[] | null;
};

type RetrievalIntent = {
  keywords: string[];
  isPaymentRelated: boolean;
  isPaymentMethodQuestion: boolean;
  isComplementQuestion: boolean;
};

type RankedCandidate = {
  chunk: RetrievedChunk;
  baseScore: number;
  vectorScore: number;
  ftsScore: number;
};

type RankedSelection = {
  chunk: RetrievedChunk;
  baseScore: number;
  finalScore: number;
  vectorScore: number;
  ftsScore: number;
  reasons: string[];
};

const MAX_CHUNKS_PER_SOURCE = 2;

const PAYMENT_QUERY_HINTS = [
  "metodo de pago",
  "metodo pago",
  "forma de pago",
  "forma pago",
  "complemento de pagos",
  "complemento pagos",
  "recepcion de pagos",
  "pago diferido",
  "parcialidad",
  "saldo insoluto",
  "doctorelacionado",
  "metododepagodr",
];

const COMPLEMENT_QUERY_HINTS = [
  "complemento de pagos",
  "complemento pagos",
  "recepcion de pagos",
  "pago 2.0",
  "pagos 2.0",
  "doctorelacionado",
  "numparcialidad",
  "impsaldoant",
  "imppagado",
  "impsaldoinsoluto",
];

const PAYMENT_SOURCE_HINTS = [
  "complemento pagos",
  "complemento_pagos",
  "complemento de pagos",
  "recepcion de pagos",
  "pagos 2.0",
  "pago 2.0",
];

const BUZON_SOURCE_HINTS = ["buzon", "buzon_tributario", "requerimiento", "notificacion"];

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

function topicTags(topic: SatTopic): string[] {
  switch (topic) {
    case "FACTURACION_CFDI":
      return ["cfdi", "facturacion", "anexo20"];
    case "PAGOS_COMPLEMENTO":
      return ["pagos", "complemento", "ppd", "pue", "facturacion"];
    case "RFC_EFIRMA":
      return ["cfdi", "facturacion"];
    case "RESICO":
      return ["resico", "regimen"];
    case "DECLARACIONES_DEVOLUCION":
      return ["devolucion", "deducciones", "cfdi"];
    case "BUZON_REQUERIMIENTOS":
      return ["buzon", "requerimientos", "notificaciones"];
    default:
      return [];
  }
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s._-]/gu, " ");
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function queryHasToken(tokens: Set<string>, token: string): boolean {
  return tokens.has(token);
}

function sourceMetadataText(chunk: RetrievedChunk): string {
  const snippet = chunk.chunk_text.slice(0, 700);
  return normalizeForMatch(
    `${chunk.title} ${chunk.url} ${(chunk.tags ?? []).join(" ")} ${snippet}`,
  );
}

function isPaymentSource(chunk: RetrievedChunk): boolean {
  return includesAny(sourceMetadataText(chunk), PAYMENT_SOURCE_HINTS);
}

function isBuzonSource(chunk: RetrievedChunk): boolean {
  return includesAny(sourceMetadataText(chunk), BUZON_SOURCE_HINTS);
}

function isGenericCfdiSource(chunk: RetrievedChunk): boolean {
  return includesAny(sourceMetadataText(chunk), GENERAL_CFDI_SOURCE_HINTS);
}

function buildKeywords(query: string): string[] {
  // Spanish stopwords + filler words that usually don't help retrieval.
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
    "mi",
    "mis",
    "necesito",
    "hacer",
    "puedo",
    "debo",
    "cual",
    "cuál",
    "donde",
    "dónde",
    "cuando",
    "cuándo",
    "porque",
    "porqué",
    "es",
    "son",
    "un",
    "al",
    "lo",
    "ya",
    "me",
    "te",
    "se",
    "su",
    "sus",
    "una",
  ]);

  return normalizeForMatch(query)
    .replace(/[._-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4 && !stop.has(w))
    .slice(0, 8);
}

function scoreText(text: string, keywords: string[]): number {
  const t = normalizeForMatch(text);
  let score = 0;
  for (const k of keywords) {
    if (t.includes(k)) score += 1;
  }
  return score;
}

function similarityFromScore(score: number, maxScore: number): number {
  // Clamp into a reasonable band so confidence logic behaves.
  const safeMax = Math.max(1, maxScore);
  const s = score / safeMax; // 0..1-ish
  return Math.max(0.45, Math.min(0.75, 0.45 + s * 0.3));
}

function clampSimilarity(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function toRetrievedChunk(row: RpcChunkRow): RetrievedChunk {
  return {
    id: row.id,
    source_id: row.source_id,
    chunk_text: row.chunk_text,
    tags: row.tags ?? [],
    similarity: clampSimilarity(row.similarity),
    url: row.url ?? "",
    title: row.title ?? "",
    publisher: row.publisher ?? "",
  };
}

function buildRetrievalIntent(query: string): RetrievalIntent {
  const normalized = normalizeForMatch(query);
  const tokens = new Set(normalized.split(/\s+/).filter(Boolean));
  return {
    keywords: buildKeywords(query),
    isPaymentRelated:
      includesAny(normalized, PAYMENT_QUERY_HINTS) ||
      queryHasToken(tokens, "pue") ||
      queryHasToken(tokens, "ppd"),
    isPaymentMethodQuestion:
      includesAny(normalized, [
        "metodo de pago",
        "metodo pago",
        "forma de pago",
        "forma pago",
      ]) ||
      queryHasToken(tokens, "pue") ||
      queryHasToken(tokens, "ppd"),
    isComplementQuestion: includesAny(normalized, COMPLEMENT_QUERY_HINTS),
  };
}

function topicSpecificHints(topic: SatTopic): string[] {
  switch (topic) {
    case "FACTURACION_CFDI":
      return ["cfdi", "factura", "anexo 20", "uso cfdi"];
    case "PAGOS_COMPLEMENTO":
      return [
        "complemento de pagos",
        "recepcion de pagos",
        "recibo de pago",
        "ppd",
        "pue",
        "parcialidad",
        "saldo insoluto",
      ];
    case "RFC_EFIRMA":
      return ["rfc", "efirma", "e.firma", "firma electronica"];
    case "RESICO":
      return ["resico", "regimen simplificado"];
    case "DECLARACIONES_DEVOLUCION":
      return ["devolucion", "declaracion", "saldo a favor", "deduccion"];
    case "BUZON_REQUERIMIENTOS":
      return ["buzon", "requerimiento", "notificacion"];
    default:
      return [];
  }
}

function isTopicSpecificSource(
  chunk: RetrievedChunk,
  topic: SatTopic,
  intent: RetrievalIntent,
): boolean {
  if (intent.isPaymentRelated || intent.isComplementQuestion) {
    return isPaymentSource(chunk);
  }

  const hints = topicSpecificHints(topic);
  if (hints.length === 0) return false;
  return includesAny(sourceMetadataText(chunk), hints);
}

function computeRerankAdjustment(
  candidate: RankedCandidate,
  intent: RetrievalIntent,
  topic: SatTopic,
): { delta: number; reasons: string[] } {
  const { chunk } = candidate;
  const reasons: string[] = [];
  let delta = 0;

  const keywordHits = scoreText(
    `${chunk.title}\n${chunk.chunk_text.slice(0, 1200)}`,
    intent.keywords,
  );
  if (keywordHits > 0) {
    const keywordBoost = Math.min(0.08, keywordHits * 0.02);
    delta += keywordBoost;
    reasons.push(`keyword_boost(+${keywordBoost.toFixed(2)} hits=${keywordHits})`);
  } else if (intent.keywords.length >= 3) {
    delta -= 0.03;
    reasons.push("low_keyword_overlap(-0.03)");
  }

  if (intent.isPaymentRelated) {
    if (isPaymentSource(chunk)) {
      const paymentBoost = intent.isComplementQuestion
        ? 0.16
        : intent.isPaymentMethodQuestion
          ? 0.1
          : 0.06;
      delta += paymentBoost;
      reasons.push(`payment_source_boost(+${paymentBoost.toFixed(2)})`);
    } else if (isGenericCfdiSource(chunk)) {
      const genericPenalty = intent.isPaymentMethodQuestion ? 0.1 : 0.06;
      delta -= genericPenalty;
      reasons.push(`generic_cfdi_penalty_for_payment(-${genericPenalty.toFixed(2)})`);
    }
  }

  if (intent.isPaymentMethodQuestion && isBuzonSource(chunk)) {
    delta -= 0.35;
    reasons.push("irrelevant_buzon_penalty(-0.35)");
  }

  if (isTopicSpecificSource(chunk, topic, intent)) {
    delta += 0.06;
    reasons.push("topic_specific_boost(+0.06)");
  } else if (topic !== "OTRO" && !intent.isPaymentRelated && !isGenericCfdiSource(chunk)) {
    delta -= 0.04;
    reasons.push("off_topic_penalty(-0.04)");
  }

  return { delta, reasons };
}

function rerankCandidates(
  candidates: RankedCandidate[],
  query: string,
  topic: SatTopic,
  limit: number,
  strategy: "hybrid" | "fallback",
): RetrievedChunk[] {
  if (candidates.length === 0) return [];

  const intent = buildRetrievalIntent(query);
  const ranked: RankedSelection[] = candidates.map((candidate) => {
    const { delta, reasons } = computeRerankAdjustment(candidate, intent, topic);
    const finalScore = clampSimilarity(candidate.baseScore + delta);
    return {
      chunk: candidate.chunk,
      baseScore: candidate.baseScore,
      finalScore,
      vectorScore: candidate.vectorScore,
      ftsScore: candidate.ftsScore,
      reasons,
    };
  });

  ranked.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    if (b.baseScore !== a.baseScore) return b.baseScore - a.baseScore;
    if (b.vectorScore !== a.vectorScore) return b.vectorScore - a.vectorScore;
    return b.ftsScore - a.ftsScore;
  });

  const selected: RankedSelection[] = [];
  const deferred: RankedSelection[] = [];
  const countsBySource = new Map<string, number>();

  // Diversify by source first so top results are not dominated by one document.
  for (const item of ranked) {
    if (selected.length >= limit) break;
    const sourceKey = item.chunk.source_id || item.chunk.url || item.chunk.id;
    const used = countsBySource.get(sourceKey) ?? 0;
    if (used >= MAX_CHUNKS_PER_SOURCE) {
      deferred.push(item);
      continue;
    }

    countsBySource.set(sourceKey, used + 1);
    selected.push({
      ...item,
      reasons: [...item.reasons, "diversity_selected"],
    });
  }

  // If diversification is too strict for sparse results, fill remaining slots by score.
  for (const item of deferred) {
    if (selected.length >= limit) break;
    selected.push({
      ...item,
      reasons: [...item.reasons, "diversity_fill_after_cap"],
    });
  }

  const queryLabel = query.length > 180 ? `${query.slice(0, 180)}...` : query;
  const payload = selected.map((item, index) => ({
    rank: index + 1,
    id: item.chunk.id,
    sourceTitle: item.chunk.title,
    sourceId: item.chunk.source_id,
    score: Number(item.finalScore.toFixed(4)),
    baseScore: Number(item.baseScore.toFixed(4)),
    finalScore: Number(item.finalScore.toFixed(4)),
    vectorScore: Number(item.vectorScore.toFixed(4)),
    ftsScore: Number(item.ftsScore.toFixed(4)),
    reasons: item.reasons,
  }));

  console.info(
    `[SAT][RAG][SELECT] strategy=${strategy} topic=${topic} payment_intent=${intent.isPaymentRelated} method_intent=${intent.isPaymentMethodQuestion} complement_intent=${intent.isComplementQuestion} query="${queryLabel}" selected=${JSON.stringify(payload)}`,
  );

  return selected.map((item) => ({
    ...item.chunk,
    similarity: item.finalScore,
    retrieval_reasons: item.reasons,
  }));
}

async function searchByVector(
  supabase: SupabaseClient,
  query: string,
  tags: string[],
  limit: number,
): Promise<RetrievedChunk[]> {
  if (!hasOpenAIConfig()) {
    return [];
  }

  try {
    const embedding = await createEmbedding(query);
    const { data, error } = await supabase.rpc("match_kb_chunks", {
      query_embedding: toVectorLiteral(embedding),
      match_count: limit,
      filter_tags: tags.length > 0 ? tags : null,
    });

    if (error || !data) {
      return [];
    }

    return (data as RpcChunkRow[]).map(toRetrievedChunk);
  } catch {
    return [];
  }
}

async function searchByFullText(
  supabase: SupabaseClient,
  query: string,
  tags: string[],
  limit: number,
): Promise<RetrievedChunk[]> {
  const { data, error } = await supabase.rpc("match_kb_chunks_fts", {
    query_text: query,
    match_count: limit,
    filter_tags: tags.length > 0 ? tags : null,
  });

  if (error || !data) {
    return [];
  }

  return (data as RpcChunkRow[]).map(toRetrievedChunk);
}

function mergeHybridResults(
  vectorRows: RetrievedChunk[],
  ftsRows: RetrievedChunk[],
): RankedCandidate[] {
  // Simple weighted merge:
  // - semantic signal (vector): 65%
  // - lexical signal (FTS): 35%
  // Chunks present in both get naturally boosted.
  const merged = new Map<
    string,
    {
      chunk: RetrievedChunk;
      vectorScore: number;
      ftsScore: number;
      hybridScore: number;
    }
  >();

  for (const chunk of vectorRows) {
    merged.set(chunk.id, {
      chunk,
      vectorScore: clampSimilarity(chunk.similarity),
      ftsScore: 0,
      hybridScore: 0,
    });
  }

  for (const chunk of ftsRows) {
    const existing = merged.get(chunk.id);
    if (existing) {
      existing.ftsScore = clampSimilarity(chunk.similarity);
      continue;
    }

    merged.set(chunk.id, {
      chunk,
      vectorScore: 0,
      ftsScore: clampSimilarity(chunk.similarity),
      hybridScore: 0,
    });
  }

  const scored = Array.from(merged.values()).map((item) => {
    const hybridScore = item.vectorScore * 0.65 + item.ftsScore * 0.35;
    return { ...item, hybridScore };
  });

  return scored.map(({ chunk, hybridScore, vectorScore, ftsScore }) => ({
    chunk,
    baseScore: clampSimilarity(hybridScore),
    vectorScore,
    ftsScore,
  }));
}

async function fallbackKeywordSearch(
  supabase: SupabaseClient,
  query: string,
  tags: string[],
  limit: number,
): Promise<RetrievedChunk[]> {
  const keywords = buildKeywords(query);
  const keywordOr =
    keywords.length > 0
      ? keywords.map((k) => `chunk_text.ilike.%${k}%`).join(",")
      : null;

  const base = supabase
    .from("kb_chunks")
    .select("id,source_id,chunk_text,tags,kb_sources!inner(url,title,publisher)")
    .limit(limit * 3);

  if (tags.length > 0 && keywordOr) {
    const { data, error } = await base.or(`${keywordOr},tags.cs.{${tags.join(",")}}`);
    if (error || !data || data.length === 0) return [];

    const scored = (data as FallbackChunkRow[]).map((row) => ({
      row,
      score: scoreText(String(row.chunk_text ?? ""), keywords),
    }));
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit);
    const maxScore = Math.max(1, ...top.map((x) => x.score));

    return top.map(({ row, score }) => {
      const source = Array.isArray(row.kb_sources) ? row.kb_sources[0] : row.kb_sources;
      return {
        id: row.id,
        source_id: row.source_id,
        chunk_text: row.chunk_text,
        tags: row.tags ?? [],
        similarity: similarityFromScore(score, maxScore),
        url: source?.url ?? "",
        title: source?.title ?? "",
        publisher: source?.publisher ?? "",
      };
    });
  }

  if (keywordOr) {
    const { data, error } = await base.or(keywordOr);
    if (error || !data || data.length === 0) return [];

    const scored = (data as FallbackChunkRow[]).map((row) => ({
      row,
      score: scoreText(String(row.chunk_text ?? ""), keywords),
    }));
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit);
    const maxScore = Math.max(1, ...top.map((x) => x.score));

    return top.map(({ row, score }) => {
      const source = Array.isArray(row.kb_sources) ? row.kb_sources[0] : row.kb_sources;
      return {
        id: row.id,
        source_id: row.source_id,
        chunk_text: row.chunk_text,
        tags: row.tags ?? [],
        similarity: similarityFromScore(score, maxScore),
        url: source?.url ?? "",
        title: source?.title ?? "",
        publisher: source?.publisher ?? "",
      };
    });
  }

  if (tags.length > 0) {
    const { data, error } = await base.contains("tags", tags);
    if (error || !data || data.length === 0) return [];

    const scored = (data as FallbackChunkRow[]).map((row) => ({
      row,
      score: scoreText(String(row.chunk_text ?? ""), keywords),
    }));
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, limit);
    const maxScore = Math.max(1, ...top.map((x) => x.score));

    return top.map(({ row, score }) => {
      const source = Array.isArray(row.kb_sources) ? row.kb_sources[0] : row.kb_sources;
      return {
        id: row.id,
        source_id: row.source_id,
        chunk_text: row.chunk_text,
        tags: row.tags ?? [],
        similarity: similarityFromScore(score, maxScore),
        url: source?.url ?? "",
        title: source?.title ?? "",
        publisher: source?.publisher ?? "",
      };
    });
  }

  const { data, error } = await base;
  if (error || !data || data.length === 0) return [];

  const scored = (data as FallbackChunkRow[]).map((row) => ({
    row,
    score: scoreText(String(row.chunk_text ?? ""), keywords),
  }));
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);
  const maxScore = Math.max(1, ...top.map((x) => x.score));

  return top.map(({ row, score }) => {
    const source = Array.isArray(row.kb_sources) ? row.kb_sources[0] : row.kb_sources;
    return {
      id: row.id,
      source_id: row.source_id,
      chunk_text: row.chunk_text,
      tags: row.tags ?? [],
      similarity: similarityFromScore(score, maxScore),
      url: source?.url ?? "",
      title: source?.title ?? "",
      publisher: source?.publisher ?? "",
    };
  });
}

export async function retrieveRelevantChunks(
  supabase: SupabaseClient,
  query: string,
  topic: SatTopic,
  limit = 5,
): Promise<RetrievedChunk[]> {
  const tags = topicTags(topic);
  const searchLimit = Math.max(limit * 2, 8);

  // Hybrid retrieval: run semantic and lexical searches in parallel, then merge.
  const [vectorRows, ftsRows] = await Promise.all([
    searchByVector(supabase, query, tags, searchLimit),
    searchByFullText(supabase, query, tags, searchLimit),
  ]);

  const mergedCandidates = mergeHybridResults(vectorRows, ftsRows);
  if (mergedCandidates.length > 0) {
    return rerankCandidates(mergedCandidates, query, topic, limit, "hybrid");
  }

  // Backward-compatible fallback if the FTS RPC is unavailable or data is sparse.
  const fallbackRows = await fallbackKeywordSearch(supabase, query, tags, searchLimit);
  const fallbackCandidates: RankedCandidate[] = fallbackRows.map((chunk) => ({
    chunk,
    baseScore: clampSimilarity(chunk.similarity),
    vectorScore: 0,
    ftsScore: 0,
  }));

  return rerankCandidates(fallbackCandidates, query, topic, limit, "fallback");
}

export function extractCitations(chunks: RetrievedChunk[]): SourceCitation[] {
  const unique = new Map<string, SourceCitation>();

  for (const chunk of chunks) {
    if (!chunk.url || !chunk.title) {
      continue;
    }

    if (!unique.has(chunk.url)) {
      unique.set(chunk.url, {
        url: chunk.url,
        title: chunk.title,
        publisher: chunk.publisher,
      });
    }

    if (unique.size >= 3) {
      break;
    }
  }

  return Array.from(unique.values());
}

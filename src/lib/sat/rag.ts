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

function topicTags(topic: SatTopic): string[] {
  switch (topic) {
    case "FACTURACION_CFDI":
      return ["cfdi", "facturacion", "anexo20"];
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

  return query
    .toLowerCase()
    .normalize("NFD") // strip accents
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4 && !stop.has(w))
    .slice(0, 8);
}

function scoreText(text: string, keywords: string[]): number {
  const t = text.toLowerCase();
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
  limit: number,
): RetrievedChunk[] {
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

  scored.sort((a, b) => {
    if (b.hybridScore !== a.hybridScore) return b.hybridScore - a.hybridScore;
    if (b.vectorScore !== a.vectorScore) return b.vectorScore - a.vectorScore;
    return b.ftsScore - a.ftsScore;
  });

  return scored.slice(0, limit).map(({ chunk, hybridScore }) => ({
    ...chunk,
    similarity: hybridScore,
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

  const merged = mergeHybridResults(vectorRows, ftsRows, limit);
  if (merged.length > 0) {
    return merged;
  }

  // Backward-compatible fallback if the FTS RPC is unavailable or data is sparse.
  return fallbackKeywordSearch(supabase, query, tags, limit);
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

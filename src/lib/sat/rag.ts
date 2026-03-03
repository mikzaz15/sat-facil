import type { SupabaseClient } from "@supabase/supabase-js";

import { createEmbedding, hasOpenAIConfig, toVectorLiteral } from "@/lib/sat/openai";
import type { RetrievedChunk, SatTopic, SourceCitation } from "@/lib/sat/types";

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

export async function retrieveRelevantChunks(
  supabase: SupabaseClient,
  query: string,
  topic: SatTopic,
  limit = 5,
): Promise<RetrievedChunk[]> {
  const tags = topicTags(topic);

  if (hasOpenAIConfig()) {
    try {
      const embedding = await createEmbedding(query);
      const { data, error } = await supabase.rpc("match_kb_chunks", {
        query_embedding: toVectorLiteral(embedding),
        match_count: limit,
        filter_tags: tags.length > 0 ? tags : null,
      });

      if (error) {
        throw error;
      }

      return (data ?? []) as RetrievedChunk[];
    } catch {
      // Falls back to text lookup when embeddings are unavailable.
    }
  }

  const fallbackTerm = query.slice(0, 70).replace(/[,%]/g, " ");
  const builder = supabase
    .from("kb_chunks")
    .select(
      "id,source_id,chunk_text,tags,kb_sources!inner(url,title,publisher)",
    )
    .limit(limit);

  const { data, error } =
    tags.length > 0
      ? await builder.or(
          `chunk_text.ilike.%${fallbackTerm}%,tags.cs.{${tags.join(",")}}`,
        )
      : await builder.ilike("chunk_text", `%${fallbackTerm}%`);

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const source = Array.isArray(row.kb_sources)
      ? row.kb_sources[0]
      : row.kb_sources;

    return {
      id: row.id as string,
      source_id: row.source_id as string,
      chunk_text: row.chunk_text as string,
      tags: (row.tags as string[]) ?? [],
      similarity: 0.7,
      url: source?.url as string,
      title: source?.title as string,
      publisher: source?.publisher as string,
    } satisfies RetrievedChunk;
  });
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

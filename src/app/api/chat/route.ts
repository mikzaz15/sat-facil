import { NextResponse } from "next/server";

import { hasOpenAIConfig, runChatCompletion } from "@/lib/sat/openai";
import { extractCitations, retrieveRelevantChunks } from "@/lib/sat/rag";
import { routeSatQuestion } from "@/lib/sat/router";
import { getSatEntitlements } from "@/lib/sat/billing";
import { getAuthenticatedUser } from "@/lib/supabase/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SourceUsed = {
  title: string;
  url: string;
  score: number;
};

function buildFallbackAnswer(
  message: string,
  chunks: Awaited<ReturnType<typeof retrieveRelevantChunks>>,
): string {
  if (chunks.length === 0) {
    return "No encontré evidencia suficiente en la base SAT para responder con confianza. Comparte más contexto para afinar la búsqueda.";
  }

  const top = chunks[0];
  const excerpt = top.chunk_text.replace(/\s+/g, " ").trim().slice(0, 420);
  return [
    `Con base en documentación SAT recuperada, la guía principal para tu consulta es: ${excerpt}`,
    "Revisa las referencias SAT incluidas para confirmar el caso exacto.",
  ].join("\n\n");
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, code: "AUTH_REQUIRED", error: "Autenticación requerida." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      user_id?: string;
      session_id?: string;
      channel?: "web" | "whatsapp";
      message?: string;
    };

    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json(
        { ok: false, error: "El mensaje es obligatorio." },
        { status: 400 },
      );
    }

    const supabase = createSupabaseServerClient();
    const entitlements = await getSatEntitlements(supabase, user.id);
    if (!entitlements.canUseSatAssistant) {
      return NextResponse.json(
        {
          ok: false,
          code: "PRO_REQUIRED_ASSISTANT",
          error: "El asistente IA SAT está disponible solo en Plan Pro.",
          entitlements,
        },
        { status: 403 },
      );
    }

    const router = await routeSatQuestion(message);
    const ragQuery = [...router.ragQueries, message].join(" ");
    const chunks = await retrieveRelevantChunks(
      supabase,
      ragQuery,
      router.topic,
      5,
    );

    const sourcesUsed: SourceUsed[] = chunks.map((chunk) => ({
      title: chunk.title || "(sin titulo)",
      url: chunk.url || "",
      score: Number.isFinite(chunk.similarity)
        ? Number(chunk.similarity.toFixed(4))
        : 0,
    }));
    const satReferences = extractCitations(chunks);

    const answer = hasOpenAIConfig()
      ? await runChatCompletion([
          {
            role: "system",
            content:
              "You are a SAT CFDI expert. Answer using official SAT rules and cite sources.",
          },
          {
            role: "user",
            content: JSON.stringify(
              {
                question: message,
                retrieved_sources: chunks.map((chunk) => ({
                  title: chunk.title,
                  url: chunk.url,
                  text: chunk.chunk_text,
                  similarity: chunk.similarity,
                })),
              },
              null,
              2,
            ),
          },
        ])
      : buildFallbackAnswer(message, chunks);

    return NextResponse.json({
      ok: true,
      data: {
        answer,
        sources_used: sourcesUsed,
        sat_references: satReferences,
        entitlements,
        // Backward compatibility with existing chat client response shape.
        text: answer,
        sessionId: body.session_id ?? null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

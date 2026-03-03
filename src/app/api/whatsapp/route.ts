import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { handleSatChat } from "@/lib/sat/brain";
import { answerFlowRun, startFlowRun } from "@/lib/sat/flow-engine";
import { formatStructuredAnswer } from "@/lib/sat/format";
import {
  ensureSession,
  ensureUserByPhone,
  getActiveFlowRun,
  getLatestSessionForChannel,
} from "@/lib/sat/store";
import { WHATSAPP_MENU } from "@/lib/sat/constants";
import { createTwimlMessage, shortenForWhatsApp } from "@/lib/sat/whatsapp";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MENU_FLOW_MAP: Record<string, string> = {
  "1": "FACTURAR",
  "2": "RESICO",
  "3": "BUZON",
  "4": "DEVOLUCION",
};

function isGreeting(text: string) {
  return /^(hola|holi|buenas|menu|men[uú])$/i.test(text.trim());
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const from = String(form.get("From") ?? "");
    const message = String(form.get("Body") ?? "").trim();

    if (!from) {
      return new NextResponse(createTwimlMessage("Falta remitente."), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    const supabase = createSupabaseServerClient();
    const userId = await ensureUserByPhone(supabase, from);

    const latestSession = await getLatestSessionForChannel(
      supabase,
      userId,
      "whatsapp",
    );

    const sessionId = await ensureSession(
      supabase,
      userId,
      "whatsapp",
      (latestSession?.id as string | undefined) ?? randomUUID(),
    );

    if (!message || isGreeting(message)) {
      return new NextResponse(createTwimlMessage(WHATSAPP_MENU), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    const selectedFlow = MENU_FLOW_MAP[message];
    if (selectedFlow) {
      const started = await startFlowRun(supabase, userId, sessionId, selectedFlow);
      const reply = started.nextQuestion
        ? `Iniciamos ${selectedFlow}.\nPregunta 1: ${started.nextQuestion.label}`
        : `No pude iniciar el flujo ${selectedFlow}.`;

      return new NextResponse(createTwimlMessage(reply), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    const activeFlow = await getActiveFlowRun(supabase, sessionId);
    if (activeFlow?.flow_id) {
      const state = await answerFlowRun(
        supabase,
        userId,
        sessionId,
        activeFlow.flow_id as string,
        "",
        message,
      );

      if (state.status === "in_progress" && state.nextQuestion) {
        const reply = `Siguiente pregunta: ${state.nextQuestion.label}`;
        return new NextResponse(createTwimlMessage(reply), {
          headers: { "Content-Type": "text/xml" },
        });
      }

      const finalText = formatStructuredAnswer(state.answer!);
      const short = await shortenForWhatsApp(finalText);

      return new NextResponse(createTwimlMessage(short), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    const chat = await handleSatChat(supabase, {
      userId,
      sessionId,
      channel: "whatsapp",
      message,
    });

    const short = await shortenForWhatsApp(chat.text);

    return new NextResponse(createTwimlMessage(short), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return new NextResponse(createTwimlMessage(`Error: ${message}`), {
      status: 500,
      headers: { "Content-Type": "text/xml" },
    });
  }
}

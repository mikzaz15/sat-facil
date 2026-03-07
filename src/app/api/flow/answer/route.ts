import { NextResponse } from "next/server";

import { answerFlowRun } from "@/lib/sat/flow-engine";
import { ensureSession, ensureUser } from "@/lib/sat/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      user_id?: string;
      session_id?: string;
      flow_id?: string;
      question_id?: string;
      answer?: string;
      channel?: "web" | "whatsapp";
    };

    if (!body.flow_id || !body.answer) {
      return NextResponse.json(
        { ok: false, error: "flow_id and answer are required" },
        { status: 400 },
      );
    }

    const supabase = createSupabaseServerClient();
    const userId = await ensureUser(supabase, body.user_id);
    const sessionId = await ensureSession(
      supabase,
      userId,
      body.channel ?? "web",
      body.session_id,
      body.flow_id,
    );

    const state = await answerFlowRun(
      supabase,
      userId,
      sessionId,
      body.flow_id,
      body.question_id ?? "",
      body.answer,
    );

    return NextResponse.json({
      ok: true,
      data: {
        user_id: userId,
        session_id: sessionId,
        flow_id: body.flow_id,
        ...state,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

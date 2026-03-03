import { NextResponse } from "next/server";

import { handleSatChat } from "@/lib/sat/brain";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      user_id?: string;
      session_id?: string;
      channel?: "web" | "whatsapp";
      message?: string;
    };

    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json(
        { ok: false, error: "message is required" },
        { status: 400 },
      );
    }

    const supabase = createSupabaseServerClient();
    const result = await handleSatChat(supabase, {
      userId: body.user_id ?? undefined,
      sessionId: body.session_id,
      channel: body.channel ?? "web",
      message,
    });

    return NextResponse.json(
      {
        ok: true,
        data: result,
      },
      { status: result.limited ? 429 : 200 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

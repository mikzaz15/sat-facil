import { NextResponse } from "next/server";

import { getMessagesForSession } from "@/lib/sat/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await context.params;
    const supabase = createSupabaseServerClient();
    const messages = await getMessagesForSession(supabase, sessionId);
    return NextResponse.json({ ok: true, data: messages });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

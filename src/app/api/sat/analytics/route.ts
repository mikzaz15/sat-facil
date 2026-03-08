import { NextResponse } from "next/server";

import {
  SAT_ANALYTICS_EVENT_NAMES,
  getSatAnalyticsSummary,
  logSatAnalyticsEvent,
  type SatAnalyticsEventName,
} from "@/lib/sat/analytics";
import { getSatEntitlements } from "@/lib/sat/billing";
import { getAuthenticatedUser } from "@/lib/supabase/current-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function asOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asOptionalInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(parsed));
    }
  }
  return null;
}

function parseEventName(value: unknown): SatAnalyticsEventName | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (
    SAT_ANALYTICS_EVENT_NAMES.includes(
      normalized as SatAnalyticsEventName,
    )
  ) {
    return normalized as SatAnalyticsEventName;
  }
  return null;
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Autenticación requerida." },
        { status: 401 },
      );
    }

    const supabase = createSupabaseServerClient();
    const summary = await getSatAnalyticsSummary(supabase, {
      userId: user.id,
      topLimit: 5,
      sampleLimit: 1500,
    });

    return NextResponse.json({ ok: true, data: summary });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Autenticación requerida.", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const eventName = parseEventName(body.event_name);
    if (!eventName) {
      return NextResponse.json(
        {
          ok: false,
          error: "event_name inválido para analytics.",
          code: "INVALID_EVENT_NAME",
        },
        { status: 400 },
      );
    }

    const sourcePage = asOptionalString(body.source_page) ?? "/unknown";
    const mode = asOptionalString(body.mode);
    const errorCode = asOptionalString(body.error_code);
    const detectedRule = asOptionalString(body.detected_rule);
    const fileCount = asOptionalInteger(body.file_count);

    const supabase = createSupabaseServerClient();
    const entitlements = await getSatEntitlements(supabase, user.id);

    await logSatAnalyticsEvent(supabase, {
      userId: user.id,
      eventName,
      sourcePage,
      mode,
      errorCode,
      detectedRule,
      fileCount,
      plan: entitlements.plan,
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

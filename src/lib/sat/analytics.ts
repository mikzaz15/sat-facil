import type { SupabaseClient } from "@supabase/supabase-js";

export const SAT_ANALYTICS_EVENT_NAMES = [
  "validation_run",
  "validation_error_detected",
  "corrected_xml_downloaded",
  "batch_validation_run",
  "batch_corrected_zip_downloaded",
] as const;

export type SatAnalyticsEventName = (typeof SAT_ANALYTICS_EVENT_NAMES)[number];
export type SatAnalyticsPlan = "free" | "pro";

export type SatAnalyticsEventInput = {
  userId: string;
  eventName: SatAnalyticsEventName;
  sourcePage: string;
  mode?: string | null;
  errorCode?: string | null;
  detectedRule?: string | null;
  fileCount?: number | null;
  plan: SatAnalyticsPlan;
};

type ValidationIssueLike = {
  code: string;
  related_rule?: string;
};

type ValidationResultLike = {
  errors: ValidationIssueLike[];
  detected_rules: string[];
};

export type SatAnalyticsTopItem = {
  key: string;
  count: number;
};

export type SatAnalyticsSummary = {
  totalValidations: number;
  totalErrorsDetected: number;
  totalDownloads: number;
  topErrorCodes: SatAnalyticsTopItem[];
  topDetectedRules: SatAnalyticsTopItem[];
};

function normalizeNullableText(input: string | null | undefined): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeFileCount(input: number | null | undefined): number | null {
  if (typeof input !== "number" || !Number.isFinite(input)) return null;
  const normalized = Math.max(0, Math.floor(input));
  return normalized;
}

export async function logSatAnalyticsEvent(
  supabase: SupabaseClient,
  input: SatAnalyticsEventInput,
): Promise<void> {
  const insert = await supabase.from("analytics_events").insert({
    user_id: input.userId,
    event_name: input.eventName,
    source_page: normalizeNullableText(input.sourcePage) ?? "/unknown",
    mode: normalizeNullableText(input.mode ?? null),
    error_code: normalizeNullableText(input.errorCode ?? null),
    detected_rule: normalizeNullableText(input.detectedRule ?? null),
    file_count: normalizeFileCount(input.fileCount ?? null),
    plan: input.plan === "pro" ? "pro" : "free",
  });

  if (insert.error) {
    throw new Error(`Could not log analytics event: ${insert.error.message}`);
  }
}

export async function logValidationAnalyticsEvents(params: {
  supabase: SupabaseClient;
  userId: string;
  sourcePage: string;
  mode: string;
  plan: SatAnalyticsPlan;
  validation: ValidationResultLike;
}): Promise<void> {
  await logSatAnalyticsEvent(params.supabase, {
    userId: params.userId,
    eventName: "validation_run",
    sourcePage: params.sourcePage,
    mode: params.mode,
    plan: params.plan,
    detectedRule: params.validation.detected_rules[0] ?? null,
  });

  const firstError = params.validation.errors[0];
  if (!firstError) {
    return;
  }

  await logSatAnalyticsEvent(params.supabase, {
    userId: params.userId,
    eventName: "validation_error_detected",
    sourcePage: params.sourcePage,
    mode: params.mode,
    plan: params.plan,
    errorCode: firstError.code,
    detectedRule: firstError.related_rule ?? params.validation.detected_rules[0] ?? null,
  });
}

function toCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  return 0;
}

async function countEvents(params: {
  supabase: SupabaseClient;
  eventNames: SatAnalyticsEventName[];
  userId?: string;
}): Promise<number> {
  let query = params.supabase
    .from("analytics_events")
    .select("id", { count: "exact", head: true });

  if (params.userId) {
    query = query.eq("user_id", params.userId);
  }

  if (params.eventNames.length === 1) {
    query = query.eq("event_name", params.eventNames[0]);
  } else if (params.eventNames.length > 1) {
    query = query.in("event_name", params.eventNames);
  }

  const { count, error } = await query;
  if (error) {
    throw new Error(`Could not count analytics events: ${error.message}`);
  }

  return toCount(count);
}

function topFromValues(values: string[], topLimit: number): SatAnalyticsTopItem[] {
  const counts = new Map<string, number>();

  for (const rawValue of values) {
    const value = rawValue.trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return left[0].localeCompare(right[0], "es");
    })
    .slice(0, topLimit)
    .map(([key, count]) => ({ key, count }));
}

async function loadTopValues(params: {
  supabase: SupabaseClient;
  userId?: string;
  column: "error_code" | "detected_rule";
  topLimit: number;
  sampleLimit: number;
}): Promise<SatAnalyticsTopItem[]> {
  let query = params.supabase
    .from("analytics_events")
    .select(params.column)
    .eq("event_name", "validation_error_detected")
    .not(params.column, "is", null)
    .order("created_at", { ascending: false })
    .limit(params.sampleLimit);

  if (params.userId) {
    query = query.eq("user_id", params.userId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Could not load analytics top values: ${error.message}`);
  }

  const values = (data ?? [])
    .map((row) => {
      const candidate = (row as Record<string, unknown>)[params.column];
      return typeof candidate === "string" ? candidate : "";
    })
    .filter((value) => value.length > 0);

  return topFromValues(values, params.topLimit);
}

export async function getSatAnalyticsSummary(
  supabase: SupabaseClient,
  options?: {
    userId?: string;
    topLimit?: number;
    sampleLimit?: number;
  },
): Promise<SatAnalyticsSummary> {
  const userId = options?.userId;
  const topLimit = options?.topLimit ?? 5;
  const sampleLimit = options?.sampleLimit ?? 1000;

  const [totalValidations, totalErrorsDetected, totalDownloads, topErrorCodes, topDetectedRules] =
    await Promise.all([
      countEvents({
        supabase,
        userId,
        eventNames: ["validation_run"],
      }),
      countEvents({
        supabase,
        userId,
        eventNames: ["validation_error_detected"],
      }),
      countEvents({
        supabase,
        userId,
        eventNames: ["corrected_xml_downloaded", "batch_corrected_zip_downloaded"],
      }),
      loadTopValues({
        supabase,
        userId,
        column: "error_code",
        topLimit,
        sampleLimit,
      }),
      loadTopValues({
        supabase,
        userId,
        column: "detected_rule",
        topLimit,
        sampleLimit,
      }),
    ]);

  return {
    totalValidations,
    totalErrorsDetected,
    totalDownloads,
    topErrorCodes,
    topDetectedRules,
  };
}

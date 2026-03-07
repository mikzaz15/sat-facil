import type { SupabaseClient } from "@supabase/supabase-js";

export const SAT_FREE_DAILY_VALIDATION_LIMIT = 5;

export type SatPlan = "free" | "pro";
export type SatValidationMode = "manual" | "xml" | "xml_fix";

export type SatEntitlements = {
  userId: string;
  plan: SatPlan;
  subscriptionStatus: string;
  isPro: boolean;
  canUseXmlValidator: boolean;
  canUseSatAssistant: boolean;
  dailyValidationLimit: number | null;
  validationsUsedToday: number;
  validationsRemainingToday: number | null;
};

export type SatValidationAccessResult =
  | { allowed: true; entitlements: SatEntitlements }
  | {
      allowed: false;
      code: "PRO_REQUIRED_XML" | "FREE_LIMIT_REACHED";
      message: string;
      entitlements: SatEntitlements;
    };

type SubscriptionRow = {
  user_id: string;
  plan: SatPlan;
  status: string;
};

function todayUtcRange(): { startIso: string; endIso: string } {
  const now = new Date();
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function toPlan(value: string | null | undefined): SatPlan {
  return value === "pro" ? "pro" : "free";
}

function toValidationCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed));
  }
  return 0;
}

export function isProFromSubscription(input: {
  plan: SatPlan;
  status: string;
}): boolean {
  if (input.plan !== "pro") return false;
  const status = input.status.toLowerCase();
  return status === "active" || status === "trialing" || status === "past_due";
}

export async function ensureSatSubscriptionRow(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubscriptionRow> {
  const lookup = await supabase
    .from("sat_subscriptions")
    .select("user_id,plan,status")
    .eq("user_id", userId)
    .maybeSingle();

  if (lookup.error) {
    throw new Error(`Could not read SAT subscription: ${lookup.error.message}`);
  }

  if (lookup.data) {
    return {
      user_id: lookup.data.user_id as string,
      plan: toPlan(lookup.data.plan as string),
      status: (lookup.data.status as string) || "inactive",
    };
  }

  const insert = await supabase
    .from("sat_subscriptions")
    .insert({
      user_id: userId,
      plan: "free",
      status: "inactive",
    })
    .select("user_id,plan,status")
    .single();

  if (insert.error || !insert.data) {
    throw new Error(
      `Could not create SAT subscription row: ${
        insert.error?.message ?? "unknown error"
      }`,
    );
  }

  return {
    user_id: insert.data.user_id as string,
    plan: toPlan(insert.data.plan as string),
    status: (insert.data.status as string) || "inactive",
  };
}

export async function getSatEntitlements(
  supabase: SupabaseClient,
  userId: string,
): Promise<SatEntitlements> {
  const subscription = await ensureSatSubscriptionRow(supabase, userId);
  const { startIso, endIso } = todayUtcRange();

  const usage = await supabase
    .from("validation_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  if (usage.error) {
    throw new Error(`Could not read SAT daily usage: ${usage.error.message}`);
  }

  const validationsUsedToday = toValidationCount(usage.count);
  const isPro = isProFromSubscription({
    plan: subscription.plan,
    status: subscription.status,
  });

  const remaining = isPro
    ? null
    : Math.max(SAT_FREE_DAILY_VALIDATION_LIMIT - validationsUsedToday, 0);

  return {
    userId,
    plan: isPro ? "pro" : "free",
    subscriptionStatus: subscription.status,
    isPro,
    canUseXmlValidator: isPro,
    canUseSatAssistant: isPro,
    dailyValidationLimit: isPro ? null : SAT_FREE_DAILY_VALIDATION_LIMIT,
    validationsUsedToday,
    validationsRemainingToday: remaining,
  };
}

export async function assertValidationAccess(
  supabase: SupabaseClient,
  userId: string,
  mode: SatValidationMode,
): Promise<SatValidationAccessResult> {
  const entitlements = await getSatEntitlements(supabase, userId);

  if (mode === "xml_fix" && !entitlements.canUseXmlValidator) {
    return {
      allowed: false,
      code: "PRO_REQUIRED_XML",
      message: "La descarga del XML corregido está disponible en el Plan Pro.",
      entitlements,
    };
  }

  if (
    !entitlements.isPro &&
    entitlements.validationsUsedToday >= SAT_FREE_DAILY_VALIDATION_LIMIT
  ) {
    return {
      allowed: false,
      code: "FREE_LIMIT_REACHED",
      message:
        "Has alcanzado el límite gratuito de validaciones. Mejora a Plan Pro para validaciones ilimitadas.",
      entitlements,
    };
  }

  return { allowed: true, entitlements };
}

export async function incrementValidationUsage(
  supabase: SupabaseClient,
  userId: string,
  mode: SatValidationMode,
): Promise<number> {
  const insert = await supabase.from("validation_logs").insert({
    user_id: userId,
    validation_mode: mode,
  });

  if (insert.error) {
    throw new Error(`Could not log validation usage: ${insert.error.message}`);
  }

  const { startIso, endIso } = todayUtcRange();
  const usage = await supabase
    .from("validation_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  if (usage.error) {
    throw new Error(`Could not read SAT daily usage: ${usage.error.message}`);
  }

  return toValidationCount(usage.count);
}

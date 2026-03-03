import type { SupabaseClient } from "@supabase/supabase-js";

import { FREE_DAILY_MESSAGE_LIMIT } from "@/lib/sat/constants";

const todayIso = () => new Date().toISOString().slice(0, 10);

export async function checkAndIncrementDailyMessages(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ allowed: boolean; count: number; limit: number }> {
  const date = todayIso();

  const { data: usageRow, error: usageError } = await supabase
    .from("usage")
    .select("messages_count")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (usageError) {
    throw new Error(`Could not query usage: ${usageError.message}`);
  }

  const currentCount = usageRow?.messages_count ?? 0;
  if (currentCount >= FREE_DAILY_MESSAGE_LIMIT) {
    return {
      allowed: false,
      count: currentCount,
      limit: FREE_DAILY_MESSAGE_LIMIT,
    };
  }

  if (usageRow) {
    const { error: updateError } = await supabase
      .from("usage")
      .update({ messages_count: currentCount + 1 })
      .eq("user_id", userId)
      .eq("date", date);

    if (updateError) {
      throw new Error(`Could not update usage: ${updateError.message}`);
    }
  } else {
    const { error: insertError } = await supabase.from("usage").insert({
      user_id: userId,
      date,
      messages_count: 1,
      flows_count: 0,
    });

    if (insertError) {
      throw new Error(`Could not insert usage: ${insertError.message}`);
    }
  }

  return {
    allowed: true,
    count: currentCount + 1,
    limit: FREE_DAILY_MESSAGE_LIMIT,
  };
}

export async function incrementFlowUsage(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const date = todayIso();

  const { data: usageRow } = await supabase
    .from("usage")
    .select("flows_count,messages_count")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();

  if (!usageRow) {
    await supabase.from("usage").insert({
      user_id: userId,
      date,
      messages_count: 0,
      flows_count: 1,
    });
    return;
  }

  await supabase
    .from("usage")
    .update({ flows_count: (usageRow.flows_count ?? 0) + 1 })
    .eq("user_id", userId)
    .eq("date", date);
}

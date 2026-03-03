import { randomUUID } from "crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureUser(
  supabase: SupabaseClient,
  userId?: string,
): Promise<string> {
  const id = userId && userId.trim() ? userId : randomUUID();

  const { data: existing, error: existingError } = await supabase
    .from("users")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Could not query user: ${existingError.message}`);
  }

  if (existing) {
    return existing.id as string;
  }

  const { error: insertError } = await supabase.from("users").insert({
    id,
    plan: "free",
  });

  if (insertError) {
    throw new Error(`Could not create user: ${insertError.message}`);
  }

  return id;
}

export async function ensureUserByPhone(
  supabase: SupabaseClient,
  phone: string,
): Promise<string> {
  const { data: existing, error: existingError } = await supabase
    .from("users")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Could not query phone user: ${existingError.message}`);
  }

  if (existing) {
    return existing.id as string;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("users")
    .insert({
      phone,
      plan: "free",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw new Error(`Could not create phone user: ${insertError?.message}`);
  }

  return inserted.id as string;
}

export async function ensureSession(
  supabase: SupabaseClient,
  userId: string,
  channel: "web" | "whatsapp",
  sessionId?: string,
  topic?: string,
): Promise<string> {
  const normalizedSessionId =
    sessionId && sessionId.trim() ? sessionId : undefined;

  if (normalizedSessionId) {
    const { data: existing, error: existingError } = await supabase
      .from("sessions")
      .select("id")
      .eq("id", normalizedSessionId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existingError) {
      throw new Error(`Could not query session: ${existingError.message}`);
    }

    if (existing) {
      return existing.id as string;
    }
  }

  const id = normalizedSessionId ?? randomUUID();

  const { error: insertError } = await supabase.from("sessions").insert({
    id,
    user_id: userId,
    channel,
    topic,
  });

  if (insertError) {
    throw new Error(`Could not create session: ${insertError.message}`);
  }

  return id;
}

export async function updateSessionTopic(
  supabase: SupabaseClient,
  sessionId: string,
  topic: string,
): Promise<void> {
  const { error } = await supabase
    .from("sessions")
    .update({ topic })
    .eq("id", sessionId);

  if (error) {
    throw new Error(`Could not update session topic: ${error.message}`);
  }
}

export async function saveMessage(
  supabase: SupabaseClient,
  sessionId: string,
  role: "user" | "assistant" | "system",
  content: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabase.from("messages").insert({
    session_id: sessionId,
    role,
    content,
    metadata_json: metadata,
  });

  if (error) {
    throw new Error(`Could not save message: ${error.message}`);
  }
}

export async function getSessionHistory(
  supabase: SupabaseClient,
  userId: string,
  limit = 10,
) {
  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("id,channel,topic,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (sessionsError) {
    throw new Error(`Could not query sessions: ${sessionsError.message}`);
  }

  const sessionIds = (sessions ?? []).map((item) => item.id as string);
  if (sessionIds.length === 0) {
    return [];
  }

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("session_id,role,content,created_at")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: false });

  if (messagesError) {
    throw new Error(`Could not query session messages: ${messagesError.message}`);
  }

  const lastBySession = new Map<string, { role: string; content: string }>();
  for (const message of messages ?? []) {
    const key = message.session_id as string;
    if (!lastBySession.has(key)) {
      lastBySession.set(key, {
        role: message.role as string,
        content: message.content as string,
      });
    }
  }

  return (sessions ?? []).map((session) => ({
    id: session.id,
    channel: session.channel,
    topic: session.topic,
    created_at: session.created_at,
    last_message: lastBySession.get(session.id as string)?.content ?? "",
  }));
}

export async function getMessagesForSession(
  supabase: SupabaseClient,
  sessionId: string,
) {
  const { data, error } = await supabase
    .from("messages")
    .select("id,role,content,metadata_json,created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    throw new Error(`Could not query messages: ${error.message}`);
  }

  return data ?? [];
}

export async function getActiveFlowRun(
  supabase: SupabaseClient,
  sessionId: string,
) {
  const { data, error } = await supabase
    .from("flow_runs")
    .select("id,flow_id,current_question_index,answers_json")
    .eq("session_id", sessionId)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not query flow run: ${error.message}`);
  }

  return data;
}

export async function getLatestSessionForChannel(
  supabase: SupabaseClient,
  userId: string,
  channel: "web" | "whatsapp",
) {
  const { data, error } = await supabase
    .from("sessions")
    .select("id,created_at")
    .eq("user_id", userId)
    .eq("channel", channel)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not query latest session: ${error.message}`);
  }

  return data;
}

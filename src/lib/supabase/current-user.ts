import type { User } from "@supabase/supabase-js";

import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";

export async function getAuthenticatedUser(): Promise<User | null> {
  const supabase = await createSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ?? null;
}

export async function requireAuthenticatedUser(): Promise<User> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error("AUTH_REQUIRED");
  }
  return user;
}

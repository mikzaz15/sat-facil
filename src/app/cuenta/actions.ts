"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";

export async function logoutFromAccountAction() {
  const supabase = await createSupabaseServerAuthClient();
  await supabase.auth.signOut();
  redirect("/");
}

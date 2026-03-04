"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";

function getNextPath(formData: FormData) {
  const nextValue = formData.get("next");
  if (typeof nextValue === "string" && nextValue.startsWith("/app")) {
    return nextValue;
  }
  return "/app";
}

export async function loginAction(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const nextPath = getNextPath(formData);

  if (typeof email !== "string" || typeof password !== "string") {
    redirect("/login?error=Please+enter+email+and+password.");
  }

  const supabase = await createSupabaseServerAuthClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(nextPath);
}

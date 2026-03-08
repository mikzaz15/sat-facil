"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";

const DEFAULT_AUTH_REDIRECT = "/validate-cfdi";

function isSafeInternalPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

function getNextPath(formData: FormData, defaultPath = DEFAULT_AUTH_REDIRECT) {
  const nextValue = formData.get("next");
  if (typeof nextValue !== "string") {
    return defaultPath;
  }

  const nextPath = nextValue.trim();
  if (!isSafeInternalPath(nextPath)) {
    return defaultPath;
  }

  if (nextPath === "/app" || nextPath.startsWith("/app/")) {
    return defaultPath;
  }

  return nextPath;
}

export async function loginAction(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const nextPath = getNextPath(formData);

  if (typeof email !== "string" || typeof password !== "string") {
    redirect("/login?error=Ingresa+correo+electr%C3%B3nico+y+contrase%C3%B1a.");
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

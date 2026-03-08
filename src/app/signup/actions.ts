"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_GOOGLE_REDIRECT = "/cfdi-xml-validator";

function isSafeInternalPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

function getNextPath(formData: FormData) {
  const nextValue = formData.get("next");
  if (typeof nextValue !== "string") {
    return DEFAULT_GOOGLE_REDIRECT;
  }

  const nextPath = nextValue.trim();
  if (!isSafeInternalPath(nextPath)) {
    return DEFAULT_GOOGLE_REDIRECT;
  }

  if (nextPath === "/app" || nextPath.startsWith("/app/")) {
    return DEFAULT_GOOGLE_REDIRECT;
  }

  return nextPath;
}

async function ensureUserProfile(params: {
  userId: string;
  email: string;
  fullName: string | null;
}) {
  const adminClient = createSupabaseServerClient();

  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      id: params.userId,
      email: params.email,
      full_name: params.fullName,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    throw new Error(profileError.message);
  }
}

export async function signupAction(formData: FormData) {
  const fullNameValue = formData.get("fullName");
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");

  const fullName = typeof fullNameValue === "string" ? fullNameValue : null;
  const email = typeof emailValue === "string" ? emailValue : null;
  const password = typeof passwordValue === "string" ? passwordValue : null;
  const nextPath = getNextPath(formData);

  if (!email || !password) {
    redirect("/signup?error=Ingresa+correo+electr%C3%B3nico+y+contrase%C3%B1a.");
  }

  const supabase = await createSupabaseServerAuthClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.user) {
    redirect("/signup?error=No+se+pudo+crear+la+cuenta.");
  }

  try {
    await ensureUserProfile({
      userId: data.user.id,
      email,
      fullName,
    });
  } catch (bootstrapError) {
    const message =
      bootstrapError instanceof Error
        ? bootstrapError.message
        : "La cuenta se creó, pero falló la configuración del perfil.";
    redirect(`/signup?error=${encodeURIComponent(message)}`);
  }

  if (!data.session) {
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      redirect(
        "/login?error=Cuenta+creada.+Confirma+tu+correo+antes+de+iniciar+sesi%C3%B3n.",
      );
    }
  }

  redirect(nextPath);
}

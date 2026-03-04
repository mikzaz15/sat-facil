"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function workspaceNameFromEmail(email: string) {
  const localPart = email.split("@")[0]?.trim();
  if (!localPart) {
    return "My Workspace";
  }
  return `${localPart}'s Workspace`;
}

async function bootstrapUserWorkspace(params: {
  userId: string;
  email: string;
  fullName: string | null;
}) {
  const adminClient = createSupabaseServerClient();

  const { data: existingMembership } = await adminClient
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", params.userId)
    .maybeSingle();

  if (existingMembership) {
    return;
  }

  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      id: params.userId,
      full_name: params.fullName,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { data: workspace, error: workspaceError } = await adminClient
    .from("workspaces")
    .insert({
      name: workspaceNameFromEmail(params.email),
      owner_id: params.userId,
    })
    .select("id")
    .single();

  if (workspaceError || !workspace) {
    throw new Error(workspaceError?.message ?? "Failed to create workspace.");
  }

  const { error: memberError } = await adminClient
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: params.userId,
      role: "owner",
    });

  if (memberError) {
    throw new Error(memberError.message);
  }
}

export async function signupAction(formData: FormData) {
  const fullNameValue = formData.get("fullName");
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");

  const fullName = typeof fullNameValue === "string" ? fullNameValue : null;
  const email = typeof emailValue === "string" ? emailValue : null;
  const password = typeof passwordValue === "string" ? passwordValue : null;

  if (!email || !password) {
    redirect("/signup?error=Please+enter+email+and+password.");
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
    redirect("/signup?error=Unable+to+create+account.");
  }

  try {
    await bootstrapUserWorkspace({
      userId: data.user.id,
      email,
      fullName,
    });
  } catch (bootstrapError) {
    const message =
      bootstrapError instanceof Error
        ? bootstrapError.message
        : "Account created, but workspace setup failed.";
    redirect(`/signup?error=${encodeURIComponent(message)}`);
  }

  if (!data.session) {
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      redirect(
        "/login?error=Account+created.+Please+confirm+your+email+before+logging+in.",
      );
    }
  }

  redirect("/app");
}

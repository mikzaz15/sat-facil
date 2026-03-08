"use client";

import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const DEFAULT_NEXT_PATH = "/validate-cfdi";

type GoogleAuthButtonProps = {
  className?: string;
  errorPath?: "/login" | "/signup";
};

export function GoogleAuthButton({
  className,
  errorPath = "/login",
}: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleGoogleAuth() {
    setIsLoading(true);

    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(DEFAULT_NEXT_PATH)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      window.location.assign(
        `${errorPath}?error=${encodeURIComponent(error.message)}`,
      );
      return;
    }

    setIsLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleGoogleAuth}
      disabled={isLoading}
      className={
        className ||
        "w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
      }
    >
      {isLoading ? "Conectando con Google..." : "Continuar con Google"}
    </button>
  );
}

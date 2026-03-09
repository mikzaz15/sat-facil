import type { Metadata } from "next";
import Link from "next/link";

import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";
import { isProFromSubscription } from "@/lib/sat/billing";

import "./globals.css";

export const metadata: Metadata = {
  title: "SAT Fácil",
  description: "Asistente educativo para trámites SAT.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const navLinks: Array<{ href: string; label: string }> = [];
  let authHref = "/login";
  let authLabel = "Iniciar sesión";
  navLinks.push({ href: "/", label: "Inicio" });

  if (!user) {
    navLinks.push(
      { href: "/cfdi-xml-validator", label: "Validar XML" },
      { href: "/cfdi-error-explainer", label: "Errores SAT" },
      { href: "/pricing", label: "Planes" },
    );
  } else {
    authHref = "/cuenta";
    authLabel = "Cuenta";

    const subscription = await supabase
      .from("sat_subscriptions")
      .select("plan,status")
      .eq("user_id", user.id)
      .maybeSingle();
    const isPro =
      !subscription.error &&
      isProFromSubscription({
        plan: (subscription.data?.plan ?? "free") === "pro" ? "pro" : "free",
        status: subscription.data?.status ?? "inactive",
      });

    if (isPro) {
      navLinks.push(
        { href: "/cfdi-xml-validator", label: "Validar XML" },
        { href: "/cfdi-batch-validator", label: "Lote XML" },
        { href: "/cfdi-error-explainer", label: "Errores SAT" },
        { href: "/chat", label: "Asistente SAT" },
      );
    } else {
      navLinks.push(
        { href: "/cfdi-xml-validator", label: "Validar XML" },
        { href: "/cfdi-error-explainer", label: "Errores SAT" },
        { href: "/pricing", label: "Planes" },
      );
    }
  }

  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-2 py-1 text-sm font-medium text-slate-900 hover:bg-slate-100"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <Link
              href={authHref}
              className="ml-auto rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              {authLabel}
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}

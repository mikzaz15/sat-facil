import type { Metadata } from "next";
import Link from "next/link";

import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";

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
  const authHref = user ? "/cuenta" : "/login";
  const authLabel = user ? "Cuenta" : "Iniciar sesión";

  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="rounded-md px-2 py-1 text-sm font-medium text-slate-900 hover:bg-slate-100"
              >
                Inicio
              </Link>
              <Link
                href="/cfdi-xml-validator"
                className="rounded-md px-2 py-1 text-sm font-medium text-slate-900 hover:bg-slate-100"
              >
                Validar XML
              </Link>
              <Link
                href="/cfdi-batch-validator"
                className="rounded-md px-2 py-1 text-sm font-medium text-slate-900 hover:bg-slate-100"
              >
                Lote XML
              </Link>
              <Link
                href="/cfdi-error-explainer"
                className="rounded-md px-2 py-1 text-sm font-medium text-slate-900 hover:bg-slate-100"
              >
                Errores SAT
              </Link>
              <Link
                href="/pricing"
                className="rounded-md px-2 py-1 text-sm font-medium text-slate-900 hover:bg-slate-100"
              >
                Planes
              </Link>
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

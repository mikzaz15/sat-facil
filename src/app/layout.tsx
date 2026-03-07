import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAT Fácil",
  description: "Asistente educativo para trámites SAT.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
            <Link
              href="/"
              className="rounded-md px-2 py-1 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              Inicio
            </Link>
            <Link
              href="/validate-cfdi"
              className="rounded-md px-2 py-1 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              Validar CFDI
            </Link>
            <Link
              href="/cfdi-decision"
              className="rounded-md px-2 py-1 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              Configurar CFDI
            </Link>
            <Link
              href="/cfdi-xml-validator"
              className="rounded-md px-2 py-1 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              Validar XML CFDI
            </Link>
            <Link
              href="/cfdi-error-explainer"
              className="rounded-md px-2 py-1 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              Explicar error SAT
            </Link>
            <Link
              href="/chat"
              className="rounded-md px-2 py-1 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              Asistente SAT
            </Link>
            <Link
              href="/pricing"
              className="rounded-md px-2 py-1 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              Planes
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}

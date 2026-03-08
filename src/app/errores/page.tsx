import type { Metadata } from "next";
import Link from "next/link";

import { listSatErrorCodes } from "@/lib/sat/error-library";

export const metadata: Metadata = {
  title: "Errores CFDI del SAT más comunes",
  description:
    "SAT Fácil explica los errores CFDI más comunes del SAT, por qué ocurren y cómo solucionarlos antes de timbrar.",
  keywords: [
    "errores cfdi",
    "errores sat cfdi",
    "errores cfdi 4.0",
    "lista errores cfdi",
  ],
};

const SAT_ERROR_CODES = listSatErrorCodes();

export default function ErroresIndexPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
          SAT Fácil
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Errores CFDI del SAT más comunes
        </h1>
        <p className="text-sm text-slate-700">
          Consulta una guía práctica de errores CFDI 4.0: qué significan, por
          qué ocurren y cómo corregirlos antes de timbrar.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Introducción</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">
          Esta lista de errores CFDI del SAT te ayuda a identificar rechazos
          comunes del PAC y aplicar correcciones con criterio contable. Cada
          error incluye explicación y pasos de solución.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Lista de errores</h2>
        {SAT_ERROR_CODES.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">
            Aún no hay códigos de error publicados.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {SAT_ERROR_CODES.map((code) => (
              <li key={code}>
                <Link
                  href={`/errores/${code}`}
                  className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 transition hover:border-sky-300 hover:bg-sky-50"
                >
                  {code} - Error {code} SAT / CFDI
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Valida tu XML CFDI gratis
        </h2>
        <p className="mt-2 text-sm text-slate-700">
          Sube tu XML y revisa errores SAT antes de timbrar.
        </p>
        <Link
          href="/cfdi-xml-validator"
          className="mt-3 inline-flex items-center rounded-md bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800"
        >
          Ir al validador XML
        </Link>
      </section>
    </main>
  );
}

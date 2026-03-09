import type { Metadata } from "next";
import Link from "next/link";

import { ErroresSatIndexClient } from "@/components/sat/errores-sat-index-client";
import { listSatCfdiErrorContents } from "@/lib/sat/error-library";

export const metadata: Metadata = {
  title: "Errores SAT CFDI Más Comunes | SAT Fácil",
  description:
    "Directorio de errores SAT CFDI comunes, su significado y cómo solucionarlos antes de timbrar CFDI 4.0 con SAT Fácil.",
  alternates: {
    canonical: "/errores-sat",
  },
};

export default function ErroresSatIndexPage() {
  const errors = listSatCfdiErrorContents();

  return (
    <main className="bg-gradient-to-b from-slate-50 via-white to-sky-50/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-6 md:py-14">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
            Errores SAT
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            Errores SAT CFDI Más Comunes
          </h1>
          <p className="max-w-4xl text-sm leading-relaxed text-slate-700 md:text-base">
            Consulta los errores CFDI más frecuentes, entiende qué significan y
            aprende cómo corregirlos antes de timbrar.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/validar-xml"
              className="inline-flex items-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800"
            >
              Probar validador XML
            </Link>
            <Link
              href="/precios"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              Ver precios
            </Link>
          </div>
        </header>

        <ErroresSatIndexClient errors={errors} />

        <section className="rounded-2xl border border-sky-200 bg-sky-50 p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            Por qué usar SAT Fácil para estos errores
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            SAT Fácil te ayuda a detectar errores CFDI antes de timbrar, reducir
            rechazos del PAC y corregir inconsistencias con una guía práctica para
            operación diaria.
          </p>
          <Link
            href="/validar-xml"
            className="mt-4 inline-flex items-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800"
          >
            Validar un XML ahora
          </Link>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            Preguntas frecuentes
          </h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <article className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900">
                ¿Qué son los errores CFDI del SAT?
              </h3>
              <p className="mt-1">
                Son validaciones fiscales que detectan inconsistencias en datos del
                CFDI antes de timbrar.
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900">
                ¿Estos errores impiden timbrar?
              </h3>
              <p className="mt-1">
                En la mayoría de los casos sí, hasta corregir el campo o combinación
                que genera el rechazo.
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900">
                ¿SAT Fácil detecta estos errores automáticamente?
              </h3>
              <p className="mt-1">
                Sí, puedes cargar tu XML y obtener un diagnóstico con guías de
                corrección antes de enviarlo al PAC.
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900">
                ¿Cómo puedo corregirlos antes de enviarlos al PAC?
              </h3>
              <p className="mt-1">
                Revisa la causa del error, aplica la corrección sugerida y vuelve a
                validar tu XML para confirmar que está listo para timbrar.
              </p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}

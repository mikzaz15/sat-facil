import type { Metadata } from "next";
import Link from "next/link";
import CfdiBatchValidatorTool from "@/components/sat/cfdi-batch-validator-tool";

const BENEFITS = [
  {
    title: "Validación masiva",
    description:
      "Sube múltiples XML y revisa resultados en una sola corrida.",
  },
  {
    title: "Ahorro de tiempo para contadores",
    description:
      "Reduce trabajo manual y acelera el control de calidad previo al timbrado.",
  },
  {
    title: "Diagnóstico inmediato",
    description:
      "Obtén visibilidad rápida de errores para priorizar correcciones.",
  },
];

export const metadata: Metadata = {
  title: "Validador CFDI en Lote | SAT Fácil",
  description:
    "Valida múltiples XML CFDI en lote y revisa errores SAT en segundos con SAT Fácil.",
};

export default function LoteXmlPage() {
  return (
    <main className="bg-gradient-to-b from-slate-50 via-white to-sky-50/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-6 md:py-14">
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
              SAT Fácil
            </p>
            <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-800">
              Función Pro
            </span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            Valida múltiples XML CFDI en lote
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-700 md:text-base">
            Sube varios XML y obtén un diagnóstico rápido para revisar múltiples
            CFDI antes del timbrado.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="#lote-validator"
              className="inline-flex items-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800"
            >
              Probar validación en lote
            </Link>
            <Link
              href="/precios"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              Ver Plan Pro
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {BENEFITS.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-xl font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {item.description}
              </p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            Valida múltiples CFDI en lote
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            Sube varios archivos XML y revisa rápidamente errores SAT en cada
            factura.
          </p>
          <Link
            href="/validar-xml"
            className="mt-4 inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
          >
            Probar validador individual
          </Link>
        </section>

        <section id="lote-validator" className="scroll-mt-24">
          <h2 className="text-2xl font-semibold text-slate-900">
            Probar validación en lote
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
            Accede a la herramienta de lote para procesar múltiples XML desde un
            solo flujo.
          </p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CfdiBatchValidatorTool />
          </div>
        </section>
      </div>
    </main>
  );
}

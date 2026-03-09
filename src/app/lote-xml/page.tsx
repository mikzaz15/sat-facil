import Link from "next/link";

const BENEFITS = [
  {
    title: "Sube múltiples XML",
    description:
      "Carga varios CFDI en una sola operación para revisión rápida sin validar archivo por archivo.",
  },
  {
    title: "Procesa en segundos",
    description:
      "Obtén resultados consolidados para detectar errores SAT más rápido en flujos de alto volumen.",
  },
  {
    title: "Exporta resultados",
    description:
      "Comparte hallazgos con tu equipo contable y prioriza correcciones críticas.",
  },
  {
    title: "Ideal para contadores y despachos",
    description:
      "Diseñado para despachos que administran múltiples clientes y cierres con tiempos exigentes.",
  },
];

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
            Validación de XML en lote
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-700 md:text-base">
            Automatiza la revisión de muchos CFDI en una sola corrida. Ideal para
            despachos y empresas que necesitan velocidad, control y trazabilidad.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/cfdi-batch-validator"
              className="inline-flex items-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800"
            >
              Probar lote XML
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
      </div>
    </main>
  );
}

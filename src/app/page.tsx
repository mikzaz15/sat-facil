import Link from "next/link";

const FEATURES = [
  {
    title: "Validación CFDI 4.0",
    description:
      "Revisa campos clave, coherencia entre catálogos SAT y configuraciones de timbrado antes de emitir.",
  },
  {
    title: "Explicación de errores SAT",
    description:
      "Ingresa el código de error y obtén una explicación clara con causa probable y acción recomendada.",
  },
  {
    title: "Corrección automática de XML",
    description:
      "Detecta discrepancias comunes y genera propuesta de corrección lista para revisión y descarga.",
  },
];

const STEPS = [
  "Subir XML",
  "Detectar error",
  "Corregir",
  "Descargar XML",
];

export default function HomePage() {
  return (
    <main className="bg-gradient-to-b from-slate-50 via-white to-sky-50/40">
      <section className="mx-auto w-full max-w-6xl px-4 pb-14 pt-12 md:px-6 md:pt-16">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm backdrop-blur md:p-10">
          <p className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-800">
            SAT Fácil para contadores
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            Valida y corrige CFDI antes de timbrar
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-700 md:text-lg">
            Evita errores del SAT y rechazos del PAC en segundos.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Usado por contadores y despachos para prevenir rechazos del SAT.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/cfdi-xml-validator"
              className="inline-flex items-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800"
            >
              Subir XML gratis
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center px-1 py-2.5 text-sm font-medium text-slate-600 underline-offset-4 transition hover:text-slate-900 hover:underline"
            >
              Ver planes
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl font-semibold text-slate-900">Funciones clave</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Cómo funciona</h2>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
            {STEPS.map((step, index) => (
              <div key={step} className="flex items-center gap-2">
                <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1">
                  {step}
                </span>
                {index < STEPS.length - 1 ? (
                  <span className="text-slate-400" aria-hidden="true">
                    →
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <div className="rounded-2xl border border-slate-900 bg-slate-900 p-6 text-slate-100 shadow-sm md:p-8">
          <h2 className="text-2xl font-semibold">Elige tu plan</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Empieza gratis y escala a Pro para trabajar con mayor velocidad y
            menos rechazos al timbrar.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="rounded-xl border border-slate-700 bg-slate-800/80 p-4">
              <p className="text-sm font-semibold text-white">Free</p>
              <p className="mt-1 text-xs text-slate-300">Ideal para comenzar</p>
              <ul className="mt-3 space-y-1 text-sm text-slate-200">
                <li>5 validaciones CFDI por día</li>
                <li>Diagnóstico de errores SAT</li>
                <li>Vista previa de correcciones</li>
              </ul>
            </article>
            <article className="rounded-xl border border-sky-300 bg-sky-100 p-4 text-slate-900">
              <p className="text-sm font-semibold">Pro</p>
              <p className="mt-1 text-xs">Para despachos y operación diaria</p>
              <ul className="mt-3 space-y-1 text-sm">
                <li>Validaciones ilimitadas</li>
                <li>Descarga de XML corregido</li>
                <li>Asistente SAT y validación avanzada</li>
              </ul>
            </article>
          </div>
          <div className="mt-6">
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Comparar Free vs Pro
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 md:flex-row md:items-center md:justify-between md:px-6">
          <p>SAT Fácil · Validación CFDI para contadores en México</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/validate-cfdi" className="hover:text-slate-900">
              Validar CFDI
            </Link>
            <Link href="/cfdi-xml-validator" className="hover:text-slate-900">
              Validar XML CFDI
            </Link>
            <Link href="/cfdi-error-explainer" className="hover:text-slate-900">
              Explicar error SAT
            </Link>
            <Link href="/chat" className="hover:text-slate-900">
              Asistente SAT
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

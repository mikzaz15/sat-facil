import Link from "next/link";

const FEATURES = [
  {
    title: "Detecta errores CFDI",
    description:
      "Revisa configuraciones CFDI 4.0 y detecta inconsistencias antes de timbrar.",
  },
  {
    title: "Explica errores SAT",
    description:
      "Obtén una explicación clara de errores como CFDI40102 y cómo solucionarlos.",
  },
  {
    title: "Corrige XML automáticamente",
    description:
      "Genera una propuesta de corrección lista para descargar.",
  },
];

const STEPS = [
  "Subir XML o lote",
  "Detectar errores SAT",
  "Corregir automáticamente",
  "Descargar XML corregido",
];

const COMMON_ERRORS = ["CFDI40102", "CFDI40138", "CFDI40148", "CFDI40160"];

export default function HomePage() {
  return (
    <main className="bg-gradient-to-b from-slate-50 via-white to-sky-50/40">
      <section className="mx-auto w-full max-w-6xl px-4 pb-12 pt-12 md:px-6 md:pt-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
          <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <p className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-800">
                SAT Fácil para contadores
              </p>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
                Valida y corrige CFDI antes de timbrar
              </h1>
              <p className="mt-5 max-w-2xl whitespace-pre-line text-lg leading-8 text-slate-700 md:text-xl">
                Detecta errores del SAT en segundos y corrige XML automáticamente.
                {"\n"}
                Valida uno o cientos de XML en segundos.
                {"\n"}
                Usado por contadores y despachos para evitar rechazos del PAC.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href="/cfdi-xml-validator"
                  className="inline-flex items-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800"
                >
                  Subir XML gratis
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Ver planes
                </Link>
              </div>
              <p className="mt-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900">
                5 validaciones gratis al día · No requiere tarjeta
              </p>
            </div>

            <aside className="rounded-2xl border border-sky-100 bg-sky-50/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
                Qué resuelve SAT Fácil
              </p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li className="rounded-lg border border-sky-100 bg-white px-3 py-2">
                  Detecta errores CFDI antes de timbrar
                </li>
                <li className="rounded-lg border border-sky-100 bg-white px-3 py-2">
                  Corrige XML automáticamente
                </li>
                <li className="rounded-lg border border-sky-100 bg-white px-3 py-2">
                  Procesa XML en lote para despachos
                </li>
              </ul>
            </aside>
          </div>
          <p className="mt-5 border-t border-slate-200 pt-4 text-sm text-slate-600">
            Diseñado para contadores y despachos en México. Compatible con CFDI
            4.0.
          </p>
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
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {STEPS.map((step, index) => (
              <article
                key={step}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Paso {index + 1}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{step}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-900 to-sky-800 p-6 text-sky-50 shadow-sm md:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold text-white">
              Procesa muchos CFDI en segundos
            </h2>
            <span className="rounded-full border border-sky-100/40 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-50">
              Disponible en Pro
            </span>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-sky-100">
            Sube decenas o cientos de XML y detecta errores del SAT
            automáticamente.
          </p>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-sky-100">
            Ideal para despachos contables que revisan grandes volúmenes de
            facturas.
          </p>
          <div className="mt-5 grid gap-2 text-sm text-slate-900 md:grid-cols-2">
            <div className="rounded-lg border border-sky-200 bg-white px-3 py-2">
              Subir lote de XML
            </div>
            <div className="rounded-lg border border-sky-200 bg-white px-3 py-2">
              Detectar errores SAT
            </div>
            <div className="rounded-lg border border-sky-200 bg-white px-3 py-2">
              Exportar resultados
            </div>
            <div className="rounded-lg border border-sky-200 bg-white px-3 py-2">
              Descargar XML corregidos
            </div>
          </div>
          <Link
            href="/pricing"
            className="mt-7 inline-flex items-center rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-400"
          >
            Ver Pro
          </Link>
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
                <li>Procesamiento en lote (Lote XML)</li>
                <li>Descarga de XML corregido</li>
                <li>Asistente SAT</li>
              </ul>
            </article>
          </div>
          <div className="mt-6">
            <Link
              href="/precios"
              className="inline-flex items-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Comparar Free vs Pro
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            Errores CFDI más comunes
          </h2>
          <p className="mt-2 text-sm text-slate-700">
            Consulta guías rápidas para resolver errores SAT frecuentes.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {COMMON_ERRORS.map((code) => (
              <Link
                key={code}
                href={`/errores/${code}`}
                className="rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:border-sky-300 hover:bg-sky-100"
              >
                {code} · Ver explicación
              </Link>
            ))}
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
            <Link href="/validar-xml" className="hover:text-slate-900">
              Guía Validar XML
            </Link>
            <Link href="/lote-xml" className="hover:text-slate-900">
              Lote XML
            </Link>
            <Link href="/precios" className="hover:text-slate-900">
              Precios
            </Link>
            <Link href="/contacto" className="hover:text-slate-900">
              Contacto
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

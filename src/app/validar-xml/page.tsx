import Link from "next/link";

const VALIDATIONS = [
  "Campos clave de CFDI 4.0 (método de pago, forma de pago, uso CFDI, régimen fiscal).",
  "Compatibilidad de datos antes de timbrar para reducir rechazos del PAC.",
  "Coherencia general de configuración para emisión más segura.",
];

const COMMON_ERRORS = [
  "Inconsistencias de método y forma de pago.",
  "Uso CFDI incompatible con el contexto del comprobante.",
  "Errores frecuentes reportados por PAC, como CFDI40138 y CFDI40221 (ejemplos).",
];

const STEPS = [
  "Sube tu XML CFDI o captura los datos básicos.",
  "SAT Fácil valida reglas clave y detecta inconsistencias.",
  "Revisa recomendaciones para corregir antes de timbrar.",
];

export default function ValidarXmlMarketingPage() {
  return (
    <main className="bg-gradient-to-b from-slate-50 via-white to-sky-50/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-6 md:py-14">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
            SAT Fácil
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            Validar XML CFDI en línea
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-700 md:text-base">
            SAT Fácil te ayuda a revisar CFDI 4.0 antes de timbrar para detectar
            errores del SAT y reducir retrabajo operativo en tu despacho o empresa.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/cfdi-xml-validator"
              className="inline-flex items-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800"
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

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            Qué valida SAT Fácil
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {VALIDATIONS.map((item) => (
              <li key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            Errores comunes que detecta
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {COMMON_ERRORS.map((item) => (
              <li key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Cómo funciona</h2>
          <ol className="mt-4 space-y-2 text-sm text-slate-700">
            {STEPS.map((step, index) => (
              <li
                key={step}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <span className="font-semibold text-slate-900">Paso {index + 1}:</span>{" "}
                {step}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}

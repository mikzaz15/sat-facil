import Link from "next/link";
import CfdiXmlValidatorTool from "@/components/sat/cfdi-xml-validator-tool";

const HIGHLIGHTS = [
  "Qué valida SAT Fácil",
  "Qué errores detecta",
  "Compatibilidad CFDI 4.0",
];

const TRUST_BULLETS = [
  "Compatible CFDI 4.0",
  "Validación en segundos",
  "Sin registro requerido",
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
            Validador XML CFDI 4.0 Gratis
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-700 md:text-base">
            Sube tu archivo XML y detecta errores SAT antes de timbrar.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="#validador"
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
          <div className="flex flex-wrap gap-2 pt-1 text-sm text-slate-700">
            {TRUST_BULLETS.map((bullet) => (
              <span
                key={bullet}
                className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-900"
              >
                ✓ {bullet}
              </span>
            ))}
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            Qué valida SAT Fácil
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            SAT Fácil revisa campos clave del CFDI, detecta inconsistencias SAT
            frecuentes y te da un diagnóstico claro para emitir con mayor seguridad.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {HIGHLIGHTS.map((item, index) => (
              <li
                key={item}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <span className="font-semibold text-slate-900">{index + 1}. </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section id="validador" className="scroll-mt-24">
          <h2 className="text-2xl font-semibold text-slate-900">Sube tu XML</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
            Usa la herramienta de validación para analizar tu CFDI directamente
            desde esta página.
          </p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <CfdiXmlValidatorTool />
          </div>
        </section>
      </div>
    </main>
  );
}

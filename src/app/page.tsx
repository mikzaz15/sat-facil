import fs from "node:fs";
import path from "node:path";

import Image from "next/image";
import Link from "next/link";

const TRUST_BADGES = [
  "Compatible CFDI 4.0",
  "Sin tarjeta requerida",
  "Resultados en segundos",
];

const FEATURES = [
  {
    title: "Validación XML CFDI",
    description: "Verifica estructura y errores SAT automáticamente.",
  },
  {
    title: "Validación en Lote",
    description: "Sube múltiples XML y procesa resultados rápidamente.",
  },
  {
    title: "Detección de Errores SAT",
    description: "Identifica problemas antes del timbrado.",
  },
  {
    title: "Corrección XML",
    description: "Recibe sugerencias para corregir errores comunes.",
  },
];

const USE_CASES = [
  {
    title: "Contadores",
    description: "Revisa múltiples CFDI rápidamente.",
  },
  {
    title: "Despachos Contables",
    description: "Automatiza revisiones antes del timbrado.",
  },
  {
    title: "Empresas",
    description: "Detecta errores antes de enviar facturas.",
  },
];

const FAQ = [
  {
    question: "¿Funciona con CFDI 4.0?",
    answer: "Sí, SAT Fácil es compatible con CFDI 4.0.",
  },
  {
    question: "¿Necesito tarjeta para probar?",
    answer: "No, puedes probar gratis.",
  },
  {
    question: "¿Qué errores detecta?",
    answer: "Errores estructurales SAT comunes.",
  },
  {
    question: "¿Puedo validar múltiples XML?",
    answer: "Sí, con el plan Pro.",
  },
];

function getScreenshotFiles(): string[] {
  const screenshotsDir = path.join(process.cwd(), "public", "screenshots");
  if (!fs.existsSync(screenshotsDir)) return [];

  const allowedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);
  return fs
    .readdirSync(screenshotsDir)
    .filter((name) => allowedExtensions.has(path.extname(name).toLowerCase()))
    .sort()
    .slice(0, 3);
}

export default function HomePage() {
  const screenshots = getScreenshotFiles();

  return (
    <main className="bg-gradient-to-b from-slate-50 via-white to-sky-50/40">
      <section className="mx-auto w-full max-w-6xl px-4 pb-8 pt-12 md:px-6 md:pt-16">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
          <p className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-800">
            SAT Fácil
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            Valida CFDI y detecta errores SAT en segundos
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-700 md:text-lg">
            Sube tu XML y detecta errores antes de timbrar. Compatible con CFDI
            4.0.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/cfdi-xml-validator"
              className="inline-flex items-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800"
            >
              Probar Gratis
            </Link>
            <Link
              href="/precios"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Ver Precios
            </Link>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-sm text-slate-700">
            {TRUST_BADGES.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-900"
              >
                ✓ {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            Detecta errores del SAT antes de timbrar
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
            Sube un XML CFDI y obtén un diagnóstico claro para detectar errores
            SAT.
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ejemplo de error detectado
          </p>
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-900">
              CFDI40138 – UsoCFDI inválido para el receptor
            </p>
          </div>
          <Link
            href="/cfdi-xml-validator"
            className="mt-5 inline-flex items-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800"
          >
            Ir al validador XML
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <h2 className="text-2xl font-semibold text-slate-900">Funciones clave</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
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
        <h2 className="text-2xl font-semibold text-slate-900">
          Para quién es SAT Fácil
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {USE_CASES.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            Así funciona SAT Fácil
          </h2>
          <p className="mt-2 text-sm text-slate-700">
            Vista general del flujo de validación y revisión antes del timbrado.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {screenshots.length > 0
              ? screenshots.map((file) => (
                  <div
                    key={file}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <Image
                      src={`/screenshots/${file}`}
                      alt={`Pantalla SAT Fácil ${file}`}
                      width={1200}
                      height={700}
                      className="h-40 w-full object-cover"
                    />
                  </div>
                ))
              : [1, 2, 3].map((slot) => (
                  <div
                    key={slot}
                    className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500"
                  >
                    Screenshot próximamente
                  </div>
                ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
        <div className="rounded-2xl border border-slate-900 bg-slate-900 p-6 text-slate-100 shadow-sm md:p-8">
          <h2 className="text-2xl font-semibold">Planes</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <article className="rounded-xl border border-slate-700 bg-slate-800/80 p-4">
              <p className="text-sm font-semibold text-white">Gratis</p>
              <ul className="mt-3 space-y-1 text-sm text-slate-200">
                <li>5 validaciones</li>
              </ul>
            </article>
            <article className="rounded-xl border border-sky-300 bg-sky-100 p-4 text-slate-900">
              <p className="text-sm font-semibold">Pro</p>
              <ul className="mt-3 space-y-1 text-sm">
                <li>Validación en lote</li>
                <li>Corrección XML</li>
                <li>Funciones avanzadas</li>
              </ul>
            </article>
          </div>
          <Link
            href="/precios"
            className="mt-6 inline-flex items-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Ver Precios
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-10 pt-8 md:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">
            Preguntas frecuentes
          </h2>
          <div className="mt-4 space-y-3">
            {FAQ.map((item) => (
              <article key={item.question} className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">{item.question}</h3>
                <p className="mt-1 text-sm text-slate-700">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white/80">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 md:flex-row md:items-center md:justify-between md:px-6">
          <p>SAT Fácil · Validación CFDI para contadores en México</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/validar-xml" className="hover:text-slate-900">
              Validar XML
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
            <Link href="/errores-cfdi" className="hover:text-slate-900">
              Errores CFDI
            </Link>
            <Link href="/errores-sat" className="hover:text-slate-900">
              Biblioteca errores SAT
            </Link>
            <Link href="/integraciones" className="hover:text-slate-900">
              Integraciones
            </Link>
            <Link href="/ayuda" className="hover:text-slate-900">
              Ayuda
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Guías CFDI y Recursos SAT",
  description:
    "Guías prácticas de SAT Fácil para validar XML, revisar errores SAT, usar validación en lote y elegir el plan adecuado.",
};

const GUIDE_LINKS = [
  {
    href: "/validar-xml",
    title: "Validar XML CFDI",
    description:
      "Aprende cómo validar un XML paso a paso y detectar errores antes de timbrar.",
  },
  {
    href: "/lote-xml",
    title: "Validación en lote",
    description:
      "Procesa múltiples XML en un solo flujo para ahorrar tiempo en operación contable.",
  },
  {
    href: "/errores-sat",
    title: "Biblioteca de errores SAT",
    description:
      "Consulta qué significan los errores CFDI más comunes y cómo resolverlos.",
  },
  {
    href: "/ayuda",
    title: "Centro de ayuda",
    description:
      "Resuelve dudas frecuentes sobre validación, corrección y uso de SAT Fácil.",
  },
  {
    href: "/precios",
    title: "Planes y precios",
    description:
      "Compara plan Gratis y Pro para elegir la capacidad adecuada para tu equipo.",
  },
];

export default function GuiasPage() {
  return (
    <main className="bg-gradient-to-b from-slate-50 via-white to-sky-50/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-6 md:py-14">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
            SAT Fácil
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            Guías CFDI y Recursos SAT
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-700 md:text-base">
            Encuentra recursos rápidos para validar CFDI, interpretar errores SAT y
            optimizar tu flujo antes del timbrado.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {GUIDE_LINKS.map((item) => (
            <article
              key={item.href}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {item.description}
              </p>
              <Link
                href={item.href}
                className="mt-4 inline-flex items-center text-sm font-semibold text-sky-700 hover:text-sky-800"
              >
                Ir a la guía
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

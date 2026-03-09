import Link from "next/link";

const HELP_SECTIONS = [
  {
    title: "Cómo validar un XML CFDI",
    description:
      "Sube tu archivo XML en el validador, revisa el diagnóstico y corrige antes de timbrar.",
    href: "/cfdi-xml-validator",
    cta: "Ir al validador XML",
  },
  {
    title: "Cómo usar validación en lote",
    description:
      "Carga varios XML para evaluar muchos CFDI en una sola corrida y acelerar revisiones.",
    href: "/cfdi-batch-validator",
    cta: "Ir a validación en lote",
  },
  {
    title: "Cómo interpretar errores SAT",
    description:
      "Consulta descripciones y acciones sugeridas para resolver errores CFDI frecuentes.",
    href: "/errores-cfdi",
    cta: "Ver errores CFDI",
  },
  {
    title: "Cómo actualizar a Pro",
    description:
      "Activa el plan Pro para funciones avanzadas como lote y capacidades extendidas.",
    href: "/precios",
    cta: "Ver planes",
  },
];

export default function AyudaPage() {
  return (
    <main className="bg-gradient-to-b from-slate-50 via-white to-sky-50/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-6 md:py-14">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
            SAT Fácil
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            Centro de Ayuda SAT Fácil
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-700 md:text-base">
            Encuentra guías rápidas para validar CFDI, entender errores SAT y sacar
            mayor provecho de la plataforma.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {HELP_SECTIONS.map((item) => (
            <article
              key={item.title}
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
                {item.cta}
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

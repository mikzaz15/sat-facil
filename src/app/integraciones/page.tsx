import Link from "next/link";

const INTEGRATION_SECTIONS = [
  {
    title: "Zapier",
    description:
      "Automatiza flujos entre SAT Fácil y otras herramientas sin desarrollo complejo.",
  },
  {
    title: "Google Sheets",
    description:
      "Centraliza resultados de validación y seguimiento operativo en hojas compartidas.",
  },
  {
    title: "API",
    description:
      "Integra validaciones CFDI en tus sistemas internos para revisar antes de timbrar.",
  },
  {
    title: "Webhooks",
    description:
      "Recibe eventos y notificaciones para disparar acciones automáticas en tu stack.",
  },
];

export default function IntegracionesPage() {
  return (
    <main className="bg-gradient-to-b from-slate-50 via-white to-sky-50/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-6 md:py-14">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
            SAT Fácil
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            Integra SAT Fácil con tus herramientas
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-700 md:text-base">
            Conecta SAT Fácil con tus procesos actuales para validar CFDI más
            rápido y con menos retrabajo.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {INTEGRATION_SECTIONS.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {item.description}
              </p>
            </article>
          ))}
        </section>

        <section>
          <Link
            href="/signup"
            className="inline-flex items-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800"
          >
            Crear cuenta gratis
          </Link>
        </section>
      </div>
    </main>
  );
}

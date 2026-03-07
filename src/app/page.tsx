import Link from "next/link";

const TOOL_LINKS = [
  {
    title: "Validar CFDI",
    href: "/validate-cfdi",
    description:
      "Revisa tu configuración CFDI antes de emitir para prevenir rechazos del SAT.",
  },
  {
    title: "Subir XML",
    href: "/cfdi-xml-validator",
    description:
      "Carga un XML CFDI y valida sus campos con reglas SAT en segundos.",
  },
  {
    title: "Consultar error SAT",
    href: "/cfdi-error-explainer",
    description:
      "Busca un código de error SAT/PAC y obtén causa y corrección recomendada.",
  },
  {
    title: "Preguntar al asistente SAT",
    href: "/chat",
    description:
      "Consulta dudas CFDI con evidencia SAT para tomar decisiones con más certeza.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-4 py-8">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-slate-900">SAT Fácil</h1>
        <p className="text-lg text-slate-800">
          Evita errores CFDI antes de timbrar tus facturas al SAT.
        </p>
        <p className="max-w-3xl text-sm text-slate-700">
          Valida la configuración de tus CFDI, detecta errores del SAT y obtén
          correcciones automáticas antes de emitir la factura.
        </p>
      </header>

      <nav className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <ul className="flex flex-wrap gap-2">
          {TOOL_LINKS.map((tool) => (
            <li key={tool.href}>
              <Link
                href={tool.href}
                className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                {tool.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {TOOL_LINKS.map((tool) => (
          <article
            key={tool.href}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900">{tool.title}</h2>
            <p className="mt-2 text-sm text-slate-700">{tool.description}</p>
            <Link
              href={tool.href}
              className="mt-4 inline-flex items-center rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-800"
            >
              Abrir herramienta
            </Link>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Planes</h2>
        <p className="mt-1 text-sm text-slate-700">
          Gratis: 5 validaciones/día. Pro ($9/mes): validaciones ilimitadas,
          Validar XML CFDI y Asistente SAT.
        </p>
        <Link
          href="/pricing"
          className="mt-4 inline-flex items-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Ver planes
        </Link>
      </section>
    </main>
  );
}

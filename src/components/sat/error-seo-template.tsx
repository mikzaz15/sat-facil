import Link from "next/link";

type SatErrorSeoTemplateProps = {
  code: string;
  meaning: string;
  whyItHappens: string[];
  howToFix: string[];
  xmlIncorrectExample: string;
};

export function SatErrorSeoTemplate({
  code,
  meaning,
  whyItHappens,
  howToFix,
  xmlIncorrectExample,
}: SatErrorSeoTemplateProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-8 md:px-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
          SAT Fácil
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Error {code} – Qué significa y cómo solucionarlo
        </h1>
        <p className="text-sm text-slate-700">
          Guía práctica para resolver el error {code} en CFDI 4.0 antes de
          timbrar.
        </p>
      </header>

      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <article>
          <h2 className="text-lg font-semibold text-slate-900">
            Qué significa el error
          </h2>
          <p className="mt-1 text-sm text-slate-700">{meaning}</p>
        </article>

        <article>
          <h2 className="text-lg font-semibold text-slate-900">Por qué ocurre</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {whyItHappens.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article>
          <h2 className="text-lg font-semibold text-slate-900">
            Cómo solucionarlo
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
            {howToFix.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </article>

        <article>
          <h2 className="text-lg font-semibold text-slate-900">
            Ejemplo de XML incorrecto
          </h2>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 p-3 text-xs leading-relaxed text-slate-100">
            <code>{xmlIncorrectExample}</code>
          </pre>
        </article>
      </section>

      <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          Valida tu XML para detectar este error automáticamente
        </h2>
        <p className="mt-1 text-sm text-slate-700">
          Sube tu CFDI en SAT Fácil y revisa errores antes de enviarlo al PAC.
        </p>
        <Link
          href="/cfdi-xml-validator"
          className="mt-3 inline-flex items-center rounded-md bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800"
        >
          Validar XML CFDI
        </Link>
      </section>
    </main>
  );
}

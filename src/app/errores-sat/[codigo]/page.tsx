import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getRelatedSatCfdiErrors,
  getSatCfdiErrorContent,
  listSatCfdiErrorCodes,
  listSatCfdiErrorCodesForStaticPages,
  normalizeSatErrorCode,
} from "@/lib/sat/error-library";

type ErrorPageParams = Promise<{ codigo: string }>;

function toAbsoluteBaseUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  const fallback = "https://www.satfacil.com.mx";
  if (!configured) return fallback;

  const withProtocol = /^https?:\/\//i.test(configured)
    ? configured
    : `https://${configured}`;

  try {
    const parsed = new URL(withProtocol);
    return parsed.origin;
  } catch {
    return fallback;
  }
}

function codeFromParams(raw: string): string {
  return normalizeSatErrorCode(decodeURIComponent(raw || ""));
}

export async function generateStaticParams() {
  return listSatCfdiErrorCodesForStaticPages(100).map((code) => ({
    codigo: code.toLowerCase(),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: ErrorPageParams;
}): Promise<Metadata> {
  const { codigo } = await params;
  const normalizedCode = codeFromParams(codigo);
  const entry = getSatCfdiErrorContent(normalizedCode);

  if (!entry) {
    return {
      title: `Error ${normalizedCode || "CFDI"} | SAT Facil`,
      description: "El codigo solicitado no esta disponible en la biblioteca de errores SAT.",
      robots: { index: false, follow: false },
    };
  }

  const title = `${entry.code}: ${entry.title} | SAT Facil`;
  const description = `Que significa ${entry.code}, causas comunes y como solucionarlo antes de timbrar CFDI 4.0. Revisalo con SAT Facil.`;
  const baseUrl = toAbsoluteBaseUrl();
  const canonical = `${baseUrl}/errores-sat/${entry.code.toLowerCase()}`;

  return {
    title,
    description,
    keywords: entry.keywords,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      siteName: "SAT Facil",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function ErrorSatSeoPage({
  params,
}: {
  params: ErrorPageParams;
}) {
  const { codigo } = await params;
  const normalizedCode = codeFromParams(codigo);
  const entry = getSatCfdiErrorContent(normalizedCode);

  if (!entry) {
    notFound();
  }

  const related = getRelatedSatCfdiErrors(entry.code, 4);
  const fallbackRelated =
    related.length > 0
      ? related
      : listSatCfdiErrorCodes()
          .filter((code) => code !== entry.code)
          .slice(0, 4)
          .map((code) => getSatCfdiErrorContent(code))
          .filter((error): error is NonNullable<typeof error> => Boolean(error));

  return (
    <main className="bg-gradient-to-b from-slate-50 via-white to-sky-50/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-6 md:py-14">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
            Errores SAT
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            {entry.code}: {entry.title}
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-700 md:text-base">
            {entry.shortDescription}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/validar-xml"
              className="inline-flex items-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800"
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
            Que significa este error
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-700 md:text-base">
            {entry.description}
          </p>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              Mensaje SAT de ejemplo
            </p>
            <p className="mt-1 text-sm font-semibold text-amber-900">{entry.exampleMessage}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Causas comunes</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {entry.commonCauses.map((cause) => (
              <li
                key={cause}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                {cause}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Como solucionarlo</h2>
          <ol className="mt-4 space-y-2 text-sm text-slate-700">
            {entry.howToFix.map((step, index) => (
              <li
                key={step}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <span className="font-semibold text-slate-900">Paso {index + 1}: </span>
                {step}
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border border-sky-200 bg-sky-50 p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Resuelvelo antes de timbrar</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            SAT Facil te ayuda a detectar y corregir errores del SAT antes de enviar
            el XML al PAC, reduciendo rechazos y retrabajo operativo.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/validar-xml"
              className="inline-flex items-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800"
            >
              {entry.validatorCtaLabel}
            </Link>
            <Link
              href="/lote-xml"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              Ver validacion en lote
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Errores relacionados</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {fallbackRelated.slice(0, 4).map((related) => (
              <Link
                key={related.code}
                href={`/errores-sat/${related.code.toLowerCase()}`}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-sky-300 hover:bg-sky-50"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {related.code}: {related.title}
                </p>
                <p className="mt-1 text-sm text-slate-700">{related.shortDescription}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Preguntas frecuentes</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <article className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900">Este error impide timbrar?</h3>
              <p className="mt-1">
                Generalmente si. {entry.code} suele bloquear el timbrado hasta corregir
                los datos indicados por la validacion.
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900">
                SAT Facil detecta este error automaticamente?
              </h3>
              <p className="mt-1">
                Si. Puedes cargar tu XML para revisar inconsistencias relacionadas con
                {" "}
                {entry.code} antes de enviarlo al PAC.
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900">
                Puedo corregirlo antes de enviarlo al PAC?
              </h3>
              <p className="mt-1">
                Si, la recomendacion es ajustar la configuracion y volver a validar el
                XML para confirmar que el error quedo resuelto.
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900">
                Tambien aplica para CFDI 4.0?
              </h3>
              <p className="mt-1">
                Si. Esta guia esta orientada a escenarios de CFDI 4.0 y validaciones
                habituales en procesos de timbrado.
              </p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}

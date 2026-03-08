import type { Metadata } from "next";
import Link from "next/link";

import {
  getSatErrorLibraryEntry,
  listSatErrorCodesForStaticPages,
  normalizeSatErrorCode,
} from "@/lib/sat/error-library";

type ErrorPageParams = Promise<{ codigo: string }>;

function normalizeCodeFromParams(raw: string): string {
  return normalizeSatErrorCode(decodeURIComponent(raw || ""));
}

export async function generateMetadata({
  params,
}: {
  params: ErrorPageParams;
}): Promise<Metadata> {
  const { codigo } = await params;
  const normalizedCode = normalizeCodeFromParams(codigo) || "CFDI";
  const lowerCode = normalizedCode.toLowerCase();

  return {
    title: `Error ${normalizedCode} SAT / CFDI – Qué significa y cómo solucionarlo`,
    description: `Aprende qué significa el error ${normalizedCode} del SAT en CFDI 4.0, por qué ocurre y cómo solucionarlo fácilmente. Valida tu XML CFDI gratis.`,
    keywords: [
      `error ${lowerCode}`,
      `${lowerCode} sat`,
      `como solucionar ${lowerCode}`,
      `error ${normalizedCode} CFDI 4.0`,
      `solucion ${normalizedCode} SAT`,
    ],
  };
}

export async function generateStaticParams() {
  return listSatErrorCodesForStaticPages(20).map((code) => ({
    codigo: code,
  }));
}

export default async function ErrorLibraryPage({
  params,
}: {
  params: ErrorPageParams;
}) {
  const { codigo } = await params;
  const normalizedCode = normalizeCodeFromParams(codigo);
  const entry = getSatErrorLibraryEntry(normalizedCode);

  const meaning = entry?.meaning
    ? entry.meaning
    : "Código no mapeado todavía en la librería local de errores SAT.";
  const whyItHappens = entry?.why_it_happens?.length
    ? entry.why_it_happens
    : [
        "Puede haber incompatibilidades entre campos obligatorios del CFDI.",
        "El PAC puede rechazar por formato, catálogos SAT o reglas de negocio.",
      ];
  const howToFix = entry?.how_to_fix?.length
    ? entry.how_to_fix
    : [
        "Verifica campos obligatorios y catálogos vigentes.",
        "Vuelve a validar el XML antes de timbrar.",
      ];
  const example =
    entry?.example ||
    "Antes de timbrar, valida el XML y ajusta el campo marcado por el error.";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
          SAT Fácil
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Error {normalizedCode || codigo} SAT / CFDI
        </h1>
        <p className="text-sm text-slate-700">
          Biblioteca de errores SAT para validar y corregir CFDI con criterios
          prácticos. Si necesitas validar tu XML, usa el{" "}
          <Link href="/cfdi-xml-validator" className="font-medium text-sky-700 underline">
            validador CFDI
          </Link>
          .
        </p>
      </header>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <article>
          <h2 className="text-lg font-semibold text-slate-900">Qué significa</h2>
          <p className="mt-1 text-sm text-slate-700">{meaning}</p>
        </article>

        <article>
          <h2 className="text-lg font-semibold text-slate-900">Por qué ocurre</h2>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {whyItHappens.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article>
          <h2 className="text-lg font-semibold text-slate-900">
            Cómo solucionarlo
          </h2>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-700">
            {howToFix.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </article>

        <article>
          <h2 className="text-lg font-semibold text-slate-900">Ejemplo práctico</h2>
          <p className="mt-1 text-sm text-slate-700">{example}</p>
        </article>
      </section>

      <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          Valida tu XML CFDI gratis
        </h2>
        <p className="mt-1 text-sm text-slate-700">
          Sube tu XML y revisa errores SAT antes de timbrar.
        </p>
        <Link
          href="/cfdi-xml-validator"
          className="mt-3 inline-flex items-center rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-800"
        >
          Probar validador CFDI
        </Link>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          Búsquedas frecuentes relacionadas
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>{`error ${(normalizedCode || codigo).toLowerCase()}`}</li>
          <li>{`${(normalizedCode || codigo).toLowerCase()} sat`}</li>
          <li>{`como solucionar ${(normalizedCode || codigo).toLowerCase()}`}</li>
        </ul>
      </section>

      <section className="flex flex-wrap gap-2">
        <Link
          href="/cfdi-xml-validator"
          className="inline-flex items-center rounded-md bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800"
        >
          Validar XML CFDI
        </Link>
        <Link
          href="/pricing"
          className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          Ver planes
        </Link>
      </section>
    </main>
  );
}

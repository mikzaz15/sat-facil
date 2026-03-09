"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { SatCfdiErrorContent } from "@/lib/sat/error-library";

const FEATURED_CODES = [
  "CFDI40138",
  "CFDI40103",
  "CFDI40221",
  "CFDI40115",
  "CFDI40161",
  "CFDI40148",
];

type ErroresSatIndexClientProps = {
  errors: SatCfdiErrorContent[];
};

export function ErroresSatIndexClient({ errors }: ErroresSatIndexClientProps) {
  const [query, setQuery] = useState("");

  const featuredErrors = useMemo(() => {
    const byCode = new Map(errors.map((error) => [error.code, error]));
    return FEATURED_CODES.map((code) => byCode.get(code)).filter(
      (error): error is SatCfdiErrorContent => Boolean(error),
    );
  }, [errors]);

  const filteredErrors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return errors;

    return errors.filter((error) => {
      return (
        error.code.toLowerCase().includes(normalizedQuery) ||
        error.title.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [errors, query]);

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Errores prioritarios</h2>
        <p className="mt-2 text-sm text-slate-700">
          Estos errores suelen aparecer con frecuencia en procesos de facturación CFDI.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {featuredErrors.map((error) => (
            <Link
              key={error.code}
              href={`/errores-sat/${error.code.toLowerCase()}`}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-sky-300 hover:bg-sky-50"
            >
              <p className="text-sm font-semibold text-slate-900">
                {error.code}: {error.title}
              </p>
              <p className="mt-1 text-sm text-slate-700">{error.shortDescription}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Buscar error SAT</h2>
        <p className="mt-2 text-sm text-slate-700">
          Filtra por código o título para encontrar más rápido la guía de solución.
        </p>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ejemplo: CFDI40138 o uso CFDI"
          className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-200 transition focus:ring-2"
        />
        <p className="mt-2 text-xs text-slate-500">
          Mostrando {filteredErrors.length} resultado(s).
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-slate-900">Directorio de errores</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {filteredErrors.map((error) => (
            <article
              key={error.code}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-sm font-semibold text-slate-900">
                {error.code}: {error.title}
              </p>
              <p className="mt-1 text-sm text-slate-700">{error.shortDescription}</p>
              <Link
                href={`/errores-sat/${error.code.toLowerCase()}`}
                className="mt-3 inline-flex items-center text-sm font-semibold text-sky-700 hover:text-sky-800"
              >
                Ver solución
              </Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

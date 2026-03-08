"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AnalyticsTopItem = {
  key: string;
  count: number;
};

type AnalyticsSummary = {
  totalValidations: number;
  totalErrorsDetected: number;
  totalDownloads: number;
  topErrorCodes: AnalyticsTopItem[];
  topDetectedRules: AnalyticsTopItem[];
};

type AnalyticsPayload = {
  ok: boolean;
  data?: AnalyticsSummary;
  error?: string;
};

function NumberCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    </article>
  );
}

function TopList({
  title,
  emptyMessage,
  rows,
}: {
  title: string;
  emptyMessage: string;
  rows: AnalyticsTopItem[];
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">{emptyMessage}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <span className="text-sm font-medium text-slate-800">{row.key}</span>
              <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">
                {row.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAnalytics() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/sat/analytics");
        const payload = (await response.json()) as AnalyticsPayload;
        if (!active) return;

        if (response.status === 401) {
          setAuthRequired(true);
          setSummary(null);
          return;
        }

        if (!response.ok || !payload.ok || !payload.data) {
          setError(payload.error || "No se pudo cargar analytics.");
          setSummary(null);
          return;
        }

        setAuthRequired(false);
        setSummary(payload.data);
      } catch {
        if (!active) return;
        setError("Error de conexión al cargar analytics.");
        setSummary(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadAnalytics();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
          SAT Fácil
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Analytics interno
        </h1>
        <p className="text-sm text-slate-700">
          Resumen de uso por cuenta para validaciones CFDI y correcciones XML.
        </p>
      </header>

      {loading ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          Cargando analytics...
        </section>
      ) : null}

      {!loading && authRequired ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-sm text-amber-900">
            Inicia sesión para consultar analytics.
          </p>
          <Link
            href="/login?next=/analytics"
            className="mt-3 inline-flex rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Iniciar sesión
          </Link>
        </section>
      ) : null}

      {!loading && !authRequired && summary ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <NumberCard
              label="Total validaciones"
              value={summary.totalValidations}
            />
            <NumberCard
              label="Total errores detectados"
              value={summary.totalErrorsDetected}
            />
            <NumberCard
              label="Total descargas"
              value={summary.totalDownloads}
            />
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <TopList
              title="Top códigos de error"
              emptyMessage="Sin códigos de error registrados."
              rows={summary.topErrorCodes}
            />
            <TopList
              title="Top reglas SAT detectadas"
              emptyMessage="Sin reglas detectadas todavía."
              rows={summary.topDetectedRules}
            />
          </section>
        </>
      ) : null}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </main>
  );
}

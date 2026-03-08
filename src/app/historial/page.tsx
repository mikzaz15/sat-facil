"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";

type ValidationHistoryIssue = {
  type: "error" | "warning";
  code: string;
  message: string;
  fix: string;
};

type ValidationHistoryRow = {
  id: string;
  file_name: string;
  result: "OK" | "Error" | "Warning";
  detected_errors: ValidationHistoryIssue[];
  created_at: string;
};

type HistoryPayload = {
  ok: boolean;
  data?: ValidationHistoryRow[];
  error?: string;
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function HistorialPage() {
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<ValidationHistoryRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/sat/validation-history?limit=100");
        const payload = (await response.json()) as HistoryPayload;

        if (!active) return;
        if (response.status === 401) {
          setAuthRequired(true);
          setRows([]);
          return;
        }
        if (!response.ok || !payload.ok || !payload.data) {
          setError(payload.error || "No se pudo cargar el historial.");
          setRows([]);
          return;
        }

        setAuthRequired(false);
        setRows(payload.data);
      } catch {
        if (!active) return;
        setError("Error de conexión al cargar el historial.");
        setRows([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadHistory();
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        if (row.result === "OK") acc.ok += 1;
        if (row.result === "Warning") acc.warning += 1;
        if (row.result === "Error") acc.error += 1;
        return acc;
      },
      { ok: 0, warning: 0, error: 0 },
    );
  }, [rows]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
          SAT Fácil
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Historial de validaciones CFDI
        </h1>
        <p className="text-sm text-slate-700">
          Consulta validaciones manuales y XML, con detalle de errores y
          advertencias detectadas por ejecución.
        </p>
      </header>

      {loading ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          Cargando historial...
        </section>
      ) : null}

      {!loading && authRequired ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-sm text-amber-900">
            Inicia sesión para ver tu historial de validaciones.
          </p>
          <Link
            href="/login?next=/historial"
            className="mt-3 inline-flex rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Iniciar sesión
          </Link>
        </section>
      ) : null}

      {!loading && !authRequired ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
              OK: {summary.ok}
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 font-medium text-amber-700">
              Warning: {summary.warning}
            </span>
            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 font-medium text-red-700">
              Error: {summary.error}
            </span>
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-slate-600">
              Aún no tienes validaciones registradas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm text-slate-800">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Archivo</th>
                    <th className="px-3 py-2">Resultado</th>
                    <th className="px-3 py-2">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((row) => {
                    const isExpanded = expandedId === row.id;
                    return (
                      <Fragment key={row.id}>
                        <tr
                          onClick={() =>
                            setExpandedId(isExpanded ? null : row.id)
                          }
                          className="cursor-pointer hover:bg-slate-50"
                        >
                          <td className="px-3 py-2 font-medium">{row.file_name}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                row.result === "OK"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : row.result === "Warning"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-red-50 text-red-700"
                              }`}
                            >
                              {row.result}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {formatDate(row.created_at)}
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr key={`${row.id}-details`}>
                            <td colSpan={3} className="bg-slate-50 px-3 py-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Detalles de validación
                              </p>
                              {row.detected_errors.length === 0 ? (
                                <p className="mt-1 text-sm text-slate-600">
                                  Sin errores o advertencias detalladas.
                                </p>
                              ) : (
                                <ul className="mt-2 space-y-2">
                                  {row.detected_errors.map((issue, index) => (
                                    <li
                                      key={`${row.id}-${issue.code}-${index}`}
                                      className={`rounded-md border p-3 text-sm ${
                                        issue.type === "error"
                                          ? "border-red-200 bg-red-50 text-red-900"
                                          : "border-amber-200 bg-amber-50 text-amber-900"
                                      }`}
                                    >
                                      <p className="font-semibold">
                                        {issue.code} · {issue.type.toUpperCase()}
                                      </p>
                                      <p className="mt-1">{issue.message}</p>
                                      <p className="mt-1">
                                        <span className="font-medium">Acción sugerida: </span>
                                        {issue.fix}
                                      </p>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </main>
  );
}

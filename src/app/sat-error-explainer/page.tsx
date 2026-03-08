"use client";

import { FormEvent, useState } from "react";

type ErrorExplainerResult = {
  error_code: string;
  explanation: string;
  how_to_fix: string[];
};

type ApiPayload = {
  ok: boolean;
  data?: ErrorExplainerResult;
  error?: string;
};

export default function SatErrorExplainerPage() {
  const [errorCode, setErrorCode] = useState("CFDI40138");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ErrorExplainerResult | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = errorCode.trim().toUpperCase();
    if (!code) {
      setError("Introduce un código de error SAT.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/cfdi-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error_code: code }),
      });
      const payload = (await response.json()) as ApiPayload;

      if (!response.ok || !payload.ok || !payload.data) {
        setResult(null);
        setError(payload.error || "No se pudo explicar el error SAT.");
        return;
      }

      setResult({
        error_code: payload.data.error_code,
        explanation: payload.data.explanation,
        how_to_fix: payload.data.how_to_fix ?? [],
      });
    } catch {
      setResult(null);
      setError("Error de conexión con /api/cfdi-error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
          SAT Fácil
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          SAT Error Explainer
        </h1>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm text-slate-800">
            <span className="font-medium">
              Introduce el código de error SAT
            </span>
            <input
              value={errorCode}
              onChange={(event) => setErrorCode(event.target.value.toUpperCase())}
              placeholder="CFDI40138"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-200 focus:ring"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? "Buscando..." : "Explicar error"}
          </button>
        </form>

        {error ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {!result ? (
          <p className="text-sm text-slate-600">
            Ingresa un código para consultar explicación y corrección.
          </p>
        ) : (
          <div className="space-y-4">
            <article className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                Error code
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {result.error_code}
              </p>
            </article>

            <article className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                Explanation
              </p>
              <p className="mt-1 text-sm text-slate-700">{result.explanation}</p>
            </article>

            <article className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                Suggested fix
              </p>
              {result.how_to_fix.length === 0 ? (
                <p className="mt-1 text-sm text-slate-700">
                  No hay corrección sugerida disponible.
                </p>
              ) : (
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-700">
                  {result.how_to_fix.map((fix) => (
                    <li key={fix}>{fix}</li>
                  ))}
                </ol>
              )}
            </article>
          </div>
        )}
      </section>
    </main>
  );
}

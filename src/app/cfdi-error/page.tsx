"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type SourceCitation = {
  title: string;
  url: string;
  publisher?: string;
};

type ErrorExplainerResult = {
  error_code: string;
  topic: string;
  explanation: string;
  why_it_occurs: string[];
  how_to_fix: string[];
  detected_rules: string[];
  sources: SourceCitation[];
};

type ApiPayload = {
  ok: boolean;
  data?: ErrorExplainerResult;
  error?: string;
};

export default function CfdiErrorPage() {
  const [errorCode, setErrorCode] = useState("CFDI40138");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ErrorExplainerResult | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = errorCode.trim().toUpperCase();
    if (!code) {
      setError("Captura un código de error SAT/PAC.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/cfdi-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error_code: code,
          context: context.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as ApiPayload;
      if (!response.ok || !payload.ok || !payload.data) {
        setResult(null);
        setError(payload.error || "No se pudo explicar el código.");
        return;
      }

      setResult(payload.data);
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
          Explicar error SAT
        </h1>
        <p className="text-sm text-slate-700">
          Entiende por qué aparece un error SAT/PAC y qué acciones tomar para
          corregirlo.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm text-slate-800">
            <span className="font-medium">Código de error</span>
            <input
              value={errorCode}
              onChange={(event) => setErrorCode(event.target.value.toUpperCase())}
              placeholder="CFDI40138"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-200 focus:ring"
            />
          </label>

          <label className="block text-sm text-slate-800">
            <span className="font-medium">Contexto (opcional)</span>
            <textarea
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="Ej. Factura de ingreso con MétodoPago PPD y forma_pago 03."
              className="mt-1 h-24 w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-200 focus:ring"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? "Analizando..." : "Explicar error"}
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
            Captura un código para mostrar explicación, causas y pasos de
            corrección.
          </p>
        ) : (
          <div className="space-y-4">
            <article className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                Código / Tópico
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {result.error_code} - {result.topic}
              </p>
            </article>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">Explicación</h2>
              <p className="mt-1 text-sm text-slate-700">{result.explanation}</p>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Por qué ocurre
              </h2>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {result.why_it_occurs.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">Cómo corregir</h2>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-700">
                {result.how_to_fix.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Reglas SAT detectadas
              </h2>
              {result.detected_rules.length === 0 ? (
                <p className="mt-1 text-sm text-slate-600">
                  Sin reglas específicas detectadas.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {result.detected_rules.map((rule) => (
                    <span
                      key={rule}
                      className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                    >
                      {rule}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">Fuentes</h2>
              {result.sources.length === 0 ? (
                <p className="mt-1 text-sm text-slate-600">Sin fuentes disponibles.</p>
              ) : (
                <ul className="mt-1 space-y-1 text-sm text-slate-700">
                  {result.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-700 hover:underline"
                      >
                        {source.title}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          Prueba herramientas SAT:
        </h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href="/validate-cfdi"
            className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Validar CFDI
          </Link>
          <Link
            href="/cfdi-xml-validator"
            className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Validar XML CFDI
          </Link>
          <Link
            href="/chat"
            className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Asistente SAT
          </Link>
        </div>
      </section>
    </main>
  );
}

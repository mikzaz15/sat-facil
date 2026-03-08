import type { Metadata } from "next";
import Link from "next/link";

import {
  explainCfdiError,
  normalizeErrorCode,
} from "@/lib/sat/error-explainer";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ErrorPageParams = Promise<{ code: string }>;
type ExplainCfdiErrorResult = Awaited<
  ReturnType<typeof explainCfdiError>
>;
type ErrorPageState =
  | { status: "success"; result: ExplainCfdiErrorResult }
  | { status: "error"; message: string };

function normalizeCodeFromParams(raw: string): string {
  return normalizeErrorCode(decodeURIComponent(raw || ""));
}

export async function generateMetadata({
  params,
}: {
  params: ErrorPageParams;
}): Promise<Metadata> {
  const { code } = await params;
  const normalizedCode = normalizeCodeFromParams(code) || "Error CFDI";

  return {
    title: `${normalizedCode} | Explicar error SAT`,
    description: `Explicación SAT CFDI para ${normalizedCode}: causas comunes y pasos para corregir el error.`,
  };
}

function TrySatToolsSection() {
  return (
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
  );
}

export default async function ErrorCodePage({
  params,
}: {
  params: ErrorPageParams;
}) {
  const { code } = await params;
  const normalizedCode = normalizeCodeFromParams(code);

  if (!normalizedCode) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 px-4 py-8">
        <h1 className="text-3xl font-semibold text-slate-900">
          Error CFDI SAT
        </h1>
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          El código de error es inválido.
        </p>
        <TrySatToolsSection />
      </main>
    );
  }

  let pageState: ErrorPageState;
  try {
    const supabase = createSupabaseServerClient();
    const result = await explainCfdiError(supabase, normalizedCode);
    pageState = { status: "success", result };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error inesperado";
    pageState = { status: "error", message };
  }

  if (pageState.status === "error") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 px-4 py-8">
        <h1 className="text-3xl font-semibold text-slate-900">
          Error CFDI SAT {normalizedCode}
        </h1>
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {pageState.message}
        </p>
        <TrySatToolsSection />
      </main>
    );
  }

  const { result } = pageState;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
          SAT Fácil
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Error CFDI SAT {result.error_code}
        </h1>
        <p className="text-sm text-slate-700">
          Explicación técnica y guía de corrección con base en reglas SAT y
          documentación recuperada.
        </p>
      </header>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <article className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
            Código de error
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {result.error_code}
          </p>
        </article>

        <article className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
            Tema
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {result.topic}
          </p>
        </article>

        <div>
          <h2 className="text-sm font-semibold text-slate-900">Explicación</h2>
          <p className="mt-1 text-sm text-slate-700">{result.explanation}</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-900">Por qué ocurre</h2>
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
              No se detectaron reglas SAT específicas.
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
          <h2 className="text-sm font-semibold text-slate-900">
            Referencias SAT
          </h2>
          {result.sources.length === 0 ? (
            <p className="mt-1 text-sm text-slate-600">
              No hay referencias SAT disponibles para este código.
            </p>
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
      </section>

      <TrySatToolsSection />
    </main>
  );
}

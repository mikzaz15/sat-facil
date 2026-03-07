import Link from "next/link";

import { loginAction } from "./actions";

const DEFAULT_AUTH_REDIRECT = "/validate-cfdi";

function isSafeInternalPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextCandidate = typeof params.next === "string" ? params.next.trim() : "";
  const nextPath =
    isSafeInternalPath(nextCandidate) &&
    nextCandidate !== "/app" &&
    !nextCandidate.startsWith("/app/")
      ? nextCandidate
      : DEFAULT_AUTH_REDIRECT;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
          SAT Fácil
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Iniciar sesión
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Accede a SAT Fácil para validar CFDI antes de timbrar, revisar errores
          SAT y usar el asistente.
        </p>

        {params.error ? (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {params.error}
          </p>
        ) : null}

        <form action={loginAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={nextPath} />

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Iniciar sesión
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          ¿Nuevo en SAT Fácil?{" "}
          <Link href="/signup" className="font-medium text-slate-900 underline">
            Crear cuenta
          </Link>
        </p>
      </div>
    </main>
  );
}

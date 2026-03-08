import Link from "next/link";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";

import { signupAction } from "./actions";

const DEFAULT_AUTH_REDIRECT = "/cfdi-xml-validator";

function isSafeInternalPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

type SignupPageProps = {
  searchParams: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
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
          Crear cuenta
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Crea tu cuenta para validar CFDI antes de timbrar, revisar errores SAT
          y usar el asistente.
        </p>

        {params.error ? (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {params.error}
          </p>
        ) : null}

        <div className="mt-6">
          <GoogleAuthButton errorPath="/signup" />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-500">o continuar con</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form action={signupAction} className="mt-4 space-y-4">
          <input type="hidden" name="next" value={nextPath} />
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-slate-700"
            >
              Nombre completo
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Ej. Juan Pérez"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

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
              minLength={8}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Crear cuenta
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          ¿Ya tienes una cuenta?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(nextPath)}`}
            className="font-medium text-slate-900 underline"
          >
            Iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  );
}

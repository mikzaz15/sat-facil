import Link from "next/link";

import { AuthFormGaTracker } from "@/components/analytics/auth-form-ga-tracker";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";

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

function isSignupConfirmationMessage(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "cuenta creada. confirma tu correo antes de iniciar sesión." ||
    normalized === "cuenta creada. confirma tu correo antes de iniciar sesion."
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextCandidate = typeof params.next === "string" ? params.next.trim() : "";
  const rawError = typeof params.error === "string" ? params.error.trim() : "";
  const showSignupConfirmation = rawError
    ? isSignupConfirmationMessage(rawError)
    : false;
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

        {rawError ? (
          showSignupConfirmation ? (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              <p className="font-semibold">Cuenta creada correctamente.</p>
              <p className="mt-1">
                Te enviamos un enlace de verificación a tu correo. Confirma tu
                correo para poder iniciar sesión.
              </p>
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {rawError}
            </p>
          )
        ) : null}

        <div className="mt-6">
          <GoogleAuthButton errorPath="/login" gaEventName="login" />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-500">o continuar con</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form id="login-form" action={loginAction} className="mt-4 space-y-4">
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
        <AuthFormGaTracker formId="login-form" eventName="login" />

        <p className="mt-6 text-sm text-slate-600">
          ¿Nuevo en SAT Fácil?{" "}
          <Link
            href={`/signup?next=${encodeURIComponent(nextPath)}`}
            className="font-medium text-slate-900 underline"
          >
            Crear cuenta
          </Link>
        </p>
      </div>
    </main>
  );
}

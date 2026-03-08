"use client";

import Link from "next/link";
import { useState } from "react";

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isDevelopment = process.env.NODE_ENV !== "production";

  function withDevStripeHint(message: string): string {
    if (!isDevelopment) return message;

    const missingVars: string[] = [];
    if (/STRIPE_PRICE_PRO_MONTHLY/i.test(message)) {
      missingVars.push("STRIPE_PRICE_PRO_MONTHLY");
    }
    if (/STRIPE_SECRET_KEY/i.test(message)) {
      missingVars.push("STRIPE_SECRET_KEY");
    }
    if (/STRIPE_WEBHOOK_SECRET/i.test(message)) {
      missingVars.push("STRIPE_WEBHOOK_SECRET");
    }

    if (missingVars.length === 0) {
      return message;
    }

    return `${message} (Dev: revisa ${missingVars.join(
      ", ",
    )} en .env.local y en variables de entorno de Vercel).`;
  }

  async function startUpgradeCheckout() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/sat/billing/checkout", {
        method: "POST",
      });
      const payload = (await response.json()) as {
        ok: boolean;
        data?: { checkout_url?: string };
        error?: string;
      };

      if (!response.ok || !payload.ok || !payload.data?.checkout_url) {
        setError(
          withDevStripeHint(
            payload.error || "No se pudo iniciar el proceso de pago.",
          ),
        );
        return;
      }

      window.location.href = payload.data.checkout_url;
    } catch {
      setError("Error de conexión con el pago de Stripe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-gradient-to-b from-slate-50 via-white to-sky-50/30">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-6 md:py-14">
        <header className="space-y-3 text-center md:text-left">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
            SAT Fácil
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            Planes para validar CFDI con confianza
          </h1>
          <p className="mx-auto max-w-3xl text-sm leading-relaxed text-slate-700 md:mx-0 md:text-base">
            Elige el plan que mejor se adapta a tu operación. Empieza gratis y
            mejora a Pro cuando necesites mayor velocidad, automatización y
            cobertura para tu equipo contable.
          </p>
        </header>

        <section className="grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-1">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Plan Free
              </p>
              <h2 className="text-2xl font-semibold text-slate-900">Gratis</h2>
              <p className="text-sm text-slate-600">$0 MXN / mes</p>
            </div>

            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              <li>5 validaciones CFDI por día para probar SAT Fácil</li>
              <li>Validación base para detectar errores antes de timbrar</li>
              <li>Explicación de errores SAT</li>
              <li>Vista previa de correcciones XML</li>
            </ul>

            <Link
              href="/validate-cfdi"
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              Comenzar gratis
            </Link>
          </article>

          <article className="relative rounded-2xl border-2 border-sky-300 bg-gradient-to-b from-sky-50 to-white p-7 shadow-lg md:p-8">
            <span className="absolute -top-3 right-4 inline-flex rounded-full bg-sky-700 px-3 py-1 text-xs font-semibold text-white shadow-sm">
              Más popular
            </span>

            <div className="space-y-1">
              <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
                Plan Pro
              </p>
              <h2 className="text-2xl font-semibold text-slate-900">Pro</h2>
              <p className="text-sm text-slate-700">$9 USD / mes</p>
              <p className="text-sm font-medium text-sky-800">
                Recomendado para despachos contables
              </p>
            </div>

            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              <li>Validaciones CFDI ilimitadas</li>
              <li>Procesamiento en lote (Lote XML)</li>
              <li>Descarga de XML corregido</li>
              <li>Asistente SAT</li>
              <li>Flujo optimizado para despacho contable</li>
            </ul>

            <button
              type="button"
              onClick={() => void startUpgradeCheckout()}
              disabled={loading}
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? "Abriendo Stripe..." : "Mejorar a Pro"}
            </button>
            <p className="mt-2 text-xs text-slate-600">
              Requiere sesión iniciada.{" "}
              <Link href="/login?next=/pricing" className="font-medium underline">
                Iniciar sesión
              </Link>
            </p>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">
            ¿Por qué despachos contables eligen SAT Fácil?
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            SAT Fácil reduce retrabajo por rechazo de timbrado, estandariza
            criterios CFDI y acelera la revisión previa al envío al PAC.
          </p>
        </section>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        setError(payload.error || "No se pudo iniciar el proceso de pago.");
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
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
          SAT Fácil
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">Planes</h1>
        <p className="text-sm text-slate-700">
          Suscripciones para validar CFDI antes de timbrar.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Gratuito</h2>
          <p className="mt-1 text-sm text-slate-700">$0 / mes</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>5 validaciones CFDI por día</li>
            <li>Validación manual de campos</li>
          </ul>
        </article>

        <article className="rounded-xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Pro</h2>
          <p className="mt-1 text-sm text-slate-700">$9 / mes</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Validaciones ilimitadas</li>
            <li>Acceso a Validar XML CFDI</li>
            <li>Acceso al Asistente SAT</li>
          </ul>
          <button
            type="button"
            onClick={() => void startUpgradeCheckout()}
            disabled={loading}
            className="mt-4 rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? "Abriendo Stripe..." : "Mejorar a Pro"}
          </button>
          <p className="mt-2 text-xs text-slate-600">
            Requiere sesión iniciada.{" "}
            <Link href="/login?next=/pricing" className="underline">
              Iniciar sesión
            </Link>
          </p>
        </article>
      </section>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </main>
  );
}

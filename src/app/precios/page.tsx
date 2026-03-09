"use client";

import Link from "next/link";
import { useState } from "react";

const FAQ_ITEMS = [
  {
    question: "¿El plan Gratis requiere tarjeta?",
    answer:
      "No. Puedes iniciar con el plan Gratis sin tarjeta y validar tus CFDI desde el primer día.",
  },
  {
    question: "¿Qué desbloquea el plan Pro?",
    answer:
      "Pro habilita funciones avanzadas como validación en lote, acceso a funciones de corrección XML y capacidades ampliadas para operación diaria.",
  },
  {
    question: "¿Puedo cambiar de plan después?",
    answer:
      "Sí. Puedes mejorar a Pro y administrar tu suscripción desde tu cuenta cuando lo necesites.",
  },
  {
    question: "¿SAT Fácil sustituye al PAC?",
    answer:
      "No. SAT Fácil ayuda a validar y corregir antes de timbrar para reducir rechazos del PAC.",
  },
  {
    question: "¿Para quién está pensado SAT Fácil?",
    answer:
      "Para contadores, despachos y empresas que quieren reducir errores CFDI 4.0 y retrabajo operativo.",
  },
];

export default function PreciosPage() {
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
      setError("Error de conexión con Stripe. Intenta nuevamente.");
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
            Planes y Precios
          </h1>
          <p className="mx-auto max-w-3xl text-sm leading-relaxed text-slate-700 md:mx-0 md:text-base">
            Empieza con el plan Gratis para validar CFDI y mejora a Pro cuando
            necesites mayor capacidad, validación en lote y funciones avanzadas.
          </p>
        </header>

        <section className="grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-1">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Plan Gratis
              </p>
              <h2 className="text-2xl font-semibold text-slate-900">Gratis</h2>
              <p className="text-sm text-slate-600">$0 MXN / mes</p>
            </div>

            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              <li>5 validaciones</li>
              <li>Vista previa de corrección</li>
              <li>Acceso básico</li>
            </ul>

            <Link
              href="/cfdi-xml-validator"
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              Comenzar gratis
            </Link>
          </article>

          <article className="relative rounded-2xl border-2 border-sky-300 bg-gradient-to-b from-sky-50 to-white p-7 shadow-lg md:p-8">
            <span className="absolute -top-3 right-4 inline-flex rounded-full bg-sky-700 px-3 py-1 text-xs font-semibold text-white shadow-sm">
              Recomendado
            </span>

            <div className="space-y-1">
              <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
                Plan Pro
              </p>
              <h2 className="text-2xl font-semibold text-slate-900">Pro</h2>
              <p className="text-sm text-slate-700">$9 USD / mes</p>
            </div>

            <ul className="mt-5 space-y-2 text-sm text-slate-700">
              <li>Validaciones ampliadas para operación diaria</li>
              <li>Validación de XML en lote</li>
              <li>Corrección XML y funciones Pro</li>
              <li>Soporte para equipos contables</li>
            </ul>

            <button
              type="button"
              onClick={() => void startUpgradeCheckout()}
              disabled={loading}
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? "Abriendo Stripe..." : "Activar Plan Pro"}
            </button>
            <p className="mt-2 text-xs text-slate-600">
              Requiere sesión iniciada.{" "}
              <Link href="/login?next=/precios" className="font-medium underline">
                Iniciar sesión
              </Link>
            </p>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900">Preguntas frecuentes</h2>
          <div className="mt-4 space-y-4">
            {FAQ_ITEMS.map((item) => (
              <article key={item.question} className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-900">{item.question}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{item.answer}</p>
              </article>
            ))}
          </div>
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

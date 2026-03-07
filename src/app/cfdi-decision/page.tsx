"use client";

import { FormEvent, useMemo, useState } from "react";

type CfdiDecisionRecommendation = {
  tipo_comprobante: "I";
  metodo_pago: "PUE" | "PPD";
  forma_pago: string;
  complemento_pagos_required: boolean;
  sat_risks: string[];
  steps: string[];
  applied_rules: string[];
  guidance?: {
    summary?: string;
    sat_rule?: string;
    practical_example?: string;
  };
};

type ApiPayload = {
  ok: boolean;
  data?: {
    recommendation: CfdiDecisionRecommendation;
  };
  error?: string;
};

type FormState = {
  sale_date: string;
  payment_date: string;
  partial_payment: boolean;
  foreign_client: boolean;
  amount: string;
  currency: string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const INITIAL_FORM: FormState = {
  sale_date: todayIso(),
  payment_date: "",
  partial_payment: false,
  foreign_client: false,
  amount: "",
  currency: "MXN",
};

export default function CfdiDecisionPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recommendation, setRecommendation] =
    useState<CfdiDecisionRecommendation | null>(null);

  const amountNumber = useMemo(() => {
    if (!form.amount.trim()) return undefined;
    const parsed = Number(form.amount);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [form.amount]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/cfdi-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sale_date: form.sale_date,
          payment_date: form.payment_date || null,
          partial_payment: form.partial_payment,
          foreign_client: form.foreign_client,
          amount: amountNumber,
          currency: form.currency.trim().toUpperCase(),
        }),
      });

      const payload = (await response.json()) as ApiPayload;
      if (!response.ok || !payload.ok || !payload.data?.recommendation) {
        setRecommendation(null);
        setError(payload.error || "No se pudo calcular la recomendación.");
        return;
      }

      setRecommendation(payload.data.recommendation);
    } catch {
      setRecommendation(null);
      setError("Error de conexión con /api/cfdi-decision.");
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
          Configurar CFDI
        </h1>
        <p className="text-sm text-slate-700">
          Captura datos de venta/cobro y recibe una configuración sugerida de
          CFDI con reglas SAT.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-800">
            <span className="font-medium">Fecha de venta</span>
            <input
              type="date"
              value={form.sale_date}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, sale_date: event.target.value }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-200 focus:ring"
              required
            />
          </label>

          <label className="space-y-1 text-sm text-slate-800">
            <span className="font-medium">Fecha de pago (opcional)</span>
            <input
              type="date"
              value={form.payment_date}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, payment_date: event.target.value }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-200 focus:ring"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-800">
            <span className="font-medium">Monto</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Ej. 11600.00"
              value={form.amount}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, amount: event.target.value }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-200 focus:ring"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-800">
            <span className="font-medium">Moneda</span>
            <input
              type="text"
              maxLength={3}
              value={form.currency}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  currency: event.target.value.toUpperCase(),
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 uppercase outline-none ring-sky-200 focus:ring"
            />
          </label>

          <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={form.partial_payment}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  partial_payment: event.target.checked,
                }))
              }
            />
            <span>Pago parcial o diferido</span>
          </label>

          <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={form.foreign_client}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  foreign_client: event.target.checked,
                }))
              }
            />
            <span>Cliente extranjero</span>
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? "Calculando..." : "Calcular recomendación CFDI"}
            </button>
          </div>
        </form>

        {error ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {!recommendation ? (
          <p className="text-sm text-slate-600">
            Completa el formulario para ver la recomendación estructurada.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              <article className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                  Tipo de comprobante
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {recommendation.tipo_comprobante}
                </p>
              </article>
              <article className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                  Método de pago
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {recommendation.metodo_pago}
                </p>
              </article>
              <article className="rounded-md border border-slate-200 bg-slate-50 p-3 md:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                  Forma de pago
                </p>
                <p className="mt-1 text-base font-medium text-slate-900">
                  {recommendation.forma_pago}
                </p>
              </article>
              <article className="rounded-md border border-slate-200 bg-slate-50 p-3 md:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                  Complemento de pagos requerido
                </p>
                <p
                  className={`mt-1 text-base font-semibold ${
                    recommendation.complemento_pagos_required
                      ? "text-amber-700"
                      : "text-emerald-700"
                  }`}
                >
                  {recommendation.complemento_pagos_required ? "Sí" : "No"}
                </p>
              </article>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Riesgos SAT
              </h2>
              {recommendation.sat_risks.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">
                  Sin riesgos adicionales detectados.
                </p>
              ) : (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {recommendation.sat_risks.map((risk) => (
                    <li key={risk}>{risk}</li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">Pasos</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
                {recommendation.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Reglas aplicadas
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {recommendation.applied_rules.map((rule) => (
                  <span
                    key={rule}
                    className="rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                  >
                    {rule}
                  </span>
                ))}
              </div>
            </div>

            {recommendation.guidance?.summary ||
            recommendation.guidance?.sat_rule ||
            recommendation.guidance?.practical_example ? (
              <div className="rounded-md border border-sky-200 bg-sky-50 p-3">
                <p className="text-sm font-semibold text-sky-900">
                  Guía SAT estructurada
                </p>
                {recommendation.guidance.summary ? (
                  <p className="mt-2 text-sm text-sky-900">
                    {recommendation.guidance.summary}
                  </p>
                ) : null}
                {recommendation.guidance.sat_rule ? (
                  <p className="mt-2 text-sm text-sky-900">
                    <span className="font-medium">Regla: </span>
                    {recommendation.guidance.sat_rule}
                  </p>
                ) : null}
                {recommendation.guidance.practical_example ? (
                  <p className="mt-2 text-sm text-sky-900">
                    <span className="font-medium">Ejemplo: </span>
                    {recommendation.guidance.practical_example}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}

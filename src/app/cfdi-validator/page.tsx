"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type ValidationIssue = {
  code: string;
  message: string;
  fix: string;
  related_rule?: string;
};

type ValidationResult = {
  is_valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  suggested_fixes: string[];
  detected_rules: string[];
};

type ApiPayload = {
  ok: boolean;
  data?: {
    validation: ValidationResult;
  };
  code?: string;
  error?: string;
};

type FormState = {
  tipo_comprobante: string;
  metodo_pago: string;
  forma_pago: string;
  uso_cfdi: string;
  regimen_fiscal: string;
  currency: string;
  payment_date: string;
};

const INITIAL_FORM: FormState = {
  tipo_comprobante: "I",
  metodo_pago: "PUE",
  forma_pago: "03",
  uso_cfdi: "G03",
  regimen_fiscal: "601",
  currency: "MXN",
  payment_date: "",
};

export default function CfdiValidatorPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setAuthRequired(false);

    try {
      const response = await fetch("/api/cfdi-validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_comprobante: form.tipo_comprobante.trim().toUpperCase(),
          metodo_pago: form.metodo_pago.trim().toUpperCase(),
          forma_pago: form.forma_pago.trim(),
          uso_cfdi: form.uso_cfdi.trim().toUpperCase(),
          regimen_fiscal: form.regimen_fiscal.trim(),
          currency: form.currency.trim().toUpperCase(),
          payment_date: form.payment_date || null,
          mode: "manual",
        }),
      });

      const payload = (await response.json()) as ApiPayload;
      if (!response.ok || !payload.ok || !payload.data?.validation) {
        setValidation(null);
        if (payload.code === "AUTH_REQUIRED") {
          setAuthRequired(true);
          setError("Inicia sesión para validar CFDI.");
          return;
        }
        setError(payload.error || "No se pudo validar la configuración CFDI.");
        return;
      }

      setValidation(payload.data.validation);
    } catch {
      setValidation(null);
      setError("Error de conexión con /api/cfdi-validate.");
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
        <h1 className="text-3xl font-semibold text-slate-900">Validar CFDI</h1>
        <p className="text-sm text-slate-700">
          Valida configuraciones CFDI y detecta errores comunes con base en reglas
          SAT.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-800">
            <span className="font-medium">Tipo de comprobante</span>
            <select
              value={form.tipo_comprobante}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  tipo_comprobante: event.target.value,
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-200 focus:ring"
            >
              <option value="I">I - Ingreso</option>
              <option value="E">E - Egreso</option>
              <option value="T">T - Traslado</option>
              <option value="N">N - Nómina</option>
              <option value="P">P - Pago</option>
            </select>
          </label>

          <label className="space-y-1 text-sm text-slate-800">
              <span className="font-medium">Método de pago</span>
            <select
              value={form.metodo_pago}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  metodo_pago: event.target.value,
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-200 focus:ring"
            >
              <option value="PUE">PUE</option>
              <option value="PPD">PPD</option>
            </select>
          </label>

          <label className="space-y-1 text-sm text-slate-800">
            <span className="font-medium">Forma de pago</span>
            <input
              value={form.forma_pago}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, forma_pago: event.target.value }))
              }
              placeholder="Ej. 03 o 99"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-200 focus:ring"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-800">
            <span className="font-medium">Uso CFDI</span>
            <input
              value={form.uso_cfdi}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  uso_cfdi: event.target.value.toUpperCase(),
                }))
              }
              placeholder="Ej. G03, CP01, S01"
              className="w-full rounded-md border border-slate-300 px-3 py-2 uppercase outline-none ring-sky-200 focus:ring"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-800">
            <span className="font-medium">Régimen fiscal</span>
            <input
              value={form.regimen_fiscal}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  regimen_fiscal: event.target.value,
                }))
              }
              placeholder="Ej. 601 o 626"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-200 focus:ring"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-800">
            <span className="font-medium">Moneda</span>
            <input
              value={form.currency}
              maxLength={3}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  currency: event.target.value.toUpperCase(),
                }))
              }
              placeholder="MXN"
              className="w-full rounded-md border border-slate-300 px-3 py-2 uppercase outline-none ring-sky-200 focus:ring"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-800 md:col-span-2">
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

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loading ? "Validando..." : "Validar configuración CFDI"}
            </button>
          </div>
        </form>

        {error ? (
          <div className="mt-3 space-y-2">
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
            {authRequired ? (
              <Link
                href="/login?next=/cfdi-validator"
                className="inline-flex rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
              >
                Iniciar sesión
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {!validation ? (
          <p className="text-sm text-slate-600">
            Completa el formulario para obtener el resultado de validación.
          </p>
        ) : (
          <div className="space-y-5">
            <article
              className={`rounded-md border px-3 py-2 text-sm font-medium ${
                validation.is_valid
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              Estado: {validation.is_valid ? "Válido" : "Inválido"}
            </article>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">Errores</h2>
              {validation.errors.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">
                  Sin errores bloqueantes.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {validation.errors.map((issue) => (
                    <li
                      key={`error-${issue.code}-${issue.message}`}
                      className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900"
                    >
                      <p className="font-semibold">{issue.code}</p>
                      <p>{issue.message}</p>
                      <p>
                        <span className="font-medium">Corrección: </span>
                        {issue.fix}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Advertencias
              </h2>
              {validation.warnings.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">
                  Sin advertencias.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {validation.warnings.map((issue) => (
                    <li
                      key={`warn-${issue.code}-${issue.message}`}
                      className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                    >
                      <p className="font-semibold">{issue.code}</p>
                      <p>{issue.message}</p>
                      <p>
                        <span className="font-medium">Sugerencia: </span>
                        {issue.fix}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Correcciones sugeridas
              </h2>
              {validation.suggested_fixes.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">
                  Sin recomendaciones adicionales.
                </p>
              ) : (
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
                  {validation.suggested_fixes.map((fix) => (
                    <li key={fix}>{fix}</li>
                  ))}
                </ol>
              )}
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Reglas SAT detectadas
              </h2>
              {validation.detected_rules.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">
                  No se detectaron reglas SAT específicas.
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {validation.detected_rules.map((rule) => (
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
          </div>
        )}
      </section>
    </main>
  );
}

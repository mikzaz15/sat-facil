"use client";

import { FormEvent, useState } from "react";

import {
  auditCfdiPreTimbrado,
  type PreTimbradoAuditResult,
} from "@/lib/sat/pre-timbrado-audit";

type FormState = {
  rfc_receptor: string;
  uso_cfdi: string;
  forma_pago: string;
  metodo_pago: string;
  tipo_comprobante: string;
};

const INITIAL_FORM: FormState = {
  rfc_receptor: "",
  uso_cfdi: "G03",
  forma_pago: "03",
  metodo_pago: "PUE",
  tipo_comprobante: "I",
};

export default function AuditoriaCfdiPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [result, setResult] = useState<PreTimbradoAuditResult | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const audit = auditCfdiPreTimbrado(form);
    setResult(audit);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
          SAT Fácil
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Auditoría CFDI Pre-Timbrado
        </h1>
        <p className="text-sm text-slate-700">
          Valida compatibilidad de configuración CFDI antes de generar XML y
          evita rechazos del SAT/PAC.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-800">
            <span className="font-medium">RFC receptor</span>
            <input
              value={form.rfc_receptor}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  rfc_receptor: event.target.value.toUpperCase(),
                }))
              }
              placeholder="XAXX010101000"
              className="w-full rounded-md border border-slate-300 px-3 py-2 uppercase outline-none ring-sky-200 focus:ring"
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
              placeholder="G03"
              className="w-full rounded-md border border-slate-300 px-3 py-2 uppercase outline-none ring-sky-200 focus:ring"
            />
          </label>

          <label className="space-y-1 text-sm text-slate-800">
            <span className="font-medium">Forma de pago</span>
            <input
              value={form.forma_pago}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  forma_pago: event.target.value,
                }))
              }
              placeholder="03"
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none ring-sky-200 focus:ring"
            />
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

          <label className="space-y-1 text-sm text-slate-800 md:col-span-2">
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

          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
            >
              Auditar configuración CFDI
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {!result ? (
          <p className="text-sm text-slate-600">
            Completa el formulario para revisar compatibilidades SAT antes de
            generar XML.
          </p>
        ) : (
          <div className="space-y-4">
            <article
              className={`rounded-md border px-3 py-2 text-sm font-medium ${
                result.status === "OK"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              Status: {result.status}
            </article>

            {result.status === "OK" ? (
              <p className="text-sm text-slate-700">
                Configuración compatible con reglas base de catálogos SAT para
                pre-timbrado.
              </p>
            ) : (
              <div className="space-y-3">
                {result.issues.map((issue) => (
                  <article
                    key={`${issue.code}-${issue.explanation}`}
                    className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900"
                  >
                    <p className="font-semibold">{issue.code}</p>
                    <p className="mt-1">{issue.explanation}</p>
                    <p className="mt-2 font-medium">Valores sugeridos:</p>
                    <ul className="mt-1 list-disc pl-5">
                      {issue.suggested_values.map((value) => (
                        <li key={`${issue.code}-${value}`}>{value}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

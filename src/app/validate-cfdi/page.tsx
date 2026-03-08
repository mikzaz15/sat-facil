"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

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
    entitlements?: SatEntitlements;
  };
  code?: string;
  entitlements?: SatEntitlements;
  message?: string;
  error?: string;
};

type EntitlementsPayload = {
  ok: boolean;
  data?: SatEntitlements;
};

type SatEntitlements = {
  plan: "free" | "pro";
  isPro: boolean;
  canUseXmlValidator: boolean;
  canUseSatAssistant: boolean;
  validationsUsedToday: number;
  validationsRemainingToday: number | null;
  dailyValidationLimit: number | null;
};

type ValidationInput = {
  tipo_comprobante: string;
  metodo_pago: string;
  forma_pago: string;
  uso_cfdi: string;
  regimen_fiscal: string;
  currency: string;
  payment_date: string;
};

type ValidationMode = "xml" | "manual";

const INITIAL_FORM: ValidationInput = {
  tipo_comprobante: "I",
  metodo_pago: "PUE",
  forma_pago: "03",
  uso_cfdi: "G03",
  regimen_fiscal: "601",
  currency: "MXN",
  payment_date: "",
};

const EMPTY_XML: ValidationInput = {
  tipo_comprobante: "",
  metodo_pago: "",
  forma_pago: "",
  uso_cfdi: "",
  regimen_fiscal: "",
  currency: "",
  payment_date: "",
};

function getAttr(node: Element | null, name: string): string {
  if (!node) return "";
  return (
    node.getAttribute(name) ||
    node.getAttribute(name.toLowerCase()) ||
    node.getAttribute(name.toUpperCase()) ||
    ""
  ).trim();
}

function firstByLocalName(root: ParentNode, localName: string): Element | null {
  const all = root.querySelectorAll("*");
  for (const node of Array.from(all)) {
    const element = node as Element;
    if (element.localName?.toLowerCase() === localName.toLowerCase()) {
      return element;
    }
  }
  return null;
}

function parseCfdiXml(xmlText: string): ValidationInput {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    throw new Error("XML inválido. No se pudo parsear el archivo.");
  }

  const comprobante =
    firstByLocalName(doc, "Comprobante") || doc.documentElement;
  const emisor = firstByLocalName(doc, "Emisor");
  const receptor = firstByLocalName(doc, "Receptor");

  const fechaRaw = getAttr(comprobante, "Fecha");
  const paymentDate = /^\d{4}-\d{2}-\d{2}/.test(fechaRaw)
    ? fechaRaw.slice(0, 10)
    : "";

  return {
    tipo_comprobante: getAttr(comprobante, "TipoDeComprobante").toUpperCase(),
    metodo_pago: getAttr(comprobante, "MetodoPago").toUpperCase(),
    forma_pago: getAttr(comprobante, "FormaPago"),
    uso_cfdi: getAttr(receptor, "UsoCFDI").toUpperCase(),
    regimen_fiscal: (
      getAttr(emisor, "RegimenFiscal") ||
      getAttr(receptor, "RegimenFiscalReceptor")
    ).toUpperCase(),
    currency: getAttr(comprobante, "Moneda").toUpperCase(),
    payment_date: paymentDate,
  };
}

export default function ValidateCfdiPage() {
  const [mode, setMode] = useState<ValidationMode>("xml");
  const [form, setForm] = useState<ValidationInput>(INITIAL_FORM);
  const [xmlFields, setXmlFields] = useState<ValidationInput>(EMPTY_XML);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [entitlements, setEntitlements] = useState<SatEntitlements | null>(null);
  const [error, setError] = useState("");
  const [freeLimitReached, setFreeLimitReached] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const hasXmlFields = useMemo(() => {
    return Object.values(xmlFields).some((value) => value.trim().length > 0);
  }, [xmlFields]);

  useEffect(() => {
    let isActive = true;

    async function loadEntitlements() {
      try {
        const response = await fetch("/api/sat/entitlements");
        if (!isActive) return;

        if (response.status === 401) {
          setIsAuthenticated(false);
          setEntitlements(null);
          return;
        }

        const payload = (await response.json()) as EntitlementsPayload;
        if (payload.ok && payload.data) {
          setIsAuthenticated(true);
          setEntitlements(payload.data);
        }
      } catch {
        if (isActive) {
          setIsAuthenticated(false);
          setEntitlements(null);
        }
      }
    }

    void loadEntitlements();
    return () => {
      isActive = false;
    };
  }, []);

  async function startUpgradeCheckout() {
    setCheckoutLoading(true);
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
        setError(payload.error || "No se pudo iniciar el pago de Stripe.");
        return;
      }

      window.location.href = payload.data.checkout_url;
    } catch {
      setError("Error de conexión al iniciar el pago.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function runValidation(input: ValidationInput) {
    setLoading(true);
    setError("");
    setFreeLimitReached(false);

    try {
      const response = await fetch("/api/cfdi-validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_comprobante: input.tipo_comprobante.trim().toUpperCase(),
          metodo_pago: input.metodo_pago.trim().toUpperCase(),
          forma_pago: input.forma_pago.trim(),
          uso_cfdi: input.uso_cfdi.trim().toUpperCase(),
          regimen_fiscal: input.regimen_fiscal.trim(),
          currency: input.currency.trim().toUpperCase(),
          payment_date: input.payment_date || null,
          file_name: mode === "xml" ? fileName || "cfdi.xml" : undefined,
          source_page: "/validate-cfdi",
          mode,
        }),
      });

      const payload = (await response.json()) as ApiPayload;
      if (payload.entitlements) {
        setEntitlements(payload.entitlements);
      }
      if (!response.ok || !payload.ok || !payload.data?.validation) {
        setValidation(null);

        if (payload.code === "AUTH_REQUIRED") {
          setIsAuthenticated(false);
          setError("Inicia sesión para usar el validador CFDI.");
          return;
        }

        if (payload.code === "PRO_REQUIRED_XML") {
          setError("El modo XML está disponible solo en Plan Pro.");
          return;
        }

        if (payload.code === "FREE_LIMIT_REACHED") {
          setFreeLimitReached(true);
          setError(
            payload.message ||
              "Has alcanzado el límite gratuito de validaciones hoy. Mejora a Pro para validaciones ilimitadas.",
          );
          return;
        }

        if (payload.error === "free_limit_reached") {
          setFreeLimitReached(true);
          setError(
            payload.message ||
              "Has alcanzado el límite gratuito de validaciones hoy. Mejora a Pro para validaciones ilimitadas.",
          );
          return;
        }

        setError(payload.error || "No se pudo validar la configuración CFDI.");
        return;
      }

      setIsAuthenticated(true);
      if (payload.data.entitlements) {
        setEntitlements(payload.data.entitlements);
      }
      setValidation(payload.data.validation);
    } catch {
      setValidation(null);
      setError("Error de conexión con /api/cfdi-validate.");
    } finally {
      setLoading(false);
    }
  }

  async function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runValidation(form);
  }

  async function handleXmlUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setValidation(null);
    setError("");
    setFreeLimitReached(false);

    try {
      const xmlText = await file.text();
      const parsed = parseCfdiXml(xmlText);
      setXmlFields(parsed);
      await runValidation(parsed);
    } catch (uploadError) {
      setXmlFields(EMPTY_XML);
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudo procesar el XML.";
      setError(message);
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
          Herramienta para contadores: valida la configuración CFDI antes de
          enviar facturas al SAT y reduce errores de timbrado.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          Prueba herramientas SAT
        </h2>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <Link
            href="/cfdi-xml-validator"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Validar XML CFDI
          </Link>
          <Link
            href="/cfdi-error-explainer"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Explicar error SAT
          </Link>
          <Link
            href="/chat"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Asistente SAT
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          <p>
            Plan:{" "}
            <span className="font-semibold uppercase">
              {entitlements ? (entitlements.plan === "pro" ? "PRO" : "GRATIS") : "GRATIS"}
            </span>
            {entitlements && !entitlements.canUseXmlValidator
              ? ` · Validaciones hoy: ${entitlements.validationsUsedToday}/${
                  entitlements.dailyValidationLimit ?? 5
                }`
              : ""}
          </p>
          <div className="flex items-center gap-2">
            {isAuthenticated === false ? (
              <Link
                href="/login?next=/validate-cfdi"
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-100"
              >
                Iniciar sesión
              </Link>
            ) : null}
            {entitlements && !entitlements.isPro ? (
              <button
                type="button"
                onClick={() => void startUpgradeCheckout()}
                disabled={checkoutLoading}
                className="rounded-md bg-sky-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {checkoutLoading ? "Abriendo Stripe..." : "Mejorar a Pro ($9/mes)"}
              </button>
            ) : null}
          </div>
        </div>

        {isAuthenticated === false ? (
          <div className="mb-4 rounded-md border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-slate-800">
            <p className="font-semibold text-slate-900">Plan gratuito incluye:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>5 validaciones CFDI por día</li>
              <li>Explicación de errores SAT</li>
              <li>Acceso al asistente IA del SAT</li>
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setMode("xml");
              setError("");
            }}
            disabled={Boolean(entitlements && !entitlements.canUseXmlValidator)}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              mode === "xml"
                ? "bg-sky-700 text-white"
                : "border border-slate-300 bg-white text-slate-700"
            } disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400`}
          >
            Modo 1: Subir XML
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("manual");
              setError("");
            }}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              mode === "manual"
                ? "bg-sky-700 text-white"
                : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            Modo 2: Entrada manual
          </button>
        </div>

        {mode === "xml" ? (
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-slate-800">
              Archivo XML CFDI
            </label>
            <input
              type="file"
              accept=".xml,text/xml,application/xml"
              onChange={handleXmlUpload}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
            {fileName ? (
              <p className="text-xs text-slate-600">Archivo: {fileName}</p>
            ) : null}
            {hasXmlFields ? (
              <div className="grid gap-2 md:grid-cols-2">
                <Field label="tipo_comprobante" value={xmlFields.tipo_comprobante} />
                <Field label="metodo_pago" value={xmlFields.metodo_pago} />
                <Field label="forma_pago" value={xmlFields.forma_pago} />
                <Field label="uso_cfdi" value={xmlFields.uso_cfdi} />
                <Field label="regimen_fiscal" value={xmlFields.regimen_fiscal} />
                <Field label="moneda" value={xmlFields.currency} />
                <Field label="fecha_pago" value={xmlFields.payment_date} />
              </div>
            ) : null}
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
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
                {loading ? "Validando..." : "Validar CFDI"}
              </button>
            </div>
          </form>
        )}

        {loading && mode === "xml" ? (
          <p className="mt-3 text-sm text-slate-600">Validando...</p>
        ) : null}
        {entitlements && !entitlements.canUseXmlValidator && mode === "xml" ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Subir XML requiere Plan Pro.
          </p>
        ) : null}
        {error ? (
          freeLimitReached ? (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
              <p className="font-semibold">⚠ Límite gratuito alcanzado</p>
              <p className="mt-1">Mejora a Pro para validaciones ilimitadas</p>
              <Link
                href="/pricing"
                className="mt-3 inline-flex rounded-md bg-sky-700 px-3 py-2 text-xs font-medium text-white hover:bg-sky-800"
              >
                Ver planes
              </Link>
            </div>
          ) : (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          Resultados de validación
        </h2>
        {!validation ? (
          <p className="mt-2 text-sm text-slate-600">
            Ejecuta una validación para ver resultados.
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Estado de validación
              </p>
              <article
                className={`mt-2 rounded-md border px-3 py-2 text-sm font-medium ${
                  validation.is_valid
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {validation.is_valid ? "Válido" : "Inválido"}
              </article>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">Errores</p>
              {validation.errors.length === 0 ? (
                <p className="mt-1 text-sm text-slate-600">
                  Sin errores bloqueantes.
                </p>
              ) : (
                <>
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
                  <button
                    type="button"
                    onClick={() => {
                      console.log("Fix CFDI clicked");
                    }}
                    className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg"
                  >
                    Corregir este CFDI
                  </button>
                </>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">Advertencias</p>
              {validation.warnings.length === 0 ? (
                <p className="mt-1 text-sm text-slate-600">Sin advertencias.</p>
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
              <p className="text-sm font-semibold text-slate-900">
                Correcciones sugeridas
              </p>
              {validation.suggested_fixes.length === 0 ? (
                <p className="mt-1 text-sm text-slate-600">
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
              <p className="text-sm font-semibold text-slate-900">
                Reglas SAT detectadas
              </p>
              {validation.detected_rules.length === 0 ? (
                <p className="mt-1 text-sm text-slate-600">
                  No se detectaron reglas SAT.
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-900">
        {value || "(vacío)"}
      </p>
    </article>
  );
}

"use client";

import Link from "next/link";
import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";

import { trackSatAnalyticsEvent } from "@/lib/sat/analytics-client";

type SatEntitlements = {
  isPro: boolean;
  canUseXmlValidator: boolean;
  plan: "free" | "pro";
};

type EntitlementsResponse = {
  ok: boolean;
  data?: SatEntitlements;
  error?: string;
};

type ValidationIssue = {
  code: string;
  message: string;
  fix: string;
};

type ValidationResult = {
  is_valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  suggested_fixes: string[];
  detected_rules: string[];
};

type ValidationApiPayload = {
  ok: boolean;
  data?: {
    validation: ValidationResult;
    entitlements?: {
      isPro?: boolean;
      canUseXmlValidator?: boolean;
      plan?: "free" | "pro";
    };
  };
  code?: string;
  error?: string;
  entitlements?: {
    isPro?: boolean;
    canUseXmlValidator?: boolean;
    plan?: "free" | "pro";
  };
};

type UploadedXmlFile = {
  id: string;
  name: string;
  text: string;
};

type ExtractedCfdi = {
  tipo_comprobante: string;
  metodo_pago: string;
  forma_pago: string;
  uso_cfdi: string;
  regimen_fiscal: string;
  currency: string;
  payment_date: string;
};

type BatchStatus = "OK" | "Error" | "Warning";

type BatchValidationRow = {
  fileName: string;
  status: BatchStatus;
  errorDetected: string;
  detectedRule: string;
  action: string;
};

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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
    if ((node as Element).localName?.toLowerCase() === localName.toLowerCase()) {
      return node as Element;
    }
  }
  return null;
}

function parseCfdiXml(xmlText: string): ExtractedCfdi {
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
    tipo_comprobante: getAttr(comprobante, "TipoDeComprobante"),
    metodo_pago: getAttr(comprobante, "MetodoPago"),
    forma_pago: getAttr(comprobante, "FormaPago"),
    uso_cfdi: getAttr(receptor, "UsoCFDI"),
    regimen_fiscal:
      getAttr(emisor, "RegimenFiscal") ||
      getAttr(receptor, "RegimenFiscalReceptor"),
    currency: getAttr(comprobante, "Moneda"),
    payment_date: paymentDate,
  };
}

function parseXmlFilesFromList(list: FileList | null): File[] {
  if (!list) return [];
  return Array.from(list).filter(
    (file) =>
      file.name.toLowerCase().endsWith(".xml") ||
      file.type === "application/xml" ||
      file.type === "text/xml",
  );
}

function csvEscape(value: string): string {
  if (/["\n,]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toBatchStatus(validation: ValidationResult): BatchStatus {
  if (validation.errors.length > 0) return "Error";
  if (validation.warnings.length > 0) return "Warning";
  return "OK";
}

export default function CfdiBatchValidatorPage() {
  const [entitlements, setEntitlements] = useState<SatEntitlements | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [entitlementsLoading, setEntitlementsLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedXmlFile[]>([]);
  const [results, setResults] = useState<BatchValidationRow[]>([]);
  const [error, setError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [validating, setValidating] = useState(false);

  const isPro = Boolean(
    entitlements?.isPro && entitlements?.canUseXmlValidator,
  );

  const summary = useMemo(() => {
    return results.reduce(
      (acc, row) => {
        if (row.status === "OK") acc.ok += 1;
        if (row.status === "Warning") acc.warning += 1;
        if (row.status === "Error") acc.error += 1;
        return acc;
      },
      { ok: 0, warning: 0, error: 0 },
    );
  }, [results]);

  useEffect(() => {
    async function loadEntitlements() {
      setEntitlementsLoading(true);
      try {
        const response = await fetch("/api/sat/entitlements");
        const payload = (await response.json()) as EntitlementsResponse;
        if (!response.ok || !payload.ok || !payload.data) {
          if (response.status === 401) {
            setAuthRequired(true);
          }
          return;
        }
        setAuthRequired(false);
        setEntitlements(payload.data);
      } catch {
        setError("No se pudo validar tu plan. Intenta recargar la página.");
      } finally {
        setEntitlementsLoading(false);
      }
    }

    void loadEntitlements();
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

  async function addFiles(files: File[]) {
    if (!files.length) return;
    const next: UploadedXmlFile[] = [];

    for (const file of files) {
      try {
        const text = await file.text();
        next.push({
          id:
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${file.name}-${Date.now()}-${Math.random()}`,
          name: file.name,
          text,
        });
      } catch {
        setError(`No se pudo leer el archivo ${file.name}.`);
      }
    }

    if (next.length > 0) {
      setUploadedFiles((prev) => {
        const byName = new Map(prev.map((item) => [item.name, item]));
        for (const item of next) byName.set(item.name, item);
        return Array.from(byName.values());
      });
    }
  }

  async function onInputFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = parseXmlFilesFromList(event.target.files);
    await addFiles(files);
    event.target.value = "";
  }

  async function onDropFiles(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    const files = Array.from(event.dataTransfer.files).filter((file) =>
      file.name.toLowerCase().endsWith(".xml"),
    );
    await addFiles(files);
  }

  async function validateOneFile(
    uploaded: UploadedXmlFile,
  ): Promise<BatchValidationRow> {
    try {
      const parsed = parseCfdiXml(uploaded.text);
      const response = await fetch("/api/cfdi-validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_comprobante: parsed.tipo_comprobante.trim().toUpperCase(),
          metodo_pago: parsed.metodo_pago.trim().toUpperCase(),
          forma_pago: parsed.forma_pago.trim(),
          uso_cfdi: parsed.uso_cfdi.trim().toUpperCase(),
          regimen_fiscal: parsed.regimen_fiscal.trim(),
          currency: parsed.currency.trim().toUpperCase(),
          payment_date: parsed.payment_date || null,
          file_name: uploaded.name,
          source_page: "/cfdi-batch-validator",
          mode: "xml",
        }),
      });
      const payload = (await response.json()) as ValidationApiPayload;

      if (!response.ok || !payload.ok || !payload.data?.validation) {
        return {
          fileName: uploaded.name,
          status: "Error",
          errorDetected: payload.error || "No se pudo validar el CFDI.",
          detectedRule: "-",
          action: "Revisar manualmente",
        };
      }

      const validation = payload.data.validation;
      const status = toBatchStatus(validation);
      const firstError = validation.errors[0];
      const firstWarning = validation.warnings[0];
      const detectedRule = validation.detected_rules[0] || "-";
      const errorDetected = firstError
        ? `${firstError.code}: ${firstError.message}`
        : firstWarning
          ? `${firstWarning.code}: ${firstWarning.message}`
          : "Sin errores ni advertencias.";

      return {
        fileName: uploaded.name,
        status,
        errorDetected,
        detectedRule,
        action: status === "OK" ? "Sin acción" : "Validar individual",
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error inesperado en validación XML.";
      return {
        fileName: uploaded.name,
        status: "Error",
        errorDetected: message,
        detectedRule: "-",
        action: "Revisar manualmente",
      };
    }
  }

  async function runBatchValidation() {
    if (!isPro) {
      setError("Batch Validator está disponible solo para Plan Pro.");
      return;
    }
    if (uploadedFiles.length === 0) {
      setError("Agrega al menos un XML para validar.");
      return;
    }

    setValidating(true);
    setError("");
    try {
      await trackSatAnalyticsEvent({
        event_name: "batch_validation_run",
        source_page: "/cfdi-batch-validator",
        mode: "xml_batch",
        file_count: uploadedFiles.length,
      });
    } catch {
      // Best-effort analytics logging should not block batch validation.
    }
    const nextRows: BatchValidationRow[] = [];
    for (const file of uploadedFiles) {
      const row = await validateOneFile(file);
      nextRows.push(row);
      setResults([...nextRows]);
    }
    setValidating(false);
  }

  function downloadCsvReport() {
    if (results.length === 0) {
      setError("No hay resultados para exportar.");
      return;
    }

    const header = [
      "Archivo",
      "Estado",
      "Error detectado",
      "Regla SAT detectada",
      "Accion",
    ];
    const rows = results.map((row) => [
      row.fileName,
      row.status,
      row.errorDetected,
      row.detectedRule,
      row.action,
    ]);
    const csv = [header, ...rows]
      .map((line) => line.map((cell) => csvEscape(cell)).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    downloadBlob(blob, "reporte_batch_cfdi.csv");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
          SAT Fácil
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">
          Batch XML Validator
        </h1>
        <p className="text-sm text-slate-700">
          Valida múltiples CFDI XML en lote y exporta resultados para revisión
          contable.
        </p>
      </header>

      {entitlementsLoading ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          Cargando plan y permisos...
        </section>
      ) : null}

      {!entitlementsLoading && authRequired ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-sm text-amber-900">
            Inicia sesión para usar el Batch XML Validator.
          </p>
          <Link
            href="/login?next=/cfdi-batch-validator"
            className="mt-3 inline-flex rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Iniciar sesión
          </Link>
        </section>
      ) : null}

      {!entitlementsLoading && !authRequired && !isPro ? (
        <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
          <p className="text-sm font-medium text-slate-900">
            Batch XML Validator es exclusivo de Plan Pro.
          </p>
          <p className="mt-1 text-sm text-slate-700">
            Incluye validación masiva y reporte CSV. La corrección masiva de XML
            estará disponible próximamente.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/pricing"
              className="inline-flex rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              Ver planes
            </Link>
            <button
              type="button"
              onClick={() => void startUpgradeCheckout()}
              disabled={checkoutLoading}
              className="inline-flex rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {checkoutLoading ? "Abriendo Stripe..." : "Mejorar a Pro"}
            </button>
          </div>
        </section>
      ) : null}

      <section
        className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${
          !isPro ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragOver(false);
          }}
          onDrop={(event) => void onDropFiles(event)}
          className={`rounded-xl border-2 border-dashed p-8 text-center transition ${
            isDragOver
              ? "border-sky-400 bg-sky-50"
              : "border-slate-300 bg-slate-50"
          }`}
        >
          <p className="text-sm font-medium text-slate-900">
            Arrastra y suelta múltiples XML CFDI aquí
          </p>
          <p className="mt-1 text-xs text-slate-600">o selecciona archivos desde tu equipo</p>
          <label className="mt-4 inline-flex cursor-pointer rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
            Seleccionar XML
            <input
              type="file"
              multiple
              accept=".xml,text/xml,application/xml"
              onChange={(event) => void onInputFilesSelected(event)}
              className="hidden"
            />
          </label>
        </div>

        {uploadedFiles.length > 0 ? (
          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-900">
              Archivos cargados ({uploadedFiles.length})
            </p>
            <ul className="mt-2 grid gap-2 md:grid-cols-2">
              {uploadedFiles.map((file) => (
                <li
                  key={file.id}
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
                >
                  {file.name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void runBatchValidation()}
          disabled={!isPro || validating || uploadedFiles.length === 0}
          className="mt-4 rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {validating ? "Validando lote..." : "Validar lote de XML"}
        </button>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Resultados de validación
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
              OK: {summary.ok}
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 font-medium text-amber-700">
              Warning: {summary.warning}
            </span>
            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 font-medium text-red-700">
              Error: {summary.error}
            </span>
          </div>
        </div>

        {results.length === 0 ? (
          <p className="text-sm text-slate-600">
            Sube XML y ejecuta la validación en lote para ver resultados.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm text-slate-800">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Archivo</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Error detectado</th>
                    <th className="px-3 py-2">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {results.map((row) => (
                    <tr key={row.fileName}>
                      <td className="px-3 py-2 font-medium">{row.fileName}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            row.status === "OK"
                              ? "bg-emerald-50 text-emerald-700"
                              : row.status === "Warning"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-red-50 text-red-700"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <p>{row.errorDetected}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Regla SAT: {row.detectedRule}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        {row.status === "OK" ? (
                          <span className="text-xs text-slate-500">{row.action}</span>
                        ) : (
                          <Link
                            href="/cfdi-xml-validator"
                            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-900 hover:bg-slate-50"
                          >
                            {row.action}
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                Descargar XML corregidos (ZIP)
              </button>
              <button
                type="button"
                onClick={downloadCsvReport}
                disabled={results.length === 0}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Descargar reporte CSV
              </button>
            </div>
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              La corrección masiva de XML estará disponible próximamente. Por
              ahora, revisa manualmente los archivos con error o usa la
              corrección individual.
            </p>
            {/* TODO: Rehabilitar corrección masiva (ZIP) cuando la serialización XML sea segura y validada end-to-end. */}
          </div>
        )}
      </section>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </main>
  );
}

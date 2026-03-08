"use client";

import Link from "next/link";
import { ChangeEvent, useMemo, useState } from "react";
import { formatCorrectedXmlOutput } from "@/lib/sat/xml-format";

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

type ValidationSummary = {
  status: "Válido" | "Inválido";
  errors_count: number;
  warnings_count: number;
};

type ApiPayload = {
  ok: boolean;
  data?: {
    preview_mode?: boolean;
    validation?: ValidationResult;
    validation_summary?: ValidationSummary;
    entitlements?: {
      isPro?: boolean;
      canUseXmlValidator?: boolean;
    };
  };
  code?: string;
  message?: string;
  entitlements?: {
    isPro?: boolean;
    canUseXmlValidator?: boolean;
  };
  error?: string;
};

type XmlFixLogPayload = {
  ok: boolean;
  code?: string;
  error?: string;
  data?: {
    entitlements?: {
      isPro?: boolean;
      canUseXmlValidator?: boolean;
    };
  };
  entitlements?: {
    isPro?: boolean;
    canUseXmlValidator?: boolean;
  };
};

type XmlCorrectionPreview = {
  code: string;
  attribute: string;
  previousValue: string;
  correctedValue: string;
  explanation: string;
  suggestedFix: string;
};

type TaxBreakdown = {
  total_trasladados?: string;
  total_retenidos?: string;
  traslados: Array<{
    impuesto?: string;
    tasa_o_cuota?: string;
    tipo_factor?: string;
    importe?: string;
    base?: string;
  }>;
  retenciones: Array<{
    impuesto?: string;
    tasa_o_cuota?: string;
    tipo_factor?: string;
    importe?: string;
    base?: string;
  }>;
};

type ExtractedCfdi = {
  tipo_comprobante: string;
  metodo_pago: string;
  forma_pago: string;
  uso_cfdi: string;
  regimen_fiscal: string;
  currency: string;
  payment_date: string;
  taxes: TaxBreakdown;
};

const EMPTY_TAXES: TaxBreakdown = {
  total_trasladados: undefined,
  total_retenidos: undefined,
  traslados: [],
  retenciones: [],
};

const EMPTY_EXTRACTED: ExtractedCfdi = {
  tipo_comprobante: "",
  metodo_pago: "",
  forma_pago: "",
  uso_cfdi: "",
  regimen_fiscal: "",
  currency: "",
  payment_date: "",
  taxes: EMPTY_TAXES,
};

const DEFAULT_CORRECTIONS = {
  tipoComprobante: "I",
  metodoPago: "PUE",
  formaPagoPue: "03",
  formaPagoPpd: "99",
  usoCfdiGeneral: "G03",
  usoCfdiPago: "CP01",
  regimenFiscal: "601",
  currency: "MXN",
} as const;

function getAttr(node: Element | null, name: string): string {
  if (!node) return "";
  return (
    node.getAttribute(name) ||
    node.getAttribute(name.toLowerCase()) ||
    node.getAttribute(name.toUpperCase()) ||
    ""
  ).trim();
}

function firstByLocalName(
  root: ParentNode,
  localName: string,
): Element | null {
  const all = root.querySelectorAll("*");
  for (const node of Array.from(all)) {
    if ((node as Element).localName?.toLowerCase() === localName.toLowerCase()) {
      return node as Element;
    }
  }
  return null;
}

function allByLocalName(root: ParentNode, localName: string): Element[] {
  const all = root.querySelectorAll("*");
  const result: Element[] = [];
  for (const node of Array.from(all)) {
    if ((node as Element).localName?.toLowerCase() === localName.toLowerCase()) {
      result.push(node as Element);
    }
  }
  return result;
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
  const impuestos = firstByLocalName(doc, "Impuestos");

  const fechaRaw = getAttr(comprobante, "Fecha");
  const paymentDate = /^\d{4}-\d{2}-\d{2}/.test(fechaRaw)
    ? fechaRaw.slice(0, 10)
    : "";

  const trasladoNodes = allByLocalName(doc, "Traslado");
  const retencionNodes = allByLocalName(doc, "Retencion");

  const taxes: TaxBreakdown = {
    total_trasladados: getAttr(impuestos, "TotalImpuestosTrasladados") || undefined,
    total_retenidos: getAttr(impuestos, "TotalImpuestosRetenidos") || undefined,
    traslados: trasladoNodes.map((node) => ({
      impuesto: getAttr(node, "Impuesto") || undefined,
      tasa_o_cuota: getAttr(node, "TasaOCuota") || undefined,
      tipo_factor: getAttr(node, "TipoFactor") || undefined,
      importe: getAttr(node, "Importe") || undefined,
      base: getAttr(node, "Base") || undefined,
    })),
    retenciones: retencionNodes.map((node) => ({
      impuesto: getAttr(node, "Impuesto") || undefined,
      tasa_o_cuota: getAttr(node, "TasaOCuota") || undefined,
      tipo_factor: getAttr(node, "TipoFactor") || undefined,
      importe: getAttr(node, "Importe") || undefined,
      base: getAttr(node, "Base") || undefined,
    })),
  };

  const tipoComprobante = getAttr(comprobante, "TipoDeComprobante");
  const metodoPago = getAttr(comprobante, "MetodoPago");
  const formaPago = getAttr(comprobante, "FormaPago");
  const usoCfdi = getAttr(receptor, "UsoCFDI");
  const regimenFiscal =
    getAttr(emisor, "RegimenFiscal") ||
    getAttr(receptor, "RegimenFiscalReceptor");
  const currency = getAttr(comprobante, "Moneda");

  return {
    tipo_comprobante: tipoComprobante,
    metodo_pago: metodoPago,
    forma_pago: formaPago,
    uso_cfdi: usoCfdi,
    regimen_fiscal: regimenFiscal,
    currency,
    payment_date: paymentDate,
    taxes,
  };
}

function applyAttributeCorrection(params: {
  node: Element | null;
  attributeName: string;
  value: string;
  issue: ValidationIssue;
  preview: XmlCorrectionPreview[];
}) {
  if (!params.node) return;
  const nextValue = params.value.trim();
  if (!nextValue) return;

  const prevValue = getAttr(params.node, params.attributeName);
  if (prevValue === nextValue) return;

  params.node.setAttribute(params.attributeName, nextValue);
  params.preview.push({
    code: params.issue.code,
    attribute: params.attributeName,
    previousValue: prevValue || "(vacío)",
    correctedValue: nextValue,
    explanation: params.issue.message,
    suggestedFix: params.issue.fix,
  });
}

function buildCorrectedXmlFromValidation(
  xmlText: string,
  validation: ValidationResult,
): { correctedXml: string; preview: XmlCorrectionPreview[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    throw new Error("XML inválido. No se pudo parsear para corrección.");
  }

  const comprobante =
    firstByLocalName(doc, "Comprobante") || doc.documentElement;
  const emisor = firstByLocalName(doc, "Emisor");
  const receptor = firstByLocalName(doc, "Receptor");
  const preview: XmlCorrectionPreview[] = [];

  for (const issue of validation.errors) {
    const tipo = getAttr(comprobante, "TipoDeComprobante").toUpperCase();
    const metodo = getAttr(comprobante, "MetodoPago").toUpperCase();
    const shouldUsePpd = metodo === "PPD" || tipo === "P";

    switch (issue.code) {
      case "TIPO_MISSING":
      case "TIPO_INVALID":
        applyAttributeCorrection({
          node: comprobante,
          attributeName: "TipoDeComprobante",
          value: DEFAULT_CORRECTIONS.tipoComprobante,
          issue,
          preview,
        });
        break;

      case "METODO_MISSING":
      case "METODO_INVALID":
        applyAttributeCorrection({
          node: comprobante,
          attributeName: "MetodoPago",
          value: tipo === "P" ? "PPD" : DEFAULT_CORRECTIONS.metodoPago,
          issue,
          preview,
        });
        break;

      case "FORMA_MISSING":
      case "FORMA_INVALID":
      case "PPD_FORMA_PAGO_MISMATCH":
        applyAttributeCorrection({
          node: comprobante,
          attributeName: "FormaPago",
          value: DEFAULT_CORRECTIONS.formaPagoPpd,
          issue,
          preview,
        });
        break;

      case "PUE_FORMA_PAGO_INVALID":
        applyAttributeCorrection({
          node: comprobante,
          attributeName: "FormaPago",
          value: DEFAULT_CORRECTIONS.formaPagoPue,
          issue,
          preview,
        });
        break;

      case "USO_MISSING":
      case "USO_INVALID":
      case "TIPO_P_USO_CFDI":
        applyAttributeCorrection({
          node: receptor,
          attributeName: "UsoCFDI",
          value:
            tipo === "P"
              ? DEFAULT_CORRECTIONS.usoCfdiPago
              : DEFAULT_CORRECTIONS.usoCfdiGeneral,
          issue,
          preview,
        });
        break;

      case "USO_CP01_NON_P":
        applyAttributeCorrection({
          node: receptor,
          attributeName: "UsoCFDI",
          value: DEFAULT_CORRECTIONS.usoCfdiGeneral,
          issue,
          preview,
        });
        break;

      case "REGIMEN_MISSING":
      case "REGIMEN_INVALID":
        applyAttributeCorrection({
          node: emisor ?? receptor,
          attributeName: emisor ? "RegimenFiscal" : "RegimenFiscalReceptor",
          value: DEFAULT_CORRECTIONS.regimenFiscal,
          issue,
          preview,
        });
        break;

      case "CURRENCY_INVALID":
        applyAttributeCorrection({
          node: comprobante,
          attributeName: "Moneda",
          value: DEFAULT_CORRECTIONS.currency,
          issue,
          preview,
        });
        break;

      default:
        if (issue.code === "TIPO_P_FORMA_PAGO_99" && !shouldUsePpd) {
          applyAttributeCorrection({
            node: comprobante,
            attributeName: "FormaPago",
            value: DEFAULT_CORRECTIONS.formaPagoPue,
            issue,
            preview,
          });
        }
        break;
    }
  }

  const serializer = new XMLSerializer();
  const serializedXml = serializer.serializeToString(doc).trim();
  if (!serializedXml) {
    throw new Error("No se pudo generar el XML corregido.");
  }
  const formattedXml = formatCorrectedXmlOutput(serializedXml).trim();
  if (!formattedXml) {
    throw new Error("No se pudo formatear el XML corregido.");
  }

  return {
    correctedXml: formattedXml,
    preview,
  };
}

export default function CfdiXmlValidatorPage() {
  const [fileName, setFileName] = useState("");
  const [xmlError, setXmlError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [freeLimitReached, setFreeLimitReached] = useState(false);
  const [canCorrectXml, setCanCorrectXml] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewSummary, setPreviewSummary] = useState<ValidationSummary | null>(
    null,
  );
  const [rawXmlText, setRawXmlText] = useState("");
  const [correctionError, setCorrectionError] = useState("");
  const [correctionPreview, setCorrectionPreview] = useState<XmlCorrectionPreview[]>(
    [],
  );
  const [correctedXml, setCorrectedXml] = useState("");
  const [extracted, setExtracted] = useState<ExtractedCfdi>(EMPTY_EXTRACTED);
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  const hasExtractedCoreFields = useMemo(() => {
    return (
      extracted.tipo_comprobante ||
      extracted.metodo_pago ||
      extracted.forma_pago ||
      extracted.uso_cfdi ||
      extracted.regimen_fiscal ||
      extracted.currency
    );
  }, [extracted]);

  async function startUpgradeCheckout() {
    setCheckoutLoading(true);
    setApiError("");

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
          setApiError(payload.error || "No se pudo iniciar el pago de Stripe.");
          return;
        }

      window.location.href = payload.data.checkout_url;
    } catch {
      setApiError("Error de conexión al iniciar el pago.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function runValidation(payload: ExtractedCfdi) {
    setLoading(true);
    setApiError("");
    setFreeLimitReached(false);
    setPreviewMode(false);
    setPreviewSummary(null);

    try {
      const response = await fetch("/api/cfdi-xml-validator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_comprobante: payload.tipo_comprobante.trim().toUpperCase(),
          metodo_pago: payload.metodo_pago.trim().toUpperCase(),
          forma_pago: payload.forma_pago.trim(),
          uso_cfdi: payload.uso_cfdi.trim().toUpperCase(),
          regimen_fiscal: payload.regimen_fiscal.trim(),
          currency: payload.currency.trim().toUpperCase(),
          payment_date: payload.payment_date || null,
          file_name: fileName || "cfdi.xml",
          source_page: "/cfdi-xml-validator",
          mode: "xml",
        }),
      });

      const apiPayload = (await response.json()) as ApiPayload;
      if (!response.ok || !apiPayload.ok || !apiPayload.data) {
        setValidation(null);
        setCanCorrectXml(false);
        setPreviewMode(false);
        setPreviewSummary(null);
        if (apiPayload.code === "AUTH_REQUIRED") {
          setApiError("Inicia sesión para usar Validar XML CFDI.");
          return;
        }
        if (apiPayload.code === "PRO_REQUIRED_XML") {
          setApiError("Validar XML CFDI requiere Plan Pro.");
          return;
        }
        if (
          apiPayload.code === "FREE_LIMIT_REACHED" ||
          apiPayload.error === "free_limit_reached"
        ) {
          setFreeLimitReached(true);
          setApiError(
            apiPayload.message ||
              "Has alcanzado el límite gratuito de validaciones hoy. Mejora a Pro para validaciones ilimitadas.",
          );
          return;
        }
        setApiError(apiPayload.error || "No se pudo validar el CFDI.");
        return;
      }

      if (apiPayload.data.preview_mode) {
        if (!apiPayload.data.validation_summary) {
          setValidation(null);
          setCanCorrectXml(false);
          setPreviewMode(false);
          setPreviewSummary(null);
          setApiError("No se pudo generar el resumen de validación.");
          return;
        }

        setValidation(null);
        setCanCorrectXml(false);
        setCorrectionError("");
        setCorrectionPreview([]);
        setCorrectedXml("");
        setPreviewMode(true);
        setPreviewSummary(apiPayload.data.validation_summary);
        return;
      }

      if (!apiPayload.data.validation) {
        setValidation(null);
        setCanCorrectXml(false);
        setPreviewMode(false);
        setPreviewSummary(null);
        setApiError("No se pudo validar el CFDI.");
        return;
      }

      setValidation(apiPayload.data.validation);
      setPreviewMode(false);
      setPreviewSummary(null);
      setCanCorrectXml(
        Boolean(
          apiPayload.data.entitlements?.isPro ??
            apiPayload.data.entitlements?.canUseXmlValidator ??
            false,
        ),
      );
    } catch {
      setValidation(null);
      setCanCorrectXml(false);
      setApiError("Error de conexión con /api/cfdi-xml-validator.");
    } finally {
      setLoading(false);
    }
  }

  async function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setXmlError("");
    setApiError("");
    setFreeLimitReached(false);
    setPreviewMode(false);
    setPreviewSummary(null);
    setCorrectionError("");
    setCorrectionPreview([]);
    setCorrectedXml("");
    setValidation(null);

    try {
      const text = await file.text();
      setRawXmlText(text);
      const parsed = parseCfdiXml(text);
      setExtracted(parsed);
      await runValidation(parsed);
    } catch (error) {
      setRawXmlText("");
      setExtracted(EMPTY_EXTRACTED);
      const message = error instanceof Error ? error.message : "No se pudo leer el XML.";
      setXmlError(message);
    }
  }

  async function downloadCorrectedXml() {
    if (!canCorrectXml) {
      setCorrectionError(
        "La corrección automática de XML está disponible en Plan Pro.",
      );
      return;
    }

    const xmlToDownload = correctedXml.trim();
    if (!xmlToDownload) {
      setCorrectionError("No se pudo descargar: el XML corregido está vacío.");
      return;
    }

    const logResponse = await fetch("/api/sat/xml-fix-log", {
      method: "POST",
    });
    const logPayload = (await logResponse.json()) as XmlFixLogPayload;
    if (!logResponse.ok || !logPayload.ok) {
      if (logPayload.code === "AUTH_REQUIRED") {
        setCorrectionError("Inicia sesión para descargar el XML corregido.");
        setCanCorrectXml(false);
        return;
      }
      if (logPayload.code === "PRO_REQUIRED_XML") {
        setCorrectionError(
          "La corrección automática de XML está disponible en Plan Pro.",
        );
        setCanCorrectXml(false);
        return;
      }
      setCorrectionError(
        logPayload.error || "No se pudo registrar la descarga del XML corregido.",
      );
      return;
    }

    setCanCorrectXml(
      Boolean(
        logPayload.data?.entitlements?.isPro ??
          logPayload.data?.entitlements?.canUseXmlValidator ??
          true,
      ),
    );
    setCorrectionError("");
    const blob = new Blob([xmlToDownload], {
      type: "application/xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "corrected_cfdi.xml";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function onAutoCorrectXml() {
    setCorrectionError("");
    setCorrectionPreview([]);
    setCorrectedXml("");

    if (!validation || validation.errors.length === 0) {
      setCorrectionError("No hay errores bloqueantes para corregir.");
      return;
    }
    if (!rawXmlText.trim()) {
      setCorrectionError("No se encontró el XML original para corregir.");
      return;
    }

    try {
      const corrected = buildCorrectedXmlFromValidation(rawXmlText, validation);
      if (corrected.preview.length === 0) {
        setCorrectionError(
          "No se detectaron cambios automáticos para los errores actuales.",
        );
        return;
      }
      if (!corrected.correctedXml.trim()) {
        setCorrectionError("No se pudo generar un XML corregido descargable.");
        return;
      }
      setCorrectionPreview(corrected.preview);
      setCorrectedXml(corrected.correctedXml);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo corregir el XML.";
      setCorrectionError(message);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-6 md:py-10">
      <header className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
          SAT Fácil
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          Validar XML CFDI
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-700">
          Sube tu XML, revisa validaciones SAT y genera una propuesta de
          corrección antes de timbrar.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-indigo-50 px-4 py-3">
          <p className="text-xs leading-relaxed text-slate-700 md:text-sm">
            Plan Gratis: validación y vista previa de corrección. Plan Pro:
            descarga de XML corregido y flujo completo de corrección.
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/login?next=/cfdi-xml-validator"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-white"
            >
              Iniciar sesión
            </Link>
            <button
              type="button"
              onClick={() => void startUpgradeCheckout()}
              disabled={checkoutLoading}
              className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {checkoutLoading ? "Abriendo Stripe..." : "Activar Plan Pro ($9/mes)"}
            </button>
          </div>
        </div>

        <label className="block text-sm font-medium text-slate-800">
          Archivo XML CFDI
        </label>
        <input
          type="file"
          accept=".xml,text/xml,application/xml"
          onChange={onFileSelected}
          className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm"
        />
        {fileName ? (
          <p className="mt-2 text-xs font-medium text-slate-600">Archivo: {fileName}</p>
        ) : null}
        {loading ? <p className="mt-2 text-sm text-slate-600">Validando...</p> : null}
        {xmlError ? (
          <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {xmlError}
          </p>
        ) : null}
        {apiError ? (
          freeLimitReached ? (
            <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
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
            <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {apiError}
            </p>
          )
        ) : null}
      </section>

      {!previewMode && validation ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-base font-semibold text-slate-900">Campos extraídos</h2>
            {!hasExtractedCoreFields ? (
              <p className="mt-2 text-sm text-slate-600">
                Sube un XML para extraer campos CFDI.
              </p>
            ) : (
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <Field label="tipo_comprobante" value={extracted.tipo_comprobante} />
                <Field label="metodo_pago" value={extracted.metodo_pago} />
                <Field label="forma_pago" value={extracted.forma_pago} />
                <Field label="uso_cfdi" value={extracted.uso_cfdi} />
                <Field label="regimen_fiscal" value={extracted.regimen_fiscal} />
                <Field label="moneda" value={extracted.currency} />
                <Field label="fecha_pago" value={extracted.payment_date || "(vacío)"} />
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-base font-semibold text-slate-900">
              Impuestos detectados
            </h2>
            {!hasExtractedCoreFields ? (
              <p className="mt-2 text-sm text-slate-600">
                Sube un XML para ver impuestos detectados.
              </p>
            ) : (
              <div className="mt-3 space-y-3 text-sm text-slate-700">
                <p>
                  <span className="font-medium">Total trasladados:</span>{" "}
                  {extracted.taxes.total_trasladados || "(no informado)"}
                </p>
                <p>
                  <span className="font-medium">Total retenidos:</span>{" "}
                  {extracted.taxes.total_retenidos || "(no informado)"}
                </p>

                <div>
                  <p className="font-medium">Traslados</p>
                  {extracted.taxes.traslados.length === 0 ? (
                    <p className="text-slate-600">(sin traslados detectados)</p>
                  ) : (
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {extracted.taxes.traslados.map((item, index) => (
                        <li key={`traslado-${index}`}>
                          Impuesto {item.impuesto || "?"}, Tasa {item.tasa_o_cuota || "?"},
                          Importe {item.importe || "?"}, Base {item.base || "?"}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="font-medium">Retenciones</p>
                  {extracted.taxes.retenciones.length === 0 ? (
                    <p className="text-slate-600">(sin retenciones detectadas)</p>
                  ) : (
                    <ul className="mt-1 list-disc space-y-1 pl-5">
                      {extracted.taxes.retenciones.map((item, index) => (
                        <li key={`retencion-${index}`}>
                          Impuesto {item.impuesto || "?"}, Tasa {item.tasa_o_cuota || "?"},
                          Importe {item.importe || "?"}, Base {item.base || "?"}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </section>
        </>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-base font-semibold text-slate-900">
          Resultados de validación
        </h2>
        {!validation && !previewSummary ? (
          <p className="mt-2 text-sm text-slate-600">
            Sube un XML válido para ejecutar /api/cfdi-xml-validator.
          </p>
        ) : previewMode && previewSummary ? (
          <div className="mt-4 space-y-4">
            <article
              className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                previewSummary.status === "Válido"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              <span className="mr-2 inline-block rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold">
                Estado de validación
              </span>
              {previewSummary.status}
            </article>

            <div className="grid gap-3 sm:grid-cols-2">
              <article className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                  Errores
                </p>
                <p className="mt-1 text-2xl font-semibold text-red-900">
                  {previewSummary.errors_count}
                </p>
              </article>
              <article className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Advertencias
                </p>
                <p className="mt-1 text-2xl font-semibold text-amber-900">
                  {previewSummary.warnings_count}
                </p>
              </article>
            </div>

            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
              <p className="text-sm font-medium text-slate-900">
                Para ver el detalle completo del diagnóstico y descargar el XML
                corregido, crea una cuenta gratuita.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-md bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800"
                >
                  Crear cuenta gratis
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                >
                  Iniciar sesión
                </Link>
              </div>
            </div>
          </div>
        ) : validation ? (
          <div className="mt-4 space-y-5">
            <article
              className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                validation.is_valid
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              <span className="mr-2 inline-block rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold">
                Estado de validación
              </span>
              {validation.is_valid ? "Válido" : "Inválido"}
            </article>

            <article className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">Errores</p>
                <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                  {validation.errors.length}
                </span>
              </div>
              {validation.errors.length === 0 ? (
                <p className="mt-1 text-sm text-slate-600">Sin errores bloqueantes.</p>
              ) : (
                <div>
                  <ul className="mt-3 space-y-2">
                    {validation.errors.map((issue) => (
                      <li
                        key={`error-${issue.code}-${issue.message}`}
                        className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
                      >
                        <p className="font-semibold">{issue.code}</p>
                        <p className="mt-1">{issue.message}</p>
                        <p className="mt-1">
                          <span className="font-medium">Corrección: </span>
                          {issue.fix}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => void onAutoCorrectXml()}
                    className="mt-4 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    Corregir este CFDI
                  </button>
                </div>
              )}
            </article>

            <article className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">Advertencias</p>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  {validation.warnings.length}
                </span>
              </div>
              {validation.warnings.length === 0 ? (
                <p className="mt-1 text-sm text-slate-600">Sin advertencias.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {validation.warnings.map((issue) => (
                    <li
                      key={`warn-${issue.code}-${issue.message}`}
                      className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                    >
                      <p className="font-semibold">{issue.code}</p>
                      <p className="mt-1">{issue.message}</p>
                      <p className="mt-1">
                        <span className="font-medium">Sugerencia: </span>
                        {issue.fix}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
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
            </article>

            <article className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-sm font-semibold text-slate-900">
                Reglas SAT detectadas
              </p>
              {validation.detected_rules.length === 0 ? (
                <p className="mt-1 text-sm text-slate-600">
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
            </article>

            {correctionError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {correctionError}
              </p>
            ) : null}

            {correctionPreview.length > 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    Vista previa de valores corregidos
                  </p>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    Cambios: {correctionPreview.length}
                  </span>
                </div>
                <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[760px] text-left text-sm text-slate-800">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Código</th>
                        <th className="px-3 py-2">Atributo XML</th>
                        <th className="px-3 py-2">Valor actual</th>
                        <th className="px-3 py-2">Valor corregido</th>
                        <th className="px-3 py-2">Explicación</th>
                        <th className="px-3 py-2">Corrección sugerida</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {correctionPreview.map((row, index) => (
                        <tr key={`${row.code}-${row.attribute}-${index}`}>
                          <td className="px-3 py-2 font-semibold text-slate-900">{row.code}</td>
                          <td className="px-3 py-2">{row.attribute}</td>
                          <td className="px-3 py-2">
                            <span className="rounded-md bg-rose-50 px-2 py-1 text-rose-800 line-through">
                              {row.previousValue}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-800">
                              {row.correctedValue}
                            </span>
                          </td>
                          <td className="px-3 py-2">{row.explanation}</td>
                          <td className="px-3 py-2">{row.suggestedFix}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={() => void downloadCorrectedXml()}
                  disabled={!canCorrectXml}
                  className="mt-4 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  Descargar XML corregido
                </button>
                {!canCorrectXml ? (
                  <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Descarga premium: actualiza a Plan Pro para descargar el XML
                    corregido automáticamente.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-900">
        {value || "(vacío)"}
      </p>
    </article>
  );
}

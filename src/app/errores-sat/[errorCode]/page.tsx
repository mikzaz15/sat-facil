import type { Metadata } from "next";

import { SatErrorSeoTemplate } from "@/components/sat/error-seo-template";
import {
  getSatErrorLibraryEntry,
  listSatErrorCodesForStaticPages,
  normalizeSatErrorCode,
} from "@/lib/sat/error-library";

type ErrorPageParams = Promise<{ errorCode: string }>;

function normalizeCodeFromParams(raw: string): string {
  return normalizeSatErrorCode(decodeURIComponent(raw || ""));
}

function fallbackWhy(code: string): string[] {
  return [
    `El código ${code} puede deberse a una inconsistencia entre campos obligatorios del CFDI.`,
    "El PAC puede rechazar por formato XML, catálogos SAT o reglas de negocio.",
  ];
}

function fallbackFixes(): string[] {
  return [
    "Valida el XML con estructura CFDI 4.0 antes de timbrar.",
    "Corrige el campo marcado por el PAC y vuelve a generar el comprobante.",
    "Verifica claves de catálogos SAT (uso CFDI, régimen, método y forma de pago).",
  ];
}

function xmlIncorrectExampleForCode(code: string): string {
  switch (code) {
    case "CFDI40145":
      return `<cfdi:Comprobante Version="4.0" Moneda="MXN" MetodoPago="PUE" FormaPago="03">
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="00000000" Cantidad="1" ClaveUnidad="E48" ValorUnitario="1000" Importe="1000" />
  </cfdi:Conceptos>
</cfdi:Comprobante>`;
    case "CFDI40138":
      return `<cfdi:Comprobante Version="4.0" MetodoPago="PPD" FormaPago="03" Moneda="MXN">
  <!-- Para PPD en CFDI de ingreso, FormaPago normalmente debe ser 99 -->
</cfdi:Comprobante>`;
    case "CFDI40102":
      return `<cfdi:Comprobante Version="4.0" MetodoPago="PUE" FormaPago="03" Moneda="MXN">
  <cfdi:Receptor Rfc="XAXX010101000" UsoCFDI="" />
  <!-- UsoCFDI vacío provoca error de estructura/validación -->
</cfdi:Comprobante>`;
    default:
      return `<cfdi:Comprobante Version="4.0" Moneda="MXN">
  <!-- Ejemplo de XML incorrecto para ${code}: revisa campo obligatorio o catálogo SAT -->
</cfdi:Comprobante>`;
  }
}

export async function generateMetadata({
  params,
}: {
  params: ErrorPageParams;
}): Promise<Metadata> {
  const { errorCode } = await params;
  const normalizedCode = normalizeCodeFromParams(errorCode) || "CFDI";
  const lowerCode = normalizedCode.toLowerCase();

  return {
    title: `Error ${normalizedCode} – Qué significa y cómo solucionarlo`,
    description: `Aprende qué significa el error ${normalizedCode} del SAT en CFDI 4.0, por qué ocurre y cómo solucionarlo. Valida tu XML automáticamente en SAT Fácil.`,
    keywords: [
      `error ${lowerCode}`,
      `${lowerCode} sat`,
      `como solucionar ${lowerCode}`,
      `error ${normalizedCode} cfdi`,
      `errores sat cfdi`,
    ],
  };
}

export async function generateStaticParams() {
  return listSatErrorCodesForStaticPages(20).map((code) => ({
    errorCode: code.toLowerCase(),
  }));
}

export default async function SatErrorSeoPage({
  params,
}: {
  params: ErrorPageParams;
}) {
  const { errorCode } = await params;
  const normalizedCode = normalizeCodeFromParams(errorCode) || "CFDI";
  const entry = getSatErrorLibraryEntry(normalizedCode);

  const meaning =
    entry?.meaning ||
    `El error ${normalizedCode} indica una validación no cumplida en el CFDI.`;
  const whyItHappens = entry?.why_it_happens?.length
    ? entry.why_it_happens
    : fallbackWhy(normalizedCode);
  const howToFix = entry?.how_to_fix?.length ? entry.how_to_fix : fallbackFixes();
  const xmlIncorrectExample = xmlIncorrectExampleForCode(normalizedCode);

  return (
    <SatErrorSeoTemplate
      code={normalizedCode}
      meaning={meaning}
      whyItHappens={whyItHappens}
      howToFix={howToFix}
      xmlIncorrectExample={xmlIncorrectExample}
    />
  );
}

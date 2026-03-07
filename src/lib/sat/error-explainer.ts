import type { SupabaseClient } from "@supabase/supabase-js";

import { extractCitations, retrieveRelevantChunks } from "@/lib/sat/rag";
import { buildSatRuleGuidance } from "@/lib/sat/rules";
import type { RouterResult, SatTopic } from "@/lib/sat/types";

type ErrorProfile = {
  topic: SatTopic;
  ruleQuery: string;
  kbQuery: string;
  explanation: string;
  why: string[];
  baseFixes: string[];
};

export type CfdiErrorExplanation = {
  error_code: string;
  topic: SatTopic;
  explanation: string;
  why_it_occurs: string[];
  how_to_fix: string[];
  detected_rules: string[];
  sources: ReturnType<typeof extractCitations>;
};

export function normalizeErrorCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidErrorCodeFormat(code: string): boolean {
  return /^[A-Z]{3,}\d{3,}$/.test(code);
}

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function dedupe(values: string[], max = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const text = compact(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= max) break;
  }

  return out;
}

function profileForErrorCode(code: string): ErrorProfile {
  if (code === "CFDI40138") {
    return {
      topic: "PAGOS_COMPLEMENTO",
      ruleQuery: "metodo de pago pue ppd forma de pago 99 complemento de pagos",
      kbQuery: "error metodo pago forma pago pue ppd complemento pagos 2.0",
      explanation:
        "CFDI40138 suele indicar una configuración inconsistente entre método de pago, forma de pago y el flujo real de cobro.",
      why: [
        "Se captura PPD con forma de pago distinta de 99 en el CFDI inicial.",
        "Se captura PUE aunque el cobro realmente es diferido o en parcialidades.",
        "No hay consistencia entre la factura base y el proceso posterior de complemento de pagos.",
      ],
      baseFixes: [
        "Si el cobro es posterior o parcial, usa MetodoPago = PPD.",
        "Para PPD, usa forma_pago 99 en el CFDI inicial.",
        "Emite complemento de pagos 2.0 al recibir cada cobro con UUID y saldos correctos.",
      ],
    };
  }

  if (code.startsWith("CFDI401")) {
    return {
      topic: "FACTURACION_CFDI",
      ruleQuery: "errores comunes cfdi 4.0 validaciones catalogos sat",
      kbQuery: "errores comunes cfdi 4.0 validacion catalogos sat",
      explanation:
        `${code} pertenece al bloque CFDI401xx de validaciones de estructura/catálogos en CFDI 4.0.`,
      why: [
        "Algún campo obligatorio está incompleto o en formato no válido.",
        "Existe incompatibilidad entre claves de catálogos (uso CFDI, régimen, método/forma de pago).",
      ],
      baseFixes: [
        "Revisa los campos obligatorios y sus formatos.",
        "Valida compatibilidad de catálogos antes de timbrar.",
        "Si el error es de pago, verifica coherencia PUE/PPD y forma de pago.",
      ],
    };
  }

  return {
    topic: "FACTURACION_CFDI",
    ruleQuery: "errores comunes cfdi sat",
    kbQuery: "errores comunes cfdi sat guia llenado",
    explanation:
      `${code} no está mapeado de forma específica en el motor local, pero se puede orientar con reglas SAT de validación CFDI.`,
    why: [
      "El código puede corresponder a una validación específica de versión/catálogo SAT.",
      "También puede depender de reglas particulares del PAC al momento del timbrado.",
    ],
    baseFixes: [
      "Verifica catálogo y formato de cada campo del CFDI.",
      "Contrasta la captura con Anexo 20 y guía de llenado vigente.",
      "Si persiste, revisa el detalle técnico devuelto por el PAC junto con los campos enviados.",
    ],
  };
}

function extractFixCandidatesFromEvidence(chunks: { chunk_text: string }[]): string[] {
  return chunks
    .slice(0, 3)
    .flatMap((chunk) => chunk.chunk_text.split("\n"))
    .map((line) =>
      line
        .replace(/^[-*]\s*/, "")
        .replace(/^\d+[.)]\s*/, "")
        .trim(),
    )
    .filter(
      (line) =>
        line.length >= 25 &&
        /valida|verifica|captura|corrige|emite|revisa|consistencia|complemento|metodo|forma/i.test(
          line,
        ),
    )
    .slice(0, 6);
}

export async function explainCfdiError(
  supabase: SupabaseClient | null,
  rawCode: string,
  context = "",
): Promise<CfdiErrorExplanation> {
  const code = normalizeErrorCode(rawCode);
  if (!code) {
    throw new Error("error_code is required");
  }
  if (!isValidErrorCodeFormat(code)) {
    throw new Error("error_code format looks invalid");
  }

  const profile = profileForErrorCode(code);
  const query = [code, profile.kbQuery, context].filter(Boolean).join(" ");

  let chunks: Awaited<ReturnType<typeof retrieveRelevantChunks>> = [];
  if (supabase) {
    try {
      chunks = await retrieveRelevantChunks(supabase, query, profile.topic, 4);
    } catch (error) {
      console.warn(
        `[SAT][CFDI_ERROR] Retrieval unavailable for ${code}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  const routerContext: RouterResult = {
    topic: profile.topic,
    needMoreInfo: false,
    questions: [],
    ragQueries: [profile.ruleQuery],
  };
  const ruleGuidance = buildSatRuleGuidance(
    [code, profile.ruleQuery, context].filter(Boolean).join(" "),
    routerContext,
  );

  const citations = extractCitations(chunks);
  const evidenceSnippet = chunks[0]?.chunk_text
    ? compact(chunks[0].chunk_text).slice(0, 220)
    : "";

  const whyItOccurs = dedupe([
    ...profile.why,
    ...(ruleGuidance?.commonErrors ?? []),
  ]);

  const howToFix = dedupe([
    ...profile.baseFixes,
    ...(ruleGuidance?.actions ?? []),
    ...extractFixCandidatesFromEvidence(chunks),
  ]);

  const explanation = compact(
    [
      profile.explanation,
      ruleGuidance?.summary ? `Guía del motor SAT: ${ruleGuidance.summary}` : "",
      evidenceSnippet ? `Evidencia KB: ${evidenceSnippet}` : "",
    ]
      .filter(Boolean)
      .join(" "),
  );

  return {
    error_code: code,
    topic: profile.topic,
    explanation,
    why_it_occurs: whyItOccurs,
    how_to_fix: howToFix,
    detected_rules: ruleGuidance ? [ruleGuidance.scenario] : [],
    sources: citations,
  };
}

import {
  EDUCATIONAL_DISCLAIMER,
  PROFESSIONAL_ALERT,
} from "@/lib/sat/constants";
import { SAFETY_GUARD_PROMPT } from "@/lib/sat/prompts";
import { hasOpenAIConfig, runChatCompletion } from "@/lib/sat/openai";
import type { StructuredAnswer } from "@/lib/sat/types";

const EVASION_PATTERN =
  /evadir|evasi[oó]n|ocultar ingresos|factura falsa|facturas falsas|falsificar|simular operaciones|empresa fantasma|comprobante falso/i;

const HIGH_RISK_PATTERN =
  /multa|requerimiento|auditor[ií]a|cr[eé]dito fiscal/i;

const DEFINITIVE_PATTERN = /garantizado|100% seguro|sin riesgo|definitivamente/i;

export type SafetyAnalysis = {
  evasionIntent: boolean;
  highRiskCase: boolean;
};

export function analyzeSafety(text: string): SafetyAnalysis {
  return {
    evasionIntent: EVASION_PATTERN.test(text),
    highRiskCase: HIGH_RISK_PATTERN.test(text),
  };
}

export function forceSafeAnswer(input: string): StructuredAnswer {
  return {
    summary:
      "No puedo ayudar con evasión fiscal ni con falsificación de facturas o documentos.",
    steps: [
      "Regulariza la operación con CFDI real y datos correctos del receptor.",
      "Corrige o sustituye comprobantes con tu proveedor autorizado cuando exista error.",
      "Consulta los trámites oficiales del SAT para cumplir por la vía legal.",
    ],
    confidence: "Alta",
    sources: [],
    clarifyingQuestions: input ? [] : ["¿Qué trámite legal necesitas resolver?"],
    disclaimer: EDUCATIONAL_DISCLAIMER,
  };
}

export async function guardAnswerText(raw: string): Promise<string> {
  if (!hasOpenAIConfig()) {
    return raw.replace(DEFINITIVE_PATTERN, "orientación educativa");
  }

  try {
    return await runChatCompletion([
      { role: "system", content: SAFETY_GUARD_PROMPT },
      { role: "user", content: raw },
    ]);
  } catch {
    return raw.replace(DEFINITIVE_PATTERN, "orientación educativa");
  }
}

export function applySafetyToStructuredAnswer(
  answer: StructuredAnswer,
  input: string,
): StructuredAnswer {
  const safety = analyzeSafety(input);

  if (safety.evasionIntent) {
    return forceSafeAnswer(input);
  }

  const sanitized: StructuredAnswer = {
    ...answer,
    disclaimer: EDUCATIONAL_DISCLAIMER,
  };

  if (safety.highRiskCase) {
    sanitized.legalAlert = PROFESSIONAL_ALERT;
  }

  return sanitized;
}

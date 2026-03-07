import type { StructuredAnswer } from "@/lib/sat/types";

const SECTION_LIMITS = {
  summary: 260,
  satRule: 260,
  step: 140,
  stepsMax: 4,
  practicalExample: 240,
  commonError: 120,
  commonErrorsMax: 3,
  clarifyingQuestion: 140,
  clarifyingQuestionsMax: 2,
  sourcesMax: 3,
} as const;

function compact(value: string): string {
  return value
    .replace(/\r/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

function normalizeKey(value: string): string {
  return compact(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, "")
    .trim();
}

function isSimilarText(a: string, b: string): boolean {
  const left = normalizeKey(a);
  const right = normalizeKey(b);

  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;

  const leftTokens = new Set(left.split(" ").filter((token) => token.length >= 4));
  const rightTokens = new Set(right.split(" ").filter((token) => token.length >= 4));
  if (leftTokens.size === 0 || rightTokens.size === 0) return false;

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1;
  }

  const ratio = overlap / Math.min(leftTokens.size, rightTokens.size);
  return ratio >= 0.8;
}

function uniqueTexts(items: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const item of items) {
    const normalized = normalizeKey(item);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(item);
  }

  return output;
}

export function formatStructuredAnswer(answer: StructuredAnswer): string {
  const lines: string[] = [];
  const summary = truncate(compact(answer.summary), SECTION_LIMITS.summary);
  let satRule = answer.satRule
    ? truncate(compact(answer.satRule), SECTION_LIMITS.satRule)
    : "";

  if (satRule && isSimilarText(summary, satRule)) {
    satRule = "";
  }

  const steps = uniqueTexts(
    (answer.steps ?? [])
      .filter(Boolean)
      .map((step) => truncate(compact(step), SECTION_LIMITS.step))
      .filter((step) => step.length > 0)
      .filter((step) => !isSimilarText(step, summary) && (!satRule || !isSimilarText(step, satRule))),
  ).slice(0, SECTION_LIMITS.stepsMax);

  let practicalExample = answer.practicalExample
    ? truncate(compact(answer.practicalExample), SECTION_LIMITS.practicalExample)
    : "";
  if (
    practicalExample &&
    (isSimilarText(practicalExample, summary) ||
      (satRule && isSimilarText(practicalExample, satRule)))
  ) {
    practicalExample = "";
  }

  const commonErrors = uniqueTexts(
    (answer.commonErrors ?? [])
      .filter(Boolean)
      .map((error) => truncate(compact(error), SECTION_LIMITS.commonError))
      .filter((error) => error.length > 0)
      .filter(
        (error) =>
          !isSimilarText(error, summary) &&
          (!satRule || !isSimilarText(error, satRule)) &&
          (!practicalExample || !isSimilarText(error, practicalExample)),
      ),
  ).slice(0, SECTION_LIMITS.commonErrorsMax);

  const clarifyingQuestions = uniqueTexts(
    (answer.clarifyingQuestions ?? [])
      .filter(Boolean)
      .map((question) => truncate(compact(question), SECTION_LIMITS.clarifyingQuestion))
      .filter((question) => question.length > 0),
  ).slice(0, SECTION_LIMITS.clarifyingQuestionsMax);

  const sources = answer.sources
    .filter((source) => source?.url && source?.title)
    .filter(
      (source, index, list) =>
        list.findIndex((candidate) => candidate.url === source.url) === index,
    )
    .slice(0, SECTION_LIMITS.sourcesMax);

  lines.push("Resumen:");
  lines.push(summary);

  if (satRule) {
    lines.push("Regla SAT aplicable:");
    lines.push(satRule);
  }

  lines.push("Qué hacer:");
  steps.forEach((step, index) => {
    lines.push(`${index + 1}. ${step}`);
  });

  if (practicalExample) {
    lines.push("Ejemplo práctico:");
    lines.push(practicalExample);
  }

  if (commonErrors.length > 0) {
    lines.push("Errores comunes:");
    commonErrors.forEach((error, index) => {
      lines.push(`${index + 1}. ${error}`);
    });
  }

  if (sources.length > 0) {
    lines.push("Fuentes:");
    sources.forEach((source, index) => {
      lines.push(`${index + 1}. ${source.title} - ${source.url}`);
    });
  }

  lines.push(`Nivel de confianza: ${answer.confidence}`);

  if (clarifyingQuestions.length > 0) {
    lines.push("Preguntas para afinar:");
    clarifyingQuestions.forEach((question, index) => {
      lines.push(`${index + 1}. ${question}`);
    });
  }

  if (answer.legalAlert) {
    lines.push(`Alerta: ${answer.legalAlert}`);
  }

  lines.push(answer.disclaimer);

  return lines.join("\n");
}

export function toWhatsAppFriendly(
  answerText: string,
  maxLength = 900,
): string {
  const lines = answerText.split("\n");
  const sourcesIndex = lines.findIndex((line) => line.trim() === "Fuentes:");
  if (sourcesIndex >= 0) {
    let sourceCount = 0;
    for (let i = sourcesIndex + 1; i < lines.length; i += 1) {
      if (/^\d+\.\s/.test(lines[i])) {
        sourceCount += 1;
        if (sourceCount > 2) {
          lines.splice(i, 1);
          i -= 1;
        }
      } else if (lines[i].trim().length === 0) {
        continue;
      } else {
        break;
      }
    }
  }

  const normalized = lines.join("\n");
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const short = normalized.slice(0, maxLength - 3).trimEnd();
  return `${short}...`;
}

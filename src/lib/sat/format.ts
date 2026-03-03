import type { StructuredAnswer } from "@/lib/sat/types";

export function formatStructuredAnswer(answer: StructuredAnswer): string {
  const lines: string[] = [];

  lines.push(`Resumen: ${answer.summary}`);
  if (answer.legalAlert) {
    lines.push(`Alerta: ${answer.legalAlert}`);
  }

  lines.push("Pasos:");
  answer.steps.forEach((step, index) => {
    lines.push(`${index + 1}. ${step}`);
  });

  if (answer.clarifyingQuestions && answer.clarifyingQuestions.length > 0) {
    lines.push("Preguntas para afinar:");
    answer.clarifyingQuestions.forEach((question, index) => {
      lines.push(`${index + 1}. ${question}`);
    });
  }

  lines.push(`Nivel de confianza: ${answer.confidence}`);

  if (answer.sources.length > 0) {
    lines.push("Fuentes:");
    answer.sources.slice(0, 3).forEach((source, index) => {
      lines.push(`${index + 1}. ${source.title} - ${source.url}`);
    });
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

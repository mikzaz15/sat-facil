import { ROUTER_PROMPT } from "@/lib/sat/prompts";
import { hasOpenAIConfig, runChatJson } from "@/lib/sat/openai";
import type { RouterResult, SatTopic } from "@/lib/sat/types";

const DEFAULT_ROUTER: RouterResult = {
  topic: "OTRO",
  needMoreInfo: false,
  questions: [],
  ragQueries: [],
};
const VALID_TOPICS = new Set<SatTopic>([
  "FACTURACION_CFDI",
  "RFC_EFIRMA",
  "RESICO",
  "DECLARACIONES_DEVOLUCION",
  "BUZON_REQUERIMIENTOS",
  "OTRO",
]);

const EVASION_PATTERN =
  /evadir|evasi[oó]n|ocultar ingresos|factura falsa|facturas falsas|falsificar|simular operaciones|empresa fantasma/i;

const TOPIC_RULES: Array<{ topic: SatTopic; pattern: RegExp }> = [
  {
    topic: "FACTURACION_CFDI",
    pattern:
      /cfdi|factur|timbr|anexo\s*20|uso del cfdi|raz[oó]n social|sello digital/i,
  },
  {
    topic: "RFC_EFIRMA",
    pattern: /rfc|e\.firma|efirma|firma electr[oó]nica|contrase[nñ]a del sat/i,
  },
  {
    topic: "RESICO",
    pattern: /resico|r[eé]gimen simplificado/i,
  },
  {
    topic: "DECLARACIONES_DEVOLUCION",
    pattern: /declaraci[oó]n|saldo a favor|devoluci[oó]n|deducci[oó]n/i,
  },
  {
    topic: "BUZON_REQUERIMIENTOS",
    pattern: /buz[oó]n|requerimiento|multa|auditor[ií]a|cr[eé]dito fiscal|notificaci[oó]n/i,
  },
];

export function classifyWithHeuristics(message: string): RouterResult {
  const text = message.toLowerCase();

  let topic: SatTopic = "OTRO";
  for (const rule of TOPIC_RULES) {
    if (rule.pattern.test(text)) {
      topic = rule.topic;
      break;
    }
  }

  const needMoreInfo = text.length < 20;
  const questions = needMoreInfo
    ? [
        "¿Qué trámite específico del SAT estás resolviendo?",
        "¿Tienes plazo o fecha límite para responder?",
      ]
    : [];

  const ragQueries = [
    topic === "OTRO" ? "trámites SAT orientación general" : topic,
    message,
  ];

  if (EVASION_PATTERN.test(text)) {
    return {
      topic: "FACTURACION_CFDI",
      needMoreInfo: false,
      questions: [],
      ragQueries: ["cumplimiento fiscal SAT facturación legal"],
    };
  }

  return {
    topic,
    needMoreInfo,
    questions,
    ragQueries,
  };
}

function normalizeRouterResult(input: Partial<RouterResult>): RouterResult {
  const rawTopic = input.topic ?? DEFAULT_ROUTER.topic;
  const topic = VALID_TOPICS.has(rawTopic) ? rawTopic : DEFAULT_ROUTER.topic;

  return {
    topic,
    needMoreInfo: Boolean(input.needMoreInfo),
    questions: (input.questions ?? []).slice(0, 2),
    ragQueries: (input.ragQueries ?? []).slice(0, 3),
  };
}

export async function routeSatQuestion(message: string): Promise<RouterResult> {
  if (!hasOpenAIConfig()) {
    return classifyWithHeuristics(message);
  }

  try {
    const result = await runChatJson<RouterResult>([
      {
        role: "system",
        content: ROUTER_PROMPT,
      },
      {
        role: "user",
        content: message,
      },
    ]);

    return normalizeRouterResult(result);
  } catch {
    return classifyWithHeuristics(message);
  }
}

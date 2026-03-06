import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

import { retrieveRelevantChunks } from "@/lib/sat/rag";
import type { RetrievedChunk, SatTopic } from "@/lib/sat/types";

type ExpectedSourceRule = {
  name: string;
  titleIncludes?: string[];
  urlIncludes?: string[];
  tagIncludes?: string[];
  chunkIncludes?: string[];
};

type EvalCase = {
  id: string;
  topic: SatTopic;
  question: string;
  expected: ExpectedSourceRule[];
};

type MatchResult = {
  passed: boolean;
  matchedRuleNames: string[];
};

const DEFAULT_LIMIT = 5;

const EVAL_CASES: EvalCase[] = [
  {
    id: "Q01",
    topic: "FACTURACION_CFDI",
    question: "Que datos del receptor debo validar para emitir CFDI 4.0 sin rechazo?",
    expected: [
      {
        name: "CFDI 4.0 receptor data",
        titleIncludes: ["cfdi"],
        chunkIncludes: ["receptor", "rfc"],
      },
    ],
  },
  {
    id: "Q02",
    topic: "FACTURACION_CFDI",
    question: "Donde reviso uso del CFDI y regimen fiscal correcto?",
    expected: [
      {
        name: "CFDI usage and regimen",
        titleIncludes: ["cfdi"],
        chunkIncludes: ["uso", "regimen"],
      },
      {
        name: "Catalogos CFDI",
        titleIncludes: ["catalog"],
      },
    ],
  },
  {
    id: "Q03",
    topic: "FACTURACION_CFDI",
    question: "Que es el Anexo 20 y por que afecta el XML del CFDI?",
    expected: [
      {
        name: "Anexo 20 technical source",
        titleIncludes: ["anexo 20"],
        chunkIncludes: ["xml"],
      },
    ],
  },
  {
    id: "Q04",
    topic: "FACTURACION_CFDI",
    question: "Como evito errores de timbrado por catalogos CFDI?",
    expected: [
      {
        name: "Catalogos CFDI source",
        titleIncludes: ["catalog"],
        chunkIncludes: ["timbrado"],
      },
    ],
  },
  {
    id: "Q05",
    topic: "FACTURACION_CFDI",
    question: "Como cancelar un CFDI y relacionar folio sustituto?",
    expected: [
      {
        name: "CFDI cancellation guidance",
        titleIncludes: ["cfdi"],
        chunkIncludes: ["cancel"],
      },
    ],
  },
  {
    id: "Q06",
    topic: "RESICO",
    question: "RESICO puede facturar con CFDI 4.0 y que obligaciones debo cumplir?",
    expected: [
      {
        name: "RESICO source",
        titleIncludes: ["resico"],
      },
      {
        name: "RESICO mentions CFDI",
        titleIncludes: ["resico"],
        chunkIncludes: ["cfdi"],
      },
    ],
  },
  {
    id: "Q07",
    topic: "BUZON_REQUERIMIENTOS",
    question: "Que pasa si no reviso notificaciones del buzon tributario?",
    expected: [
      {
        name: "Buzon source",
        titleIncludes: ["buzon"],
      },
    ],
  },
  {
    id: "Q08",
    topic: "DECLARACIONES_DEVOLUCION",
    question: "Cuanto tiempo tiene SAT para devolver saldo a favor?",
    expected: [
      {
        name: "Devolucion source",
        titleIncludes: ["devolucion"],
        chunkIncludes: ["devol"],
      },
    ],
  },
  {
    id: "Q09",
    topic: "DECLARACIONES_DEVOLUCION",
    question: "Como validar que una factura recibida sea deducible ante SAT?",
    expected: [
      {
        name: "CFDI evidence for deductions",
        titleIncludes: ["cfdi"],
      },
      {
        name: "Devolucion and deductions",
        titleIncludes: ["devolucion"],
        chunkIncludes: ["deducc"],
      },
    ],
  },
  {
    id: "Q10",
    topic: "FACTURACION_CFDI",
    question: "Que campos del XML exige anexo 20 para impuestos y forma de pago?",
    expected: [
      {
        name: "Anexo 20 XML fields",
        titleIncludes: ["anexo 20"],
        chunkIncludes: ["xml", "impuesto"],
      },
      {
        name: "Catalogos and payment fields",
        titleIncludes: ["catalog"],
        chunkIncludes: ["forma de pago"],
      },
    ],
  },
];

function mustGetEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function includesAll(haystack: string, needles: string[]): boolean {
  return needles.every((needle) => haystack.includes(normalize(needle)));
}

function chunkMatchesRule(chunk: RetrievedChunk, rule: ExpectedSourceRule): boolean {
  const title = normalize(chunk.title || "");
  const url = normalize(chunk.url || "");
  const tags = normalize((chunk.tags || []).join(" "));
  const text = normalize(chunk.chunk_text || "");

  if (rule.titleIncludes && !includesAll(title, rule.titleIncludes)) return false;
  if (rule.urlIncludes && !includesAll(url, rule.urlIncludes)) return false;
  if (rule.tagIncludes && !includesAll(tags, rule.tagIncludes)) return false;
  if (rule.chunkIncludes && !includesAll(text, rule.chunkIncludes)) return false;

  return true;
}

function evaluateCase(chunks: RetrievedChunk[], rules: ExpectedSourceRule[]): MatchResult {
  const matched = new Set<string>();

  for (const chunk of chunks) {
    for (const rule of rules) {
      if (chunkMatchesRule(chunk, rule)) {
        matched.add(rule.name);
      }
    }
  }

  return {
    passed: matched.size > 0,
    matchedRuleNames: [...matched],
  };
}

function findMatchingRules(chunk: RetrievedChunk, rules: ExpectedSourceRule[]): string[] {
  const result: string[] = [];

  for (const rule of rules) {
    if (chunkMatchesRule(chunk, rule)) {
      result.push(rule.name);
    }
  }

  return result;
}

function snippet(text: string, maxLength = 180): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 3)}...`;
}

function parseLimitArg(): number {
  const arg = process.argv.find((value) => value.startsWith("--limit="));
  if (!arg) return DEFAULT_LIMIT;

  const raw = Number(arg.split("=")[1]);
  if (!Number.isFinite(raw) || raw < 1) return DEFAULT_LIMIT;

  return Math.floor(raw);
}

async function main() {
  const supabaseUrl = mustGetEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = mustGetEnv("SUPABASE_SERVICE_ROLE_KEY");

  const limit = parseLimitArg();

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(
    `[SAT Eval] Starting retrieval evaluation with ${EVAL_CASES.length} questions (limit=${limit}).`,
  );

  let passed = 0;
  const failedCases: string[] = [];

  for (const testCase of EVAL_CASES) {
    const chunks = await retrieveRelevantChunks(
      supabase,
      testCase.question,
      testCase.topic,
      limit,
    );

    const result = evaluateCase(chunks, testCase.expected);
    if (result.passed) {
      passed += 1;
    } else {
      failedCases.push(testCase.id);
    }

    console.log("\n------------------------------------------------------------");
    console.log(`[${testCase.id}] ${testCase.question}`);
    console.log(`topic=${testCase.topic}`);
    console.log(`expected=${testCase.expected.map((rule) => rule.name).join(" | ")}`);
    console.log(
      `result=${result.passed ? "PASS" : "FAIL"} matched=${
        result.matchedRuleNames.length > 0 ? result.matchedRuleNames.join(", ") : "none"
      }`,
    );
    console.log(`retrieved=${chunks.length}`);

    chunks.forEach((chunk, index) => {
      const matchedRules = findMatchingRules(chunk, testCase.expected);
      console.log(
        `  #${index + 1} sim=${chunk.similarity.toFixed(3)} matched=${
          matchedRules.length > 0 ? matchedRules.join(",") : "-"
        }`,
      );
      console.log(`     source=${chunk.title || "(no title)"}`);
      console.log(`     url=${chunk.url || "(no url)"}`);
      console.log(`     tags=${chunk.tags.length > 0 ? chunk.tags.join(",") : "-"}`);
      console.log(`     snippet=${snippet(chunk.chunk_text)}`);
    });
  }

  console.log("\n============================================================");
  console.log(`[SAT Eval] Summary: ${passed}/${EVAL_CASES.length} passed.`);
  if (failedCases.length > 0) {
    console.log(`[SAT Eval] Failed cases: ${failedCases.join(", ")}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[SAT Eval] Fatal error: ${message}`);
  process.exit(1);
});

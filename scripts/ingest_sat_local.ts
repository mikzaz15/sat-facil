import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import fs from "fs";
import fsp from "fs/promises";
import path from "path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PDFParse } from "pdf-parse";

type LocalSourceDoc = {
  absolutePath: string;
  relativePath: string;
  extension: ".pdf" | ".txt" | ".md";
  title: string;
  text: string;
  url: string;
  tags: string[];
};

type ChunkInsertRow = {
  source_id: string;
  chunk_text: string;
  embedding: string;
  tags: string[];
  chunk_index?: number;
};

type EmbeddingModelState = {
  model: string;
  dimension: number | null;
};

const SOURCE_ROOT = path.resolve(process.cwd(), "sat_sources");
const SUPPORTED_EXTENSIONS = new Set([".pdf", ".txt", ".md"]);
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const MODEL_BY_DIMENSION: Record<number, string> = {
  1536: "text-embedding-3-small",
  3072: "text-embedding-3-large",
};

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 180;
const MIN_TEXT_CHARS = 250;
const EMBEDDING_BATCH_SIZE = 32;

function log(level: "INFO" | "WARN" | "ERROR", message: string) {
  console.log(`[${new Date().toISOString()}] [${level}] ${message}`);
}

function mustGetEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === "string") return value;
  }
  return JSON.stringify(error);
}

function normalizeText(input: string): string {
  return input
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitPathToTags(relativePath: string): string[] {
  const normalized = relativePath.replace(/\\/g, "/").toLowerCase();
  const withoutExt = normalized.replace(/\.[^.]+$/, "");
  const parts = withoutExt
    .split(/[\/_.\-]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);

  return [...new Set(parts)].slice(0, 10);
}

function slugToTitle(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^.]+$/, "");
  const words = withoutExt
    .split(/[_\-]+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1));

  return words.join(" ") || fileName;
}

function markdownTitle(raw: string): string | null {
  const lines = raw.split("\n");
  for (const line of lines) {
    const match = line.trim().match(/^#\s+(.+)$/);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function chunkTextByParagraphs(input: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const cleaned = normalizeText(input);
  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buffer = "";

  const flush = () => {
    const next = buffer.trim();
    if (next.length >= MIN_TEXT_CHARS) chunks.push(next);
    buffer = "";
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > chunkSize * 1.5) {
      flush();
      for (let cursor = 0; cursor < paragraph.length; cursor += chunkSize - overlap) {
        const slice = paragraph.slice(cursor, cursor + chunkSize).trim();
        if (slice.length >= MIN_TEXT_CHARS) chunks.push(slice);
      }
      continue;
    }

    if ((buffer + "\n\n" + paragraph).length > chunkSize) {
      flush();
      buffer = paragraph;
    } else {
      buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    }
  }

  flush();
  return chunks;
}

function parseVectorDimensionFromValue(value: unknown): number | null {
  if (Array.isArray(value)) {
    return value.length;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
      return null;
    }

    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return 0;
    return inner.split(",").length;
  }

  return null;
}

function parseExpectedDimensionFromError(message: string): number | null {
  const expectedPattern = /expected\s+(\d+)\s+dimensions?/i;
  const vectorPattern = /vector\((\d+)\)/i;

  const expectedMatch = message.match(expectedPattern);
  if (expectedMatch?.[1]) {
    const value = Number(expectedMatch[1]);
    return Number.isFinite(value) ? value : null;
  }

  const vectorMatch = message.match(vectorPattern);
  if (vectorMatch?.[1]) {
    const value = Number(vectorMatch[1]);
    return Number.isFinite(value) ? value : null;
  }

  return null;
}

function requiresSourceColumn(message: string): boolean {
  return /source/i.test(message) && /not-null|null value|violates/i.test(message);
}

function requiresChunkIndexColumn(message: string): boolean {
  return /chunk_index/i.test(message) && /not-null|null value|violates/i.test(message);
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

async function collectLocalFiles(root: string): Promise<string[]> {
  if (!fs.existsSync(root)) {
    return [];
  }

  const files: string[] = [];

  async function walk(current: string) {
    const entries = await fsp.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        files.push(absolutePath);
      }
    }
  }

  await walk(root);
  files.sort((a, b) => a.localeCompare(b));
  return files;
}

async function parsePdfFile(absolutePath: string): Promise<string> {
  const buffer = await fsp.readFile(absolutePath);
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return normalizeText(result.text ?? "");
  } finally {
    await parser.destroy();
  }
}

async function readLocalDocument(absolutePath: string): Promise<LocalSourceDoc | null> {
  const relativePath = path.relative(SOURCE_ROOT, absolutePath).replace(/\\/g, "/");
  const ext = path.extname(absolutePath).toLowerCase() as ".pdf" | ".txt" | ".md";

  const fileName = path.basename(absolutePath);
  const fallbackTitle = slugToTitle(fileName);

  let text = "";
  let title = fallbackTitle;

  if (ext === ".pdf") {
    text = await parsePdfFile(absolutePath);
  }

  if (ext === ".txt") {
    text = normalizeText(await fsp.readFile(absolutePath, "utf8"));
  }

  if (ext === ".md") {
    const raw = await fsp.readFile(absolutePath, "utf8");
    title = markdownTitle(raw) ?? fallbackTitle;
    text = normalizeText(raw.replace(/^---[\s\S]*?---\s*/m, ""));
  }

  if (text.length < MIN_TEXT_CHARS) {
    log("WARN", `Skipping ${relativePath}: extracted text too short (${text.length} chars).`);
    return null;
  }

  return {
    absolutePath,
    relativePath,
    extension: ext,
    title,
    text,
    url: `local://sat_sources/${relativePath}`,
    tags: [...splitPathToTags(relativePath), `ext:${ext.replace(".", "")}`],
  };
}

async function detectDbVectorDimension(supabase: SupabaseClient): Promise<number | null> {
  const sample = await supabase
    .from("kb_chunks")
    .select("embedding")
    .not("embedding", "is", null)
    .limit(1)
    .maybeSingle();

  if (sample.error) {
    log("WARN", `Could not sample kb_chunks.embedding dimension: ${sample.error.message}`);
  } else if (sample.data?.embedding != null) {
    const dim = parseVectorDimensionFromValue(sample.data.embedding);
    if (dim && dim > 0) {
      return dim;
    }
  }

  const probe = await supabase.rpc("match_kb_chunks", {
    query_embedding: "[0]",
    match_count: 1,
    filter_tags: null,
  });

  if (probe.error) {
    const dim = parseExpectedDimensionFromError(probe.error.message);
    if (dim) {
      return dim;
    }
  }

  return null;
}

async function chooseEmbeddingModel(supabase: SupabaseClient): Promise<EmbeddingModelState> {
  const dbDimension = await detectDbVectorDimension(supabase);
  if (dbDimension != null) {
    const mappedModel = MODEL_BY_DIMENSION[dbDimension];
    if (mappedModel) {
      return { model: mappedModel, dimension: dbDimension };
    }

    const envModel = process.env.OPENAI_EMBEDDING_MODEL?.trim();
    if (envModel) {
      log(
        "WARN",
        `Detected vector(${dbDimension}) without known default mapping. Using OPENAI_EMBEDDING_MODEL=${envModel}.`,
      );
      return { model: envModel, dimension: dbDimension };
    }

    throw new Error(
      `Unsupported DB vector dimension ${dbDimension}. Set OPENAI_EMBEDDING_MODEL to a compatible model.`,
    );
  }

  return { model: process.env.OPENAI_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL, dimension: null };
}

async function createEmbeddingsBatch(model: string, input: string[]): Promise<number[][]> {
  const apiKey = mustGetEnv("OPENAI_API_KEY");

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`OpenAI embeddings error (${response.status}): ${raw}`);
  }

  const payload = JSON.parse(raw) as { data?: Array<{ embedding?: number[] }> };
  const embeddings = payload.data?.map((item) => item.embedding).filter(Array.isArray) as number[][];

  if (!embeddings || embeddings.length !== input.length) {
    throw new Error("Embedding response length mismatch.");
  }

  return embeddings;
}

async function createEmbeddings(model: string, chunks: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
    log("INFO", `Embedding ${batch.length} chunks (${i + 1}-${i + batch.length}) with ${model}.`);
    const result = await createEmbeddingsBatch(model, batch);
    embeddings.push(...result);
  }

  return embeddings;
}

async function upsertSourceCompat(
  supabase: SupabaseClient,
  document: LocalSourceDoc,
): Promise<{ id: string }> {
  const basePayload = {
    url: document.url,
    title: document.title,
    publisher: "SAT",
    last_crawled_at: new Date().toISOString(),
  };

  let response = await supabase
    .from("kb_sources")
    .upsert(basePayload, { onConflict: "url" })
    .select("id")
    .single();

  if (!response.error && response.data?.id) {
    return { id: response.data.id as string };
  }

  if (response.error && requiresSourceColumn(response.error.message)) {
    response = await supabase
      .from("kb_sources")
      .upsert({ ...basePayload, source: "local://sat_sources" }, { onConflict: "url" })
      .select("id")
      .single();

    if (!response.error && response.data?.id) {
      return { id: response.data.id as string };
    }
  }

  throw new Error(`Could not upsert kb_sources for ${document.relativePath}: ${response.error?.message || "unknown"}`);
}

async function deleteChunksForSource(supabase: SupabaseClient, sourceId: string): Promise<void> {
  const response = await supabase.from("kb_chunks").delete().eq("source_id", sourceId);
  if (response.error) {
    throw new Error(`Could not delete old chunks for source ${sourceId}: ${response.error.message}`);
  }
}

async function insertChunkRows(
  supabase: SupabaseClient,
  rows: ChunkInsertRow[],
): Promise<void> {
  let payload = rows;
  let withChunkIndex = false;

  while (true) {
    const response = await supabase.from("kb_chunks").insert(payload);
    if (!response.error) {
      return;
    }

    if (!withChunkIndex && requiresChunkIndexColumn(response.error.message)) {
      withChunkIndex = true;
      payload = rows.map((row, index) => ({ ...row, chunk_index: index }));
      continue;
    }

    throw new Error(`Could not insert kb_chunks rows: ${response.error.message}`);
  }
}

async function ingestDocument(
  supabase: SupabaseClient,
  document: LocalSourceDoc,
  modelState: EmbeddingModelState,
): Promise<{ chunks: number }> {
  const chunks = chunkTextByParagraphs(document.text);
  if (chunks.length === 0) {
    throw new Error(`No chunks produced from ${document.relativePath}`);
  }

  const source = await upsertSourceCompat(supabase, document);
  await deleteChunksForSource(supabase, source.id);

  let model = modelState.model;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const embeddings = await createEmbeddings(model, chunks);
    const rows: ChunkInsertRow[] = chunks.map((chunk, index) => ({
      source_id: source.id,
      chunk_text: chunk,
      embedding: toVectorLiteral(embeddings[index] ?? []),
      tags: document.tags,
    }));

    try {
      await insertChunkRows(supabase, rows);
      modelState.model = model;
      modelState.dimension = embeddings[0]?.length ?? modelState.dimension;
      return { chunks: chunks.length };
    } catch (error) {
      const message = getErrorMessage(error);
      const expectedDimension = parseExpectedDimensionFromError(message);
      const fallbackModel = expectedDimension ? MODEL_BY_DIMENSION[expectedDimension] : undefined;

      if (fallbackModel && fallbackModel !== model && attempt < 2) {
        log("WARN", `Embedding dimension mismatch; retrying ${document.relativePath} with ${fallbackModel}.`);
        model = fallbackModel;
        continue;
      }

      throw error;
    }
  }

  throw new Error(`Could not ingest ${document.relativePath}`);
}

async function main() {
  const supabaseUrl = mustGetEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = mustGetEnv("SUPABASE_SERVICE_ROLE_KEY");
  mustGetEnv("OPENAI_API_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const files = await collectLocalFiles(SOURCE_ROOT);
  if (files.length === 0) {
    throw new Error(`No PDF/TXT/MD files found under ${SOURCE_ROOT}`);
  }

  const modelState = await chooseEmbeddingModel(supabase);
  log(
    "INFO",
    `Starting local SAT ingestion from ${SOURCE_ROOT}. files=${files.length}, embedding_model=${modelState.model}${
      modelState.dimension ? `, db_vector_dim=${modelState.dimension}` : ""
    }`,
  );

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  let totalChunks = 0;

  for (const absolutePath of files) {
    let document: LocalSourceDoc | null = null;
    try {
      document = await readLocalDocument(absolutePath);
      if (!document) {
        skipped += 1;
        continue;
      }

      const result = await ingestDocument(supabase, document, modelState);
      processed += 1;
      totalChunks += result.chunks;

      log(
        "INFO",
        `Ingested ${document.relativePath} (${document.extension}) -> chunks=${result.chunks}, tags=${document.tags.length}.`,
      );
    } catch (error) {
      failed += 1;
      const label = document?.relativePath || path.relative(SOURCE_ROOT, absolutePath);
      log("ERROR", `Failed ${label}: ${getErrorMessage(error)}`);
    }
  }

  log(
    "INFO",
    `Completed local SAT ingestion. processed=${processed}, skipped=${skipped}, failed=${failed}, total_chunks=${totalChunks}.`,
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  log("ERROR", `Fatal local ingestion error: ${getErrorMessage(error)}`);
  process.exit(1);
});

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import crypto from "crypto";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type LocalMarkdownDoc = {
  absolutePath: string;
  relativePath: string;
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

type ExistingChunkRow = {
  id: string;
  chunk_text: string;
  tags: string[] | null;
};

type MarkdownSection = {
  heading: string;
  body: string;
};

const SOURCE_ROOT = path.resolve(process.cwd(), "sat_sources");
const EMBEDDING_MODEL = "text-embedding-3-small";
const SUPPORTED_EXTENSIONS = new Set([".md"]);
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

function normalizeForHash(input: string): string {
  return normalizeText(input).replace(/\s+/g, " ").trim();
}

function hashStrings(values: string[]): string {
  const hash = crypto.createHash("sha256");
  hash.update(values.join("\n<chunk>\n"));
  return hash.digest("hex");
}

function hashChunkPayload(rows: Array<{ chunk_text: string; tags: string[] | null }>): string {
  const normalizedRows = rows
    .map((row) => {
      const text = normalizeForHash(row.chunk_text);
      const tags = [...(row.tags ?? [])].sort().join(",");
      return `${text}||${tags}`;
    })
    .sort();

  return hashStrings(normalizedRows);
}

function markdownTitle(raw: string): string | null {
  const lines = raw.split("\n");
  for (const line of lines) {
    const match = line.trim().match(/^#\s+(.+)$/);
    if (match?.[1]) return match[1].trim();
  }
  return null;
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

function splitPathToTags(relativePath: string): string[] {
  const normalized = relativePath.replace(/\\/g, "/").toLowerCase();
  const withoutExt = normalized.replace(/\.[^.]+$/, "");
  const parts = withoutExt
    .split(/[\/_.\-]+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3);

  return [...new Set(parts)].slice(0, 10);
}

function stripFrontmatter(raw: string): string {
  return raw.replace(/^---[\s\S]*?---\s*/m, "");
}

function parseMarkdownSections(input: string): MarkdownSection[] {
  const lines = input.split("\n");
  const sections: MarkdownSection[] = [];
  const headingPath: string[] = [];

  let currentHeading = "";
  let bodyBuffer: string[] = [];

  const flush = () => {
    const body = normalizeText(bodyBuffer.join("\n"));
    if (body.length > 0) {
      sections.push({ heading: currentHeading, body });
    }
    bodyBuffer = [];
  };

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (headerMatch) {
      flush();

      const level = headerMatch[1].length;
      const title = normalizeText(headerMatch[2] ?? "");
      headingPath[level - 1] = title;
      headingPath.length = level;
      currentHeading = headingPath.filter(Boolean).join(" > ");
      continue;
    }

    bodyBuffer.push(line);
  }

  flush();

  if (sections.length === 0) {
    const body = normalizeText(input);
    if (body.length > 0) {
      return [{ heading: "", body }];
    }
  }

  return sections;
}

function chunkSectionByParagraphs(
  section: MarkdownSection,
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP,
): string[] {
  const prefix = section.heading ? `Seccion: ${section.heading}\n\n` : "";
  const maxBodySize = Math.max(420, chunkSize - prefix.length);
  const step = Math.max(120, maxBodySize - overlap);

  const paragraphs = section.body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buffer = "";

  const flush = () => {
    const body = normalizeText(buffer);
    const chunk = normalizeText(`${prefix}${body}`);
    if (chunk.length >= MIN_TEXT_CHARS) chunks.push(chunk);
    buffer = "";
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxBodySize * 1.5) {
      flush();
      for (let cursor = 0; cursor < paragraph.length; cursor += step) {
        const slice = paragraph.slice(cursor, cursor + maxBodySize).trim();
        const chunk = normalizeText(`${prefix}${slice}`);
        if (chunk.length >= MIN_TEXT_CHARS) chunks.push(chunk);
      }
      continue;
    }

    if ((buffer + "\n\n" + paragraph).length > maxBodySize) {
      flush();
      buffer = paragraph;
    } else {
      buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    }
  }

  flush();
  return chunks;
}

function chunkMarkdownBySections(input: string): string[] {
  const sections = parseMarkdownSections(input);
  const chunks: string[] = [];

  for (const section of sections) {
    chunks.push(...chunkSectionByParagraphs(section));
  }

  if (chunks.length > 0) {
    return chunks;
  }

  // Conservative fallback to avoid empty-ingestion for unusual markdown formatting.
  const fallbackBody = normalizeText(input);
  if (fallbackBody.length < MIN_TEXT_CHARS) return [];
  return [{ heading: "", body: fallbackBody }].flatMap((section) => chunkSectionByParagraphs(section));
}

function requiresChunkIndexColumn(message: string): boolean {
  return /chunk_index/i.test(message) && /not-null|null value|violates/i.test(message);
}

function sourceColumnMissing(message: string): boolean {
  return /column/i.test(message) && /source/i.test(message) && /does not exist/i.test(message);
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

async function collectMarkdownFiles(root: string): Promise<string[]> {
  if (!fs.existsSync(root)) return [];

  const files: string[] = [];

  async function walk(current: string) {
    const entries = await fsp.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;

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

async function readMarkdownDocument(absolutePath: string): Promise<LocalMarkdownDoc | null> {
  const relativePath = path.relative(SOURCE_ROOT, absolutePath).replace(/\\/g, "/");
  const fileName = path.basename(absolutePath);
  const raw = await fsp.readFile(absolutePath, "utf8");
  const body = stripFrontmatter(raw);
  const title = markdownTitle(raw) ?? slugToTitle(fileName);
  const normalizedBody = normalizeText(body);

  if (normalizedBody.length < MIN_TEXT_CHARS) {
    log("WARN", `Skipping ${relativePath}: extracted text too short (${normalizedBody.length} chars).`);
    return null;
  }

  return {
    absolutePath,
    relativePath,
    title,
    text: body,
    url: `local://sat_sources/${relativePath}`,
    tags: [...splitPathToTags(relativePath), "ext:md", "doc:local_md"],
  };
}

async function createEmbeddingsBatch(input: string[]): Promise<number[][]> {
  const apiKey = mustGetEnv("OPENAI_API_KEY");

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
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

async function createEmbeddings(chunks: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
    log(
      "INFO",
      `Embedding ${batch.length} chunks (${i + 1}-${i + batch.length}) with ${EMBEDDING_MODEL}.`,
    );
    const result = await createEmbeddingsBatch(batch);
    embeddings.push(...result);
  }

  return embeddings;
}

async function upsertSource(
  supabase: SupabaseClient,
  document: LocalMarkdownDoc,
): Promise<{ id: string }> {
  const basePayload = {
    url: document.url,
    title: document.title,
    publisher: "SAT",
    source: "local_md",
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

  if (response.error && sourceColumnMissing(response.error.message)) {
    response = await supabase
      .from("kb_sources")
      .upsert(
        {
          url: document.url,
          title: document.title,
          publisher: "SAT",
          last_crawled_at: new Date().toISOString(),
        },
        { onConflict: "url" },
      )
      .select("id")
      .single();

    if (!response.error && response.data?.id) {
      return { id: response.data.id as string };
    }
  }

  throw new Error(
    `Could not upsert kb_sources for ${document.relativePath}: ${response.error?.message || "unknown"}`,
  );
}

async function loadExistingChunks(
  supabase: SupabaseClient,
  sourceId: string,
): Promise<ExistingChunkRow[]> {
  const response = await supabase.from("kb_chunks").select("id,chunk_text,tags").eq("source_id", sourceId);
  if (response.error) {
    throw new Error(`Could not load existing chunks for source ${sourceId}: ${response.error.message}`);
  }

  return (response.data ?? []) as ExistingChunkRow[];
}

async function deleteChunksByIds(supabase: SupabaseClient, ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const response = await supabase.from("kb_chunks").delete().in("id", ids);
  if (response.error) {
    throw new Error(`Could not delete old kb_chunks rows: ${response.error.message}`);
  }
}

async function insertChunkRows(supabase: SupabaseClient, rows: ChunkInsertRow[]): Promise<void> {
  let payload = rows;
  let withChunkIndex = false;

  while (true) {
    const response = await supabase.from("kb_chunks").insert(payload);
    if (!response.error) return;

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
  document: LocalMarkdownDoc,
): Promise<{ chunks: number; status: "updated" | "unchanged" }> {
  const chunks = chunkMarkdownBySections(document.text);
  if (chunks.length === 0) {
    throw new Error(`No chunks produced from ${document.relativePath}`);
  }

  const source = await upsertSource(supabase, document);
  const existingRows = await loadExistingChunks(supabase, source.id);
  const nextHash = hashChunkPayload(chunks.map((chunk) => ({ chunk_text: chunk, tags: document.tags })));
  const existingHash = hashChunkPayload(existingRows);

  if (existingRows.length > 0 && nextHash === existingHash) {
    return { chunks: chunks.length, status: "unchanged" };
  }

  const embeddings = await createEmbeddings(chunks);
  const rows: ChunkInsertRow[] = chunks.map((chunk, index) => ({
    source_id: source.id,
    chunk_text: chunk,
    embedding: toVectorLiteral(embeddings[index] ?? []),
    tags: document.tags,
  }));

  await insertChunkRows(supabase, rows);

  const previousIds = existingRows.map((row) => row.id);
  await deleteChunksByIds(supabase, previousIds);

  return { chunks: chunks.length, status: "updated" };
}

async function main() {
  const supabaseUrl = mustGetEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = mustGetEnv("SUPABASE_SERVICE_ROLE_KEY");
  mustGetEnv("OPENAI_API_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const files = await collectMarkdownFiles(SOURCE_ROOT);
  if (files.length === 0) {
    throw new Error(`No .md files found under ${SOURCE_ROOT}`);
  }

  log(
    "INFO",
    `Starting local markdown SAT ingestion from ${SOURCE_ROOT}. files=${files.length}, embedding_model=${EMBEDDING_MODEL}.`,
  );

  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  let failed = 0;
  let totalChunks = 0;

  for (const absolutePath of files) {
    let document: LocalMarkdownDoc | null = null;
    try {
      document = await readMarkdownDocument(absolutePath);
      if (!document) {
        skipped += 1;
        continue;
      }

      const result = await ingestDocument(supabase, document);
      if (result.status === "unchanged") {
        unchanged += 1;
        log("INFO", `No content change for ${document.relativePath}; skipping re-ingestion.`);
        continue;
      }

      updated += 1;
      totalChunks += result.chunks;

      log(
        "INFO",
        `Replaced chunks for ${document.relativePath} -> chunks=${result.chunks}, tags=${document.tags.length}.`,
      );
    } catch (error) {
      failed += 1;
      const label = document?.relativePath || path.relative(SOURCE_ROOT, absolutePath);
      log("ERROR", `Failed ${label}: ${getErrorMessage(error)}`);
    }
  }

  log(
    "INFO",
    `Completed local markdown SAT ingestion. updated=${updated}, unchanged=${unchanged}, skipped=${skipped}, failed=${failed}, total_chunks=${totalChunks}.`,
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  log("ERROR", `Fatal local markdown ingestion error: ${getErrorMessage(error)}`);
  process.exit(1);
});

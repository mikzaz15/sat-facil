import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import fs from "fs";
import fsp from "fs/promises";
import path from "path";

import { Readability } from "@mozilla/readability";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { JSDOM } from "jsdom";
import { PDFParse } from "pdf-parse";

type SatTarget = {
  key: string;
  canonicalUrl: string;
  title: string;
  publisher: string;
  tags: string[];
  localFiles: string[];
  officialDownloadUrls: string[];
  htmlFallbackUrls: string[];
};

type LocalDocKind = "local_pdf" | "local_text";
type RemoteDocKind = "remote_pdf" | "remote_text" | "remote_html";
type ResolvedDocKind = LocalDocKind | RemoteDocKind;

type ResolvedDocument = {
  kind: ResolvedDocKind;
  title: string;
  text: string;
  origin: string;
};

type ExistingChunkRow = {
  id: string;
  chunk_text: string;
  tags: string[] | null;
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

type FetchResource = {
  finalUrl: string;
  status: number;
  contentType: string;
  buffer: Buffer;
};

const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const MODEL_BY_DIMENSION: Record<number, string> = {
  1536: "text-embedding-3-small",
  3072: "text-embedding-3-large",
};

const MIN_TEXT_CHARS = 700;
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 180;
const EMBEDDING_BATCH_SIZE = 32;
const FETCH_TIMEOUT_MS = 45_000;
const DEBUG_DIR = path.join(process.cwd(), "scripts", "debug");

const TARGETS: SatTarget[] = [
  {
    key: "cfdi_40",
    canonicalUrl: "https://www.sat.gob.mx/consultas/35025/factura-electronica-(cfdi)-4.0",
    title: "Factura electronica (CFDI) 4.0",
    publisher: "SAT",
    tags: ["cfdi", "facturacion", "anexo20"],
    localFiles: ["sat_sources/pdfs/cfdi_40.pdf", "sat_sources/cfdi_40.md"],
    officialDownloadUrls: [],
    htmlFallbackUrls: [
      "https://www.sat.gob.mx/consultas/35025/factura-electronica-(cfdi)-4.0",
    ],
  },
  {
    key: "anexo_20",
    canonicalUrl: "https://www.sat.gob.mx/consultas/42968/anexo-20",
    title: "Anexo 20 y estandar tecnico del CFDI",
    publisher: "SAT",
    tags: ["anexo20", "cfdi", "tecnico"],
    localFiles: ["sat_sources/pdfs/anexo_20.pdf", "sat_sources/anexo_20.md"],
    officialDownloadUrls: [],
    htmlFallbackUrls: ["https://www.sat.gob.mx/consultas/42968/anexo-20"],
  },
  {
    key: "catalogos_cfdi",
    canonicalUrl: "https://www.sat.gob.mx/consultas/53016/catalogos-cfdi",
    title: "Catalogos CFDI",
    publisher: "SAT",
    tags: ["cfdi", "catalogos", "anexo20"],
    localFiles: ["sat_sources/pdfs/catalogos_cfdi.pdf", "sat_sources/catalogos_cfdi.md"],
    officialDownloadUrls: [],
    htmlFallbackUrls: ["https://www.sat.gob.mx/consultas/53016/catalogos-cfdi"],
  },
  {
    key: "resico",
    canonicalUrl:
      "https://www.sat.gob.mx/portal/public/tramites-y-servicios/resico-personas-fisicas",
    title: "RESICO para personas fisicas",
    publisher: "SAT",
    tags: ["resico", "persona_fisica", "regimen"],
    localFiles: ["sat_sources/pdfs/resico.pdf", "sat_sources/resico.md"],
    officialDownloadUrls: [],
    htmlFallbackUrls: [
      "https://www.sat.gob.mx/portal/public/tramites-y-servicios/resico-personas-fisicas",
    ],
  },
  {
    key: "buzon_tributario",
    canonicalUrl: "https://www.sat.gob.mx/portal/public/tramites-y-servicios/buzon-tributario",
    title: "Buzon Tributario",
    publisher: "SAT",
    tags: ["buzon", "notificaciones", "requerimientos"],
    localFiles: ["sat_sources/pdfs/buzon_tributario.pdf", "sat_sources/buzon_tributario.md"],
    officialDownloadUrls: [],
    htmlFallbackUrls: ["https://www.sat.gob.mx/portal/public/tramites-y-servicios/buzon-tributario"],
  },
  {
    key: "devolucion",
    canonicalUrl: "https://www.sat.gob.mx/portal/public/tramites-y-servicios/devoluciones-y-compensaciones",
    title: "Devoluciones y compensaciones",
    publisher: "SAT",
    tags: ["devolucion", "deducciones", "declaracion"],
    localFiles: ["sat_sources/pdfs/devolucion.pdf", "sat_sources/devolucion.md"],
    officialDownloadUrls: [],
    htmlFallbackUrls: [
      "https://www.sat.gob.mx/portal/public/tramites-y-servicios/devoluciones-y-compensaciones",
    ],
  },
];

fs.mkdirSync(DEBUG_DIR, { recursive: true });

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

function extension(fileOrUrl: string): string {
  const clean = fileOrUrl.split("?")[0]?.split("#")[0] ?? fileOrUrl;
  return path.extname(clean).toLowerCase();
}

function isPdfByMetadata(url: string, contentType: string): boolean {
  return contentType.toLowerCase().includes("application/pdf") || extension(url) === ".pdf";
}

function isTextLikeContentType(contentType: string): boolean {
  const value = contentType.toLowerCase();
  return (
    value.includes("text/plain") ||
    value.includes("text/markdown") ||
    value.includes("application/json") ||
    value.includes("application/xml") ||
    value.includes("text/xml")
  );
}

function isHtmlContentType(contentType: string): boolean {
  return contentType.toLowerCase().includes("text/html");
}

function extractMarkdownTitle(raw: string): string | null {
  const lines = raw.split("\n");
  for (const line of lines) {
    const match = line.trim().match(/^#\s+(.+)$/);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function hasBlockSignals(text: string, html: string): boolean {
  const combined = `${text}\n${html}`.toLowerCase();
  const markers = [
    "access gateway",
    "acceso prohibido",
    "usted no tiene permiso",
    "you do not have permission",
    "you don't have permission",
    "request blocked",
    "forbidden",
    "access denied",
    "captcha",
    "incapsula",
    "cloudflare",
    "akamai",
    "nagerrors",
    "nageerrors",
  ];

  return markers.some((marker) => combined.includes(marker));
}

function textLooksBlocked(text: string, html: string): boolean {
  if (hasBlockSignals(text, html)) {
    return true;
  }

  return normalizeText(text).length < MIN_TEXT_CHARS;
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
    if (next.length >= 250) chunks.push(next);
    buffer = "";
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > chunkSize * 1.5) {
      flush();
      for (let cursor = 0; cursor < paragraph.length; cursor += chunkSize - overlap) {
        const slice = paragraph.slice(cursor, cursor + chunkSize).trim();
        if (slice.length >= 250) chunks.push(slice);
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

  const fromExpected = message.match(expectedPattern);
  if (fromExpected?.[1]) {
    const value = Number(fromExpected[1]);
    return Number.isFinite(value) ? value : null;
  }

  const fromVector = message.match(vectorPattern);
  if (fromVector?.[1]) {
    const value = Number(fromVector[1]);
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

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}

function filenameSlug(value: string): string {
  return value
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 140);
}

async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return normalizeText(result.text ?? "");
  } finally {
    await parser.destroy();
  }
}

async function fetchWithTimeout(url: string): Promise<FetchResource> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "Accept-Language": "es-MX,es;q=0.9,en;q=0.7",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
      },
    });

    const arrayBuffer = await response.arrayBuffer();
    return {
      finalUrl: response.url,
      status: response.status,
      contentType: response.headers.get("content-type") ?? "",
      buffer: Buffer.from(arrayBuffer),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function extractReadableTextFromHtml(html: string, url: string, fallbackTitle: string): { title: string; text: string } {
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  const title = normalizeText(article?.title || fallbackTitle || url);
  const text = normalizeText(article?.textContent || "");

  return { title, text };
}

function extractDownloadLinksFromHtml(html: string, baseUrl: string): string[] {
  const dom = new JSDOM(html, { url: baseUrl });
  const anchors = Array.from(dom.window.document.querySelectorAll("a[href]"));
  const links = new Set<string>();

  for (const anchor of anchors) {
    const href = anchor.getAttribute("href");
    if (!href) continue;

    try {
      const absolute = new URL(href, baseUrl).toString();
      if (/\.(pdf|doc|docx|txt|xml|xsd|zip)(\?|#|$)/i.test(absolute)) {
        links.add(absolute);
      }
    } catch {
      // Ignore malformed href values.
    }
  }

  return [...links];
}

async function resolveLocalFile(filePath: string, titleHint: string): Promise<ResolvedDocument | null> {
  const absolute = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolute)) {
    return null;
  }

  const ext = extension(absolute);

  if (ext === ".pdf") {
    const buffer = await fsp.readFile(absolute);
    const text = await parsePdfBuffer(buffer);
    if (text.length < MIN_TEXT_CHARS) {
      log("WARN", `Local PDF ${filePath} was found but has too little text (${text.length} chars).`);
      return null;
    }

    return {
      kind: "local_pdf",
      title: titleHint,
      text,
      origin: absolute,
    };
  }

  if (ext === ".md" || ext === ".txt") {
    const raw = await fsp.readFile(absolute, "utf8");
    const cleaned = normalizeText(raw.replace(/^---[\s\S]*?---\s*/m, ""));
    if (cleaned.length < MIN_TEXT_CHARS) {
      log("WARN", `Local text doc ${filePath} was found but has too little text (${cleaned.length} chars).`);
      return null;
    }

    return {
      kind: "local_text",
      title: extractMarkdownTitle(raw) ?? titleHint,
      text: cleaned,
      origin: absolute,
    };
  }

  if (ext === ".html" || ext === ".htm") {
    const raw = await fsp.readFile(absolute, "utf8");
    const parsed = extractReadableTextFromHtml(raw, `file://${absolute}`, titleHint);
    if (textLooksBlocked(parsed.text, raw)) {
      log("WARN", `Local HTML ${filePath} looks blocked and was skipped.`);
      return null;
    }
    if (parsed.text.length < MIN_TEXT_CHARS) {
      log("WARN", `Local HTML ${filePath} has too little readable text (${parsed.text.length} chars).`);
      return null;
    }

    return {
      kind: "local_text",
      title: parsed.title || titleHint,
      text: parsed.text,
      origin: absolute,
    };
  }

  log("WARN", `Unsupported local file type for ${filePath}.`);
  return null;
}

async function resolveRemoteDocument(url: string, titleHint: string): Promise<ResolvedDocument | null> {
  const resource = await fetchWithTimeout(url);
  const finalUrl = resource.finalUrl || url;

  if (isPdfByMetadata(finalUrl, resource.contentType)) {
    const text = await parsePdfBuffer(resource.buffer);
    if (text.length < MIN_TEXT_CHARS) {
      log("WARN", `Remote PDF ${finalUrl} has too little text (${text.length} chars).`);
      return null;
    }

    return {
      kind: "remote_pdf",
      title: titleHint,
      text,
      origin: finalUrl,
    };
  }

  if (isTextLikeContentType(resource.contentType)) {
    const text = normalizeText(resource.buffer.toString("utf8"));
    if (text.length < MIN_TEXT_CHARS) {
      log("WARN", `Remote text doc ${finalUrl} has too little text (${text.length} chars).`);
      return null;
    }

    return {
      kind: "remote_text",
      title: titleHint,
      text,
      origin: finalUrl,
    };
  }

  if (isHtmlContentType(resource.contentType) || extension(finalUrl) === ".html" || extension(finalUrl) === ".htm") {
    const html = resource.buffer.toString("utf8");
    const parsed = extractReadableTextFromHtml(html, finalUrl, titleHint);

    if (textLooksBlocked(parsed.text, html)) {
      return null;
    }

    if (parsed.text.length < MIN_TEXT_CHARS) {
      return null;
    }

    return {
      kind: "remote_html",
      title: parsed.title || titleHint,
      text: parsed.text,
      origin: finalUrl,
    };
  }

  return null;
}

async function tryHtmlFallback(target: SatTarget): Promise<ResolvedDocument | null> {
  for (const htmlUrl of target.htmlFallbackUrls) {
    log("INFO", `Trying HTML fallback page: ${htmlUrl}`);

    let resource: FetchResource;
    try {
      resource = await fetchWithTimeout(htmlUrl);
    } catch (error) {
      log("WARN", `HTML fetch failed for ${htmlUrl}: ${getErrorMessage(error)}`);
      continue;
    }

    const finalUrl = resource.finalUrl || htmlUrl;

    if (!isHtmlContentType(resource.contentType) && extension(finalUrl) !== ".html" && extension(finalUrl) !== ".htm") {
      const asDocument = await resolveRemoteDocument(finalUrl, target.title);
      if (asDocument) {
        log("INFO", `Resolved document from non-HTML response at ${finalUrl}.`);
        return asDocument;
      }
      continue;
    }

    const html = resource.buffer.toString("utf8");

    const parsed = extractReadableTextFromHtml(html, finalUrl, target.title);

    if (hasBlockSignals(parsed.text, html)) {
      const base = filenameSlug(finalUrl);
      const debugPath = path.join(DEBUG_DIR, `${base}.html`);
      await fsp.writeFile(debugPath, html, "utf8");
      log("WARN", `HTML blocked by SAT gateway for ${finalUrl}. Saved debug to ${debugPath}.`);
      continue;
    }

    const discoveredDocs = extractDownloadLinksFromHtml(html, finalUrl);
    if (discoveredDocs.length > 0) {
      log("INFO", `Found ${discoveredDocs.length} downloadable docs in ${finalUrl}; trying them before HTML text.`);
      for (const docUrl of discoveredDocs) {
        try {
          const doc = await resolveRemoteDocument(docUrl, target.title);
          if (doc) {
            log("INFO", `Using downloadable doc discovered in HTML: ${docUrl}`);
            return doc;
          }
        } catch (error) {
          log("WARN", `Could not use discovered doc ${docUrl}: ${getErrorMessage(error)}`);
        }
      }
    }

    if (parsed.text.length < MIN_TEXT_CHARS) {
      log(
        "WARN",
        `Readable HTML text from ${finalUrl} is too small (${parsed.text.length} chars). Skipping HTML fallback.`,
      );
      continue;
    }

    log("INFO", `Using HTML content fallback from ${finalUrl}.`);
    return {
      kind: "remote_html",
      title: parsed.title || target.title,
      text: parsed.text,
      origin: finalUrl,
    };
  }

  return null;
}

function envOfficialUrls(targetKey: string): string[] {
  const envKey = `SAT_OFFICIAL_DOC_URLS_${targetKey.toUpperCase()}`;
  const raw = process.env[envKey];
  if (!raw) return [];

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

async function resolveDocumentForTarget(target: SatTarget): Promise<ResolvedDocument | null> {
  const localPdfPaths = target.localFiles.filter((filePath) => extension(filePath) === ".pdf");
  const localTextPaths = target.localFiles.filter((filePath) => extension(filePath) !== ".pdf");

  for (const filePath of localPdfPaths) {
    log("INFO", `Trying local PDF for ${target.key}: ${filePath}`);
    const doc = await resolveLocalFile(filePath, target.title);
    if (doc) {
      log("INFO", `Selected local PDF for ${target.key}: ${filePath}`);
      return doc;
    }
  }

  const explicitDownloadUrls = dedupe([...target.officialDownloadUrls, ...envOfficialUrls(target.key)]);
  for (const docUrl of explicitDownloadUrls) {
    log("INFO", `Trying official downloadable doc for ${target.key}: ${docUrl}`);
    try {
      const doc = await resolveRemoteDocument(docUrl, target.title);
      if (doc) {
        log("INFO", `Selected official downloadable doc for ${target.key}: ${doc.origin}`);
        return doc;
      }
    } catch (error) {
      log("WARN", `Could not read official doc ${docUrl}: ${getErrorMessage(error)}`);
    }
  }

  for (const filePath of localTextPaths) {
    log("INFO", `Trying local text doc for ${target.key}: ${filePath}`);
    const doc = await resolveLocalFile(filePath, target.title);
    if (doc) {
      log("INFO", `Selected local text doc for ${target.key}: ${filePath}`);
      return doc;
    }
  }

  return tryHtmlFallback(target);
}

async function detectDbVectorDimension(supabase: SupabaseClient): Promise<number | null> {
  const sample = await supabase
    .from("kb_chunks")
    .select("embedding")
    .not("embedding", "is", null)
    .limit(1)
    .maybeSingle();

  if (sample.error) {
    log("WARN", `Could not sample kb_chunks.embedding to infer dimension: ${sample.error.message}`);
  } else if (sample.data?.embedding != null) {
    const fromRow = parseVectorDimensionFromValue(sample.data.embedding);
    if (fromRow && fromRow > 0) {
      return fromRow;
    }
  }

  const probe = await supabase.rpc("match_kb_chunks", {
    query_embedding: "[0]",
    match_count: 1,
    filter_tags: null,
  });

  if (probe.error) {
    const inferred = parseExpectedDimensionFromError(probe.error.message);
    if (inferred) {
      return inferred;
    }
  }

  return null;
}

async function chooseEmbeddingModel(supabase: SupabaseClient): Promise<EmbeddingModelState> {
  const dbDimension = await detectDbVectorDimension(supabase);
  if (dbDimension != null) {
    const mapped = MODEL_BY_DIMENSION[dbDimension];
    if (mapped) {
      return { model: mapped, dimension: dbDimension };
    }

    const fallbackFromEnv = process.env.OPENAI_EMBEDDING_MODEL?.trim();
    if (fallbackFromEnv) {
      log(
        "WARN",
        `DB appears to use vector(${dbDimension}). Falling back to OPENAI_EMBEDDING_MODEL=${fallbackFromEnv} because no known default mapping exists.`,
      );
      return { model: fallbackFromEnv, dimension: dbDimension };
    }

    throw new Error(
      `Unsupported DB vector dimension ${dbDimension}. Set OPENAI_EMBEDDING_MODEL to a model that matches your database embedding dimension.`,
    );
  }

  return { model: DEFAULT_EMBEDDING_MODEL, dimension: null };
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

  const payload = JSON.parse(raw) as {
    data?: Array<{ embedding?: number[] }>;
  };

  const embeddings = payload.data?.map((item) => item.embedding).filter(Array.isArray) as number[][];
  if (!embeddings || embeddings.length !== input.length) {
    throw new Error("OpenAI embeddings response did not match requested batch size.");
  }

  return embeddings;
}

async function createEmbeddings(model: string, chunks: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
    log(
      "INFO",
      `Embedding chunks ${i + 1}-${Math.min(i + batch.length, chunks.length)} of ${chunks.length} with ${model}.`,
    );
    const next = await createEmbeddingsBatch(model, batch);
    embeddings.push(...next);
  }

  return embeddings;
}

async function upsertSourceCompat(
  supabase: SupabaseClient,
  target: SatTarget,
  resolved: ResolvedDocument,
): Promise<{ id: string }> {
  const basePayload = {
    url: target.canonicalUrl,
    title: resolved.title || target.title,
    publisher: target.publisher,
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
    log("WARN", "kb_sources appears to require a `source` column. Retrying upsert with source hostname.");

    const retryPayload = {
      ...basePayload,
      source: new URL(target.canonicalUrl).hostname,
    };

    response = await supabase
      .from("kb_sources")
      .upsert(retryPayload, { onConflict: "url" })
      .select("id")
      .single();

    if (!response.error && response.data?.id) {
      return { id: response.data.id as string };
    }
  }

  throw new Error(`Could not upsert kb_sources row for ${target.key}: ${response.error?.message || "unknown"}`);
}

async function loadExistingChunks(supabase: SupabaseClient, sourceId: string): Promise<ExistingChunkRow[]> {
  const response = await supabase.from("kb_chunks").select("id,chunk_text,tags").eq("source_id", sourceId);
  if (response.error) {
    throw new Error(`Could not load existing chunks for source ${sourceId}: ${response.error.message}`);
  }

  return (response.data ?? []) as ExistingChunkRow[];
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

async function insertChunkRows(
  supabase: SupabaseClient,
  rows: ChunkInsertRow[],
): Promise<{ usedChunkIndex: boolean; errorMessage: string | null }> {
  let payload = rows;
  let usedChunkIndex = false;

  while (true) {
    const response = await supabase.from("kb_chunks").insert(payload);
    if (!response.error) {
      return { usedChunkIndex, errorMessage: null };
    }

    const message = response.error.message;
    if (!usedChunkIndex && requiresChunkIndexColumn(message)) {
      usedChunkIndex = true;
      payload = rows.map((row, index) => ({ ...row, chunk_index: index }));
      log("WARN", "kb_chunks appears to require `chunk_index`. Retrying insert with chunk_index values.");
      continue;
    }

    return { usedChunkIndex, errorMessage: message };
  }
}

async function ingestChunksForSource(
  supabase: SupabaseClient,
  sourceId: string,
  chunks: string[],
  tags: string[],
  modelState: EmbeddingModelState,
): Promise<void> {
  let model = modelState.model;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const embeddings = await createEmbeddings(model, chunks);
    const rows: ChunkInsertRow[] = chunks.map((chunk, index) => ({
      source_id: sourceId,
      chunk_text: chunk,
      embedding: toVectorLiteral(embeddings[index] ?? []),
      tags,
    }));

    const insertResult = await insertChunkRows(supabase, rows);
    if (!insertResult.errorMessage) {
      modelState.model = model;
      modelState.dimension = embeddings[0]?.length ?? modelState.dimension;
      return;
    }

    const expectedDimension = parseExpectedDimensionFromError(insertResult.errorMessage);
    const fallbackModel = expectedDimension ? MODEL_BY_DIMENSION[expectedDimension] : undefined;

    if (fallbackModel && fallbackModel !== model && attempt < 2) {
      log(
        "WARN",
        `Embedding dimension mismatch detected (${insertResult.errorMessage}). Retrying with model ${fallbackModel}.`,
      );
      model = fallbackModel;
      continue;
    }

    throw new Error(`Could not insert kb_chunks rows: ${insertResult.errorMessage}`);
  }
}

async function deleteChunksByIds(supabase: SupabaseClient, ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const response = await supabase.from("kb_chunks").delete().in("id", ids);
  if (response.error) {
    throw new Error(`Could not delete old kb_chunks rows: ${response.error.message}`);
  }
}

async function ingestTarget(
  supabase: SupabaseClient,
  target: SatTarget,
  modelState: EmbeddingModelState,
): Promise<"updated" | "unchanged" | "skipped"> {
  log("INFO", `Processing target: ${target.key}`);

  const resolved = await resolveDocumentForTarget(target);
  if (!resolved) {
    log("WARN", `No usable document found for ${target.key}.`);
    return "skipped";
  }

  const chunks = chunkTextByParagraphs(resolved.text);
  if (chunks.length === 0) {
    log("WARN", `Document resolved for ${target.key} but no chunks were produced.`);
    return "skipped";
  }

  const sourceRow = await upsertSourceCompat(supabase, target, resolved);
  const existingRows = await loadExistingChunks(supabase, sourceRow.id);

  const tags = dedupe([...target.tags, `doc:${resolved.kind}`]);
  const nextHash = hashChunkPayload(chunks.map((chunk) => ({ chunk_text: chunk, tags })));
  const existingHash = hashChunkPayload(existingRows);

  if (existingRows.length > 0 && nextHash === existingHash) {
    log("INFO", `No content change for ${target.key}; skipping chunk re-ingestion.`);
    return "unchanged";
  }

  await ingestChunksForSource(supabase, sourceRow.id, chunks, tags, modelState);

  const previousIds = existingRows.map((row) => row.id);
  await deleteChunksByIds(supabase, previousIds);

  log(
    "INFO",
    `Ingested ${chunks.length} chunks for ${target.key} from ${resolved.kind} (${resolved.origin}).`,
  );

  return "updated";
}

async function main() {
  const supabaseUrl = mustGetEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = mustGetEnv("SUPABASE_SERVICE_ROLE_KEY");
  mustGetEnv("OPENAI_API_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const modelState = await chooseEmbeddingModel(supabase);
  log(
    "INFO",
    `Starting SAT ingestion for ${TARGETS.length} targets. Embedding model=${modelState.model}${
      modelState.dimension ? ` (db vector dimension ${modelState.dimension})` : ""
    }`,
  );

  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  let failed = 0;

  for (const target of TARGETS) {
    try {
      const result = await ingestTarget(supabase, target, modelState);
      if (result === "updated") updated += 1;
      if (result === "unchanged") unchanged += 1;
      if (result === "skipped") skipped += 1;
    } catch (error) {
      failed += 1;
      log("ERROR", `Target ${target.key} failed: ${getErrorMessage(error)}`);
    }
  }

  log(
    "INFO",
    `SAT ingestion finished. updated=${updated}, unchanged=${unchanged}, skipped=${skipped}, failed=${failed}.`,
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  log("ERROR", `Fatal ingestion error: ${getErrorMessage(error)}`);
  process.exit(1);
});

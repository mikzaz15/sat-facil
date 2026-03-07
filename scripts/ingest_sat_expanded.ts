import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";

const REQUIRED_FILES = [
  "sat_sources/reglas_cfdi_sat.md",
  "sat_sources/metodos_pago_cfdi_pue_ppd.md",
  "sat_sources/complemento_pagos_20_sat_reglas.md",
  "sat_sources/catalogo_uso_cfdi.md",
  "sat_sources/cancelacion_cfdi.md",
  "sat_sources/resico_personas_fisicas.md",
  "sat_sources/facturacion_extranjeros.md",
  "sat_sources/cfdi_sin_rfc.md",
  "sat_sources/errores_comunes_cfdi.md",
];

const MIN_DOC_SIZE_BYTES = 700;

function log(level: "INFO" | "WARN" | "ERROR", message: string) {
  console.log(`[${new Date().toISOString()}] [${level}] ${message}`);
}

async function ensureRequiredSources(): Promise<void> {
  for (const relativePath of REQUIRED_FILES) {
    const absolutePath = path.resolve(process.cwd(), relativePath);
    const stats = await fs.stat(absolutePath).catch(() => null);

    if (!stats || !stats.isFile()) {
      throw new Error(`Missing required SAT source: ${relativePath}`);
    }

    if (stats.size < MIN_DOC_SIZE_BYTES) {
      throw new Error(
        `SAT source looks too short (${stats.size} bytes): ${relativePath}`,
      );
    }
  }
}

async function runLocalIngestion(): Promise<void> {
  const tsxCli = path.resolve(
    process.cwd(),
    "node_modules",
    "tsx",
    "dist",
    "cli.mjs",
  );
  const ingestScript = path.resolve(process.cwd(), "scripts", "ingest_sat_local.ts");

  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [tsxCli, ingestScript], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`ingest_sat_local exited with code ${code ?? "unknown"}`));
    });
  });
}

async function main() {
  log("INFO", `Validating expanded SAT sources (${REQUIRED_FILES.length} files).`);
  await ensureRequiredSources();
  log("INFO", "Required SAT sources found. Running local markdown ingestion.");
  await runLocalIngestion();
  log("INFO", "Expanded SAT source ingestion completed.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  log("ERROR", message);
  process.exit(1);
});

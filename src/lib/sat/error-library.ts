import errorLibraryData from "@/data/sat-error-library.json";

export type SatErrorLibraryEntry = {
  code: string;
  topic: string;
  meaning: string;
  why_it_happens: string[];
  how_to_fix: string[];
  example: string;
};

const entries = errorLibraryData as SatErrorLibraryEntry[];

export function normalizeSatErrorCode(input: string): string {
  return (input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function getSatErrorLibraryEntry(
  rawCode: string,
): SatErrorLibraryEntry | null {
  const code = normalizeSatErrorCode(rawCode);
  if (!code) return null;

  return entries.find((entry) => entry.code === code) || null;
}

export function listSatErrorCodes(): string[] {
  return entries.map((entry) => entry.code);
}

export function listSatErrorCodesForStaticPages(limit = 20): string[] {
  return entries.slice(0, Math.max(0, limit)).map((entry) => entry.code);
}

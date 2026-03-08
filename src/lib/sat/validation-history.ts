import type { SupabaseClient } from "@supabase/supabase-js";

type ValidationIssue = {
  code: string;
  message: string;
  fix: string;
  related_rule?: string;
};

type ValidationResultInput = {
  is_valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  suggested_fixes: string[];
  detected_rules: string[];
};

export type ValidationHistoryResult = "OK" | "Error" | "Warning";

export type ValidationHistoryRow = {
  id: string;
  file_name: string;
  result: ValidationHistoryResult;
  detected_errors: Array<{
    type: "error" | "warning";
    code: string;
    message: string;
    fix: string;
  }>;
  created_at: string;
};

function toHistoryResult(
  validation: ValidationResultInput,
): ValidationHistoryResult {
  if (validation.errors.length > 0) return "Error";
  if (validation.warnings.length > 0) return "Warning";
  return "OK";
}

function toDetectedErrors(validation: ValidationResultInput) {
  const issues = [
    ...validation.errors.map((issue) => ({
      type: "error" as const,
      code: issue.code,
      message: issue.message,
      fix: issue.fix,
    })),
    ...validation.warnings.map((issue) => ({
      type: "warning" as const,
      code: issue.code,
      message: issue.message,
      fix: issue.fix,
    })),
  ];
  return issues;
}

function resolveHistoryFileName(params: {
  fileName?: string;
  mode: "manual" | "xml" | "xml_fix";
  sourcePage?: string;
}): string {
  const explicit = params.fileName?.trim();
  if (explicit) return explicit;

  if (params.mode === "manual") {
    return "entrada_manual";
  }

  if (params.sourcePage === "/cfdi-batch-validator") {
    return "batch_cfdi.xml";
  }

  return "cfdi.xml";
}

export async function saveValidationHistory(params: {
  supabase: SupabaseClient;
  userId: string;
  fileName?: string;
  mode: "manual" | "xml" | "xml_fix";
  sourcePage?: string;
  validation: ValidationResultInput;
}) {
  const sanitizedFileName = resolveHistoryFileName({
    fileName: params.fileName,
    mode: params.mode,
    sourcePage: params.sourcePage,
  });
  const result = toHistoryResult(params.validation);
  const detectedErrors = toDetectedErrors(params.validation);

  const insert = await params.supabase.from("validation_history").insert({
    user_id: params.userId,
    file_name: sanitizedFileName,
    result,
    detected_errors: detectedErrors,
  });

  if (insert.error) {
    throw new Error(`Could not save validation history: ${insert.error.message}`);
  }
}

export async function saveXmlValidationHistory(params: {
  supabase: SupabaseClient;
  userId: string;
  fileName: string;
  validation: ValidationResultInput;
}) {
  await saveValidationHistory({
    supabase: params.supabase,
    userId: params.userId,
    fileName: params.fileName,
    mode: "xml",
    validation: params.validation,
  });
}

export async function listValidationHistory(
  supabase: SupabaseClient,
  userId: string,
  limit = 100,
): Promise<ValidationHistoryRow[]> {
  const query = await supabase
    .from("validation_history")
    .select("id,file_name,result,detected_errors,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (query.error) {
    throw new Error(`Could not read validation history: ${query.error.message}`);
  }

  return (query.data || []) as ValidationHistoryRow[];
}

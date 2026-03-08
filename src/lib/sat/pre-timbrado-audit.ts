export type PreTimbradoAuditInput = {
  rfc_receptor: string;
  uso_cfdi: string;
  forma_pago: string;
  metodo_pago: string;
  tipo_comprobante: string;
};

export type PreTimbradoIssue = {
  code: string;
  explanation: string;
  suggested_values: string[];
};

export type PreTimbradoAuditResult = {
  status: "OK" | "Error";
  issues: PreTimbradoIssue[];
};

const VALID_TIPO_COMPROBANTE = new Set(["I", "E", "T", "N", "P"]);
const VALID_METODO_PAGO = new Set(["PUE", "PPD"]);

const VALID_FORMA_PAGO = new Set([
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "08",
  "12",
  "13",
  "14",
  "15",
  "17",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
  "29",
  "30",
  "31",
  "99",
]);

const VALID_USO_CFDI = new Set([
  "G01",
  "G02",
  "G03",
  "I01",
  "I02",
  "I03",
  "I04",
  "I05",
  "I06",
  "I07",
  "I08",
  "D01",
  "D02",
  "D03",
  "D04",
  "D05",
  "D06",
  "D07",
  "D08",
  "D09",
  "D10",
  "S01",
  "CP01",
]);

function normalizeUpper(input: string): string {
  return (input || "").trim().toUpperCase();
}

function extractFormaPagoCode(value: string): string {
  const normalized = normalizeUpper(value);
  const match = normalized.match(/\b\d{2}\b/);
  return match?.[0] || normalized;
}

function isValidRfc(value: string): boolean {
  const rfc = normalizeUpper(value);
  if (!rfc) return false;
  return /^([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})$/.test(rfc);
}

export function auditCfdiPreTimbrado(
  input: PreTimbradoAuditInput,
): PreTimbradoAuditResult {
  const tipo = normalizeUpper(input.tipo_comprobante);
  const metodo = normalizeUpper(input.metodo_pago);
  const uso = normalizeUpper(input.uso_cfdi);
  const forma = extractFormaPagoCode(input.forma_pago);
  const rfc = normalizeUpper(input.rfc_receptor);

  const issues: PreTimbradoIssue[] = [];

  if (!isValidRfc(rfc)) {
    issues.push({
      code: "RFC_RECEPTOR_INVALIDO",
      explanation:
        "El RFC del receptor no cumple el formato esperado por SAT para CFDI.",
      suggested_values: [
        "Verifica RFC en Constancia de Situación Fiscal.",
        "Ejemplo persona moral: AAA010101AAA",
        "Ejemplo persona física: AAAA010101AAA",
      ],
    });
  }

  if (!VALID_TIPO_COMPROBANTE.has(tipo)) {
    issues.push({
      code: "TIPO_COMPROBANTE_INVALIDO",
      explanation:
        "Tipo de comprobante fuera de catálogo SAT para CFDI 4.0.",
      suggested_values: ["Usa I, E, T, N o P."],
    });
  }

  if (!VALID_METODO_PAGO.has(metodo) && tipo !== "P") {
    issues.push({
      code: "METODO_PAGO_INVALIDO",
      explanation:
        "Método de pago inválido para pre-timbrado de CFDI de ingreso/egreso/nómina.",
      suggested_values: ["PUE (pago inmediato)", "PPD (pago diferido/parcial)"],
    });
  }

  if (!VALID_FORMA_PAGO.has(forma)) {
    issues.push({
      code: "FORMA_PAGO_INVALIDA",
      explanation:
        "Forma de pago no coincide con claves de catálogo SAT vigentes.",
      suggested_values: ["03 (transferencia)", "01 (efectivo)", "99 (por definir)"],
    });
  }

  if (!VALID_USO_CFDI.has(uso)) {
    issues.push({
      code: "USO_CFDI_INVALIDO",
      explanation: "Uso CFDI fuera de catálogo SAT.",
      suggested_values: ["G03", "S01", "CP01"],
    });
  }

  if (metodo === "PPD" && forma !== "99") {
    issues.push({
      code: "INCOMPATIBILIDAD_PPD_FORMA_PAGO",
      explanation:
        "Con Método de pago PPD, la Forma de pago del CFDI inicial debe ser 99 (por definir).",
      suggested_values: ["Método: PPD + Forma: 99"],
    });
  }

  if (metodo === "PUE" && forma === "99") {
    issues.push({
      code: "INCOMPATIBILIDAD_PUE_FORMA_PAGO",
      explanation:
        "Con Método de pago PUE no debe usarse Forma de pago 99.",
      suggested_values: ["PUE + 03", "PUE + 01", "PUE + 28"],
    });
  }

  if (tipo === "P" && uso !== "CP01") {
    issues.push({
      code: "USO_CFDI_NO_COMPATIBLE_TIPO_P",
      explanation:
        "Para complemento de pagos (tipo P), normalmente el Uso CFDI esperado es CP01.",
      suggested_values: ["Tipo comprobante P + Uso CFDI CP01"],
    });
  }

  if (tipo !== "P" && uso === "CP01") {
    issues.push({
      code: "USO_CFDI_CP01_NO_COMPATIBLE",
      explanation:
        "CP01 se reserva usualmente para complemento de pagos (tipo P).",
      suggested_values: ["Para ingreso general usa G03", "Para sin efectos fiscales considera S01"],
    });
  }

  return {
    status: issues.length > 0 ? "Error" : "OK",
    issues,
  };
}

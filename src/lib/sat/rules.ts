import type { RouterResult, SatTopic } from "@/lib/sat/types";

export type SatRuleScenario =
  | "PUE_PPD"
  | "COMPLEMENTO_PAGOS_20"
  | "CANCELACION_CFDI"
  | "FACTURACION_EXTRANJEROS"
  | "RESICO_BASICO";

export type SatRuleGuidance = {
  scenario: SatRuleScenario;
  matchedKeywords: string[];
  score: number;
  summary: string;
  satRule: string;
  actions: string[];
  practicalExample: string;
  commonErrors: string[];
};

export type CfdiDecisionInput = {
  sale_date: string;
  payment_date?: string | null;
  partial_payment?: boolean;
  foreign_client?: boolean;
  amount?: number;
  currency?: string;
};

export type CfdiDecisionRecommendation = {
  tipo_comprobante: "I";
  metodo_pago: "PUE" | "PPD";
  forma_pago: string;
  complemento_pagos_required: boolean;
  sat_risks: string[];
  steps: string[];
  applied_rules: SatRuleScenario[];
  guidance: {
    summary?: string;
    sat_rule?: string;
    practical_example?: string;
  };
};

export type CfdiValidationInput = {
  tipo_comprobante?: string;
  metodo_pago?: string;
  forma_pago?: string;
  uso_cfdi?: string;
  regimen_fiscal?: string;
  currency?: string;
  payment_date?: string | null;
};

export type CfdiValidationIssue = {
  code: string;
  message: string;
  fix: string;
  related_rule?: SatRuleScenario;
};

export type CfdiValidationResult = {
  is_valid: boolean;
  errors: CfdiValidationIssue[];
  warnings: CfdiValidationIssue[];
  suggested_fixes: string[];
  detected_rules: SatRuleScenario[];
};

type SatRuleDefinition = {
  scenario: SatRuleScenario;
  topics: SatTopic[];
  keywords: string[];
  summary: string;
  satRule: string;
  actions: string[];
  practicalExample: string;
  commonErrors: string[];
};

const SAT_RULES: SatRuleDefinition[] = [
  {
    scenario: "PUE_PPD",
    topics: ["PAGOS_COMPLEMENTO", "FACTURACION_CFDI"],
    keywords: [
      "pue",
      "ppd",
      "metodo de pago",
      "metodo pago",
      "pago en una sola exhibicion",
      "pago en parcialidades",
      "pago diferido",
      "credito",
    ],
    summary:
      "La elección entre PUE y PPD depende del momento real de cobro de la operación facturada.",
    satRule:
      "Usa PUE cuando el cobro se liquida al emitir el CFDI; usa PPD cuando el cobro será posterior o en parcialidades, y da seguimiento con complemento de pagos cuando aplique.",
    actions: [
      "Confirma si el cobro se recibió total al momento del timbrado.",
      "Si el cobro es posterior o parcial, captura MetodoPago = PPD.",
      "Para cobros posteriores, controla la emisión del complemento de pagos por cada recepción.",
      "Alinea MetodoPago con FormaPago real para evitar inconsistencias de validación.",
    ],
    practicalExample:
      "Factura a 30 días: emite CFDI con PPD; cuando recibes el pago, emites complemento de pagos con el UUID relacionado.",
    commonErrors: [
      "Capturar PUE en operaciones a crédito.",
      "Confundir MetodoPago con FormaPago.",
      "Dejar facturas PPD sin complemento de pagos.",
    ],
  },
  {
    scenario: "COMPLEMENTO_PAGOS_20",
    topics: ["PAGOS_COMPLEMENTO", "FACTURACION_CFDI"],
    keywords: [
      "complemento de pagos",
      "complemento pagos",
      "pagos 2.0",
      "recepcion de pagos",
      "recibo de pago",
      "numparcialidad",
      "saldo insoluto",
      "doctorelacionado",
    ],
    summary:
      "El complemento de pagos 2.0 documenta cobros reales de CFDI emitidos en PPD y mantiene la trazabilidad de saldos.",
    satRule:
      "Cuando un CFDI de ingreso se emite en PPD y el cobro ocurre después, se debe emitir CFDI tipo P con complemento de pagos 2.0, relacionando UUID y saldos por parcialidad.",
    actions: [
      "Verifica que el CFDI origen esté en PPD y con UUID correcto.",
      "Captura NumParcialidad consecutivo por cada pago aplicado.",
      "Valida fórmula de saldos: ImpSaldoAnt - ImpPagado = ImpSaldoInsoluto.",
      "Si un pago cubre varias facturas, registra un DoctoRelacionado por cada UUID.",
    ],
    practicalExample:
      "Factura PPD por 11,600: primer pago 5,000 (saldo insoluto 6,600), segundo pago 6,600 (saldo insoluto 0).",
    commonErrors: [
      "Emitir complemento para CFDI PUE en flujo normal.",
      "Romper consecutivo de parcialidades.",
      "Capturar saldos con cálculo inconsistente o UUID incorrecto.",
    ],
  },
  {
    scenario: "CANCELACION_CFDI",
    topics: ["FACTURACION_CFDI", "OTRO", "PAGOS_COMPLEMENTO"],
    keywords: [
      "cancelacion",
      "cancelar",
      "cfdi cancelado",
      "motivo de cancelacion",
      "sustitucion",
      "sustituir",
      "uuid",
    ],
    summary:
      "La cancelación debe seguir un motivo correcto y, cuando aplica, una sustitución con trazabilidad entre UUID.",
    satRule:
      "Antes de cancelar, valida estatus y motivo; si hay corrección de datos, emite CFDI sustituto y relaciónalo conforme criterios SAT vigentes.",
    actions: [
      "Identifica causa raíz del error (receptor, importes, impuestos o método de pago).",
      "Determina si procede cancelación simple o con sustitución.",
      "Ejecuta cancelación con motivo correcto y conserva evidencia interna.",
      "Si hay sustitución, emite nuevo CFDI validado y referencia el UUID previo.",
    ],
    practicalExample:
      "Si el RFC receptor está incorrecto, cancela el CFDI erróneo y emite uno nuevo con datos corregidos y relación de sustitución.",
    commonErrors: [
      "Cancelar sin documentar motivo.",
      "No relacionar UUID en sustituciones.",
      "Reemitir con el mismo error por falta de checklist.",
    ],
  },
  {
    scenario: "FACTURACION_EXTRANJEROS",
    topics: ["FACTURACION_CFDI", "OTRO"],
    keywords: [
      "extranjero",
      "cliente extranjero",
      "residente en el extranjero",
      "factura al extranjero",
      "exportacion",
      "pais de residencia",
      "tax id",
      "tipo de cambio",
      "moneda extranjera",
    ],
    summary:
      "Para facturar a extranjeros se deben capturar datos del receptor y de la operación internacional de forma consistente con catálogos vigentes.",
    satRule:
      "Valida datos del receptor extranjero, clave de exportación cuando corresponda, y coherencia de moneda/tipo de cambio e impuestos según el acto.",
    actions: [
      "Confirma tipo de operación: nacional vs exportación.",
      "Captura datos fiscales del receptor extranjero según regla aplicable.",
      "Define moneda y tipo de cambio alineados al documento comercial.",
      "Valida impuestos y claves CFDI antes de timbrar.",
    ],
    practicalExample:
      "Servicio a cliente extranjero en USD: captura datos del receptor, moneda USD y tipo de cambio del día de emisión según política fiscal aplicable.",
    commonErrors: [
      "Omitir datos obligatorios del receptor extranjero.",
      "Registrar moneda sin control de tipo de cambio.",
      "Tratar exportación como operación local sin validar claves.",
    ],
  },
  {
    scenario: "RESICO_BASICO",
    topics: ["RESICO", "FACTURACION_CFDI"],
    keywords: [
      "resico",
      "regimen simplificado",
      "persona fisica resico",
      "obligaciones resico",
      "factura resico",
      "ingresos resico",
    ],
    summary:
      "En RESICO PF, la facturación debe mantenerse consistente con régimen, ingresos y cumplimiento operativo.",
    satRule:
      "Verifica permanencia en RESICO, emite CFDI con datos y catálogos correctos, y concilia facturación/cobranza con obligaciones declarativas.",
    actions: [
      "Confirma que emisor y receptor tengan datos fiscales actualizados.",
      "Valida uso CFDI, régimen y método/forma de pago en cada emisión.",
      "Concilia facturación y cobros para detectar diferencias mensuales.",
      "Mantén evidencia documental por operación relevante.",
    ],
    practicalExample:
      "Profesional RESICO con cobro diferido: emite CFDI con PPD y, al cobrar, complementa conforme flujo de pagos.",
    commonErrors: [
      "Usar régimen o uso CFDI incompatible.",
      "No conciliar CFDI emitidos vs ingresos declarados.",
      "Ignorar cambios de datos fiscales del cliente.",
    ],
  },
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[._-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreRule(
  question: string,
  topic: SatTopic,
  rule: SatRuleDefinition,
): { matchedKeywords: string[]; score: number } {
  const normalizedQuestion = normalize(question);
  const matchedKeywords = rule.keywords.filter((keyword) =>
    normalizedQuestion.includes(normalize(keyword)),
  );

  const keywordScore = Math.min(0.75, matchedKeywords.length * 0.22);
  const topicScore = rule.topics.includes(topic) ? 0.2 : 0;
  const totalScore = keywordScore + topicScore;

  return {
    matchedKeywords,
    score: Number(totalScore.toFixed(4)),
  };
}

export function buildSatRuleGuidance(
  question: string,
  router: RouterResult,
): SatRuleGuidance | null {
  const scored = SAT_RULES.map((rule) => {
    const result = scoreRule(question, router.topic, rule);
    return { rule, ...result };
  })
    .filter((entry) => entry.matchedKeywords.length > 0)
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top || top.score < 0.26) {
    return null;
  }

  return {
    scenario: top.rule.scenario,
    matchedKeywords: top.matchedKeywords,
    score: top.score,
    summary: top.rule.summary,
    satRule: top.rule.satRule,
    actions: top.rule.actions,
    practicalExample: top.rule.practicalExample,
    commonErrors: top.rule.commonErrors,
  };
}

function parseDateAsUtc(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function compareDateOnly(left: string, right: string): number | null {
  const l = parseDateAsUtc(left);
  const r = parseDateAsUtc(right);
  if (!l || !r) return null;
  if (l.getTime() < r.getTime()) return -1;
  if (l.getTime() > r.getTime()) return 1;
  return 0;
}

function dedupe(items: string[], max = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of items) {
    const value = item.trim();
    if (!value) continue;
    const key = normalize(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= max) break;
  }

  return out;
}

function guidanceForScenario(scenario: SatRuleScenario): SatRuleGuidance | null {
  const rule = SAT_RULES.find((entry) => entry.scenario === scenario);
  if (!rule) return null;

  return {
    scenario: rule.scenario,
    matchedKeywords: [],
    score: 1,
    summary: rule.summary,
    satRule: rule.satRule,
    actions: rule.actions,
    practicalExample: rule.practicalExample,
    commonErrors: rule.commonErrors,
  };
}

export function buildCfdiDecisionRecommendation(
  input: CfdiDecisionInput,
): CfdiDecisionRecommendation {
  const saleDate = input.sale_date?.trim();
  if (!saleDate || !parseDateAsUtc(saleDate)) {
    throw new Error("sale_date must be YYYY-MM-DD");
  }

  const paymentDate = input.payment_date?.trim() || null;
  if (paymentDate && !parseDateAsUtc(paymentDate)) {
    throw new Error("payment_date must be YYYY-MM-DD when provided");
  }

  const partialPayment = Boolean(input.partial_payment);
  const foreignClient = Boolean(input.foreign_client);
  const amount = Number(input.amount ?? 0);
  const currency = (input.currency || "MXN").trim().toUpperCase();

  const paymentVsSale = paymentDate ? compareDateOnly(paymentDate, saleDate) : null;
  const delayedPayment = paymentVsSale !== null && paymentVsSale > 0;
  const metodoPago: "PUE" | "PPD" =
    partialPayment || delayedPayment ? "PPD" : "PUE";
  const complementoRequired = metodoPago === "PPD";

  const formaPago =
    metodoPago === "PPD"
      ? "99 - Por definir"
      : "03 - Transferencia electrónica de fondos (ajustar al medio real)";

  const appliedRuleSet = new Set<SatRuleScenario>([
    "PUE_PPD",
    "CANCELACION_CFDI",
  ]);
  if (complementoRequired) appliedRuleSet.add("COMPLEMENTO_PAGOS_20");
  if (foreignClient) appliedRuleSet.add("FACTURACION_EXTRANJEROS");

  const appliedRules = Array.from(appliedRuleSet);
  const guidances = appliedRules
    .map((scenario) => guidanceForScenario(scenario))
    .filter((entry): entry is SatRuleGuidance => Boolean(entry));

  const satRisks = dedupe(
    [
      ...(paymentVsSale !== null && paymentVsSale < 0
        ? ["payment_date es anterior a sale_date; revisa captura y evidencia de operación."]
        : []),
      ...(complementoRequired && !paymentDate
        ? ["Operación PPD sin payment_date definido: controla calendario de cobros y complemento de pagos 2.0."]
        : []),
      ...(!Number.isFinite(amount) || amount <= 0
        ? ["Monto inválido o no positivo; valida total antes de timbrar CFDI."]
        : []),
      ...(currency.length !== 3
        ? ["Currency no parece clave ISO-4217 de 3 letras; valida moneda/tipo de cambio."]
        : []),
      ...(foreignClient
        ? ["Cliente extranjero: valida datos del receptor, exportación (si aplica) y consistencia de moneda/tipo de cambio."]
        : []),
      ...guidances.flatMap((guidance) => guidance.commonErrors),
    ],
    8,
  );

  const steps = dedupe(
    [
      `Emite CFDI tipo I con MetodoPago ${metodoPago}.`,
      `Captura FormaPago recomendada: ${formaPago}.`,
      ...(complementoRequired
        ? [
            "Emite complemento de pagos 2.0 al recibir cada cobro y relaciona UUID/NumParcialidad/saldos.",
          ]
        : [
            "Si el pago no se liquida el mismo día, corrige a PPD antes de cerrar ciclo de facturación.",
          ]),
      ...(foreignClient
        ? [
            "Valida datos fiscales del receptor extranjero y clave de exportación cuando corresponda.",
          ]
        : []),
      ...guidances.flatMap((guidance) => guidance.actions),
    ],
    10,
  );

  const primaryGuidance = guidances[0];

  return {
    tipo_comprobante: "I",
    metodo_pago: metodoPago,
    forma_pago: formaPago,
    complemento_pagos_required: complementoRequired,
    sat_risks: satRisks,
    steps,
    applied_rules: appliedRules,
    guidance: {
      summary: primaryGuidance?.summary,
      sat_rule: primaryGuidance?.satRule,
      practical_example: primaryGuidance?.practicalExample,
    },
  };
}

function normalizeUpper(value: string | null | undefined): string {
  return (value ?? "").trim().toUpperCase();
}

function extractFormaPagoCode(value: string): string {
  const normalized = normalizeUpper(value);
  const match = normalized.match(/\b\d{2}\b/);
  if (match?.[0]) return match[0];
  return normalized;
}

function inferValidationTopic(
  metodoPago: string,
  regimenFiscal: string,
): SatTopic {
  if (metodoPago === "PUE" || metodoPago === "PPD") return "PAGOS_COMPLEMENTO";
  if (regimenFiscal === "626") return "RESICO";
  return "FACTURACION_CFDI";
}

export function buildCfdiValidationResult(
  input: CfdiValidationInput,
): CfdiValidationResult {
  const tipoComprobante = normalizeUpper(input.tipo_comprobante);
  const metodoPago = normalizeUpper(input.metodo_pago);
  const formaPagoCode = extractFormaPagoCode(input.forma_pago ?? "");
  const usoCfdi = normalizeUpper(input.uso_cfdi);
  const regimenFiscal = normalizeUpper(input.regimen_fiscal);
  const currency = normalizeUpper(input.currency || "MXN");
  const paymentDate = (input.payment_date ?? "").trim();

  const errors: CfdiValidationIssue[] = [];
  const warnings: CfdiValidationIssue[] = [];
  const detectedRules = new Set<SatRuleScenario>();

  const addError = (issue: CfdiValidationIssue) => errors.push(issue);
  const addWarning = (issue: CfdiValidationIssue) => warnings.push(issue);

  const validTipos = new Set(["I", "E", "T", "N", "P"]);
  const validMetodos = new Set(["PUE", "PPD"]);

  if (!tipoComprobante) {
    addError({
      code: "TIPO_MISSING",
      message: "Falta tipo_comprobante.",
      fix: "Captura tipo_comprobante válido (I, E, T, N o P).",
    });
  } else if (!validTipos.has(tipoComprobante)) {
    addError({
      code: "TIPO_INVALID",
      message: `tipo_comprobante inválido: ${tipoComprobante}.`,
      fix: "Usa un tipo válido SAT (I, E, T, N o P).",
    });
  }

  if (!metodoPago) {
    addError({
      code: "METODO_MISSING",
      message: "Falta metodo_pago.",
      fix: "Captura metodo_pago (PUE o PPD) para CFDI de ingreso/egreso/nómina.",
      related_rule: "PUE_PPD",
    });
  } else if (!validMetodos.has(metodoPago) && tipoComprobante !== "P") {
    addError({
      code: "METODO_INVALID",
      message: `metodo_pago inválido: ${metodoPago}.`,
      fix: "Usa PUE o PPD según el momento real de cobro.",
      related_rule: "PUE_PPD",
    });
  }

  if (!formaPagoCode) {
    addError({
      code: "FORMA_MISSING",
      message: "Falta forma_pago.",
      fix: "Captura forma_pago con clave SAT válida (por ejemplo 01, 03, 28, 99).",
    });
  } else if (!/^\d{2}$/.test(formaPagoCode)) {
    addError({
      code: "FORMA_INVALID",
      message: `forma_pago inválida: ${input.forma_pago ?? ""}.`,
      fix: "Usa clave de 2 dígitos del catálogo SAT para forma_pago.",
    });
  }

  if (!usoCfdi) {
    addError({
      code: "USO_MISSING",
      message: "Falta uso_cfdi.",
      fix: "Captura uso_cfdi válido conforme catálogo SAT.",
    });
  } else if (!/^(S01|[A-Z][0-9]{2})$/.test(usoCfdi)) {
    addError({
      code: "USO_INVALID",
      message: `uso_cfdi inválido: ${usoCfdi}.`,
      fix: "Usa una clave válida SAT, por ejemplo G03, CP01 o S01.",
    });
  }

  if (!regimenFiscal) {
    addError({
      code: "REGIMEN_MISSING",
      message: "Falta regimen_fiscal.",
      fix: "Captura clave de régimen fiscal de 3 dígitos.",
    });
  } else if (!/^\d{3}$/.test(regimenFiscal)) {
    addError({
      code: "REGIMEN_INVALID",
      message: `regimen_fiscal inválido: ${regimenFiscal}.`,
      fix: "Usa clave de régimen fiscal SAT de 3 dígitos.",
      related_rule: "RESICO_BASICO",
    });
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    addError({
      code: "CURRENCY_INVALID",
      message: `currency inválida: ${currency}.`,
      fix: "Usa código ISO de 3 letras (ejemplo MXN, USD, EUR).",
      related_rule: "FACTURACION_EXTRANJEROS",
    });
  }

  if (paymentDate && !parseDateAsUtc(paymentDate)) {
    addError({
      code: "PAYMENT_DATE_INVALID",
      message: `payment_date inválida: ${paymentDate}.`,
      fix: "Usa formato YYYY-MM-DD para payment_date.",
      related_rule: "COMPLEMENTO_PAGOS_20",
    });
  }

  if (metodoPago === "PPD") {
    detectedRules.add("PUE_PPD");
    detectedRules.add("COMPLEMENTO_PAGOS_20");

    if (formaPagoCode && formaPagoCode !== "99") {
      addError({
        code: "PPD_FORMA_PAGO_MISMATCH",
        message: "MetodoPago PPD debe usar forma_pago 99 (Por definir) en el CFDI inicial.",
        fix: "Cambia forma_pago a 99 y emite complemento de pagos al cobrar.",
        related_rule: "PUE_PPD",
      });
    }

    if (!paymentDate) {
      addWarning({
        code: "PPD_WITHOUT_PAYMENT_DATE",
        message: "Operacion PPD sin payment_date informado.",
        fix: "Define fecha estimada/reporte de cobro para controlar complemento de pagos 2.0.",
        related_rule: "COMPLEMENTO_PAGOS_20",
      });
    }
  }

  if (metodoPago === "PUE") {
    detectedRules.add("PUE_PPD");

    if (formaPagoCode === "99") {
      addError({
        code: "PUE_FORMA_PAGO_INVALID",
        message: "MetodoPago PUE no debe usar forma_pago 99.",
        fix: "Captura la forma de pago real del cobro (ejemplo 01, 03, 28).",
        related_rule: "PUE_PPD",
      });
    }

    if (paymentDate) {
      addWarning({
        code: "PUE_WITH_PAYMENT_DATE",
        message: "Se informó payment_date con MetodoPago PUE; valida que el cobro sí haya sido inmediato.",
        fix: "Si el cobro fue posterior, cambia metodo_pago a PPD antes de timbrar.",
        related_rule: "PUE_PPD",
      });
    }
  }

  if (tipoComprobante === "P") {
    detectedRules.add("COMPLEMENTO_PAGOS_20");

    if (usoCfdi && usoCfdi !== "CP01") {
      addWarning({
        code: "TIPO_P_USO_CFDI",
        message: "Para tipo_comprobante P normalmente se usa uso_cfdi CP01.",
        fix: "Revisa catálogo de uso_cfdi para complemento de pagos y usa CP01 cuando aplique.",
        related_rule: "COMPLEMENTO_PAGOS_20",
      });
    }

    if (formaPagoCode === "99") {
      addWarning({
        code: "TIPO_P_FORMA_PAGO_99",
        message: "En complemento de pagos se recomienda registrar la forma de pago real, no 99.",
        fix: "Captura la forma de pago real en el CFDI tipo P.",
        related_rule: "COMPLEMENTO_PAGOS_20",
      });
    }
  }

  if (tipoComprobante && tipoComprobante !== "P" && usoCfdi === "CP01") {
    addWarning({
      code: "USO_CP01_NON_P",
      message: "uso_cfdi CP01 suele corresponder a complemento de pagos (tipo P).",
      fix: "Verifica si el CFDI debe ser tipo P o cambia uso_cfdi según el caso real.",
      related_rule: "COMPLEMENTO_PAGOS_20",
    });
  }

  if (currency !== "MXN") {
    detectedRules.add("FACTURACION_EXTRANJEROS");
    addWarning({
      code: "NON_MXN_CURRENCY",
      message: "Moneda distinta de MXN: valida tipo de cambio y datos del receptor.",
      fix: "Asegura consistencia de moneda, tipo de cambio y datos de exportación/receptor extranjero.",
      related_rule: "FACTURACION_EXTRANJEROS",
    });
  }

  if (regimenFiscal === "626") {
    detectedRules.add("RESICO_BASICO");
    if (usoCfdi === "S01") {
      addWarning({
        code: "RESICO_S01_REVIEW",
        message: "Con régimen 626 (RESICO PF), uso_cfdi S01 puede requerir revisión del caso fiscal.",
        fix: "Confirma uso_cfdi conforme la operación y evidencia documental.",
        related_rule: "RESICO_BASICO",
      });
    }
  }

  const inferredTopic = inferValidationTopic(metodoPago, regimenFiscal);
  const syntheticQuestion = [
    `tipo comprobante ${tipoComprobante}`,
    `metodo pago ${metodoPago}`,
    `forma pago ${formaPagoCode}`,
    `uso cfdi ${usoCfdi}`,
    `regimen fiscal ${regimenFiscal}`,
    `moneda ${currency}`,
    paymentDate ? `payment date ${paymentDate}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const primaryGuidance = buildSatRuleGuidance(syntheticQuestion, {
    topic: inferredTopic,
    needMoreInfo: false,
    questions: [],
    ragQueries: [syntheticQuestion],
  });
  if (primaryGuidance) {
    detectedRules.add(primaryGuidance.scenario);
  }

  const guidanceActions = Array.from(detectedRules)
    .map((scenario) => guidanceForScenario(scenario))
    .filter((entry): entry is SatRuleGuidance => Boolean(entry))
    .flatMap((guidance) => guidance.actions);

  const suggestedFixes = dedupe(
    [
      ...errors.map((issue) => issue.fix),
      ...warnings.map((issue) => issue.fix),
      ...guidanceActions,
    ],
    12,
  );

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
    suggested_fixes: suggestedFixes,
    detected_rules: Array.from(detectedRules),
  };
}

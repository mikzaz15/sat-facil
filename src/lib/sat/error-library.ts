export type SatCfdiErrorContent = {
  code: string;
  title: string;
  shortDescription: string;
  description: string;
  commonCauses: string[];
  howToFix: string[];
  exampleMessage: string;
  validatorCtaLabel: string;
  relatedCodes: string[];
  keywords: string[];
};

export type SatErrorLibraryEntry = {
  code: string;
  topic: string;
  meaning: string;
  why_it_happens: string[];
  how_to_fix: string[];
  example: string;
};

function entry(input: SatCfdiErrorContent): SatCfdiErrorContent {
  return {
    ...input,
    code: normalizeSatErrorCode(input.code),
    relatedCodes: input.relatedCodes.map((code) => normalizeSatErrorCode(code)),
    keywords: input.keywords.map((keyword) => keyword.trim()).filter(Boolean),
  };
}

const RAW_SAT_CFDI_ERRORS: SatCfdiErrorContent[] = [
  entry({
    code: "CFDI40138",
    title: "Uso CFDI invalido para el receptor",
    shortDescription:
      "El uso CFDI no coincide con el tipo de receptor o con la operacion registrada.",
    description:
      "Este error aparece cuando el valor de UsoCFDI no es compatible con los datos fiscales del receptor o con el tipo de comprobante que intentas timbrar.",
    commonCauses: [
      "Se eligio un UsoCFDI de forma manual sin validar catalogos SAT.",
      "El receptor tiene un regimen fiscal distinto al considerado al capturar la factura.",
      "El sistema reutilizo una plantilla antigua con claves de uso no vigentes para ese caso.",
    ],
    howToFix: [
      "Confirma el regimen fiscal del receptor en su Constancia de Situacion Fiscal.",
      "Selecciona el UsoCFDI correcto segun el catalogo vigente y el tipo de comprobante.",
      "Vuelve a validar el XML antes de enviarlo al PAC.",
    ],
    exampleMessage:
      "CFDI40138: El campo UsoCFDI no es valido para el receptor indicado.",
    validatorCtaLabel: "Validar XML y revisar UsoCFDI",
    relatedCodes: ["CFDI40103", "CFDI40102", "CFDI40107", "CFDI40221"],
    keywords: [
      "error cfdi40138",
      "cfdi40138 sat",
      "uso cfdi invalido",
      "como corregir cfdi40138",
    ],
  }),
  entry({
    code: "CFDI40103",
    title: "Dato obligatorio faltante o invalido en el CFDI",
    shortDescription:
      "El XML no cumple con campos requeridos para el timbrado.",
    description:
      "CFDI40103 suele indicar que un dato esencial del comprobante esta vacio, mal formado o fuera del catalogo permitido por SAT.",
    commonCauses: [
      "Campos clave como RFC, UsoCFDI o RegimenFiscal se enviaron vacios.",
      "El XML se genero con formato incorrecto en etiquetas obligatorias.",
      "Se uso una version de plantilla sin ajustes de CFDI 4.0.",
    ],
    howToFix: [
      "Revisa todos los campos obligatorios del emisor y receptor.",
      "Valida que las claves correspondan a catalogos SAT vigentes.",
      "Genera un nuevo XML y prueba nuevamente antes de timbrar.",
    ],
    exampleMessage:
      "CFDI40103: El comprobante contiene datos obligatorios incompletos o invalidos.",
    validatorCtaLabel: "Validar estructura CFDI",
    relatedCodes: ["CFDI40138", "CFDI40102", "CFDI40130", "CFDI40221"],
    keywords: [
      "error cfdi40103",
      "cfdi40103 sat",
      "campo obligatorio cfdi",
      "solucion cfdi40103",
    ],
  }),
  entry({
    code: "CFDI40221",
    title: "Incompatibilidad de catalogos SAT en el comprobante",
    shortDescription:
      "Una o mas claves del CFDI no son coherentes entre si.",
    description:
      "Este error indica conflicto entre valores de catalogos SAT, por ejemplo uso CFDI, regimen fiscal, metodo de pago o tipo de comprobante.",
    commonCauses: [
      "Se mezclaron claves de catalogo que no aplican al mismo escenario fiscal.",
      "El regimen fiscal del receptor no coincide con los datos capturados.",
      "Se modifico manualmente el XML sin validar reglas de consistencia.",
    ],
    howToFix: [
      "Revisa combinaciones entre UsoCFDI, RegimenFiscal y TipoDeComprobante.",
      "Corrige las claves conflictivas con base en catalogos SAT vigentes.",
      "Ejecuta una validacion previa al timbrado para confirmar coherencia.",
    ],
    exampleMessage:
      "CFDI40221: Los datos de catalogo enviados no son compatibles entre si.",
    validatorCtaLabel: "Detectar incompatibilidades SAT",
    relatedCodes: ["CFDI40138", "CFDI40161", "CFDI40205", "CFDI40222"],
    keywords: [
      "error cfdi40221",
      "cfdi40221 sat",
      "catalogos sat incompatibles",
      "como solucionar cfdi40221",
    ],
  }),
  entry({
    code: "CFDI40115",
    title: "Forma de pago invalida para el comprobante",
    shortDescription:
      "La forma de pago no corresponde al metodo o contexto del CFDI.",
    description:
      "CFDI40115 aparece cuando FormaPago no coincide con las reglas del comprobante, especialmente en escenarios PUE, PPD o pagos diferidos.",
    commonCauses: [
      "Se uso FormaPago 99 cuando no corresponde al escenario de facturacion.",
      "MetodoPago y FormaPago fueron capturados con combinaciones invalidas.",
      "El emisor uso una configuracion heredada de otro cliente o flujo.",
    ],
    howToFix: [
      "Valida si la operacion es PUE o PPD antes de asignar forma de pago.",
      "Ajusta FormaPago segun catalogo SAT y politica de cobro real.",
      "Regenera el XML y comprueba el resultado en un validador previo.",
    ],
    exampleMessage:
      "CFDI40115: La forma de pago no es valida para el comprobante emitido.",
    validatorCtaLabel: "Revisar metodo y forma de pago",
    relatedCodes: ["CFDI40148", "CFDI40161", "CFDI40215", "CFDI40222"],
    keywords: [
      "error cfdi40115",
      "cfdi40115 sat",
      "forma de pago invalida cfdi",
      "pue ppd error",
    ],
  }),
  entry({
    code: "CFDI40161",
    title: "Metodo de pago no valido para el tipo de operacion",
    shortDescription:
      "El metodo de pago no coincide con la forma de cobro reportada.",
    description:
      "Este codigo se presenta cuando MetodoPago no es coherente con la operacion real o con otros datos fiscales del CFDI.",
    commonCauses: [
      "Se capturo PUE cuando el pago sera diferido o en parcialidades.",
      "Se capturo PPD sin considerar complementos de pago requeridos.",
      "La factura se emitio con parametros de pago por defecto no revisados.",
    ],
    howToFix: [
      "Define correctamente si el cobro es en una sola exhibicion o diferido.",
      "Configura MetodoPago de forma consistente con FormaPago.",
      "Si aplica PPD, prepara el flujo de complemento de pagos 2.0.",
    ],
    exampleMessage:
      "CFDI40161: MetodoPago no cumple con las validaciones para este comprobante.",
    validatorCtaLabel: "Validar metodo de pago",
    relatedCodes: ["CFDI40115", "CFDI40148", "CFDI40205", "CFDI40222"],
    keywords: [
      "error cfdi40161",
      "cfdi40161 sat",
      "metodo de pago invalido",
      "como corregir cfdi40161",
    ],
  }),
  entry({
    code: "CFDI40148",
    title: "Inconsistencia entre MetodoPago y FormaPago",
    shortDescription:
      "Los campos de pago no cumplen reglas de combinacion SAT.",
    description:
      "CFDI40148 marca conflicto entre MetodoPago y FormaPago, comun en operaciones PUE/PPD con configuraciones incompletas.",
    commonCauses: [
      "Se envio MetodoPago PUE con FormaPago 99 sin justificacion valida.",
      "Se envio MetodoPago PPD con forma distinta a la esperada en la emision inicial.",
      "El XML fue corregido parcialmente y quedo incoherente en campos de pago.",
    ],
    howToFix: [
      "Alinea MetodoPago y FormaPago con el escenario real de cobro.",
      "Verifica catalogos SAT antes de regenerar XML.",
      "Realiza validacion previa para confirmar que no quedan conflictos.",
    ],
    exampleMessage:
      "CFDI40148: MetodoPago y FormaPago no son compatibles segun reglas SAT.",
    validatorCtaLabel: "Corregir campos de pago",
    relatedCodes: ["CFDI40115", "CFDI40161", "CFDI40215", "CFDI40222"],
    keywords: [
      "error cfdi40148",
      "cfdi40148 sat",
      "metodo forma pago incompatibles",
      "solucion cfdi40148",
    ],
  }),
  entry({
    code: "CFDI40102",
    title: "Formato CFDI invalido para timbrado",
    shortDescription:
      "La estructura del XML no cumple con validaciones base de CFDI 4.0.",
    description:
      "CFDI40102 suele indicar problemas de estructura o datos esenciales del XML que impiden su aceptacion por PAC o SAT.",
    commonCauses: [
      "Etiquetas con valores vacios o con sintaxis incorrecta.",
      "Campos fiscales con valores fuera de catalogo o mal formateados.",
      "Version de CFDI no alineada al estandar actual.",
    ],
    howToFix: [
      "Valida estructura XML completa antes de timbrar.",
      "Corrige campos invalidos identificados por el validador.",
      "Genera nuevamente el XML con plantillas de CFDI 4.0.",
    ],
    exampleMessage:
      "CFDI40102: El XML no cumple con el formato o reglas minimas de CFDI.",
    validatorCtaLabel: "Verificar formato XML",
    relatedCodes: ["CFDI40103", "CFDI40107", "CFDI40130", "CFDI40221"],
    keywords: [
      "error cfdi40102",
      "cfdi40102 sat",
      "xml cfdi invalido",
      "como solucionar cfdi40102",
    ],
  }),
  entry({
    code: "CFDI40107",
    title: "RFC del receptor invalido o inconsistente",
    shortDescription:
      "El RFC del receptor no cumple validaciones fiscales del SAT.",
    description:
      "Este error aparece cuando el RFC del receptor tiene formato incorrecto, datos desactualizados o no coincide con el contexto fiscal de la factura.",
    commonCauses: [
      "RFC capturado con error de escritura o longitud invalida.",
      "Uso de RFC generico en un escenario que requiere RFC nominal.",
      "Datos del receptor no actualizados contra constancia fiscal.",
    ],
    howToFix: [
      "Verifica RFC directamente en la constancia del receptor.",
      "Ajusta datos fiscales y vuelve a generar el CFDI.",
      "Valida nuevamente para confirmar que no existan errores relacionados.",
    ],
    exampleMessage:
      "CFDI40107: El RFC del receptor no es valido para el comprobante.",
    validatorCtaLabel: "Validar RFC y datos receptor",
    relatedCodes: ["CFDI40102", "CFDI40103", "CFDI40138", "CFDI40130"],
    keywords: [
      "error cfdi40107",
      "cfdi40107 sat",
      "rfc receptor invalido",
      "solucion cfdi40107",
    ],
  }),
  entry({
    code: "CFDI40205",
    title: "Moneda o tipo de cambio no valido",
    shortDescription:
      "Los datos de moneda no cumplen reglas del comprobante emitido.",
    description:
      "CFDI40205 normalmente se relaciona con valores de Moneda o TipoCambio mal capturados respecto al contexto de la operacion.",
    commonCauses: [
      "Se uso una clave de moneda no permitida para el caso.",
      "TipoCambio ausente o inconsistente cuando la moneda no es MXN.",
      "Formato numerico del tipo de cambio fuera de precision esperada.",
    ],
    howToFix: [
      "Confirma la moneda aplicable y su clave SAT correcta.",
      "Cuando aplique, captura TipoCambio con formato valido.",
      "Revisa importes y regenera el XML antes de timbrar.",
    ],
    exampleMessage:
      "CFDI40205: Moneda o TipoCambio no cumplen validacion SAT.",
    validatorCtaLabel: "Revisar moneda y tipo de cambio",
    relatedCodes: ["CFDI40215", "CFDI40221", "CFDI40222", "CFDI40161"],
    keywords: [
      "error cfdi40205",
      "cfdi40205 sat",
      "moneda invalida cfdi",
      "tipo cambio cfdi error",
    ],
  }),
  entry({
    code: "CFDI40215",
    title: "Importes o calculos no cuadran con reglas SAT",
    shortDescription:
      "Los montos del CFDI presentan diferencias de calculo o redondeo.",
    description:
      "CFDI40215 suele indicar inconsistencias entre subtotal, impuestos, descuentos o total, lo que impide timbrar el comprobante.",
    commonCauses: [
      "Redondeos aplicados de forma distinta entre conceptos e impuestos.",
      "Descuentos capturados sin recalcular bases e importes.",
      "Montos editados manualmente despues de generar el XML.",
    ],
    howToFix: [
      "Recalcula importes a nivel concepto y total con la misma precision.",
      "Valida impuestos trasladados y retenidos antes de timbrar.",
      "Genera un nuevo XML evitando modificaciones manuales de montos.",
    ],
    exampleMessage:
      "CFDI40215: Los importes del comprobante no son consistentes.",
    validatorCtaLabel: "Validar calculos e importes",
    relatedCodes: ["CFDI40205", "CFDI40222", "CFDI40148", "CFDI40115"],
    keywords: [
      "error cfdi40215",
      "cfdi40215 sat",
      "importes cfdi incorrectos",
      "redondeo cfdi error",
    ],
  }),
  entry({
    code: "CFDI40222",
    title: "Inconsistencia en reglas fiscales del comprobante",
    shortDescription:
      "Uno o varios datos del CFDI no cumplen validaciones cruzadas SAT.",
    description:
      "CFDI40222 agrupa conflictos de consistencia entre datos fiscales y de pago que deben estar alineados para permitir timbrado.",
    commonCauses: [
      "Combinaciones invalidas entre tipo de comprobante, pago y receptor.",
      "Campos corregidos parcialmente sin revisar reglas cruzadas.",
      "Catalogos SAT desactualizados en el sistema emisor.",
    ],
    howToFix: [
      "Revisa integralmente los datos fiscales del comprobante.",
      "Actualiza catalogos SAT y corrige campos relacionados en conjunto.",
      "Valida nuevamente para confirmar que no existan errores encadenados.",
    ],
    exampleMessage:
      "CFDI40222: El comprobante presenta inconsistencias contra validaciones SAT.",
    validatorCtaLabel: "Revisar consistencia fiscal",
    relatedCodes: ["CFDI40221", "CFDI40215", "CFDI40161", "CFDI40148"],
    keywords: [
      "error cfdi40222",
      "cfdi40222 sat",
      "inconsistencia fiscal cfdi",
      "como corregir cfdi40222",
    ],
  }),
  entry({
    code: "CFDI40130",
    title: "Regimen fiscal no valido para emisor o receptor",
    shortDescription:
      "El regimen fiscal no coincide con los datos de la operacion.",
    description:
      "CFDI40130 aparece cuando el regimen fiscal capturado no corresponde al perfil del emisor o receptor para ese CFDI.",
    commonCauses: [
      "Regimen fiscal configurado con informacion desactualizada del contribuyente.",
      "Uso de regimen por defecto que no aplica al cliente actual.",
      "Cambio reciente de regimen sin actualizar plantillas de facturacion.",
    ],
    howToFix: [
      "Confirma regimen fiscal vigente del emisor y receptor.",
      "Actualiza configuraciones y plantillas de emision CFDI.",
      "Revalida antes de timbrar para evitar rechazo del PAC.",
    ],
    exampleMessage:
      "CFDI40130: RegimenFiscal no corresponde a la validacion del comprobante.",
    validatorCtaLabel: "Validar regimen fiscal",
    relatedCodes: ["CFDI40103", "CFDI40107", "CFDI40138", "CFDI40221"],
    keywords: [
      "error cfdi40130",
      "cfdi40130 sat",
      "regimen fiscal invalido",
      "solucion cfdi40130",
    ],
  }),
];

export function normalizeSatErrorCode(input: string): string {
  return (input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function codeToKey(code: string): string {
  return normalizeSatErrorCode(code).toLowerCase();
}

export const satCfdiErrorDictionary: Record<string, SatCfdiErrorContent> =
  RAW_SAT_CFDI_ERRORS.reduce<Record<string, SatCfdiErrorContent>>((acc, current) => {
    acc[codeToKey(current.code)] = current;
    return acc;
  }, {});

export function getSatCfdiErrorContent(rawCode: string): SatCfdiErrorContent | null {
  const key = codeToKey(rawCode);
  if (!key) return null;
  return satCfdiErrorDictionary[key] ?? null;
}

export function listSatCfdiErrorCodes(): string[] {
  return Object.values(satCfdiErrorDictionary).map((entry) => entry.code);
}

export function listSatCfdiErrorCodesForStaticPages(limit = 20): string[] {
  return listSatCfdiErrorCodes().slice(0, Math.max(0, limit));
}

export function getRelatedSatCfdiErrors(
  rawCode: string,
  limit = 4,
): SatCfdiErrorContent[] {
  const current = getSatCfdiErrorContent(rawCode);
  if (!current) return [];

  const selected: SatCfdiErrorContent[] = [];
  for (const code of current.relatedCodes) {
    const related = getSatCfdiErrorContent(code);
    if (!related) continue;
    if (related.code === current.code) continue;
    selected.push(related);
    if (selected.length >= Math.max(0, limit)) break;
  }

  return selected;
}

function toLegacyEntry(entryData: SatCfdiErrorContent): SatErrorLibraryEntry {
  return {
    code: entryData.code,
    topic: "CFDI",
    meaning: entryData.shortDescription,
    why_it_happens: entryData.commonCauses,
    how_to_fix: entryData.howToFix,
    example: entryData.exampleMessage,
  };
}

export function getSatErrorLibraryEntry(rawCode: string): SatErrorLibraryEntry | null {
  const found = getSatCfdiErrorContent(rawCode);
  return found ? toLegacyEntry(found) : null;
}

export function listSatErrorCodes(): string[] {
  return listSatCfdiErrorCodes();
}

export function listSatErrorCodesForStaticPages(limit = 20): string[] {
  return listSatCfdiErrorCodesForStaticPages(limit);
}

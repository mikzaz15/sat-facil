import { createClient } from "@supabase/supabase-js";

type SeedSource = {
  url: string;
  title: string;
  publisher: string;
  tags: string[];
  content: string;
};

const SOURCES: SeedSource[] = [
  {
    url: "https://www.sat.gob.mx/consultas/35025/factura-electronica-(cfdi)-4.0",
    title: "Factura electrónica (CFDI) 4.0: qué necesitas para facturar",
    publisher: "SAT",
    tags: ["cfdi", "facturacion", "anexo20"],
    content:
      "Para emitir CFDI 4.0 necesitas estar inscrito en el RFC y mantener actualizados tus datos fiscales. El SAT pide usar un certificado de sello digital (CSD) vigente para timbrar facturas, además de capturar correctamente el nombre o razón social, régimen fiscal, código postal del receptor y uso del CFDI. La factura debe incluir método y forma de pago cuando aplique, clave de producto o servicio, unidad, impuestos trasladados o retenidos y montos desglosados. Si cancelas CFDI, debes seguir los supuestos de cancelación y, cuando corresponda, relacionar el folio sustituto. También es relevante validar que el receptor proporcione datos correctos para evitar rechazos o inconsistencias que afecten deducciones o acreditamientos. El SAT recomienda revisar catálogos vigentes del estándar y conservar controles para respaldar operaciones. Para personas físicas y morales, la emisión debe reflejar la operación real y coincidir con declaraciones. Cuando tengas dudas sobre reglas específicas, consulta reglas misceláneas y guías del portal oficial para evitar errores frecuentes en facturación.",
  },
  {
    url: "https://www.sat.gob.mx/consultas/42968/anexo-20",
    title: "Anexo 20 y estándar técnico del CFDI",
    publisher: "SAT",
    tags: ["anexo20", "cfdi", "tecnico"],
    content:
      "El Anexo 20 define el estándar técnico del CFDI: estructura XML, catálogos, validaciones y complementos que deben respetarse para emitir comprobantes válidos. Incluye reglas para campos obligatorios, tipos de comprobante, moneda, exportación, relaciones entre CFDI y nodos de impuestos. El emisor debe utilizar versiones y catálogos vigentes publicados por SAT, así como verificar cambios de mantenimiento técnico para evitar errores de timbrado. Cuando se usan complementos, estos deben corresponder al tipo de operación y cumplir las guías de llenado aplicables. La consistencia entre datos del receptor, régimen fiscal y uso del CFDI es parte de las validaciones clave. El SAT publica documentación de apoyo y criterios para proveedores de certificación y contribuyentes. Seguir el Anexo 20 ayuda a reducir rechazos, cancelaciones improcedentes y diferencias con información prellenada en declaraciones.",
  },
  {
    url: "https://www.sat.gob.mx/portal/public/tramites-y-servicios/resico-personas-fisicas",
    title: "Régimen Simplificado de Confianza (RESICO) para personas físicas",
    publisher: "SAT",
    tags: ["resico", "persona_fisica", "regimen"],
    content:
      "El RESICO para personas físicas está dirigido a contribuyentes con actividades empresariales, profesionales u otorgamiento del uso o goce temporal de bienes, dentro de límites de ingresos establecidos en la normatividad vigente. En este régimen, la determinación del ISR se realiza con tasas simplificadas sobre ingresos efectivamente cobrados, con facilidades administrativas frente a otros esquemas. Para tributar correctamente, es necesario emitir CFDI por las operaciones, conservar documentación y presentar declaraciones conforme al calendario aplicable. Existen supuestos de exclusión y situaciones en las que se debe cambiar de régimen, por ejemplo si se rebasan límites o se actualizan causales específicas. El SAT ofrece orientación para inscripción, actualización de obligaciones y cumplimiento mensual y anual. También es importante revisar compatibilidad con ingresos por sueldos, reglas de IVA e IEPS cuando corresponda y obligaciones de buzón tributario.",
  },
  {
    url: "https://www.sat.gob.mx/portal/public/tramites-y-servicios/buzon-tributario",
    title: "Buzón Tributario: activación y uso",
    publisher: "SAT",
    tags: ["buzon", "notificaciones", "requerimientos"],
    content:
      "El Buzón Tributario es el medio oficial de comunicación entre el SAT y los contribuyentes para notificaciones, requerimientos, recordatorios y seguimiento de trámites. Debes habilitar medios de contacto (correo y teléfono) y mantenerlos actualizados para recibir avisos oportunamente. Cuando llegue una notificación, es importante ingresar y revisar el documento, porque los plazos legales para responder pueden correr conforme a la normatividad aplicable. Si existe requerimiento, se recomienda identificar fecha de notificación, plazo, documentos solicitados y autoridad emisora. El SAT publica guías para consultar notificaciones, enviar promociones y atender actos administrativos por buzón. Ignorar notificaciones puede generar multas o consecuencias procesales, por lo que conviene actuar a tiempo y, en casos complejos o de fiscalización, acudir con un profesional.",
  },
  {
    url: "https://www.sat.gob.mx/portal/public/tramites-y-servicios/verifica-tus-facturas",
    title: "Requisitos de facturas que recibes y validación de CFDI",
    publisher: "SAT",
    tags: ["cfdi", "deducciones", "validacion"],
    content:
      "Para deducciones y acreditamientos, las facturas recibidas deben cumplir requisitos fiscales y corresponder a operaciones reales. Es clave revisar RFC emisor y receptor, nombre o razón social, régimen fiscal, uso del CFDI, clave de producto o servicio, impuestos y forma de pago cuando aplique. Debes validar que el folio fiscal exista y esté vigente mediante los mecanismos oficiales de verificación del SAT. Cuando detectes errores, solicita corrección o sustitución del CFDI en tiempo para evitar afectaciones en declaraciones. Conserva comprobantes y soportes de pago para respaldar la materialidad de operaciones. El SAT ofrece servicios para consultar y recuperar facturas emitidas y recibidas, así como guías sobre cancelación y aceptación de CFDI. Mantener control documental reduce riesgos de rechazo de deducciones y facilita aclaraciones.",
  },
];

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 180;

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

function chunkText(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= CHUNK_SIZE) {
    return [normalized];
  }

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    const end = Math.min(cursor + CHUNK_SIZE, normalized.length);
    const slice = normalized.slice(cursor, end);
    chunks.push(slice);

    if (end >= normalized.length) {
      break;
    }

    cursor = Math.max(0, end - CHUNK_OVERLAP);
  }

  return chunks;
}

async function embedText(input: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const model = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Embedding request failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };

  const embedding = payload.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error("Embedding response did not include an embedding vector");
  }

  return embedding;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase env vars. Expected NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const source of SOURCES) {
    const { data: sourceRow, error: sourceError } = await supabase
      .from("kb_sources")
      .upsert(
        {
          url: source.url,
          title: source.title,
          publisher: source.publisher,
          last_crawled_at: new Date().toISOString(),
        },
        { onConflict: "url" },
      )
      .select("id")
      .single();

    if (sourceError || !sourceRow) {
      throw new Error(
        `Could not upsert source ${source.url}: ${sourceError?.message ?? "unknown error"}`,
      );
    }

    const sourceId = sourceRow.id as string;

    const { error: deleteError } = await supabase
      .from("kb_chunks")
      .delete()
      .eq("source_id", sourceId);

    if (deleteError) {
      throw new Error(
        `Could not clear chunks for ${source.url}: ${deleteError.message}`,
      );
    }

    const chunks = chunkText(source.content);
    for (let i = 0; i < chunks.length; i += 1) {
      const chunk = chunks[i];
      const embedding = await embedText(chunk);

      const { error: chunkError } = await supabase.from("kb_chunks").insert({
        source_id: sourceId,
        chunk_text: chunk,
        embedding: toVectorLiteral(embedding),
        tags: [...source.tags, `chunk_${i + 1}`],
      });

      if (chunkError) {
        throw new Error(
          `Could not insert chunk ${i + 1} for ${source.url}: ${chunkError.message}`,
        );
      }
    }

    console.log(`Seeded ${source.title} with ${chunks.length} chunks.`);
  }

  console.log("KB seed complete.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});

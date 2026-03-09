import Link from "next/link";

const ERROR_CARDS = [
  {
    code: "CFDI40138",
    description: "UsoCFDI inválido para el receptor según la configuración del CFDI.",
    commonCause:
      "El uso CFDI seleccionado no corresponde al tipo de operación o datos fiscales del receptor.",
    solution:
      "Revisa el uso CFDI aplicable para el receptor y corrige el valor antes de timbrar.",
  },
  {
    code: "CFDI40103",
    description: "Dato obligatorio faltante o inconsistente en la estructura del comprobante.",
    commonCause:
      "El XML fue generado con campos incompletos o sin cumplir reglas mínimas de emisión.",
    solution:
      "Valida campos obligatorios del CFDI 4.0 y vuelve a generar el XML con la información completa.",
  },
  {
    code: "CFDI40221",
    description: "Incompatibilidad de datos fiscales o catálogo SAT en el comprobante.",
    commonCause:
      "Clave de catálogo SAT no alineada con la operación o con los datos del receptor/emisor.",
    solution:
      "Ajusta claves de catálogos SAT y confirma coherencia entre método, forma de pago y uso CFDI.",
  },
];

export default function ErroresCfdiPage() {
  return (
    <main className="bg-gradient-to-b from-slate-50 via-white to-sky-50/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 md:px-6 md:py-14">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
            SAT Fácil
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            Errores CFDI Comunes y Cómo Solucionarlos
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-700 md:text-base">
            Conoce los errores CFDI más frecuentes, sus causas comunes y cómo
            resolverlos antes de timbrar tus comprobantes.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {ERROR_CARDS.map((item) => (
            <article
              key={item.code}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-900">{item.code}</h2>
              <div className="mt-3 space-y-3 text-sm text-slate-700">
                <div>
                  <p className="font-semibold text-slate-900">Descripción</p>
                  <p>{item.description}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Causa común</p>
                  <p>{item.commonCause}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Cómo solucionarlo</p>
                  <p>{item.solution}</p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="flex flex-wrap gap-3">
          <Link
            href="/cfdi-xml-validator"
            className="inline-flex items-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800"
          >
            Probar validador
          </Link>
          <Link
            href="/precios"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
          >
            Ver precios
          </Link>
        </section>
      </div>
    </main>
  );
}

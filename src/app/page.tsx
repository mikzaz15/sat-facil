import Link from "next/link";

const FLOW_LINKS = [
  { id: "FACTURAR", label: "Facturar" },
  { id: "RESICO", label: "RESICO" },
  { id: "BUZON", label: "Buzón" },
  { id: "DEVOLUCION", label: "Devolución" },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
          SAT Fácil MVP
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">Asistente SAT Fácil</h1>
        <p className="text-sm text-slate-700">
          Orientación educativa para CFDI, RESICO, buzón y devolución con fuentes
          SAT/gob.mx.
        </p>
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Aviso: contenido educativo, no sustituye asesoría fiscal profesional.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-800">
          Escribe tu duda y abre el chat
        </p>
        <form action="/chat" method="GET" className="space-y-2">
          <input
            name="q"
            placeholder="Ej. ¿Qué necesito para facturar CFDI 4.0?"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-200 focus:ring"
          />
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
          >
            Abrir chat SAT
          </button>
        </form>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-slate-800">Flujos guiados</p>
        <div className="grid grid-cols-2 gap-2">
          {FLOW_LINKS.map((flow) => (
            <Link
              key={flow.id}
              href={`/flow/${flow.id}`}
              className="rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              {flow.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

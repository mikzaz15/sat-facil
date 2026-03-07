import Link from "next/link";

export default function QuoteNotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          Cotización no encontrada
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Este enlace de cotización es inválido o ya no está disponible.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Ir al inicio
        </Link>
      </section>
    </main>
  );
}

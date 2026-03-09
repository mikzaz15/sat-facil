"use client";

import { FormEvent, useState } from "react";

export default function ContactoPage() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [sent, setSent] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
    setNombre("");
    setCorreo("");
    setMensaje("");
  }

  return (
    <main className="bg-gradient-to-b from-slate-50 via-white to-sky-50/30">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-4 py-10 md:px-6 md:py-14">
        <header className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
            SAT Fácil
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            Contacto
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-700 md:text-base">
            ¿Tienes dudas sobre SAT Fácil o quieres apoyo para tu operación
            contable? Escríbenos y te responderemos a la brevedad.
          </p>
        </header>

        <section className="grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Envíanos un mensaje</h2>
            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Nombre</span>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-200 transition focus:ring-2"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Correo</span>
                <input
                  type="email"
                  required
                  value={correo}
                  onChange={(event) => setCorreo(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-200 transition focus:ring-2"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Mensaje</span>
                <textarea
                  required
                  rows={5}
                  value={mensaje}
                  onChange={(event) => setMensaje(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-sky-200 transition focus:ring-2"
                />
              </label>

              <button
                type="submit"
                className="inline-flex items-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800"
              >
                Enviar mensaje
              </button>
            </form>

            {sent ? (
              <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Gracias. Recibimos tu mensaje y te contactaremos pronto.
              </p>
            ) : null}
          </article>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Información de contacto</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-medium text-slate-900">Soporte:</span>{" "}
                <a href="mailto:support@satfacil.com.mx" className="underline">
                  support@satfacil.com.mx
                </a>
              </p>
              <p>
                <span className="font-medium text-slate-900">Facturación:</span>{" "}
                <a href="mailto:billing@satfacil.com.mx" className="underline">
                  billing@satfacil.com.mx
                </a>
              </p>
              <p>
                <span className="font-medium text-slate-900">
                  Avisos del sistema:
                </span>{" "}
                <a href="mailto:no-reply@satfacil.com.mx" className="underline">
                  no-reply@satfacil.com.mx
                </a>{" "}
                <span className="text-xs text-slate-500">(solo envío, no monitoreado)</span>
              </p>
              <p className="text-slate-600">
                Horario de atención: lunes a viernes, 9:00 a 18:00 (hora CDMX).
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

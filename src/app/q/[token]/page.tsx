import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PayDepositButton } from "./pay-deposit-button";

type PublicQuotePageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{
    accepted?: string;
    paid?: string;
    canceled?: string;
    error?: string;
  }>;
};

type PublicQuote = {
  status: string;
  created_at: string | null;
  subtotal: number | null;
  tax: number | null;
  discount: number | null;
  total: number | null;
  deposit_percent: number | null;
  clients:
    | Array<{
        name: string | null;
        company: string | null;
        email: string | null;
        phone: string | null;
      }>
    | null;
  quote_items:
    | Array<{
        name: string | null;
        qty: number | null;
        unit_price: number | null;
      }>
    | null;
};

function formatMoney(value: number | null) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "USD",
  }).format(value ?? 0);
}

function formatDate(date: string | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("es-MX", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function badgeClass(status: string) {
  if (status === "deposit_paid" || status === "paid") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "accepted") {
    return "bg-blue-100 text-blue-800";
  }
  if (status === "draft") {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-amber-100 text-amber-800";
}

function formatQuoteStatus(status: string) {
  switch (status) {
    case "draft":
      return "borrador";
    case "sent":
      return "enviada";
    case "accepted":
      return "aceptada";
    case "deposit_paid":
      return "anticipo pagado";
    case "paid":
      return "pagada";
    default:
      return status;
  }
}

export default async function PublicQuotePage({
  params,
  searchParams,
}: PublicQuotePageProps) {
  const { token } = await params;
  const query = await searchParams;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("quotes")
    .select(
      "status, created_at, subtotal, tax, discount, total, deposit_percent, clients(name, company, email, phone), quote_items(name, qty, unit_price)",
    )
    .eq("token", token)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    notFound();
  }

  const quote = data as PublicQuote;
  const client = Array.isArray(quote.clients) ? quote.clients[0] : quote.clients;
  const canAccept = quote.status === "draft";
  const canPayDeposit = quote.status === "accepted";
  const isDepositPaid = quote.status === "deposit_paid" || quote.status === "paid";
  const acceptedNow = query.accepted === "1";
  const paidNow = query.paid === "1";
  const canceled = query.canceled === "1";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <section className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">
              Cotización SAT Fácil
            </h1>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${badgeClass(quote.status)}`}
            >
              {formatQuoteStatus(quote.status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Creada {formatDate(quote.created_at)}
          </p>

          {acceptedNow || quote.status === "accepted" ? (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Cotización aceptada
            </p>
          ) : null}

          {paidNow ? (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Anticipo recibido.
            </p>
          ) : null}

          {canceled ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              El proceso de pago fue cancelado.
            </p>
          ) : null}

          {query.error ? (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {query.error}
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Cliente</h2>
          <dl className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Nombre</dt>
              <dd className="font-medium text-slate-900">
                {client?.name || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Empresa</dt>
              <dd>{client?.company || "-"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Correo electrónico</dt>
              <dd>{client?.email || "-"}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Teléfono</dt>
              <dd>{client?.phone || "-"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Conceptos</h2>
          {quote.quote_items && quote.quote_items.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th className="px-1 py-2 font-medium">Nombre</th>
                    <th className="px-1 py-2 font-medium">Cantidad</th>
                    <th className="px-1 py-2 font-medium">Precio unitario</th>
                    <th className="px-1 py-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {quote.quote_items.map((item, index) => (
                    <tr key={`${item.name ?? "item"}-${index}`}>
                      <td className="px-1 py-2 text-slate-800">{item.name || "-"}</td>
                      <td className="px-1 py-2 text-slate-800">{item.qty ?? 0}</td>
                      <td className="px-1 py-2 text-slate-800">
                        {formatMoney(item.unit_price)}
                      </td>
                      <td className="px-1 py-2 text-slate-800">
                        {formatMoney((item.qty ?? 0) * (item.unit_price ?? 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              No hay conceptos en esta cotización.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Totales</h2>
          <dl className="mt-3 grid max-w-sm gap-2 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <dt>Subtotal</dt>
              <dd className="font-medium">{formatMoney(quote.subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Impuesto</dt>
              <dd className="font-medium">{formatMoney(quote.tax)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Descuento</dt>
              <dd className="font-medium">{formatMoney(quote.discount)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Porcentaje de anticipo</dt>
              <dd className="font-medium">{quote.deposit_percent ?? 0}%</dd>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-slate-200 pt-2 text-base">
              <dt className="font-semibold text-slate-900">Total</dt>
              <dd className="font-semibold text-slate-900">
                {formatMoney(quote.total)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {canAccept ? (
            <form action="/api/public/quotes/accept" method="post">
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Aceptar cotización
              </button>
            </form>
          ) : canPayDeposit ? (
            <PayDepositButton token={token} />
          ) : isDepositPaid ? (
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white opacity-75"
            >
              Anticipo pagado
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white opacity-75"
            >
              Cotización aceptada
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

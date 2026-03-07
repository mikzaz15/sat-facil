import Link from "next/link";
import { notFound } from "next/navigation";

import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";
import { getCurrentUserWorkspace } from "@/lib/workspace";

import { CopyPublicLinkButton } from "./copy-public-link-button";

type QuotePageProps = {
  params: Promise<{ id: string }>;
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

type QuoteRecord = {
  id: string;
  token: string;
  status: string;
  subtotal: number | null;
  tax: number | null;
  discount: number | null;
  total: number | null;
  deposit_percent: number | null;
  created_at: string | null;
  clients:
    | Array<{
        name: string | null;
        email: string | null;
        phone: string | null;
        company: string | null;
      }>
    | null;
};

type QuoteItemRecord = {
  id: string;
  name: string | null;
  qty: number | null;
  unit_price: number | null;
};

export default async function QuoteDetailPage({ params }: QuotePageProps) {
  const { id } = await params;
  const { workspaceId } = await getCurrentUserWorkspace();
  const supabase = await createSupabaseServerAuthClient();

  const { data: quoteData, error: quoteError } = await supabase
    .from("quotes")
    .select(
      "id, token, status, subtotal, tax, discount, total, deposit_percent, created_at, clients(name, email, phone, company)",
    )
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (quoteError) {
    throw new Error(quoteError.message);
  }

  if (!quoteData) {
    notFound();
  }

  const { data: itemsData, error: itemsError } = await supabase
    .from("quote_items")
    .select("id, name, qty, unit_price")
    .eq("quote_id", id);

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const quote = quoteData as QuoteRecord;
  const items = (itemsData ?? []) as QuoteItemRecord[];
  const client = Array.isArray(quote.clients) ? quote.clients[0] : quote.clients;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const publicLink = `${appUrl}/q/${quote.token}`;

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Cotización</h1>
          <p className="mt-1 text-sm text-slate-600">
            Creada {formatDate(quote.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CopyPublicLinkButton url={publicLink} />
          <Link
            href="/app/quotes"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Volver a cotizaciones
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Resumen</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.08em] text-slate-700">
              {formatQuoteStatus(quote.status)}
            </span>
          </div>

          <dl className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Cliente</dt>
              <dd className="font-medium text-slate-900">
                {client?.name ?? "Cliente sin nombre"}
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

          {items.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              No se encontraron conceptos.
            </p>
          ) : (
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
                  {items.map((item) => (
                    <tr key={item.id}>
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
      </div>
    </section>
  );
}

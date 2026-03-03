import Link from "next/link";

import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";
import { getCurrentUserWorkspace } from "@/lib/workspace";

function formatMoney(value: number | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value ?? 0);
}

function formatDate(date: string | null) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

type QuoteRow = {
  id: string;
  status: string;
  total: number | null;
  created_at: string;
  clients:
    | Array<{
        name: string | null;
      }>
    | null;
};

export default async function QuotesPage() {
  const { workspaceId } = await getCurrentUserWorkspace();
  const supabase = await createSupabaseServerAuthClient();

  const { data, error } = await supabase
    .from("quotes")
    .select("id, status, total, created_at, clients(name)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const quotes = (data ?? []) as QuoteRow[];

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Quotes</h1>
          <p className="mt-1 text-sm text-slate-600">
            Track all quotes for your workspace.
          </p>
        </div>

        <Link
          href="/app/quotes/new"
          className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          New Quote
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {quotes.length === 0 ? (
          <div className="p-8">
            <p className="text-slate-700">No quotes yet</p>
            <Link
              href="/app/quotes/new"
              className="mt-4 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Create Quote
            </Link>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm text-slate-800">
              {quotes.map((quote) => (
                <tr key={quote.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/quotes/${quote.id}`}
                      className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500"
                    >
                      {quote.clients?.[0]?.name || "Unnamed client"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{formatMoney(quote.total)}</td>
                  <td className="px-4 py-3 capitalize">{quote.status}</td>
                  <td className="px-4 py-3">{formatDate(quote.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

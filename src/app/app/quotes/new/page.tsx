import Link from "next/link";

import { createQuoteAction } from "./actions";
import { NewQuoteForm } from "./new-quote-form";

type NewQuotePageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function NewQuotePage({ searchParams }: NewQuotePageProps) {
  const params = await searchParams;

  return (
    <section className="mx-auto max-w-5xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">New Quote</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create a draft quote for your client.
          </p>
        </div>
        <Link
          href="/app/quotes"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Back to Quotes
        </Link>
      </div>
      <NewQuoteForm action={createQuoteAction} error={params.error} />
    </section>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";

import { logoutAction } from "./actions";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl">
        <aside className="hidden w-64 border-r border-slate-200 bg-white p-6 md:flex md:flex-col">
          <Link href="/app/quotes" className="text-xl font-semibold text-slate-900">
            Accepto
          </Link>

          <nav className="mt-8 space-y-1">
            <Link
              href="/app/quotes"
              className="block rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
            >
              Quotes
            </Link>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
            <p className="text-sm font-medium text-slate-700">
              {user.email ?? "Logged in"}
            </p>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Log out
              </button>
            </form>
          </header>

          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

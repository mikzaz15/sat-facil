import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";

import { logoutFromAccountAction } from "./actions";

function toPlanLabel(plan: unknown): "Pro" | "Free" {
  if (typeof plan !== "string") return "Free";
  const normalized = plan.trim().toLowerCase();
  if (normalized === "pro" || normalized === "studio") return "Pro";
  return "Free";
}

export default async function CuentaPage() {
  const authClient = await createSupabaseServerAuthClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const subscription = await authClient
    .from("sat_subscriptions")
    .select("plan")
    .eq("user_id", user.id)
    .maybeSingle();
  const planLabel = subscription.error ? "Free" : toPlanLabel(subscription.data?.plan);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
          SAT Fácil
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Cuenta</h1>

        <div className="mt-6 space-y-4 text-sm text-slate-700">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              Correo
            </p>
            <p className="mt-1 text-base font-medium text-slate-900 break-all">
              {user.email || "(sin correo)"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              Plan
            </p>
            <p className="mt-1 text-base font-medium text-slate-900">{planLabel}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/pricing"
            className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Ver planes
          </Link>

          <form action={logoutFromAccountAction}>
            <button
              type="submit"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

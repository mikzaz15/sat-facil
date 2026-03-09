import Link from "next/link";
import { redirect } from "next/navigation";

import { isProFromSubscription } from "@/lib/sat/billing";
import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";

import { logoutFromAccountAction } from "./actions";

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
    .select("plan,status,stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const subscriptionPlan = (subscription.data?.plan ?? "free") === "pro" ? "pro" : "free";
  const subscriptionStatus = subscription.data?.status ?? "inactive";
  const isPro =
    !subscription.error &&
    isProFromSubscription({
      plan: subscriptionPlan,
      status: subscriptionStatus,
    });
  const planLabel = isPro ? "Pro" : "Free";
  const canManageBilling =
    !subscription.error && (isPro || Boolean(subscription.data?.stripe_customer_id));

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
            <div className="mt-1 flex items-center gap-2">
              <p className="text-base font-medium text-slate-900">{planLabel}</p>
              {isPro ? (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                  PRO
                </span>
              ) : null}
            </div>
            {!subscription.error && subscriptionStatus ? (
              <p className="mt-1 text-xs text-slate-500">Estado: {subscriptionStatus}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/pricing"
            className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Ver planes
          </Link>

          {canManageBilling ? (
            <Link
              href="/api/sat/billing/portal"
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Administrar suscripción
            </Link>
          ) : null}

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

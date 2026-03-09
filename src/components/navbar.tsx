import Image from "next/image";
import Link from "next/link";

import { isProFromSubscription } from "@/lib/sat/billing";
import { createSupabaseServerAuthClient } from "@/lib/supabase/auth-server";

export async function Navbar() {
  const supabase = await createSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const navLinks: Array<{ href: string; label: string }> = [];
  let authHref = "/login";
  let authLabel = "Iniciar sesión";
  let isProUser = false;

  navLinks.push({ href: "/", label: "Inicio" });

  if (!user) {
    navLinks.push(
      { href: "/cfdi-xml-validator", label: "Validar XML" },
      { href: "/cfdi-error-explainer", label: "Errores SAT" },
      { href: "/precios", label: "Precios" },
      { href: "/contacto", label: "Contacto" },
    );
  } else {
    authHref = "/cuenta";
    authLabel = "Cuenta";

    const subscription = await supabase
      .from("sat_subscriptions")
      .select("plan,status")
      .eq("user_id", user.id)
      .maybeSingle();
    isProUser =
      !subscription.error &&
      isProFromSubscription({
        plan: (subscription.data?.plan ?? "free") === "pro" ? "pro" : "free",
        status: subscription.data?.status ?? "inactive",
      });

    if (isProUser) {
      navLinks.push(
        { href: "/cfdi-xml-validator", label: "Validar XML" },
        { href: "/cfdi-batch-validator", label: "Lote XML" },
        { href: "/cfdi-error-explainer", label: "Errores SAT" },
        { href: "/chat", label: "Asistente SAT" },
        { href: "/contacto", label: "Contacto" },
      );
    } else {
      navLinks.push(
        { href: "/cfdi-xml-validator", label: "Validar XML" },
        { href: "/cfdi-error-explainer", label: "Errores SAT" },
        { href: "/precios", label: "Precios" },
        { href: "/contacto", label: "Contacto" },
      );
    }
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
        <Link href="/" className="shrink-0">
          <Image src="/logo.png" alt="SAT Fácil" width={160} height={40} />
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-2 py-1 text-sm font-medium text-slate-900 hover:bg-slate-100"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isProUser ? (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
              PRO
            </span>
          ) : null}
          <Link
            href={authHref}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            {authLabel}
          </Link>
        </div>
      </nav>
    </header>
  );
}

"use client";

import { trackGaEvent } from "@/lib/ga";

type BillingPortalButtonProps = {
  className: string;
};

export function BillingPortalButton({ className }: BillingPortalButtonProps) {
  function onClick() {
    trackGaEvent("billing_portal_opened", {
      source_page: "/cuenta",
    });
    window.location.href = "/api/sat/billing/portal";
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      Administrar suscripción
    </button>
  );
}

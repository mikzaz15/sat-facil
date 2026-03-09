type GaEventName =
  | "sign_up"
  | "login"
  | "xml_validation_started"
  | "xml_validation_completed"
  | "batch_validation_started"
  | "free_limit_reached"
  | "upgrade_clicked"
  | "checkout_started"
  | "checkout_completed"
  | "billing_portal_opened";

type GaEventParams = Record<string, string | number | boolean | null | undefined>;

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function isGaEnabled(): boolean {
  return GA_MEASUREMENT_ID.length > 0;
}

export function trackGaEvent(
  eventName: GaEventName,
  params: GaEventParams = {},
): void {
  if (!isGaEnabled()) return;
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;

  window.gtag("event", eventName, params);
}

"use client";

import { useState } from "react";

type PayDepositButtonProps = {
  token: string;
};

export function PayDepositButton({ token }: PayDepositButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPayDeposit() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/public/payments/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        url?: string | null;
        error?: string;
      };

      if (!response.ok || !payload.ok || !payload.url) {
        setError(payload.error ?? "Unable to start checkout.");
        setLoading(false);
        return;
      }

      window.location.assign(payload.url);
    } catch {
      setError("Unable to start checkout.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onPayDeposit}
        disabled={loading}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Redirecting..." : "Pay deposit"}
      </button>
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}

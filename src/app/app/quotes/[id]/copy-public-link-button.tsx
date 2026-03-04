"use client";

import { useState } from "react";

type CopyPublicLinkButtonProps = {
  url: string;
};

export function CopyPublicLinkButton({ url }: CopyPublicLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        Copy public link
      </button>
      {copied ? <span className="text-xs text-emerald-700">Copied</span> : null}
    </div>
  );
}

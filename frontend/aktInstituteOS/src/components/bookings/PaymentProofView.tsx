"use client";

import { ExternalLink } from "lucide-react";
import { usePaymentProof } from "@/lib/hooks/usePaymentProof";

interface Props {
  bookingId: number;
  paymentProofUrl?: string | null;
  /** "preview" = image + open link (dialog); "link" = a single inline View link. */
  mode?: "preview" | "link";
  enabled?: boolean;
}

/**
 * Renders a booking's payment proof. Private proofs are fetched through the authenticated endpoint
 * (see usePaymentProof) rather than loaded from a public URL.
 */
export function PaymentProofView({ bookingId, paymentProofUrl, mode = "preview", enabled = true }: Props) {
  const { url, loading, error } = usePaymentProof(bookingId, paymentProofUrl, enabled);

  if (loading) return <p className="text-sm text-gray-500">Loading proof…</p>;
  if (error || !url) return <p className="text-sm text-red-600">Could not load payment proof.</p>;

  if (mode === "link") {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="underline">
        View
      </a>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border bg-gray-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Payment proof"
          className="max-h-[60vh] w-full object-contain"
          onError={(e) => { (e.currentTarget.style.display = "none"); }}
        />
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:underline"
      >
        <ExternalLink className="size-3.5" /> Open original
      </a>
    </div>
  );
}

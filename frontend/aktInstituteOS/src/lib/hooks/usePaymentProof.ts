import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPaymentProofObjectUrl } from "@/lib/api/leads.api";

function isExternal(url?: string | null): boolean {
  return !!url && (url.startsWith("http://") || url.startsWith("https://"));
}

export interface PaymentProof {
  /** A loadable URL: the external link itself, or a freshly-minted object URL for private files. */
  url: string | null;
  /** True when the stored proof is an external link rather than a privately-served file. */
  external: boolean;
  loading: boolean;
  error: boolean;
}

/**
 * Resolve a booking's payment proof to a loadable URL.
 *
 * External links (http/https) are returned as-is. Private files are fetched through the
 * authenticated endpoint (the api client attaches the JWT) and exposed as an object URL that is
 * revoked on cleanup. Pass enabled=false to defer loading until a preview is actually opened.
 */
export function usePaymentProof(
  bookingId: number | undefined,
  paymentProofUrl: string | undefined | null,
  enabled = true,
): PaymentProof {
  const external = isExternal(paymentProofUrl);
  const wantPrivate = !external && enabled && !!bookingId && !!paymentProofUrl;

  const { data: objectUrl, isLoading, isError } = useQuery({
    queryKey: ["payment-proof", bookingId, paymentProofUrl],
    queryFn: () => getPaymentProofObjectUrl(bookingId!),
    enabled: wantPrivate,
    staleTime: Infinity,
    gcTime: 0, // don't cache the blob URL past unmount — it gets revoked below
  });

  // Revoke the object URL when it changes or the consumer unmounts.
  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  return {
    url: external ? paymentProofUrl! : objectUrl ?? null,
    external,
    loading: wantPrivate && isLoading,
    error: isError,
  };
}

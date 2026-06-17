"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  BadgeCheck, CheckCircle2, XCircle, Eye, ExternalLink,
  ChevronLeft, ChevronRight, Inbox, Loader2,
} from "lucide-react";
import { listBookings, verifyPayment, cancelBooking } from "@/lib/api/leads.api";
import { usePermissions } from "@/lib/hooks/usePermissions";
import type { AdmissionBooking } from "@/types/lead";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function apiErr(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

function formatCurrency(amount?: number) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

const TABS: Array<{ value: string; label: string }> = [
  { value: "PAYMENT_PENDING",   label: "To Verify" },
  { value: "BOOKING_CONFIRMED", label: "Verified" },
];

export default function PaymentsPage() {
  const perms = usePermissions();
  const qc = useQueryClient();

  const [status, setStatus] = useState("PAYMENT_PENDING");
  const [page, setPage] = useState(0);
  const [proofTarget, setProofTarget] = useState<AdmissionBooking | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdmissionBooking | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const canVerify = perms.has("BOOKING_VERIFY");
  const canView = perms.has("BOOKING_VIEW");
  const canViewLead = perms.has("LEAD_VIEW");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["bookings", status, page],
    queryFn: () => listBookings({ status, page, size: 20 }),
    enabled: canView,
    placeholderData: (prev) => prev,
  });

  const bookings = data?.data ?? [];
  const meta = data?.meta;

  function refresh() {
    qc.invalidateQueries({ queryKey: ["bookings"] });
    qc.invalidateQueries({ queryKey: ["payments-count"] });
  }

  const verifyMutation = useMutation({
    mutationFn: (id: number) => verifyPayment(id),
    onSuccess: () => { refresh(); toast.success("Payment verified — seat reserved!"); },
    onError: (err) => toast.error(apiErr(err) ?? "Verification failed."),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => cancelBooking(id, reason),
    onSuccess: () => {
      refresh();
      toast.success("Booking rejected & cancelled");
      setRejectTarget(null);
      setRejectReason("");
    },
    onError: (err) => toast.error(apiErr(err) ?? "Could not reject booking."),
  });

  function changeTab(next: string) {
    setStatus(next);
    setPage(0);
  }

  if (!canView) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center text-muted-foreground">
        <Inbox className="mb-3 size-10 text-gray-300" />
        <p className="text-sm">You don’t have access to the payments workspace.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <BadgeCheck className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Payments</h1>
          <p className="text-sm text-muted-foreground">
            Review payment proofs and confirm admission bookings.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg border bg-white p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => changeTab(t.value)}
            className={cn(
              "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
              status === t.value ? "bg-emerald-50 text-emerald-700" : "text-gray-500 hover:text-gray-800",
            )}
          >
            {t.label}
            {t.value === status && meta ? (
              <span className="ml-1.5 text-xs text-emerald-600/70">{meta.total}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Applicant</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Proof</TableHead>
              <TableHead>{status === "PAYMENT_PENDING" ? "Submitted" : "Verified"}</TableHead>
              <TableHead className="text-right">{status === "PAYMENT_PENDING" ? "Action" : "Status"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-14 text-center text-muted-foreground">
                  <Inbox className="mx-auto mb-2 size-8 text-gray-300" />
                  {status === "PAYMENT_PENDING"
                    ? "All caught up — no payments waiting for verification."
                    : "No verified bookings yet."}
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((b) => {
                const hasProof = !!b.paymentProofUrl;
                return (
                  <TableRow key={b.id} className="hover:bg-gray-50/80">
                    <TableCell>
                      {canViewLead ? (
                        <Link href={`/leads/${b.leadId}`} className="block">
                          <span className="font-medium text-gray-900 hover:text-emerald-700">
                            {b.leadName ?? `Lead #${b.leadId}`}
                          </span>
                          {b.leadPhone && <p className="text-xs text-muted-foreground">{b.leadPhone}</p>}
                        </Link>
                      ) : (
                        <div>
                          <span className="font-medium text-gray-900">{b.leadName ?? `Lead #${b.leadId}`}</span>
                          {b.leadPhone && <p className="text-xs text-muted-foreground">{b.leadPhone}</p>}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{b.batchName ?? "—"}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(b.paymentAmount)}</TableCell>
                    <TableCell>
                      {hasProof ? (
                        <button
                          onClick={() => setProofTarget(b)}
                          className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:underline"
                        >
                          <Eye className="size-3.5" /> View
                        </button>
                      ) : (
                        <span className="text-xs text-amber-600">Awaiting proof</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {status === "PAYMENT_PENDING"
                        ? (b.paymentProofUploadedAt
                            ? format(new Date(b.paymentProofUploadedAt), "dd MMM yyyy")
                            : format(new Date(b.createdAt), "dd MMM yyyy"))
                        : (b.paymentVerifiedAt
                            ? format(new Date(b.paymentVerifiedAt), "dd MMM yyyy")
                            : "—")}
                    </TableCell>
                    <TableCell className="text-right">
                      {status === "PAYMENT_PENDING" ? (
                        canVerify ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm" variant="outline"
                              className="border-red-200 text-red-600 hover:bg-red-50"
                              disabled={rejectMutation.isPending || verifyMutation.isPending}
                              onClick={() => { setRejectTarget(b); setRejectReason(""); }}
                            >
                              <XCircle className="size-3.5" /> Reject
                            </Button>
                            <Button
                              size="sm"
                              className="bg-emerald-600 text-white hover:bg-emerald-700"
                              disabled={!hasProof || verifyMutation.isPending}
                              title={!hasProof ? "Payment proof not uploaded yet" : undefined}
                              onClick={() => verifyMutation.mutate(b.id)}
                            >
                              {verifyMutation.isPending && verifyMutation.variables === b.id
                                ? <Loader2 className="size-3.5 animate-spin" />
                                : <CheckCircle2 className="size-3.5" />}
                              Verify
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">View only</span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
                          <CheckCircle2 className="size-3.5" /> Confirmed
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {meta.page + 1} of {meta.totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon-sm" disabled={!meta.hasPrevious || isFetching} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon-sm" disabled={!meta.hasNext || isFetching} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Proof preview dialog */}
      <Dialog open={!!proofTarget} onOpenChange={(o) => !o && setProofTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment proof</DialogTitle>
          </DialogHeader>
          {proofTarget?.paymentProofUrl && (
            <div className="space-y-3">
              <div className="overflow-hidden rounded-lg border bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={proofTarget.id}
                  src={proofTarget.paymentProofUrl}
                  alt="Payment proof"
                  className="max-h-[60vh] w-full object-contain"
                  onError={(e) => { (e.currentTarget.style.display = "none"); }}
                />
              </div>
              <a
                href={proofTarget.paymentProofUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:underline"
              >
                <ExternalLink className="size-3.5" /> Open original
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this booking?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This cancels the booking for{" "}
            <span className="font-medium text-gray-800">{rejectTarget?.leadName ?? `Lead #${rejectTarget?.leadId}`}</span>{" "}
            and reverts the lead so it can be re-attempted. A reason is required for the audit trail.
          </p>
          <Textarea
            placeholder="Reason for rejection (e.g. payment proof unclear, amount mismatch)…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" />}
            >
              Cancel
            </DialogClose>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() => rejectTarget && rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason.trim() })}
            >
              {rejectMutation.isPending ? "Rejecting…" : "Reject booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

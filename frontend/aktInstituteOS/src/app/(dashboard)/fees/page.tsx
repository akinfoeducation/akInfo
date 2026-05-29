"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  IndianRupee, TrendingUp, AlertCircle, Receipt,
  Plus, ChevronLeft, ChevronRight, X, Banknote,
  Smartphone, Building2, CreditCard, HelpCircle, Trash2, Search, Printer,
} from "lucide-react";
import { format } from "date-fns";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { listAdmissions } from "@/lib/api/admissions.api";
import type { AdmissionSummary } from "@/types/admission";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { getFeesSummary, listPayments, collectPayment, cancelPayment } from "@/lib/api/fees.api";
import type { FeePayment, PaymentMode } from "@/types/fees";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(amount);
}

const MODE_ICONS: Record<PaymentMode, React.ElementType> = {
  CASH:          Banknote,
  UPI:           Smartphone,
  CHEQUE:        Receipt,
  BANK_TRANSFER: Building2,
  OTHER:         HelpCircle,
};

const MODE_LABELS: Record<PaymentMode, string> = {
  CASH: "Cash", UPI: "UPI", CHEQUE: "Cheque",
  BANK_TRANSFER: "Bank Transfer", OTHER: "Other",
};

// ── Summary cards ─────────────────────────────────────────────────────────────

function SummaryCards() {
  const { data, isLoading } = useQuery({
    queryKey: ["fees-summary"],
    queryFn: getFeesSummary,
    refetchInterval: 30_000,
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground">Collected Today</p>
          <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <IndianRupee className="size-4 text-emerald-600" />
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-900">{fmt(data.collectedToday)}</p>
        <p className="text-xs text-muted-foreground mt-1">{data.paymentsToday} receipt{data.paymentsToday !== 1 ? "s" : ""} today</p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground">This Month</p>
          <div className="size-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <TrendingUp className="size-4 text-blue-600" />
          </div>
        </div>
        <p className="text-2xl font-bold text-gray-900">{fmt(data.collectedThisMonth)}</p>
        <p className="text-xs text-muted-foreground mt-1">This year: {fmt(data.collectedThisYear)}</p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground">Total Outstanding</p>
          <div className="size-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <CreditCard className="size-4 text-amber-600" />
          </div>
        </div>
        <p className="text-2xl font-bold text-amber-600">{fmt(data.totalOutstanding)}</p>
        <p className="text-xs text-muted-foreground mt-1">Across all active admissions</p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground">With Dues</p>
          <div className="size-8 rounded-lg bg-red-50 flex items-center justify-center">
            <AlertCircle className="size-4 text-red-500" />
          </div>
        </div>
        <p className="text-2xl font-bold text-red-500">{data.overdueCount}</p>
        <p className="text-xs text-muted-foreground mt-1">Students with pending fees</p>
      </Card>
    </div>
  );
}

// ── Collect payment form ──────────────────────────────────────────────────────

const paymentSchema = z.object({
  admissionId:     z.number().min(1, "Select an admission"),
  amount:          z.coerce.number().min(1, "Amount must be at least ₹1"),
  paymentDate:     z.string().optional().or(z.literal("")),
  paymentMode:     z.enum(["CASH", "UPI", "CHEQUE", "BANK_TRANSFER", "OTHER"]).default("CASH"),
  referenceNumber: z.string().max(100).optional().or(z.literal("")),
  notes:           z.string().max(1000).optional().or(z.literal("")),
});

type PaymentForm = z.infer<typeof paymentSchema>;

function CollectPaymentModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<AdmissionSummary | null>(null);
  const [showDropdown, setDropdown] = useState(false);
  const debouncedSearch             = useDebounce(search, 280);

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<PaymentForm>({
      resolver: zodResolver(paymentSchema) as Resolver<PaymentForm>,
      defaultValues: { paymentMode: "CASH", paymentDate: format(new Date(), "yyyy-MM-dd") },
    });

  // Live admission search — fires once user types ≥ 2 chars
  const { data: searchData, isFetching: searching } = useQuery({
    queryKey: ["admission-search-fees", debouncedSearch],
    queryFn:  () => listAdmissions({ q: debouncedSearch, size: 8 }),
    enabled:  debouncedSearch.length >= 2 && !selected,
    staleTime: 10_000,
  });
  const suggestions = searchData?.data ?? [];

  function pick(adm: AdmissionSummary) {
    setSelected(adm);
    setValue("admissionId", adm.id, { shouldValidate: true });
    // Pre-fill amount with outstanding due (if any)
    if (adm.feesDue > 0) setValue("amount", adm.feesDue);
    setSearch("");
    setDropdown(false);
  }

  function clearPick() {
    setSelected(null);
    setValue("admissionId", 0);
    setDropdown(false);
  }

  const paymentMode = watch("paymentMode");
  const needsRef = paymentMode === "CHEQUE" || paymentMode === "UPI" || paymentMode === "BANK_TRANSFER";

  const mutation = useMutation({
    mutationFn: (v: PaymentForm) =>
      collectPayment({
        admissionId:     v.admissionId,
        amount:          v.amount,
        paymentDate:     v.paymentDate || undefined,
        paymentMode:     v.paymentMode,
        referenceNumber: v.referenceNumber || undefined,
        notes:           v.notes || undefined,
      }),
    onSuccess: (payment) => {
      toast.success(`Receipt ${payment.receiptNumber} generated — ${fmt(payment.amount)} collected`);
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to record payment.";
      toast.error(msg);
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Record Payment</h2>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          {/* Hidden real admission ID */}
          <input type="hidden" {...register("admissionId", { valueAsNumber: true })} />

          {/* Admission search / selection */}
          <div className="space-y-1.5">
            <Label>Student / Admission <span className="text-destructive">*</span></Label>

            {selected ? (
              // Selected pill
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{selected.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{selected.admissionNumber}</span>
                    {selected.courseName && <span className="ml-2">{selected.courseName}</span>}
                    {selected.feesDue > 0 && (
                      <span className="ml-2 text-red-600 font-medium">Due: {fmt(selected.feesDue)}</span>
                    )}
                  </p>
                </div>
                <button type="button" onClick={clearPick}
                  className="size-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-700 shrink-0">
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              // Search input + dropdown
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    autoFocus
                    placeholder="Search by name, phone, admission #…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setDropdown(true); }}
                    onFocus={() => search.length >= 2 && setDropdown(true)}
                    onBlur={() => setTimeout(() => setDropdown(false), 150)}
                    className="pl-9"
                    aria-invalid={!!errors.admissionId}
                  />
                </div>

                {showDropdown && debouncedSearch.length >= 2 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                    {searching ? (
                      <p className="px-4 py-3 text-sm text-muted-foreground">Searching…</p>
                    ) : suggestions.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-muted-foreground">No admissions found for &ldquo;{debouncedSearch}&rdquo;</p>
                    ) : (
                      suggestions.map((adm) => (
                        <button key={adm.id} type="button" onMouseDown={() => pick(adm)}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors">
                          <p className="text-sm font-medium text-gray-900">{adm.fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-mono">{adm.admissionNumber}</span>
                            {adm.courseName && <span className="ml-2 text-gray-500">{adm.courseName}</span>}
                            {adm.feesDue > 0
                              ? <span className="ml-2 text-red-600 font-medium">Due: {fmt(adm.feesDue)}</span>
                              : <span className="ml-2 text-emerald-600">Paid in full</span>
                            }
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {errors.admissionId && !selected && (
              <p className="text-xs text-destructive">Please select an admission first</p>
            )}
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Amount (₹) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min={1}
                placeholder="5000"
                aria-invalid={!!errors.amount}
                {...register("amount")}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Payment Date</Label>
              <Input type="date" {...register("paymentDate")} />
            </div>
          </div>

          {/* Payment mode */}
          <div className="space-y-1.5">
            <Label>Payment Mode</Label>
            <Select
              defaultValue="CASH"
              onValueChange={(v) => setValue("paymentMode", v as PaymentForm["paymentMode"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">💵 Cash</SelectItem>
                <SelectItem value="UPI">📱 UPI</SelectItem>
                <SelectItem value="CHEQUE">📄 Cheque</SelectItem>
                <SelectItem value="BANK_TRANSFER">🏦 Bank Transfer</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {needsRef && (
            <div className="space-y-1.5">
              <Label>
                {paymentMode === "CHEQUE" ? "Cheque Number" : "Transaction / UTR Reference"}
              </Label>
              <Input
                placeholder={paymentMode === "CHEQUE" ? "012345" : "UTR / transaction ID"}
                {...register("referenceNumber")}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea placeholder="Optional notes…" rows={2} {...register("notes")} />
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="submit"
              disabled={mutation.isPending || !selected}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
            >
              {mutation.isPending ? "Recording…" : "Record & Generate Receipt"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Receipt view modal ────────────────────────────────────────────────────────

function ReceiptModal({ payment, onClose }: { payment: FeePayment; onClose: () => void }) {
  const ModeIcon = MODE_ICONS[payment.paymentMode] ?? HelpCircle;

  return (
    <>
      {/* Print CSS — hides everything except the receipt area when printing */}
      <style>{`
        @media print {
          body > * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area {
            position: fixed; inset: 0;
            background: white;
            display: flex; align-items: flex-start; justify-content: center;
            padding: 40px;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
          {/* Printable receipt area */}
          <div id="receipt-print-area" className="p-6 space-y-4">
            {/* Header */}
            <div className="text-center border-b border-dashed border-gray-300 pb-4">
              <p className="font-bold text-base tracking-wide uppercase">AKT Institute</p>
              <p className="text-xs text-muted-foreground mt-0.5">Fee Payment Receipt</p>
              <p className="font-mono text-lg font-semibold text-emerald-700 mt-2">
                {payment.receiptNumber}
              </p>
            </div>

            {/* Student info */}
            <div className="space-y-1.5 text-sm border-b border-dashed border-gray-300 pb-4">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Student</span>
                <span className="font-medium text-right">{payment.studentName}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Admission #</span>
                <span className="font-mono text-xs">{payment.admissionNumber}</span>
              </div>
              {payment.courseName && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">Course</span>
                  <span className="text-right">{payment.courseName}</span>
                </div>
              )}
            </div>

            {/* Payment details */}
            <div className="space-y-1.5 text-sm border-b border-dashed border-gray-300 pb-4">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Date</span>
                <span>{format(new Date(payment.paymentDate), "dd MMM yyyy")}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Mode</span>
                <span className="flex items-center gap-1.5">
                  <ModeIcon className="size-3.5 text-gray-500" />
                  {MODE_LABELS[payment.paymentMode]}
                </span>
              </div>
              {payment.referenceNumber && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">Reference</span>
                  <span className="font-mono text-xs text-right">{payment.referenceNumber}</span>
                </div>
              )}
              {payment.notes && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">Notes</span>
                  <span className="text-right text-xs max-w-[60%]">{payment.notes}</span>
                </div>
              )}
            </div>

            {/* Amount — large */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-semibold">Amount Paid</span>
              <span className="text-2xl font-bold text-emerald-700">{fmt(payment.amount)}</span>
            </div>

            <p className="text-[10px] text-muted-foreground text-center pt-1">
              Generated {format(new Date(payment.createdAt), "dd MMM yyyy, h:mm a")}
            </p>
          </div>

          {/* Actions (hidden on print via Tailwind print: variant) */}
          <div className="flex gap-3 px-6 pb-6 print:hidden">
            <Button
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5"
              onClick={() => window.print()}
            >
              <Printer className="size-4" />
              Print
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FeesPage() {
  const [page, setPage]           = useState(0);
  const [modeFilter, setMode]     = useState<PaymentMode | "">("");
  const [fromDate, setFrom]       = useState("");
  const [toDate, setTo]           = useState("");
  const [showModal, setShowModal] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<number | null>(null);
  const [viewReceipt, setViewReceipt]     = useState<FeePayment | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["fee-payments", modeFilter, fromDate, toDate, page],
    queryFn: () =>
      listPayments({
        paymentMode: modeFilter || undefined,
        from:        fromDate   || undefined,
        to:          toDate     || undefined,
        page,
        size: 20,
      }),
    placeholderData: (prev) => prev,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelPayment,
    onSuccess: () => {
      toast.success("Payment cancelled");
      setConfirmCancel(null);
      queryClient.invalidateQueries({ queryKey: ["fee-payments"] });
      queryClient.invalidateQueries({ queryKey: ["fees-summary"] });
    },
    onError: () => toast.error("Failed to cancel payment"),
  });

  const payments  = data?.data ?? [];
  const meta      = data?.meta;

  function handleSuccess() {
    setShowModal(false);
    queryClient.invalidateQueries({ queryKey: ["fee-payments"] });
    queryClient.invalidateQueries({ queryKey: ["fees-summary"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Fees</h1>
        <Button
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
          onClick={() => setShowModal(true)}
        >
          <Plus className="size-4" />
          Collect Payment
        </Button>
      </div>

      {/* Summary */}
      <SummaryCards />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <Select value={modeFilter || "__all"} onValueChange={(v) => { setMode(!v || v === "__all" ? "" : v as PaymentMode); setPage(0); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All modes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All Modes</SelectItem>
            <SelectItem value="CASH">Cash</SelectItem>
            <SelectItem value="UPI">UPI</SelectItem>
            <SelectItem value="CHEQUE">Cheque</SelectItem>
            <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="w-36 text-sm"
            value={fromDate}
            onChange={(e) => { setFrom(e.target.value); setPage(0); }}
            placeholder="From"
          />
          <span className="text-muted-foreground text-sm">–</span>
          <Input
            type="date"
            className="w-36 text-sm"
            value={toDate}
            onChange={(e) => { setTo(e.target.value); setPage(0); }}
            placeholder="To"
          />
        </div>
        {(modeFilter || fromDate || toDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setMode(""); setFrom(""); setTo(""); setPage(0); }}>
            <X className="size-3.5" /> Clear
          </Button>
        )}
        {meta && (
          <span className="text-sm text-muted-foreground ml-auto">
            {meta.total} payment{meta.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Payments table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Receipt #</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  No payments found. Click &ldquo;Collect Payment&rdquo; to record the first one.
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p) => {
                const ModeIcon = MODE_ICONS[p.paymentMode] ?? Receipt;
                return (
                  <TableRow key={p.id} className="hover:bg-gray-50/80">
                    <TableCell>
                      <button
                        onClick={() => setViewReceipt(p)}
                        className="font-mono text-xs font-medium text-emerald-700 hover:text-emerald-900 hover:underline underline-offset-2 transition-colors"
                        title="View receipt"
                      >
                        {p.receiptNumber}
                      </button>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-gray-900">{p.studentName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{p.admissionNumber}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.courseName ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-sm text-gray-700">
                        <ModeIcon className="size-3.5 text-gray-400" />
                        {MODE_LABELS[p.paymentMode]}
                      </span>
                      {p.referenceNumber && (
                        <p className="text-xs text-muted-foreground font-mono">{p.referenceNumber}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-semibold text-emerald-700">{fmt(p.amount)}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(p.paymentDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      {confirmCancel === p.id ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="destructive"
                            disabled={cancelMutation.isPending}
                            onClick={() => cancelMutation.mutate(p.id)}>
                            Confirm
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setConfirmCancel(null)}>
                            No
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="icon-sm"
                          onClick={() => setConfirmCancel(p.id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {meta.page + 1} of {meta.totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon-sm" disabled={!meta.hasPrevious || isFetching}
              onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="icon-sm" disabled={!meta.hasNext || isFetching}
              onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {showModal && (
        <CollectPaymentModal
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      {viewReceipt && (
        <ReceiptModal
          payment={viewReceipt}
          onClose={() => setViewReceipt(null)}
        />
      )}
    </div>
  );
}

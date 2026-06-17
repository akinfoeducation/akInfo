"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  IndianRupee, TrendingUp, AlertCircle, Receipt,
  Plus, ChevronLeft, ChevronRight, X, Banknote,
  Smartphone, Building2, CreditCard, HelpCircle, Trash2, Search, Printer,
  Users, ArrowRight,
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
  CASH: Banknote, UPI: Smartphone, CHEQUE: Receipt,
  BANK_TRANSFER: Building2, OTHER: HelpCircle,
};

const MODE_LABELS: Record<PaymentMode, string> = {
  CASH: "Cash", UPI: "UPI", CHEQUE: "Cheque",
  BANK_TRANSFER: "Bank Transfer", OTHER: "Other",
};

type Tab = "payments" | "dues";

// ── Summary cards ─────────────────────────────────────────────────────────────

function SummaryCards({ onDuesClick }: { onDuesClick: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["fees-summary"],
    queryFn: getFeesSummary,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
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
        <p className="text-2xl font-bold">{fmt(data.collectedToday)}</p>
        <p className="text-xs text-muted-foreground mt-1">{data.paymentsToday} receipt{data.paymentsToday !== 1 ? "s" : ""} today</p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground">This Month</p>
          <div className="size-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <TrendingUp className="size-4 text-blue-600" />
          </div>
        </div>
        <p className="text-2xl font-bold">{fmt(data.collectedThisMonth)}</p>
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

      {/* Clickable "With Dues" card */}
      <button onClick={onDuesClick} className="text-left">
        <Card className="p-5 border-red-200 hover:border-red-400 hover:shadow-md transition-all cursor-pointer group h-full">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground">With Dues</p>
            <div className="size-8 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertCircle className="size-4 text-red-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-500">{data.overdueCount}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 group-hover:text-red-600 transition-colors">
            Students with pending fees
            <ArrowRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </p>
        </Card>
      </button>
    </div>
  );
}

// ── With Dues tab ─────────────────────────────────────────────────────────────

function WithDuesTab({ onCollect }: { onCollect: (adm: AdmissionSummary) => void }) {
  const [q, setQ]     = useState("");
  const [page, setPage] = useState(0);
  const debouncedQ    = useDebounce(q, 300);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admissions-dues", debouncedQ, page],
    queryFn: () => listAdmissions({ hasDues: true, q: debouncedQ || undefined, page, size: 20, sort: "feesDue", dir: "desc" }),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const admissions = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      {meta && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="size-4 text-red-500" />
          <span><strong className="text-red-600">{meta.total}</strong> student{meta.total !== 1 ? "s" : ""} with pending fees</span>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, admission #…"
          value={q}
          onChange={e => { setQ(e.target.value); setPage(0); }}
          className="pl-9"
        />
        {q && (
          <button onClick={() => { setQ(""); setPage(0); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-700">
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Student</TableHead>
              <TableHead>Admission #</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Total Fees</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead className="text-red-600">Pending</TableHead>
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
            ) : admissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-16">
                  {q
                    ? `No students with pending fees matching "${q}".`
                    : "No students with pending fees."}
                </TableCell>
              </TableRow>
            ) : (
              admissions.map(adm => {
                const pct = adm.feesAgreed > 0 ? Math.round((adm.feesPaid / adm.feesAgreed) * 100) : 0;
                return (
                  <TableRow key={adm.id} className="hover:bg-gray-50/80">
                    <TableCell>
                      <p className="text-sm font-medium text-gray-900">{adm.fullName}</p>
                      {adm.phone && <p className="text-xs text-muted-foreground">{adm.phone}</p>}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-gray-600">{adm.admissionNumber}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {adm.courseName ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{fmt(adm.feesAgreed)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm text-emerald-700 font-medium">{fmt(adm.feesPaid)}</p>
                        {/* Progress bar */}
                        <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-bold text-red-600">{fmt(adm.feesDue)}</span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
                        onClick={() => onCollect(adm)}
                      >
                        <IndianRupee className="size-3" /> Collect
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {admissions.length > 0
              ? `Showing ${page * 20 + 1}–${Math.min((page + 1) * 20, meta.total)} of ${meta.total}`
              : "No results"}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" disabled={!meta.hasPrevious || isFetching} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-1">
              Page {meta.page + 1} of {meta.totalPages}
            </span>
            <Button variant="outline" size="icon-sm" disabled={!meta.hasNext || isFetching} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Collect payment modal ─────────────────────────────────────────────────────

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
  onClose, onSuccess, prefill,
}: {
  onClose: () => void;
  onSuccess: () => void;
  prefill?: AdmissionSummary | null;
}) {
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState<AdmissionSummary | null>(prefill ?? null);
  const [showDropdown, setDropdown] = useState(false);
  const debouncedSearch             = useDebounce(search, 280);

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<PaymentForm>({
      resolver: zodResolver(paymentSchema) as Resolver<PaymentForm>,
      defaultValues: {
        paymentMode: "CASH",
        paymentDate: format(new Date(), "yyyy-MM-dd"),
        admissionId: prefill?.id ?? 0,
        amount: prefill && prefill.feesDue > 0 ? prefill.feesDue : undefined,
      },
    });

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
    if (adm.feesDue > 0) setValue("amount", adm.feesDue);
    setSearch(""); setDropdown(false);
  }

  function clearPick() { setSelected(null); setValue("admissionId", 0); }

  const paymentMode = watch("paymentMode");
  const needsRef = paymentMode === "CHEQUE" || paymentMode === "UPI" || paymentMode === "BANK_TRANSFER";

  const mutation = useMutation({
    mutationFn: (v: PaymentForm) =>
      collectPayment({
        admissionId: v.admissionId, amount: v.amount,
        paymentDate: v.paymentDate || undefined,
        paymentMode: v.paymentMode,
        referenceNumber: v.referenceNumber || undefined,
        notes: v.notes || undefined,
      }),
    onSuccess: (payment) => {
      toast.success(`Receipt ${payment.receiptNumber} — ${fmt(payment.amount)} collected`);
      onSuccess();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to record payment.";
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

        <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="space-y-4">
          <input type="hidden" {...register("admissionId", { valueAsNumber: true })} />

          <div className="space-y-1.5">
            <Label>Student / Admission <span className="text-destructive">*</span></Label>
            {selected ? (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selected.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{selected.admissionNumber}</span>
                    {selected.courseName && <span className="ml-2">{selected.courseName}</span>}
                    {selected.feesDue > 0 && (
                      <span className="ml-2 text-red-600 font-medium">Due: {fmt(selected.feesDue)}</span>
                    )}
                  </p>
                </div>
                <button type="button" onClick={clearPick} className="size-5 rounded text-gray-400 hover:text-gray-700 shrink-0">
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    autoFocus
                    placeholder="Search by name, phone, admission #…"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setDropdown(true); }}
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
                      <p className="px-4 py-3 text-sm text-muted-foreground">No admissions found</p>
                    ) : (
                      suggestions.map(adm => (
                        <button key={adm.id} type="button" onMouseDown={() => pick(adm)}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                          <p className="text-sm font-medium">{adm.fullName}</p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-mono">{adm.admissionNumber}</span>
                            {adm.courseName && <span className="ml-2">{adm.courseName}</span>}
                            {adm.feesDue > 0
                              ? <span className="ml-2 text-red-600 font-medium">Due: {fmt(adm.feesDue)}</span>
                              : <span className="ml-2 text-emerald-600">Paid in full</span>}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Amount (₹) <span className="text-destructive">*</span></Label>
              <Input type="number" min={1} placeholder="5000" aria-invalid={!!errors.amount} {...register("amount")} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Payment Date</Label>
              <Input type="date" {...register("paymentDate")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Payment Mode</Label>
            <Select defaultValue="CASH" onValueChange={v => setValue("paymentMode", v as PaymentForm["paymentMode"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Label>{paymentMode === "CHEQUE" ? "Cheque Number" : "Transaction / UTR Reference"}</Label>
              <Input placeholder={paymentMode === "CHEQUE" ? "012345" : "UTR / transaction ID"} {...register("referenceNumber")} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea placeholder="Optional notes…" rows={2} {...register("notes")} />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={mutation.isPending || !selected}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white">
              {mutation.isPending ? "Recording…" : "Record & Generate Receipt"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Receipt modal ─────────────────────────────────────────────────────────────

function ReceiptModal({ payment, onClose }: { payment: FeePayment; onClose: () => void }) {
  const ModeIcon = MODE_ICONS[payment.paymentMode] ?? HelpCircle;
  return (
    <>
      <style>{`@media print { body > * { visibility: hidden; } #receipt-print-area, #receipt-print-area * { visibility: visible; } #receipt-print-area { position: fixed; inset: 0; background: white; display: flex; align-items: flex-start; justify-content: center; padding: 40px; } }`}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
          <div id="receipt-print-area" className="p-6 space-y-4">
            <div className="text-center border-b border-dashed border-gray-300 pb-4">
              <p className="font-bold text-base tracking-wide uppercase">AKT Institute</p>
              <p className="text-xs text-muted-foreground mt-0.5">Fee Payment Receipt</p>
              <p className="font-mono text-lg font-semibold text-emerald-700 mt-2">{payment.receiptNumber}</p>
            </div>
            <div className="space-y-1.5 text-sm border-b border-dashed border-gray-300 pb-4">
              <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Student</span><span className="font-medium text-right">{payment.studentName}</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Admission #</span><span className="font-mono text-xs">{payment.admissionNumber}</span></div>
              {payment.courseName && <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Course</span><span className="text-right">{payment.courseName}</span></div>}
            </div>
            <div className="space-y-1.5 text-sm border-b border-dashed border-gray-300 pb-4">
              <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Date</span><span>{format(new Date(payment.paymentDate), "dd MMM yyyy")}</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Mode</span><span className="flex items-center gap-1.5"><ModeIcon className="size-3.5 text-gray-500" />{MODE_LABELS[payment.paymentMode]}</span></div>
              {payment.referenceNumber && <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Reference</span><span className="font-mono text-xs">{payment.referenceNumber}</span></div>}
              {payment.notes && <div className="flex justify-between gap-4"><span className="text-muted-foreground shrink-0">Notes</span><span className="text-xs text-right max-w-[60%]">{payment.notes}</span></div>}
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-semibold">Amount Paid</span>
              <span className="text-2xl font-bold text-emerald-700">{fmt(payment.amount)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground text-center pt-1">Generated {format(new Date(payment.createdAt), "dd MMM yyyy, h:mm a")}</p>
          </div>
          <div className="flex gap-3 px-6 pb-6 print:hidden">
            <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5" onClick={() => window.print()}>
              <Printer className="size-4" /> Print
            </Button>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Payments tab ──────────────────────────────────────────────────────────────

function PaymentsTab({ onNewPayment }: { onNewPayment: () => void }) {
  const [page, setPage]       = useState(0);
  const [modeFilter, setMode] = useState<PaymentMode | "">("");
  const [fromDate, setFrom]   = useState("");
  const [toDate, setTo]       = useState("");
  const [confirmCancel, setConfirmCancel] = useState<number | null>(null);
  const [viewReceipt, setViewReceipt]     = useState<FeePayment | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["fee-payments", modeFilter, fromDate, toDate, page],
    queryFn: () => listPayments({ paymentMode: modeFilter || undefined, from: fromDate || undefined, to: toDate || undefined, page, size: 20 }),
    placeholderData: prev => prev,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelPayment,
    onSuccess: () => {
      toast.success("Payment cancelled");
      setConfirmCancel(null);
      qc.invalidateQueries({ queryKey: ["fee-payments"] });
      qc.invalidateQueries({ queryKey: ["fees-summary"] });
    },
    onError: () => toast.error("Failed to cancel payment"),
  });

  const payments = data?.data ?? [];
  const meta     = data?.meta;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-end">
        <Select value={modeFilter || "__all"} onValueChange={v => { setMode(!v || v === "__all" ? "" : v as PaymentMode); setPage(0); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All modes" /></SelectTrigger>
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
          <Input type="date" className="w-36 text-sm" value={fromDate} onChange={e => { setFrom(e.target.value); setPage(0); }} />
          <span className="text-muted-foreground text-sm">–</span>
          <Input type="date" className="w-36 text-sm" value={toDate} onChange={e => { setTo(e.target.value); setPage(0); }} />
        </div>
        {(modeFilter || fromDate || toDate) && (
          <Button variant="ghost" size="sm" onClick={() => { setMode(""); setFrom(""); setTo(""); setPage(0); }}>
            <X className="size-3.5" /> Clear
          </Button>
        )}
        {meta && <span className="text-sm text-muted-foreground ml-auto">{meta.total} payment{meta.total !== 1 ? "s" : ""}</span>}
      </div>

      {/* Table */}
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
                <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
              ))
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  No payments found.{" "}
                  <button onClick={onNewPayment} className="text-emerald-600 hover:underline">Record a payment</button>
                </TableCell>
              </TableRow>
            ) : payments.map(p => {
              const ModeIcon = MODE_ICONS[p.paymentMode] ?? Receipt;
              return (
                <TableRow key={p.id} className="hover:bg-gray-50/80">
                  <TableCell>
                    <button onClick={() => setViewReceipt(p)} className="font-mono text-xs font-medium text-emerald-700 hover:underline">
                      {p.receiptNumber}
                    </button>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{p.studentName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p.admissionNumber}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.courseName ?? "—"}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-sm text-gray-700">
                      <ModeIcon className="size-3.5 text-gray-400" />{MODE_LABELS[p.paymentMode]}
                    </span>
                    {p.referenceNumber && <p className="text-xs text-muted-foreground font-mono">{p.referenceNumber}</p>}
                  </TableCell>
                  <TableCell><span className="text-sm font-semibold text-emerald-700">{fmt(p.amount)}</span></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(p.paymentDate), "dd MMM yyyy")}</TableCell>
                  <TableCell>
                    {confirmCancel === p.id ? (
                      <div className="flex gap-1">
                        <Button size="sm" variant="destructive" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate(p.id)}>Confirm</Button>
                        <Button size="sm" variant="outline" onClick={() => setConfirmCancel(null)}>No</Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="icon-sm" onClick={() => setConfirmCancel(p.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {meta.page + 1} of {meta.totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon-sm" disabled={!meta.hasPrevious || isFetching} onClick={() => setPage(p => p - 1)}><ChevronLeft className="size-4" /></Button>
            <Button variant="outline" size="icon-sm" disabled={!meta.hasNext || isFetching} onClick={() => setPage(p => p + 1)}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
      )}

      {viewReceipt && <ReceiptModal payment={viewReceipt} onClose={() => setViewReceipt(null)} />}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FeesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>(() =>
    searchParams.get("tab") === "dues" ? "dues" : "payments"
  );
  const [showModal, setShowModal]   = useState(false);
  const [collectFor, setCollectFor] = useState<AdmissionSummary | null>(null);

  // Sync tab with URL param
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab === "dues" || urlTab === "payments") setTab(urlTab);
  }, [searchParams]);

  function switchTab(t: Tab) {
    setTab(t);
    const params = new URLSearchParams(searchParams.toString());
    if (t === "payments") params.delete("tab");
    else params.set("tab", t);
    router.replace(`/fees${params.size ? `?${params}` : ""}`);
  }

  function handleCollect(adm?: AdmissionSummary) {
    setCollectFor(adm ?? null);
    setShowModal(true);
  }

  function handleSuccess() {
    setShowModal(false);
    setCollectFor(null);
    qc.invalidateQueries({ queryKey: ["fee-payments"] });
    qc.invalidateQueries({ queryKey: ["fees-summary"] });
    qc.invalidateQueries({ queryKey: ["admissions-dues"] });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Fees</h1>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => handleCollect()}>
          <Plus className="size-4" /> Collect Payment
        </Button>
      </div>

      {/* Summary cards — "With Dues" card switches tab */}
      <SummaryCards onDuesClick={() => switchTab("dues")} />

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {([
          { key: "payments", label: "Payment History", icon: Receipt },
          { key: "dues",     label: "With Dues",       icon: AlertCircle },
        ] as { key: Tab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? "border-emerald-500 text-emerald-700"
                : "border-transparent text-muted-foreground hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Icon className={`size-4 ${key === "dues" ? "text-red-500" : ""}`} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "payments" ? (
        <PaymentsTab onNewPayment={() => handleCollect()} />
      ) : (
        <WithDuesTab onCollect={(adm) => handleCollect(adm)} />
      )}

      {/* Collect payment modal */}
      {showModal && (
        <CollectPaymentModal
          onClose={() => { setShowModal(false); setCollectFor(null); }}
          onSuccess={handleSuccess}
          prefill={collectFor}
        />
      )}
    </div>
  );
}

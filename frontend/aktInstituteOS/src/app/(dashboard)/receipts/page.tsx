"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Receipt, Search, Filter, ChevronLeft, ChevronRight, Printer, Inbox,
} from "lucide-react";
import { listPayments } from "@/lib/api/fees.api";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { ReceiptModal } from "@/components/fees/receipt-modal";
import type { FeePayment, PaymentMode } from "@/types/fees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

const MODE_OPTIONS: Array<{ value: PaymentMode | ""; label: string }> = [
  { value: "", label: "All Modes" },
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "OTHER", label: "Other" },
];

export default function ReceiptsPage() {
  const perms = usePermissions();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<PaymentMode | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [viewReceipt, setViewReceipt] = useState<FeePayment | null>(null);

  const canView = perms.has("FEE_VIEW");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["receipts", mode, from, to, page],
    queryFn: () => listPayments({ paymentMode: mode || undefined, from: from || undefined, to: to || undefined, page, size: 20 }),
    enabled: canView,
    placeholderData: (prev) => prev,
  });

  const payments = data?.data ?? [];
  const meta = data?.meta;

  // Client-side text filter over the loaded page (the fees list API has no text search).
  const q = query.trim().toLowerCase();
  const rows = q
    ? payments.filter(p =>
        p.receiptNumber.toLowerCase().includes(q) ||
        p.studentName.toLowerCase().includes(q) ||
        p.admissionNumber.toLowerCase().includes(q))
    : payments;

  if (!canView) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center text-muted-foreground">
        <Inbox className="mb-3 size-10 text-gray-300" />
        <p className="text-sm">You don’t have access to receipts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
          <Receipt className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Receipts</h1>
          <p className="text-sm text-muted-foreground">Search and reprint fee payment receipts.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search receipt #, student, admission #…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={mode || "__all"} onValueChange={(v) => { setMode((!v || v === "__all" ? "" : v) as PaymentMode | ""); setPage(0); }}>
          <SelectTrigger className="w-40">
            <Filter className="mr-1 size-3.5 text-muted-foreground" />
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent>
            {MODE_OPTIONS.map((o) => (
              <SelectItem key={o.value || "__all"} value={o.value || "__all"}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} className="w-40" title="From date" />
        <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} className="w-40" title="To date" />
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Receipt #</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
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
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  <Inbox className="mx-auto mb-2 size-8 text-gray-300" />
                  {query || mode || from || to ? "No receipts match your filters." : "No receipts yet."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((p) => (
                <TableRow key={p.id} className="hover:bg-gray-50/80">
                  <TableCell>
                    <button onClick={() => setViewReceipt(p)} className="font-mono text-xs font-medium text-emerald-700 hover:underline">
                      {p.receiptNumber}
                    </button>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-gray-900">{p.studentName}</span>
                    <p className="font-mono text-xs text-muted-foreground">{p.admissionNumber}</p>
                  </TableCell>
                  <TableCell className="text-sm">{p.courseName ?? "—"}</TableCell>
                  <TableCell className="text-sm">{p.paymentMode.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-sm font-medium">{formatCurrency(p.amount)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(p.paymentDate), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setViewReceipt(p)}>
                      <Printer className="size-3.5" /> Reprint
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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

      {viewReceipt && <ReceiptModal payment={viewReceipt} onClose={() => setViewReceipt(null)} />}
    </div>
  );
}

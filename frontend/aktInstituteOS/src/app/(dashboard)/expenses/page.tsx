"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth } from "date-fns";
import {
  Wallet, Plus, Search, Filter, ChevronLeft, ChevronRight, Inbox, X,
} from "lucide-react";
import { listExpenses, createExpense } from "@/lib/api/expenses.api";
import { getReportSummary } from "@/lib/api/reports.api";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { EXPENSE_CATEGORIES, type CreateExpenseRequest } from "@/types/expense";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

function apiErr(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}
function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

const PAYMENT_MODES = ["CASH", "UPI", "CHEQUE", "BANK_TRANSFER", "OTHER"];

export default function ExpensesPage() {
  const perms = usePermissions();
  const qc = useQueryClient();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  const canView = perms.has("EXPENSE_VIEW");
  const canCreate = perms.has("EXPENSE_CREATE");
  const canSeeSummary = perms.has("REPORT_VIEW");

  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["expenses", debouncedQuery, category, page],
    queryFn: () => listExpenses({ q: debouncedQuery || undefined, category: category || undefined, page, size: 20 }),
    enabled: canView,
    placeholderData: (prev) => prev,
  });

  const { data: summary } = useQuery({
    queryKey: ["expense-summary", monthStart, today],
    queryFn: () => getReportSummary(monthStart, today),
    enabled: canView && canSeeSummary,
    staleTime: 60_000,
  });

  const expenses = data?.data ?? [];
  const meta = data?.meta;

  if (!canView) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center text-muted-foreground">
        <Inbox className="mb-3 size-10 text-gray-300" />
        <p className="text-sm">You don’t have access to expenses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Wallet className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Expenses</h1>
            <p className="text-sm text-muted-foreground">Record and track institute expenses.</p>
          </div>
        </div>
        {canCreate && (
          <Button className="bg-emerald-500 text-white hover:bg-emerald-600" onClick={() => setShowModal(true)}>
            <Plus className="size-4" /> Record Expense
          </Button>
        )}
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-4">
            <p className="text-sm text-muted-foreground">Expenses (this month)</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(summary.totalExpenses)}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-sm text-muted-foreground">Revenue (this month)</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-700">{formatCurrency(summary.totalFeeCollected)}</p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-sm text-muted-foreground">Net (this month)</p>
            <p className={`mt-1 text-2xl font-semibold ${summary.netRevenue >= 0 ? "text-emerald-700" : "text-red-600"}`}>
              {formatCurrency(summary.netRevenue)}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search description, payee, expense #…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} className="pl-9" />
        </div>
        <Select value={category || "__all"} onValueChange={(v) => { setCategory(!v || v === "__all" ? "" : v); setPage(0); }}>
          <SelectTrigger className="w-48">
            <Filter className="mr-1 size-3.5 text-muted-foreground" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All Categories</SelectItem>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Expense #</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Paid To</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>By</TableHead>
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
            ) : expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  <Inbox className="mx-auto mb-2 size-8 text-gray-300" />
                  {query || category ? "No expenses match your filters." : "No expenses recorded yet."}
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((e) => (
                <TableRow key={e.id} className="hover:bg-gray-50/80">
                  <TableCell className="font-mono text-xs">{e.expenseNumber}</TableCell>
                  <TableCell><span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{e.category}</span></TableCell>
                  <TableCell className="max-w-[260px] truncate text-sm">{e.description}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.paidTo || "—"}</TableCell>
                  <TableCell className="text-sm font-medium">{formatCurrency(e.amount)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(e.expenseDate), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.createdByName ?? "—"}</TableCell>
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

      {showModal && canCreate && (
        <ExpenseModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["expenses"] });
            qc.invalidateQueries({ queryKey: ["expense-summary"] });
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

function ExpenseModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<CreateExpenseRequest>({
    category: "",
    description: "",
    amount: 0,
    expenseDate: format(new Date(), "yyyy-MM-dd"),
    paymentMode: "CASH",
    paidTo: "",
    referenceNumber: "",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: () => createExpense({
      ...form,
      paidTo: form.paidTo || undefined,
      referenceNumber: form.referenceNumber || undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: (exp) => { toast.success(`Expense ${exp.expenseNumber} recorded`); onSaved(); },
    onError: (err) => toast.error(apiErr(err) ?? "Failed to record expense."),
  });

  const valid = form.category && form.description.trim() && form.amount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold">Record Expense</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="size-4" /></button>
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-5">
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v ?? "" }))}>
              <SelectTrigger className="mt-1 w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Input className="mt-1" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="e.g. October office rent" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Amount (₹)</Label>
              <Input className="mt-1" type="number" min="0" value={form.amount || ""} onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))} />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input className="mt-1" type="date" value={form.expenseDate} onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Payment Mode</Label>
              <Select value={form.paymentMode} onValueChange={(v) => setForm((f) => ({ ...f, paymentMode: v ?? "CASH" }))}>
                <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Paid To</Label>
              <Input className="mt-1" value={form.paidTo} onChange={(e) => setForm((f) => ({ ...f, paidTo: e.target.value }))} placeholder="Payee" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Reference #</Label>
            <Input className="mt-1" value={form.referenceNumber} onChange={(e) => setForm((f) => ({ ...f, referenceNumber: e.target.value }))} placeholder="UTR / cheque no. (optional)" />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea className="mt-1" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
          </div>
        </div>
        <div className="flex gap-3 border-t px-5 py-4">
          <Button className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600" disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Recording…" : "Record Expense"}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

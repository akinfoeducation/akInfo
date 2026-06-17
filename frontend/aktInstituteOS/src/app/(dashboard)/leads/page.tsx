"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Plus, ChevronLeft, ChevronRight, Filter, Upload,
  CheckCircle2, CalendarDays, X, Users, CheckSquare,
  Square, Minus, Phone,
} from "lucide-react";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { listLeads, bulkImportLeads, bulkAssignLeads } from "@/lib/api/leads.api";
import { listUsers } from "@/lib/api/users.api";
import { useAuthStore } from "@/lib/stores/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { LeadSourceBadge } from "@/components/leads/LeadSourceBadge";
import type { LeadStatus, LeadSource, LeadStage, BulkImportResult, BulkAssignResult } from "@/types/lead";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";

// ── Stage tabs ────────────────────────────────────────────────────────────────

const STAGE_TABS: Array<{ value: LeadStage | ""; label: string; color: string; dot: string }> = [
  { value: "",                   label: "All Leads",       color: "text-gray-700",    dot: "bg-gray-400" },
  { value: "CALLER_PIPELINE",    label: "Caller Pipeline", color: "text-blue-700",    dot: "bg-blue-500" },
  { value: "COUNSELLOR_PIPELINE",label: "Counsellor",      color: "text-sky-700",     dot: "bg-sky-500" },
  { value: "ADMITTED",           label: "Admitted",        color: "text-emerald-700", dot: "bg-emerald-500" },
  { value: "DEAD",               label: "Dead",            color: "text-red-600",     dot: "bg-red-400" },
];

// ── Constants ──────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: Array<{ value: LeadStatus | ""; label: string }> = [
  { value: "", label: "All Statuses" },
  // Pre-visit — caller owns
  { value: "NEW_LEAD", label: "New Lead" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "INTERESTED", label: "Interested" },
  { value: "FOLLOW_UP", label: "Follow Up" },
  { value: "CALLBACK", label: "Callback" },
  { value: "VISIT_PLANNED", label: "Visit Planned" },
  { value: "NOT_CONNECTED", label: "Not Connected" },
  // Remote booking path
  { value: "ADMISSION_INTERESTED", label: "Admission Interested" },
  { value: "PAYMENT_PENDING", label: "Payment Pending" },
  { value: "BOOKING_CONFIRMED", label: "Booking Confirmed" },
  { value: "VISIT_PENDING", label: "Visit Pending" },
  // Post-visit — counsellor owns
  { value: "VISIT_DONE", label: "Visit Done" },
  { value: "FOLLOW_UP_AFTER_VISIT", label: "Follow Up After Visit" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "DOCUMENT_PENDING", label: "Document Pending" },
  { value: "ADMISSION_IN_PROGRESS", label: "Admission In Progress" },
  // Terminal
  { value: "ADMISSION_DONE", label: "Admission Done" },
  { value: "NOT_INTERESTED", label: "Not Interested" },
  { value: "NOT_REACHABLE", label: "Not Reachable" },
  { value: "CLOSED", label: "Closed" },
];

const SOURCE_OPTIONS: Array<{ value: LeadSource | ""; label: string }> = [
  { value: "", label: "All Sources" },
  { value: "WALK_IN", label: "Walk In" },
  { value: "REFERRAL", label: "Referral" },
  { value: "SOCIAL_MEDIA", label: "Social Media" },
  { value: "WEBSITE", label: "Website" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "OTHER", label: "Other" },
];

// ── Bulk Assign Result Dialog ──────────────────────────────────────────────────

function AssignResultDialog({
  result,
  callerName,
  onClose,
}: {
  result: BulkAssignResult;
  callerName: string;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-600" />
            Assignment Complete
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Assigned to <strong className="text-gray-900">{callerName}</strong>
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Newly Assigned", value: result.assigned, color: "text-emerald-600" },
              { label: "Reassigned",     value: result.reassigned, color: "text-blue-600" },
              { label: "Already Assigned (skipped)", value: result.skipped, color: "text-gray-500" },
              { label: "Not Found",      value: result.notFound, color: "text-red-500" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg border p-3 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          {result.errors.length > 0 && (
            <div>
              <p className="font-medium text-red-600 mb-1">Errors:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 max-h-24 overflow-y-auto">
                {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          )}
          <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white" onClick={onClose}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Bulk Assign Toolbar ────────────────────────────────────────────────────────

function BulkAssignModal({
  selectedIds,
  onAssign,
  onClose,
  isPending,
}: {
  selectedIds: Set<number>;
  onAssign: (callerId: number, callerName: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [search, setSearch] = useState("");
  const [selectedCallerId, setSelectedCallerId] = useState<number | null>(null);

  const { data: callersData, isLoading } = useQuery({
    queryKey: ["users", "CALLER"],
    queryFn: () => listUsers({ role: "CALLER", size: 200, status: "active" }),
    staleTime: 2 * 60_000,
  });
  const allCallers = callersData?.data ?? [];

  // Filter callers by search
  const callers = search.trim()
    ? allCallers.filter(c => {
        const name = (c.fullName ?? `${c.firstName} ${c.lastName ?? ""}`.trim()).toLowerCase();
        const phone = (c.phone ?? "").toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || phone.includes(q);
      })
    : allCallers;

  const selected = allCallers.find(c => c.id === selectedCallerId);

  function handleAssign() {
    if (!selectedCallerId || !selected) return;
    const name = selected.fullName ?? `${selected.firstName} ${selected.lastName ?? ""}`.trim();
    onAssign(selectedCallerId, name);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b">
          <div>
            <h2 className="text-base font-semibold">Assign to Caller</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="font-medium text-emerald-600">{selectedIds.size}</span> lead{selectedIds.size !== 1 ? "s" : ""} selected
            </p>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400">
            <X className="size-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 pt-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search callers by name or phone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-600">
                <X className="size-3.5" />
              </button>
            )}
          </div>
          {allCallers.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {callers.length} of {allCallers.length} caller{allCallers.length !== 1 ? "s" : ""}
              {search && " match"}
            </p>
          )}
        </div>

        {/* Caller list */}
        <div className="px-3 pb-3 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 px-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : callers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? `No callers match "${search}"` : "No active callers found"}
            </p>
          ) : (
            <div className="space-y-1">
              {callers.map(c => {
                const name = c.fullName ?? `${c.firstName} ${c.lastName ?? ""}`.trim();
                const isActive = selectedCallerId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCallerId(isActive ? null : c.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isActive
                        ? "bg-emerald-50 border border-emerald-200"
                        : "hover:bg-gray-50 border border-transparent"
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`size-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isActive ? "text-emerald-800" : "text-gray-900"}`}>
                        {name}
                      </p>
                      {c.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="size-3" /> {c.phone}
                        </p>
                      )}
                    </div>
                    {isActive && (
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <Button
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
            disabled={!selectedCallerId || isPending}
            onClick={handleAssign}
          >
            {isPending
              ? "Assigning…"
              : selectedCallerId
              ? `Assign to ${selected?.fullName ?? selected?.firstName ?? "Caller"}`
              : "Select a caller first"}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [query, setQuery]   = useState("");
  const [stage, setStage]   = useState<LeadStage | "">((searchParams.get("stage") as LeadStage) ?? "");
  const [status, setStatus] = useState<LeadStatus | "">((searchParams.get("status") as LeadStatus) ?? "");
  const [source, setSource] = useState<LeadSource | "">("");
  const [from, setFrom]     = useState(searchParams.get("from") ?? "");
  const [to, setTo]         = useState(searchParams.get("to") ?? "");
  const [page, setPage]     = useState(0);

  // Selection state
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Modals
  const [importResult, setImportResult]   = useState<BulkImportResult | null>(null);
  const [assignResult, setAssignResult]   = useState<{ result: BulkAssignResult; callerName: string } | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const debouncedQuery = useDebounce(query, 300);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const roles = user?.roles ?? [];
  const isAdmin  = roles.some(r => ["INSTITUTE_ADMIN", "SUPER_ADMIN", "COUNSELLOR"].includes(r));
  const isCaller = !isAdmin && roles.includes("CALLER");
  const canImport = isAdmin;
  const canAssign = isAdmin;

  // Sync URL params → state
  useEffect(() => {
    const s = searchParams.get("status") as LeadStatus | null;
    const f = searchParams.get("from");
    const t = searchParams.get("to");
    if (s !== null) setStatus(s as LeadStatus | "");
    if (f !== null) setFrom(f);
    if (t !== null) setTo(t);
    setPage(0);
  }, [searchParams]);

  const hasDateFilter = from || to;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["leads", debouncedQuery, stage, status, source, from, to, page],
    queryFn: () => listLeads({
      q: debouncedQuery || undefined,
      stage: stage || undefined,
      status: status || undefined,
      source: source || undefined, from: from || undefined, to: to || undefined,
      page, size: 20,
    }),
    placeholderData: prev => prev,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const leads = data?.data ?? [];
  const meta  = data?.meta;

  // ── Selection helpers ──────────────────────────────────────────────────────

  const allPageIds  = leads.map(l => l.id);
  const allSelected = allPageIds.length > 0 && allPageIds.every(id => selected.has(id));
  const someSelected = !allSelected && allPageIds.some(id => selected.has(id));

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelected(prev => { const n = new Set(prev); allPageIds.forEach(id => n.delete(id)); return n; });
    } else {
      setSelected(prev => new Set([...prev, ...allPageIds]));
    }
  }, [allSelected, allPageIds]);

  const toggleOne = useCallback((id: number) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  // Clear selection when filters change
  useEffect(() => { setSelected(new Set()); }, [debouncedQuery, stage, status, source, from, to, page]);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const importMutation = useMutation({
    mutationFn: (file: File) => bulkImportLeads(file),
    onSuccess: result => {
      setImportResult(result);
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success(`Import complete — ${result.createdRows} leads created`);
    },
    onError: () => toast.error("Import failed. Please check the file format."),
  });

  const assignMutation = useMutation({
    mutationFn: (req: { leadIds: number[]; callerId: number }) =>
      bulkAssignLeads(req),
    onSuccess: (result, vars) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "caller"] });
      const callers = qc.getQueryData<{ data: Array<{ id: number; firstName: string; lastName?: string; fullName?: string }> }>(["users", "CALLER"])?.data ?? [];
      const caller  = callers.find(c => c.id === vars.callerId);
      const rawName = `${caller?.firstName ?? ""} ${caller?.lastName ?? ""}`.trim();
      const name    = caller?.fullName ? caller.fullName : (rawName || "Caller");
      setAssignResult({ result, callerName: name });
      setSelected(new Set());
      setShowAssignModal(false);
    },
    onError: () => toast.error("Assignment failed. Please try again."),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) importMutation.mutate(file);
    e.target.value = "";
  }

  function clearDates() {
    setFrom(""); setTo(""); setPage(0);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from"); params.delete("to");
    router.replace(`/leads${params.size ? `?${params}` : ""}`);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          {meta && (
            <p className="text-sm text-muted-foreground mt-1">
              {meta.total} lead{meta.total !== 1 ? "s" : ""}
              {hasDateFilter && " in selected date range"}
              {selected.size > 0 && (
                <span className="ml-2 text-emerald-600 font-medium">· {selected.size} selected</span>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {canImport && (
            <>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importMutation.isPending}>
                <Upload className="size-4" />
                {importMutation.isPending ? "Importing…" : "Bulk Import"}
              </Button>
              <Link href="/leads/new">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  <Plus className="size-4" /> Add Lead
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Stage Tabs */}
      <div className="flex gap-1 border-b">
        {STAGE_TABS.map(tab => (
          <button
            key={tab.value || "all"}
            onClick={() => { setStage(tab.value as LeadStage | ""); setStatus(""); setPage(0); }}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              stage === tab.value
                ? `border-current ${tab.color}`
                : "border-transparent text-muted-foreground hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <span className={`size-2 rounded-full ${tab.dot}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search by name, phone, email…" value={query}
            onChange={e => { setQuery(e.target.value); setPage(0); }} className="pl-9" />
        </div>
        <Select value={status || "__all"} onValueChange={(v: string | null) => { setStatus((!v || v === "__all" ? "" : v) as LeadStatus | ""); setPage(0); }}>
          <SelectTrigger className="w-48">
            <Filter className="size-3.5 text-muted-foreground mr-1" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(opt => (
              <SelectItem key={opt.value || "__all"} value={opt.value || "__all"}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={source || "__all"} onValueChange={(v: string | null) => { setSource((!v || v === "__all" ? "" : v) as LeadSource | ""); setPage(0); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            {SOURCE_OPTIONS.map(opt => (
              <SelectItem key={opt.value || "__all"} value={opt.value || "__all"}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarDays className="size-3" /> From
            </Label>
            <Input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(0); }} className="w-36 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(0); }} className="w-36 text-sm" />
          </div>
          {hasDateFilter && (
            <Button variant="ghost" size="sm" onClick={clearDates} className="text-muted-foreground self-end">
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {hasDateFilter && (
        <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
          <CalendarDays className="size-3" />
          Assigned date: {from ? format(new Date(from), "dd MMM yyyy") : "any"} → {to ? format(new Date(to), "dd MMM yyyy") : "today"}
        </p>
      )}

      {/* Selection action bar */}
      {canAssign && (
        <div className={`flex items-center justify-between rounded-lg px-4 py-2.5 transition-all ${
          selected.size > 0
            ? "bg-emerald-50 border border-emerald-200"
            : "bg-gray-50 border border-gray-200"
        }`}>
          {selected.size > 0 ? (
            <>
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                <CheckSquare className="size-4 text-emerald-600" />
                {selected.size} lead{selected.size !== 1 ? "s" : ""} selected
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={() => setShowAssignModal(true)}
                >
                  <Users className="size-3.5" /> Assign to Caller
                </Button>
                <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setSelected(new Set())}>
                  <X className="size-3.5" /> Clear
                </Button>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CheckSquare className="size-3.5 text-gray-400" />
              Select leads using the checkboxes to bulk assign them to a caller
            </p>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              {/* Checkbox column — admin only */}
              {canAssign && (
                <TableHead className="w-10 pl-4">
                  <button onClick={toggleAll} className="flex items-center justify-center text-gray-400 hover:text-gray-700">
                    {allSelected
                      ? <CheckSquare className="size-4 text-emerald-600" />
                      : someSelected
                      ? <Minus className="size-4 text-emerald-400" />
                      : <Square className="size-4" />}
                  </button>
                </TableHead>
              )}
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Interested For</TableHead>
              <TableHead>Current Work</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Next Follow-up</TableHead>
              <TableHead>Assigned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: canAssign ? 9 : 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canAssign ? 9 : 8} className="text-center text-muted-foreground py-12">
                  {query || status || stage || source || hasDateFilter ? "No leads match your filters." : "No leads yet."}
                </TableCell>
              </TableRow>
            ) : (
              leads.map(lead => {
                const isChecked = selected.has(lead.id);
                return (
                  <TableRow
                    key={lead.id}
                    className={`hover:bg-gray-50/80 ${isChecked ? "bg-emerald-50/40" : ""}`}
                  >
                    {canAssign && (
                      <TableCell className="pl-4 w-10">
                        <button
                          onClick={e => { e.stopPropagation(); toggleOne(lead.id); }}
                          className="flex items-center justify-center text-gray-400 hover:text-emerald-600"
                        >
                          {isChecked
                            ? <CheckSquare className="size-4 text-emerald-600" />
                            : <Square className="size-4" />}
                        </button>
                      </TableCell>
                    )}
                    <TableCell>
                      <Link href={`/leads/${lead.id}`} className="block">
                        <span className="font-medium text-gray-900 hover:text-emerald-700">{lead.fullName}</span>
                        {lead.email && <p className="text-xs text-muted-foreground">{lead.email}</p>}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{lead.phone}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {lead.interestedFor ? lead.interestedFor.replace(/_/g, " ") : lead.courseInterested ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {lead.currentWork ? lead.currentWork.replace(/_/g, " ") : "—"}
                    </TableCell>
                    <TableCell><LeadSourceBadge source={lead.source} /></TableCell>
                    <TableCell><LeadStatusBadge status={lead.status} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {lead.nextFollowUpAt ? format(new Date(lead.nextFollowUpAt), "dd MMM, hh:mm a") : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {lead.assignedAt ? format(new Date(lead.assignedAt), "dd MMM yyyy") : "—"}
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
            {leads.length > 0
              ? `Showing ${page * 20 + 1}–${Math.min((page + 1) * 20, meta.total)} of ${meta.total}`
              : "No results"}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" disabled={!meta.hasPrevious || isFetching} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-1">Page {meta.page + 1} of {meta.totalPages}</span>
            <Button variant="outline" size="icon-sm" disabled={!meta.hasNext || isFetching} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk assign modal */}
      {canAssign && showAssignModal && (
        <BulkAssignModal
          selectedIds={selected}
          onAssign={(callerId) => {
            setShowAssignModal(false);
            assignMutation.mutate({ leadIds: Array.from(selected), callerId });
          }}
          onClose={() => setShowAssignModal(false)}
          isPending={assignMutation.isPending}
        />
      )}

      {/* Import result dialog */}
      <Dialog open={!!importResult} onOpenChange={() => setImportResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" /> Import Complete
            </DialogTitle>
          </DialogHeader>
          {importResult && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Leads Created", value: importResult.createdRows, color: "text-emerald-600" },
                  { label: "Duplicates Skipped", value: importResult.duplicateRows, color: "text-amber-600" },
                  { label: "Invalid Rows", value: importResult.invalidRows, color: "text-red-600" },
                  { label: "Total Rows", value: importResult.totalRows, color: "text-gray-700" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg border p-3 text-center">
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-muted-foreground text-xs">{label}</p>
                  </div>
                ))}
              </div>
              {importResult.errors.length > 0 && (
                <ul className="text-xs text-muted-foreground space-y-0.5 max-h-32 overflow-y-auto">
                  {importResult.errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              )}
              <Button className="w-full" onClick={() => setImportResult(null)}>Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign result dialog */}
      {assignResult && (
        <AssignResultDialog
          result={assignResult.result}
          callerName={assignResult.callerName}
          onClose={() => setAssignResult(null)}
        />
      )}
    </div>
  );
}

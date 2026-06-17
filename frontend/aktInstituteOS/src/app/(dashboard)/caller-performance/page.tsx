"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfWeek, startOfMonth } from "date-fns";
import {
  Phone, RefreshCw, PhoneMissed, GitBranch,
  Activity, TrendingUp, Users, Clock, ArrowRight,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getCallerPerformance } from "@/lib/api/dashboard.api";
import type { CallerPerformanceRow } from "@/lib/api/dashboard.api";

// ── Date range presets ────────────────────────────────────────────────────────

type Preset = "today" | "yesterday" | "this_week" | "this_month" | "custom";

function getRange(preset: Preset, customFrom: string, customTo: string) {
  const today = new Date();
  switch (preset) {
    case "today":      return { from: format(today, "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
    case "yesterday":  { const d = subDays(today, 1); return { from: format(d, "yyyy-MM-dd"), to: format(d, "yyyy-MM-dd") }; }
    case "this_week":  return { from: format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
    case "this_month": return { from: format(startOfMonth(today), "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
    case "custom":     return { from: customFrom, to: customTo };
  }
}

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function fmtTime(iso?: string)     { if (!iso) return "—"; try { return format(new Date(iso), "hh:mm a"); }     catch { return "—"; } }
function fmtDateTime(iso?: string) { if (!iso) return "—"; try { return format(new Date(iso), "dd MMM, hh:mm a"); } catch { return "—"; } }

function initials(name: string) {
  return name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
}

// Deterministic colour from name
const AVATAR_COLORS = [
  "bg-violet-500","bg-emerald-500","bg-blue-500","bg-amber-500",
  "bg-rose-500","bg-cyan-500","bg-indigo-500","bg-teal-500",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// ── Rate pill ─────────────────────────────────────────────────────────────────

function RatePill({ value, good, ok, label }: { value: number; good: number; ok: number; label: string }) {
  const [color, bg] = value >= good
    ? ["text-emerald-700", "bg-emerald-50 ring-emerald-200"]
    : value >= ok
    ? ["text-amber-700",   "bg-amber-50 ring-amber-200"]
    : ["text-red-600",     "bg-red-50 ring-red-200"];
  return (
    <div className="text-center">
      <div className={`inline-flex flex-col items-center px-3 py-1.5 rounded-lg ring-1 ${bg}`}>
        <span className={`text-base font-bold leading-none ${color}`}>{value.toFixed(1)}%</span>
        <span className={`text-[10px] mt-0.5 font-medium ${color} opacity-70`}>{label}</span>
      </div>
    </div>
  );
}

// ── Stat chip — for volume numbers ────────────────────────────────────────────

function Chip({ label, value, color = "text-gray-700", bold = false, hide0 = false }: {
  label: string; value: number; color?: string; bold?: boolean; hide0?: boolean;
}) {
  return (
    <div className="flex flex-col items-center min-w-[44px]">
      <span className={`text-base leading-none ${bold ? "font-bold" : "font-semibold"} ${hide0 && value === 0 ? "text-gray-200" : color}`}>
        {value}
      </span>
      <span className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">{label}</span>
    </div>
  );
}

// ── Caller row card ───────────────────────────────────────────────────────────

function CallerCard({ row, from, to, rank }: { row: CallerPerformanceRow; from: string; to: string; rank: number }) {
  const color = avatarColor(row.callerName);
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 hover:border-emerald-200 hover:shadow-sm transition-all group">
      <div className="flex items-start gap-4">

        {/* ── Avatar + rank ──────────────────────────────────────────── */}
        <div className="relative shrink-0">
          <div className={`size-10 rounded-full ${color} flex items-center justify-center text-white text-sm font-bold`}>
            {initials(row.callerName)}
          </div>
          {rank <= 3 && (
            <span className="absolute -top-1 -right-1 size-4 rounded-full bg-amber-400 text-white text-[9px] font-bold flex items-center justify-center">
              {rank}
            </span>
          )}
        </div>

        {/* ── Main content ───────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-3">

          {/* Name + last active + drill-down link */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link
                href={`/caller-performance/${row.callerId}?from=${from}&to=${to}`}
                className="font-semibold text-gray-900 hover:text-emerald-600 transition-colors group-hover:underline decoration-emerald-300"
              >
                {row.callerName}
              </Link>
              {row.callerPhone && (
                <p className="text-xs text-gray-400 mt-0.5">{row.callerPhone}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {row.lastActivityAt && (
                <span className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="size-3" />
                  {fmtDateTime(row.lastActivityAt)}
                </span>
              )}
              <Link href={`/caller-performance/${row.callerId}?from=${from}&to=${to}`}>
                <ArrowRight className="size-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
              </Link>
            </div>
          </div>

          {/* ── Volume stats ───────────────────────────────────────────── */}
          <div className="flex items-center gap-1 flex-wrap">
            {/* Assigned — always prominent */}
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5 mr-1">
              <span className="text-lg font-bold text-gray-900">{row.leadsAssigned}</span>
              <span className="text-xs text-gray-400">assigned</span>
            </div>

            <div className="h-6 w-px bg-gray-100 mx-1" />

            <Chip label="Attempted"    value={row.callsAttempted} color="text-gray-600" />
            <Chip label="Connected"    value={row.connected}      color="text-emerald-600" bold />
            <Chip label="Not Conn."    value={row.notConnected}   color="text-slate-400"  hide0 />
            <Chip label="Interested"   value={row.interested}     color="text-teal-600"   bold />
            <Chip label="Follow-ups"   value={row.followUps}      color="text-amber-600"  hide0 />
            <Chip label="Walk-in"      value={row.visitPlanned}   color="text-purple-600" hide0 />

            <div className="h-6 w-px bg-gray-100 mx-1" />

            {/* Admissions — highlighted */}
            <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${row.admissionsConverted > 0 ? "bg-emerald-50" : "bg-gray-50"}`}>
              {row.admissionsConverted > 0 && <CheckCircle2 className="size-3.5 text-emerald-500" />}
              <span className={`text-lg font-bold ${row.admissionsConverted > 0 ? "text-emerald-700" : "text-gray-300"}`}>
                {row.admissionsConverted}
              </span>
              <span className={`text-xs ${row.admissionsConverted > 0 ? "text-emerald-600" : "text-gray-400"}`}>admissions</span>
            </div>

            {row.branchTransfers > 0 && (
              <div className="flex items-center gap-1.5 bg-violet-50 rounded-lg px-3 py-1.5">
                <GitBranch className="size-3 text-violet-500" />
                <span className="text-sm font-semibold text-violet-700">{row.branchTransfers}</span>
                <span className="text-xs text-violet-500">transfer</span>
              </div>
            )}
          </div>

          {/* ── Rate pills ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 flex-wrap">
            <RatePill value={row.connectionRate}          good={60} ok={40} label="Connect" />
            <RatePill value={row.interestedRate}          good={40} ok={20} label="Interest" />
            <RatePill value={row.admissionConversionRate} good={10} ok={5}  label="Admit" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Summary totals bar ────────────────────────────────────────────────────────

function TotalsBar({ totals, count }: { totals: Partial<CallerPerformanceRow>; count: number }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 flex items-center flex-wrap gap-x-6 gap-y-2">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-2">{count} Callers Total</span>
      <div className="h-4 w-px bg-gray-200" />
      {[
        { label: "Assigned",    val: totals.leadsAssigned,        color: "text-gray-700" },
        { label: "Attempted",   val: totals.callsAttempted,       color: "text-gray-600" },
        { label: "Connected",   val: totals.connected,            color: "text-emerald-600" },
        { label: "Not Conn.",   val: totals.notConnected,         color: "text-slate-500" },
        { label: "Interested",  val: totals.interested,           color: "text-teal-600" },
        { label: "Admissions",  val: totals.admissionsConverted,  color: "text-emerald-700" },
      ].map(({ label, val, color }) => (
        <div key={label} className="flex items-center gap-1.5">
          <span className={`text-sm font-bold ${color}`}>{val ?? 0}</span>
          <span className="text-xs text-gray-400">{label}</span>
        </div>
      ))}
      <div className="h-4 w-px bg-gray-200" />
      <RatePill value={totals.connectionRate ?? 0}          good={60} ok={40} label="Connect" />
      <RatePill value={totals.interestedRate ?? 0}          good={40} ok={20} label="Interest" />
      <RatePill value={totals.admissionConversionRate ?? 0} good={10} ok={5}  label="Admit" />
    </div>
  );
}

// ── Action badge ──────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, { label: string; cls: string }> = {
  ASSIGNED:         { label: "Assigned",       cls: "bg-blue-50 text-blue-700" },
  REASSIGNED:       { label: "Reassigned",     cls: "bg-indigo-50 text-indigo-700" },
  NOT_CONNECTED:    { label: "Not Connected",  cls: "bg-slate-100 text-slate-600" },
  POOL_CLAIMED:     { label: "Pool Claimed",   cls: "bg-violet-50 text-violet-700" },
  BRANCH_TRANSFER:  { label: "Branch Transfer",cls: "bg-orange-50 text-orange-700" },
  INTERESTED:       { label: "Interested",     cls: "bg-teal-50 text-teal-700" },
  FOLLOW_UP:        { label: "Follow-up",      cls: "bg-amber-50 text-amber-700" },
  CONTACTED:        { label: "Contacted",      cls: "bg-cyan-50 text-cyan-700" },
  CALLBACK:         { label: "Callback",       cls: "bg-purple-50 text-purple-700" },
  VISIT_PLANNED:    { label: "Visit Planned",  cls: "bg-emerald-50 text-emerald-700" },
};
function ActionBadge({ type }: { type: string }) {
  const { label, cls } = ACTION_LABELS[type] ?? { label: type, cls: "bg-gray-100 text-gray-600" };
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${cls}`}>{label}</span>;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CallerPerformancePage() {
  const [preset, setPreset]           = useState<Preset>("this_week");
  const [customFrom, setCustomFrom]   = useState(format(new Date(), "yyyy-MM-dd"));
  const [customTo,   setCustomTo]     = useState(format(new Date(), "yyyy-MM-dd"));

  const { from, to } = getRange(preset, customFrom, customTo);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["caller-performance", from, to],
    queryFn:  () => getCallerPerformance(from, to),
    staleTime: 60_000,
  });

  const totals = useMemo<Partial<CallerPerformanceRow>>(() => {
    if (!data?.callers.length) return {};
    const sum = (k: keyof CallerPerformanceRow) => data.callers.reduce((a, r) => a + (r[k] as number), 0);
    const ta = sum("leadsAssigned"), tt = sum("callsAttempted"),
          tc = sum("connected"),     ti = sum("interested"), tadm = sum("admissionsConverted");
    return {
      leadsAssigned: ta, callsAttempted: tt, connected: tc,
      notConnected: sum("notConnected"), interested: ti,
      followUps: sum("followUps"), visitPlanned: sum("visitPlanned"),
      admissionsConverted: tadm, branchTransfers: sum("branchTransfers"),
      connectionRate: tt > 0 ? +(tc * 100 / tt).toFixed(1) : 0,
      interestedRate: tc > 0 ? +(ti * 100 / tc).toFixed(1) : 0,
      admissionConversionRate: ta > 0 ? +(tadm * 100 / ta).toFixed(1) : 0,
    };
  }, [data]);

  const presets: Array<{ id: Preset; label: string }> = [
    { id: "today",      label: "Today" },
    { id: "yesterday",  label: "Yesterday" },
    { id: "this_week",  label: "This Week" },
    { id: "this_month", label: "This Month" },
    { id: "custom",     label: "Custom" },
  ];

  const dateLabel = from === to
    ? format(new Date(from), "dd MMM yyyy")
    : `${format(new Date(from), "dd MMM")} – ${format(new Date(to), "dd MMM yyyy")}`;

  return (
    <div className="space-y-5 max-w-5xl">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-emerald-600" />
            <h1 className="text-2xl font-semibold">Caller Performance</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{dateLabel}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── Date filter ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        {presets.map(p => (
          <button key={p.id} onClick={() => setPreset(p.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              preset === p.id ? "bg-emerald-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>
            {p.label}
          </button>
        ))}
        {preset === "custom" && (
          <div className="flex items-center gap-2 ml-2">
            <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-8 text-sm w-36" />
            <span className="text-muted-foreground text-sm">to</span>
            <Input type="date" value={customTo}   onChange={e => setCustomTo(e.target.value)}   className="h-8 text-sm w-36" />
          </div>
        )}
      </div>

      {/* ── Retry Pool cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {isLoading ? (
          [1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : (
          <>
            {[
              { label: "Active Callers",    value: data?.callers.length ?? 0,    icon: Users,       bg: "bg-blue-500" },
              { label: "Retry Pool Ready",  value: data?.retryPoolTotal ?? 0,     icon: PhoneMissed, bg: "bg-slate-500", sub: ">30 min" },
              { label: "Picked Today",      value: data?.retryPickedToday ?? 0,   icon: Phone,       bg: "bg-emerald-500", sub: "from pool" },
              { label: "Retry Pending",     value: data?.retryPending ?? 0,       icon: Clock,       bg: "bg-amber-500", sub: "<30 min" },
            ].map(({ label, value, icon: Icon, bg, sub }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
                <div className={`${bg} p-2 rounded-lg shrink-0`}><Icon className="size-4 text-white" /></div>
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
                  {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Totals bar ──────────────────────────────────────────────────────── */}
      {!isLoading && data && data.callers.length > 0 && (
        <TotalsBar totals={totals} count={data.callers.length} />
      )}

      {/* ── Caller cards ────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {isLoading && [1,2,3].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
        {!isLoading && data?.callers.length === 0 && (
          <Card className="p-12 text-center text-muted-foreground text-sm">No caller data for this period</Card>
        )}
        {!isLoading && data?.callers.map((row, i) => (
          <CallerCard key={row.callerId} row={row} from={from} to={to} rank={i + 1} />
        ))}
      </div>

      {/* ── Activity + Branch Transfer ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Activity className="size-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Recent Activity</h2>
            <span className="text-xs text-muted-foreground ml-auto">last 20</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {isLoading && [1,2,3,4].map(i => (
              <div key={i} className="px-4 py-3 flex gap-3">
                <Skeleton className="h-4 w-14 shrink-0" /><Skeleton className="h-4 flex-1" />
              </div>
            ))}
            {!isLoading && !data?.recentActivity?.length && (
              <p className="text-sm text-muted-foreground text-center py-8">No activity in this period</p>
            )}
            {!isLoading && data?.recentActivity?.map((a, i) => (
              <div key={i} className="px-4 py-2.5 flex items-start gap-3 hover:bg-gray-50/40">
                <span className="text-[11px] text-gray-400 whitespace-nowrap mt-0.5 w-14 shrink-0">{fmtTime(a.createdAt)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="font-medium text-gray-700 truncate">{a.callerName ?? "—"}</span>
                    <span className="text-gray-300">›</span>
                    <span className="text-gray-500 truncate">{a.leadName ?? "—"}</span>
                  </div>
                  <div className="mt-0.5"><ActionBadge type={a.actionType} /></div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <GitBranch className="size-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Branch Transfers</h2>
            <span className="text-xs text-muted-foreground ml-auto">last 20</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {isLoading && [1,2,3].map(i => (
              <div key={i} className="px-4 py-3"><Skeleton className="h-4 w-full mb-1" /><Skeleton className="h-3 w-32" /></div>
            ))}
            {!isLoading && !data?.branchTransfers?.length && (
              <p className="text-sm text-muted-foreground text-center py-8">No branch transfers in this period</p>
            )}
            {!isLoading && data?.branchTransfers?.map((t, i) => (
              <div key={i} className="px-4 py-3 hover:bg-gray-50/40">
                <p className="text-sm">
                  <span className="font-medium text-gray-900">{t.leadName ?? "—"}</span>
                  <span className="text-gray-300 mx-1.5">→</span>
                  <span className="text-violet-700 font-medium">{t.branchName ?? "Branch"}</span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  by <span className="font-medium text-gray-600">{t.callerName ?? "—"}</span>
                  {" · "}{fmtDateTime(t.transferredAt)}
                  {t.notes && <span className="ml-1 text-gray-300">· {t.notes}</span>}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

    </div>
  );
}

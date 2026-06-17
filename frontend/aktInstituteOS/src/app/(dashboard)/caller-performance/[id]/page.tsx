"use client";

import { use, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfWeek, startOfMonth } from "date-fns";
import {
  ArrowLeft, Phone, Mail, TrendingUp, Activity,
  GitBranch, PhoneMissed, Clock, RefreshCw, ExternalLink,
} from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { getCallerDetail } from "@/lib/api/dashboard.api";
import type { LeadStatus } from "@/types/lead";

// ── Date range helpers (same as summary page) ─────────────────────────────────

type Preset = "today" | "yesterday" | "this_week" | "this_month" | "custom";

function getRange(preset: Preset, customFrom: string, customTo: string) {
  const today = new Date();
  switch (preset) {
    case "today":
      return { from: format(today, "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
    case "yesterday": {
      const d = subDays(today, 1);
      return { from: format(d, "yyyy-MM-dd"), to: format(d, "yyyy-MM-dd") };
    }
    case "this_week":
      return { from: format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
    case "this_month":
      return { from: format(startOfMonth(today), "yyyy-MM-dd"), to: format(today, "yyyy-MM-dd") };
    case "custom":
      return { from: customFrom, to: customTo };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try { return format(new Date(iso), "dd MMM, hh:mm a"); } catch { return "—"; }
}

function fmtTime(iso?: string | null) {
  if (!iso) return "—";
  try { return format(new Date(iso), "hh:mm a"); } catch { return "—"; }
}

function MetricCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className={`rounded-xl p-4 ${color}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-0.5">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

function RateBadge({ value, thresholdGood, thresholdOk }: {
  value: number; thresholdGood: number; thresholdOk: number;
}) {
  const cls = value >= thresholdGood
    ? "bg-emerald-50 text-emerald-700"
    : value >= thresholdOk
    ? "bg-amber-50 text-amber-700"
    : "bg-red-50 text-red-600";
  return (
    <span className={`text-sm font-bold px-2 py-0.5 rounded ${cls}`}>
      {value.toFixed(1)}%
    </span>
  );
}

const STATUS_COLORS: Record<string, string> = {
  BOOKING_CONFIRMED:    "bg-emerald-500",
  INTERESTED:           "bg-teal-400",
  ADMISSION_INTERESTED: "bg-teal-300",
  FOLLOW_UP:            "bg-amber-400",
  CALLBACK:             "bg-orange-400",
  VISIT_PLANNED:        "bg-purple-400",
  CONTACTED:            "bg-cyan-400",
  NOT_CONNECTED:        "bg-slate-300",
  NOT_INTERESTED:       "bg-red-400",
  ASSIGNED:             "bg-blue-300",
  CLOSED:               "bg-gray-300",
};

const ACTION_LABELS: Record<string, { label: string; cls: string }> = {
  ASSIGNED:         { label: "Assigned",       cls: "bg-blue-50 text-blue-700" },
  REASSIGNED:       { label: "Reassigned",     cls: "bg-indigo-50 text-indigo-700" },
  NOT_CONNECTED:    { label: "Not Connected",  cls: "bg-slate-100 text-slate-600" },
  POOL_CLAIMED:     { label: "Pool Claimed",   cls: "bg-violet-50 text-violet-700" },
  BRANCH_TRANSFER:  { label: "Branch Transfer", cls: "bg-orange-50 text-orange-700" },
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CallerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const callerId = Number(id);
  const searchParams = useSearchParams();

  // Initialise from URL params passed by summary page
  const initFrom = searchParams.get("from") ?? format(new Date(), "yyyy-MM-dd");
  const initTo   = searchParams.get("to")   ?? format(new Date(), "yyyy-MM-dd");

  const [preset, setPreset]         = useState<Preset>("today");
  const [customFrom, setCustomFrom] = useState(initFrom);
  const [customTo,   setCustomTo]   = useState(initTo);

  const { from, to } = getRange(preset, customFrom, customTo);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["caller-detail", callerId, from, to],
    queryFn:  () => getCallerDetail(callerId, from, to),
    staleTime: 60_000,
    enabled: !!callerId,
  });

  const s = data?.stats;

  const presets: Array<{ id: Preset; label: string }> = [
    { id: "today",      label: "Today" },
    { id: "yesterday",  label: "Yesterday" },
    { id: "this_week",  label: "This Week" },
    { id: "this_month", label: "This Month" },
    { id: "custom",     label: "Custom" },
  ];

  return (
    <div className="space-y-6 max-w-6xl">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 flex-wrap">
        <Link href="/caller-performance">
          <Button variant="ghost" size="icon-sm"><ArrowLeft className="size-4" /></Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isLoading
              ? <Skeleton className="h-7 w-48" />
              : <h1 className="text-2xl font-semibold">{data?.callerName ?? "Caller"}</h1>
            }
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
            {data?.callerPhone && (
              <span className="flex items-center gap-1"><Phone className="size-3.5" />{data.callerPhone}</span>
            )}
            {data?.callerEmail && (
              <span className="flex items-center gap-1"><Mail className="size-3.5" />{data.callerEmail}</span>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── Date filter ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 items-center">
        {presets.map(p => (
          <button
            key={p.id}
            onClick={() => setPreset(p.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              preset === p.id
                ? "bg-emerald-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
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

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Leads Assigned"  value={s?.leadsAssigned ?? 0}  color="bg-blue-50 text-blue-900" />
          <MetricCard label="Calls Attempted" value={s?.callsAttempted ?? 0} color="bg-slate-50 text-slate-900" />
          <MetricCard label="Connected"        value={s?.connected ?? 0}      color="bg-teal-50 text-teal-900" />
          <MetricCard label="Not Connected"    value={s?.notConnected ?? 0}   color="bg-slate-50 text-slate-600" />
        </div>
      )}

      {/* ── Productivity rates ─────────────────────────────────────────────── */}
      {!isLoading && s && (
        <Card className="p-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Productivity Metrics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Connection Rate</p>
              <RateBadge value={s.connectionRate} thresholdGood={60} thresholdOk={40} />
              <p className="text-[10px] text-muted-foreground">{s.connected} / {s.callsAttempted} attempted</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Interested Rate</p>
              <RateBadge value={s.interestedRate} thresholdGood={40} thresholdOk={20} />
              <p className="text-[10px] text-muted-foreground">{s.interested} / {s.connected} connected</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Admission Rate</p>
              <RateBadge value={s.admissionConversionRate} thresholdGood={10} thresholdOk={5} />
              <p className="text-[10px] text-muted-foreground">{s.admissionsConverted} / {s.leadsAssigned} assigned</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Last Active</p>
              <p className="text-sm font-semibold text-gray-800">{fmtDateTime(s.lastActivityAt)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* ── Status breakdown ───────────────────────────────────────────────── */}
      {!isLoading && data?.statusBreakdown && data.statusBreakdown.length > 0 && (
        <Card className="p-5">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Lead Status Breakdown</h2>
          <div className="flex flex-wrap gap-3">
            {data.statusBreakdown.map(sb => (
              <div key={sb.status} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <div className={`size-2.5 rounded-full shrink-0 ${STATUS_COLORS[sb.status] ?? "bg-gray-300"}`} />
                <span className="text-xs text-gray-600">{sb.status.replace(/_/g, " ")}</span>
                <span className="text-xs font-bold text-gray-900">{sb.count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Main two-column grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Leads */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Phone className="size-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Recent Leads</h2>
            <span className="text-xs text-muted-foreground ml-auto">last 30</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {isLoading && [1,2,3,4].map(i => (
              <div key={i} className="px-4 py-3"><Skeleton className="h-4 w-full mb-1" /><Skeleton className="h-3 w-32" /></div>
            ))}
            {!isLoading && !data?.recentLeads?.length && (
              <p className="text-sm text-muted-foreground text-center py-8">No leads in this period</p>
            )}
            {!isLoading && data?.recentLeads?.map(lead => (
              <div key={lead.leadId} className="px-4 py-3 hover:bg-gray-50/50 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 truncate">{lead.leadName || lead.phone}</span>
                    <LeadStatusBadge status={lead.status as LeadStatus} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{lead.phone}</span>
                    {lead.courseInterested && <span>· {lead.courseInterested}</span>}
                    {lead.lastActivityAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />{fmtDateTime(lead.lastActivityAt)}
                      </span>
                    )}
                  </div>
                </div>
                <Link href={`/leads/${lead.leadId}`} className="shrink-0 text-gray-400 hover:text-emerald-600 transition-colors">
                  <ExternalLink className="size-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </Card>

        {/* Activity Timeline */}
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Activity className="size-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Activity Timeline</h2>
            <span className="text-xs text-muted-foreground ml-auto">last 30 actions</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {isLoading && [1,2,3,4].map(i => (
              <div key={i} className="px-4 py-3 flex gap-3"><Skeleton className="h-4 w-14 shrink-0" /><Skeleton className="h-4 flex-1" /></div>
            ))}
            {!isLoading && !data?.activities?.length && (
              <p className="text-sm text-muted-foreground text-center py-8">No activity in this period</p>
            )}
            {!isLoading && data?.activities?.map((a, i) => (
              <div key={i} className="px-4 py-2.5 flex items-start gap-3 hover:bg-gray-50/50">
                <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5 w-14 shrink-0">
                  {fmtTime(a.createdAt)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <ActionBadge type={a.actionType} />
                    <span className="text-xs text-gray-600 truncate">{a.leadName ?? "—"}</span>
                  </div>
                  {a.description && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{a.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Branch Transfers ───────────────────────────────────────────────── */}
      {!isLoading && !!data?.branchTransfers?.length && (
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <GitBranch className="size-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Branch Transfers</h2>
            <span className="text-xs text-muted-foreground ml-auto">{data.branchTransfers.length} transfers</span>
          </div>
          <div className="divide-y divide-gray-50">
            {data.branchTransfers.map((t, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-3 hover:bg-gray-50/50">
                <PhoneMissed className="size-4 text-orange-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">{t.leadName ?? "—"}</span>
                    <span className="text-gray-400 mx-1">→</span>
                    <span className="text-violet-700 font-medium">{t.branchName ?? "Branch"}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fmtDateTime(t.transferredAt)}
                    {t.notes && <span className="ml-1 text-gray-400">· {t.notes}</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

    </div>
  );
}

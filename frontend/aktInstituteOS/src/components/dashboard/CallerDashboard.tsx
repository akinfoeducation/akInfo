"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Phone, Star, Repeat2, CheckCircle2, Clock,
  AlertTriangle, CreditCard, UserCheck, ArrowRight,
  CalendarDays, X,
} from "lucide-react";
import { format, subDays, startOfMonth } from "date-fns";
import { getCallerDashboard } from "@/lib/api/dashboard.api";
import { listPendingFollowUps } from "@/lib/api/leads.api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ── Quick preset ranges ───────────────────────────────────────────────────────

const PRESETS = [
  { label: "Today",      from: () => format(new Date(), "yyyy-MM-dd"),           to: () => format(new Date(), "yyyy-MM-dd") },
  { label: "Last 7 days",from: () => format(subDays(new Date(), 6), "yyyy-MM-dd"),to: () => format(new Date(), "yyyy-MM-dd") },
  { label: "This month", from: () => format(startOfMonth(new Date()), "yyyy-MM-dd"), to: () => format(new Date(), "yyyy-MM-dd") },
  { label: "All time",   from: () => "",                                           to: () => "" },
];

// ── Stat tile ─────────────────────────────────────────────────────────────────

interface TileProps {
  label: string;
  value: number | undefined;
  icon: React.ReactNode;
  href: string;
  color: "blue" | "amber" | "green" | "red" | "violet" | "yellow" | "lime" | "default";
  loading?: boolean;
}

const COLOR_MAP = {
  blue:    "bg-blue-50   border-blue-200   text-blue-700",
  amber:   "bg-amber-50  border-amber-200  text-amber-700",
  green:   "bg-emerald-50 border-emerald-200 text-emerald-700",
  red:     "bg-red-50    border-red-200    text-red-700",
  violet:  "bg-violet-50 border-violet-200 text-violet-700",
  yellow:  "bg-yellow-50 border-yellow-200 text-yellow-700",
  lime:    "bg-lime-50   border-lime-200   text-lime-700",
  default: "bg-white     border-gray-200   text-gray-800",
};

function Tile({ label, value, icon, href, color, loading }: TileProps) {
  const cls = COLOR_MAP[color];
  return (
    <Link href={href}>
      <Card className={`p-5 border flex items-center gap-4 ${cls} hover:shadow-md transition-shadow cursor-pointer`}>
        <div className="shrink-0 opacity-70">{icon}</div>
        <div className="flex-1 min-w-0">
          {loading ? (
            <>
              <Skeleton className="h-7 w-12 mb-1" />
              <Skeleton className="h-3 w-28" />
            </>
          ) : (
            <>
              <p className="text-2xl font-bold leading-none">{value ?? 0}</p>
              <p className="text-xs mt-1 opacity-80 font-medium leading-tight">{label}</p>
            </>
          )}
        </div>
        <ArrowRight className="size-4 opacity-40 shrink-0" />
      </Card>
    </Link>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CallerDashboard() {
  const router = useRouter();
  const today = format(new Date(), "yyyy-MM-dd");
  const [from, setFrom] = useState(today);
  const [to, setTo]     = useState(today);
  const [activePreset, setActivePreset] = useState("Today");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard", "caller", from, to],
    queryFn:  () => getCallerDashboard(from || undefined, to || undefined),
    refetchInterval: 60_000,
  });

  const { data: pendingFollowUps = [], isLoading: loadingFU } = useQuery({
    queryKey: ["follow-ups", "pending"],
    queryFn:  listPendingFollowUps,
    refetchInterval: 60_000,
  });

  function applyPreset(preset: typeof PRESETS[number]) {
    setFrom(preset.from());
    setTo(preset.to());
    setActivePreset(preset.label);
  }

  function clearDates() {
    setFrom(""); setTo(""); setActivePreset("All time");
  }

  // Build URL for tile links, carrying date range so leads list can pick them up
  function tileHref(status: string) {
    const params = new URLSearchParams({ status });
    if (from) params.set("from", from);
    if (to)   params.set("to", to);
    return `/leads?${params.toString()}`;
  }

  const hasDateFilter = from || to;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(new Date(), "EEEE, dd MMMM yyyy")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/leads")}>
          <Phone className="size-3.5" /> My Leads
        </Button>
      </div>

      {/* Date filter */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarDays className="size-4" />
          Filter by assigned date
        </div>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                activePreset === p.label
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={from}
              onChange={e => { setFrom(e.target.value); setActivePreset("Custom"); }}
              className="w-40 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={to}
              onChange={e => { setTo(e.target.value); setActivePreset("Custom"); }}
              className="w-40 text-sm"
            />
          </div>
          {hasDateFilter && (
            <Button variant="ghost" size="sm" onClick={clearDates} className="text-muted-foreground gap-1">
              <X className="size-3.5" /> Clear
            </Button>
          )}
        </div>

        {hasDateFilter && (
          <p className="text-xs text-emerald-700 font-medium">
            Showing leads assigned{from ? ` from ${format(new Date(from), "dd MMM yyyy")}` : ""}{to ? ` to ${format(new Date(to), "dd MMM yyyy")}` : ""}
          </p>
        )}
      </Card>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tile label="Assigned Leads"       value={stats?.assignedLeads}       icon={<Phone className="size-6" />}        href={tileHref("ASSIGNED")}             color="blue"    loading={isLoading} />
        <Tile label="Today's Follow-ups"   value={stats?.todayFollowUps}      icon={<Clock className="size-6" />}        href="/leads?status=FOLLOW_UP"          color={stats?.todayFollowUps ? "amber" : "default"} loading={isLoading} />
        <Tile label="Interested Leads"     value={stats?.interestedLeads}     icon={<Star className="size-6" />}         href={tileHref("INTERESTED")}           color="green"   loading={isLoading} />
        <Tile label="Pending Callbacks"    value={stats?.pendingCallbacks}    icon={<Repeat2 className="size-6" />}      href={tileHref("CALLBACK")}             color={stats?.pendingCallbacks ? "amber" : "default"} loading={isLoading} />
        <Tile label="Admission Interested" value={stats?.admissionInterested} icon={<UserCheck className="size-6" />}   href={tileHref("ADMISSION_INTERESTED")} color="violet"  loading={isLoading} />
        <Tile label="Payment Pending"      value={stats?.paymentPending}      icon={<CreditCard className="size-6" />}  href={tileHref("PAYMENT_PENDING")}      color={stats?.paymentPending ? "yellow" : "default"} loading={isLoading} />
        <Tile label="Booking Confirmed"    value={stats?.bookingConfirmed}    icon={<CheckCircle2 className="size-6" />} href={tileHref("BOOKING_CONFIRMED")}   color="lime"    loading={isLoading} />
        <Tile label="Overdue Follow-ups"   value={stats?.overdueFollowUps}    icon={<AlertTriangle className="size-6" />} href="/leads?status=FOLLOW_UP"        color={stats?.overdueFollowUps ? "red" : "default"} loading={isLoading} />
      </div>

      {/* Pending follow-ups list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Pending Follow-ups</h2>
          <Link href="/leads">
            <Button variant="ghost" size="sm" className="text-emerald-700">
              View all leads <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        {loadingFU ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : pendingFollowUps.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground text-sm">
            No pending follow-ups — great work! 🎉
          </Card>
        ) : (
          <div className="space-y-2">
            {pendingFollowUps.slice(0, 10).map((fu) => {
              const isOverdue = new Date(fu.scheduledAt) < new Date();
              return (
                <Card
                  key={fu.id}
                  className={`p-4 flex items-center gap-3 ${isOverdue ? "border-red-200 bg-red-50" : "bg-white"}`}
                >
                  <Clock className={`size-4 shrink-0 ${isOverdue ? "text-red-500" : "text-amber-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {format(new Date(fu.scheduledAt), "dd MMM yyyy 'at' hh:mm a")}
                      {isOverdue && (
                        <span className="ml-2 text-xs text-red-600 font-semibold">OVERDUE</span>
                      )}
                    </p>
                    {fu.remarks && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{fu.remarks}</p>
                    )}
                  </div>
                  <Link href={`/leads/${fu.leadId}`}>
                    <Button size="sm" variant="outline" className="shrink-0 text-xs">View Lead</Button>
                  </Link>
                </Card>
              );
            })}
            {pendingFollowUps.length > 10 && (
              <p className="text-xs text-center text-muted-foreground pt-1">
                +{pendingFollowUps.length - 10} more — <Link href="/leads" className="text-emerald-600 hover:underline">view all in leads</Link>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

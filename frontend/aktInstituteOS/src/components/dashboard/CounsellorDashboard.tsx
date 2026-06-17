"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Clock, CheckCircle2, AlertTriangle, FileText,
  IndianRupee, Wifi, MapPin, UserCheck, CalendarDays,
  Loader2, TrendingUp, AlertCircle,
} from "lucide-react";
import { getCounsellorDashboard, type CounsellorDashboard as CounsellorDashboardData } from "@/lib/api/dashboard.api";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/lib/stores/auth.store";

// ── Helpers ───────────────────────────────────────────────────────────────────

function inr(n: number) {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

type TileColor = "blue" | "amber" | "green" | "red" | "violet" | "yellow" | "indigo" | "orange" | "teal" | "default";

const COLOR_MAP: Record<TileColor, string> = {
  blue:    "bg-blue-50   border-blue-200   text-blue-700",
  amber:   "bg-amber-50  border-amber-200  text-amber-700",
  green:   "bg-emerald-50 border-emerald-200 text-emerald-700",
  red:     "bg-red-50    border-red-200    text-red-700",
  violet:  "bg-violet-50 border-violet-200 text-violet-700",
  yellow:  "bg-yellow-50 border-yellow-200 text-yellow-700",
  indigo:  "bg-indigo-50 border-indigo-200 text-indigo-700",
  orange:  "bg-orange-50 border-orange-200 text-orange-700",
  teal:    "bg-teal-50   border-teal-200   text-teal-700",
  default: "bg-white     border-gray-200   text-gray-800",
};

interface TileProps {
  label: string;
  value: number | string | undefined;
  icon: React.ReactNode;
  href?: string;
  color: TileColor;
  loading?: boolean;
  sub?: string;
}

function Tile({ label, value, icon, href, color, loading, sub }: TileProps) {
  const cls = COLOR_MAP[color];
  const inner = (
    <Card className={`p-5 border flex items-start gap-4 ${cls} ${href ? "hover:shadow-md cursor-pointer transition-shadow" : ""}`}>
      <div className="shrink-0 opacity-70 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        {loading ? (
          <>
            <Skeleton className="h-6 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </>
        ) : (
          <>
            <p className="text-2xl font-bold leading-none">{value ?? "—"}</p>
            <p className="text-xs opacity-75 mt-1 leading-tight">{label}</p>
            {sub && <p className="text-[10px] opacity-60 mt-0.5">{sub}</p>}
          </>
        )}
      </div>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ── Section heading ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      {children}
    </div>
  );
}

// ── Mode pill ─────────────────────────────────────────────────────────────────

function ModePill({ mode, count, loading }: { mode: "ONLINE" | "OFFLINE"; count: number; loading?: boolean }) {
  const isOnline = mode === "ONLINE";
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 ${isOnline ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
      {isOnline ? <Wifi className="size-4 shrink-0" /> : <MapPin className="size-4 shrink-0" />}
      <div>
        {loading ? <Skeleton className="h-5 w-8 mb-0.5" /> : (
          <p className="text-lg font-bold leading-none">{count}</p>
        )}
        <p className="text-xs opacity-75 mt-0.5">{isOnline ? "Online" : "Offline"} active</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CounsellorDashboard() {
  const user = useAuthStore(s => s.user);

  const { data, isLoading } = useQuery<CounsellorDashboardData>({
    queryKey: ["counsellor-dashboard"],
    queryFn: () => getCounsellorDashboard(),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const d = data;
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="space-y-7 max-w-[1200px]">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            My Dashboard, {user?.firstName ?? "Counsellor"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{today}</p>
        </div>
        {d && d.todayFollowUps > 0 && (
          <Link
            href="/leads?status=FOLLOW_UP_AFTER_VISIT"
            className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-3.5 py-2 text-sm font-medium hover:bg-amber-100 transition-colors"
          >
            <CalendarDays className="size-4" />
            {d.todayFollowUps} follow-up{d.todayFollowUps !== 1 ? "s" : ""} due today
          </Link>
        )}
        {d && d.overdueFollowUps > 0 && (
          <Link
            href="/leads"
            className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-3.5 py-2 text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <AlertCircle className="size-4" />
            {d.overdueFollowUps} overdue follow-up{d.overdueFollowUps !== 1 ? "s" : ""}
          </Link>
        )}
      </div>

      {/* ── Top KPI row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile
          label="My Active Leads"
          value={d?.myActiveLeads}
          icon={<Users className="size-5" />}
          href="/leads"
          color="blue"
          loading={isLoading}
        />
        <Tile
          label="Today's Follow-ups"
          value={d?.todayFollowUps}
          icon={<CalendarDays className="size-5" />}
          href="/leads?status=FOLLOW_UP_AFTER_VISIT"
          color={d && d.todayFollowUps > 0 ? "amber" : "default"}
          loading={isLoading}
        />
        <Tile
          label="Admissions This Month"
          value={d?.admissionsDoneThisMonth}
          icon={<CheckCircle2 className="size-5" />}
          href="/admissions"
          color="green"
          loading={isLoading}
          sub={d ? `${d.admissionsDoneAllTime} all time` : undefined}
        />
        <Tile
          label="Revenue This Month"
          value={d ? inr(d.revenueThisMonth) : undefined}
          icon={<IndianRupee className="size-5" />}
          color="teal"
          loading={isLoading}
          sub={d && d.feesOutstanding > 0 ? `${inr(d.feesOutstanding)} outstanding` : undefined}
        />
      </div>

      {/* ── Lead pipeline ───────────────────────────────────────────────── */}
      <Section title="Lead Pipeline">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
          <Tile
            label="Newly Assigned"
            value={d?.newlyAssigned}
            icon={<UserCheck className="size-5" />}
            href="/leads?status=VISIT_DONE"
            color={d && d.newlyAssigned > 0 ? "indigo" : "default"}
            loading={isLoading}
            sub="Last 48 hours"
          />
          <Tile
            label="Follow-up After Visit"
            value={d?.followUpAfterVisit}
            icon={<Clock className="size-5" />}
            href="/leads?status=FOLLOW_UP_AFTER_VISIT"
            color="amber"
            loading={isLoading}
          />
          <Tile
            label="Negotiation"
            value={d?.negotiation}
            icon={<TrendingUp className="size-5" />}
            href="/leads?status=NEGOTIATION"
            color="violet"
            loading={isLoading}
          />
          <Tile
            label="Payment Pending"
            value={d?.paymentPending}
            icon={<AlertTriangle className="size-5" />}
            href="/leads?status=PAYMENT_PENDING"
            color="yellow"
            loading={isLoading}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Tile
            label="Booking Confirmed"
            value={d?.bookingConfirmed}
            icon={<CheckCircle2 className="size-5" />}
            href="/leads?status=BOOKING_CONFIRMED"
            color="green"
            loading={isLoading}
          />
          <Tile
            label="Document Pending"
            value={d?.documentPending}
            icon={<FileText className="size-5" />}
            href="/leads?status=DOCUMENT_PENDING"
            color="orange"
            loading={isLoading}
          />
          <Tile
            label="Admission In Progress"
            value={d?.admissionInProgress}
            icon={<Loader2 className="size-5" />}
            href="/leads?status=ADMISSION_IN_PROGRESS"
            color="indigo"
            loading={isLoading}
          />
          <Tile
            label="Pending Admissions"
            value={d?.pendingAdmissions}
            icon={<AlertTriangle className="size-5" />}
            href="/admissions"
            color={d && d.pendingAdmissions > 0 ? "red" : "default"}
            loading={isLoading}
          />
        </div>
      </Section>

      {/* ── Online vs Offline split ──────────────────────────────────────── */}
      <Section title="Delivery Mode Breakdown">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ModePill mode="ONLINE"  count={d?.onlineLeadsActive  ?? 0} loading={isLoading} />
          <ModePill mode="OFFLINE" count={d?.offlineLeadsActive ?? 0} loading={isLoading} />
          <div className="flex items-center gap-2 rounded-xl border px-4 py-3 bg-blue-50 border-blue-200 text-blue-700">
            <Wifi className="size-4 shrink-0" />
            <div>
              {isLoading ? <Skeleton className="h-5 w-8 mb-0.5" /> : (
                <p className="text-lg font-bold leading-none">{d?.onlineAdmissionsThisMonth ?? 0}</p>
              )}
              <p className="text-xs opacity-75 mt-0.5">Online admissions (month)</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border px-4 py-3 bg-emerald-50 border-emerald-200 text-emerald-700">
            <MapPin className="size-4 shrink-0" />
            <div>
              {isLoading ? <Skeleton className="h-5 w-8 mb-0.5" /> : (
                <p className="text-lg font-bold leading-none">{d?.offlineAdmissionsThisMonth ?? 0}</p>
              )}
              <p className="text-xs opacity-75 mt-0.5">Offline admissions (month)</p>
            </div>
          </div>
        </div>
      </Section>

    </div>
  );
}

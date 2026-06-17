"use client";

import { useQuery } from "@tanstack/react-query";
import { format }   from "date-fns";
import Link         from "next/link";
import {
  BookOpen, Users, Video, AlertCircle,
  CheckCircle2, Clock, BarChart2, ArrowUpRight,
  IndianRupee, CalendarDays, TrendingUp, UserCheck,
} from "lucide-react";
import { Skeleton }          from "@/components/ui/skeleton";
import { getFacultyDashboard, type FacultyRecentSession } from "@/lib/api/dashboard.api";
import { useAuthStore }      from "@/lib/stores/auth.store";

// ── Helpers ────────────────────────────────────────────────────────────────

function inr(n: number) {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  try { return format(new Date(s), "dd MMM yyyy"); } catch { return s ?? "—"; }
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

// ── Summary card ───────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, accentBg, accentIcon, href, loading, highlight,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accentBg: string; accentIcon: string;
  href?: string; loading?: boolean; highlight?: boolean;
}) {
  const base = `bg-white rounded-2xl border p-5 flex flex-col gap-3 transition-all duration-200 ${
    highlight ? "border-amber-200 bg-amber-50/30" : "border-gray-200"
  } ${href ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : ""}`;

  const inner = (
    <div className={base}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={`size-9 rounded-xl flex items-center justify-center ${accentBg}`}>
          <Icon className={`size-4 ${accentIcon}`} />
        </div>
      </div>
      {loading ? (
        <><Skeleton className="h-7 w-20" /><Skeleton className="h-3 w-28" /></>
      ) : (
        <>
          <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </>
      )}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ── Section heading ────────────────────────────────────────────────────────

function Section({ title, sub, action, children }: {
  title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function ViewAll({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center gap-0.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
      View all <ArrowUpRight className="size-3" />
    </Link>
  );
}

// ── Session status colours ─────────────────────────────────────────────────

const SESSION_COLOR: Record<string, string> = {
  SCHEDULED:   "bg-blue-50 text-blue-700",
  COMPLETED:   "bg-emerald-50 text-emerald-700",
  CANCELLED:   "bg-red-50 text-red-700",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
};

function SessionRow({ s }: { s: FacultyRecentSession }) {
  return (
    <Link href={`/sessions/${s.id}`}
      className="flex items-center gap-3 hover:bg-gray-50 rounded-xl p-2 -mx-2 transition-colors group">
      <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
        s.attendanceMarked ? "bg-emerald-50" : "bg-amber-50"}`}>
        {s.attendanceMarked
          ? <CheckCircle2 className="size-4 text-emerald-600" />
          : <Clock className="size-4 text-amber-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {s.subject ?? "Class"}{s.batchName ? ` — ${s.batchName}` : ""}
        </p>
        <p className="text-xs text-muted-foreground">{fmtDate(s.sessionDate)}</p>
      </div>
      <div className="text-right shrink-0 space-y-0.5">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${SESSION_COLOR[s.status] ?? "bg-gray-100 text-gray-600"}`}>
          {s.status}
        </span>
        {s.totalStudents > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {s.presentCount}/{s.totalStudents}
          </p>
        )}
      </div>
    </Link>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function FacultyDashboard() {
  const user  = useAuthStore(s => s.user);
  const today = format(new Date(), "EEEE, d MMMM yyyy");

  const { data: dash, isLoading } = useQuery({
    queryKey: ["faculty-dashboard"],
    queryFn:  getFacultyDashboard,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const attPct      = dash?.avgAttendancePercent ?? 0;
  const attColor    = attPct >= 75 ? "text-emerald-600" : attPct >= 60 ? "text-amber-600" : "text-red-600";
  const pendingFees = dash?.totalPendingFees ?? 0;

  return (
    <div className="space-y-7 max-w-[1200px]">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Good {getGreeting()}, {user?.firstName ?? "Faculty"} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{today}</p>
        </div>
        {dash && dash.sessionsWithAttendancePending > 0 && (
          <Link href="/sessions"
            className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-3.5 py-2 text-sm font-medium hover:bg-amber-100 transition-colors shrink-0">
            <AlertCircle className="size-4" />
            {dash.sessionsWithAttendancePending} session{dash.sessionsWithAttendancePending !== 1 ? "s" : ""} pending attendance
          </Link>
        )}
      </div>

      {/* ── Academic Overview (primary, aggregate) ── */}
      <Section title="Academic Overview" sub="Aggregate summary across all your assigned batches">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Assigned Batches"
            value={isLoading ? "—" : dash?.assignedBatches ?? 0}
            sub={isLoading ? undefined : `${dash?.activeBatches ?? 0} active · ${dash?.plannedBatches ?? 0} planned`}
            icon={BookOpen} accentBg="bg-emerald-50" accentIcon="text-emerald-600" href="/batches" loading={isLoading} />

          <StatCard label="Total Students"
            value={isLoading ? "—" : dash?.totalAssignedStudents ?? 0}
            sub={isLoading ? undefined : `${dash?.activeStudents ?? 0} active`}
            icon={Users} accentBg="bg-indigo-50" accentIcon="text-indigo-600" href="/students" loading={isLoading} />

          <StatCard label="Active Students"
            value={isLoading ? "—" : dash?.activeStudents ?? 0}
            sub="Currently enrolled"
            icon={UserCheck} accentBg="bg-blue-50" accentIcon="text-blue-600" href="/students" loading={isLoading} />

          <StatCard label="Sessions Conducted"
            value={isLoading ? "—" : dash?.totalSessionsConducted ?? 0}
            sub={isLoading ? undefined : `${dash?.sessionsWithAttendancePending ?? 0} need marking`}
            icon={Video} accentBg="bg-violet-50" accentIcon="text-violet-600" href="/sessions" loading={isLoading} />

          <StatCard label="Avg Attendance"
            value={isLoading ? "—" : `${attPct.toFixed(0)}%`}
            sub="Across all sessions"
            icon={BarChart2} accentBg="bg-rose-50" accentIcon="text-rose-600" loading={isLoading} />

          <StatCard label="Pending Fees"
            value={isLoading ? "—" : inr(pendingFees)}
            sub={isLoading ? undefined : `${dash?.overdueStudents ?? 0} student${(dash?.overdueStudents ?? 0) !== 1 ? "s" : ""} overdue`}
            icon={IndianRupee} accentBg="bg-amber-50" accentIcon="text-amber-600"
            highlight={(dash?.overdueStudents ?? 0) > 0} href="/faculty/fees?type=pending" loading={isLoading} />
        </div>
      </Section>

      {/* ── Fee & Student summary row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Fee summary card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Fee Summary</p>
              <p className="text-xs text-muted-foreground mt-0.5">Read-only · Your assigned batch students</p>
            </div>
            <IndianRupee className="size-4 text-amber-500" />
          </div>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Clickable: Fees Collected → /faculty/fees?type=collected */}
              <Link href="/faculty/fees?type=collected"
                className="flex items-center justify-between bg-emerald-50 hover:bg-emerald-100 rounded-xl px-4 py-3 transition-colors group">
                <div>
                  <p className="text-sm text-gray-700 group-hover:text-emerald-800">Fees Collected</p>
                  <p className="text-xs text-muted-foreground">Click to view details →</p>
                </div>
                <p className="text-lg font-bold text-emerald-700">{inr(dash?.totalFeesCollected ?? 0)}</p>
              </Link>
              {/* Clickable: Pending Fees → /faculty/fees?type=pending */}
              <Link href="/faculty/fees?type=pending"
                className={`flex items-center justify-between rounded-xl px-4 py-3 transition-colors group ${(dash?.overdueStudents ?? 0) > 0 ? "bg-amber-50 hover:bg-amber-100" : "bg-gray-50 hover:bg-gray-100"}`}>
                <div>
                  <p className={`text-sm group-hover:text-amber-900 ${(dash?.overdueStudents ?? 0) > 0 ? "text-gray-700" : "text-gray-500"}`}>Pending Fees</p>
                  <p className="text-xs text-muted-foreground">{dash?.overdueStudents ?? 0} students with dues · View details →</p>
                </div>
                <p className={`text-lg font-bold ${(dash?.overdueStudents ?? 0) > 0 ? "text-amber-700" : "text-gray-500"}`}>
                  {inr(dash?.totalPendingFees ?? 0)}
                </p>
              </Link>
            </div>
          )}
        </div>

        {/* Attendance & sessions card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Attendance & Sessions</p>
              <p className="text-xs text-muted-foreground mt-0.5">Overall across all your batches</p>
            </div>
            <BarChart2 className="size-4 text-violet-500" />
          </div>
          {isLoading ? (
            <div className="space-y-3"><Skeleton className="h-10 rounded-xl" /><Skeleton className="h-10 rounded-xl" /></div>
          ) : (
            <div className="space-y-3">
              {/* Attendance bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Overall Attendance</span>
                  <span className={`font-bold ${attColor}`}>{attPct.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${attPct >= 75 ? "bg-emerald-500" : attPct >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${Math.min(attPct, 100)}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { label: "Total Sessions", value: dash?.totalSessionsConducted ?? 0, color: "text-gray-700" },
                  { label: "Today",          value: dash?.todaySessions ?? 0,           color: "text-blue-600" },
                  { label: "This Week",      value: dash?.thisWeekSessions ?? 0,        color: "text-violet-600" },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <Section title="Quick Actions">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "My Schedule",     href: "/schedule",  bg: "bg-blue-50 text-blue-600",     icon: CalendarDays },
            { label: "Class Sessions",  href: "/sessions",  bg: "bg-violet-50 text-violet-600",  icon: Video },
            { label: "My Students",     href: "/students",  bg: "bg-indigo-50 text-indigo-600",  icon: Users },
            { label: "Study Materials", href: "/materials", bg: "bg-emerald-50 text-emerald-600", icon: BookOpen },
          ].map(({ label, href, bg, icon: Icon }) => (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-200 bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
              <div className={`size-10 rounded-xl flex items-center justify-center ${bg}`}>
                <Icon className="size-5" />
              </div>
              <span className="text-xs font-medium text-gray-700 text-center">{label}</span>
            </Link>
          ))}
        </div>
      </Section>

      {/* ── Recent Sessions ── */}
      <Section
        title="Recent Sessions"
        sub="Your latest class activity"
        action={<ViewAll href="/sessions" />}
      >
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="space-y-1">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)
              : (dash?.recentSessions ?? []).length === 0
                ? <p className="text-xs text-muted-foreground py-8 text-center">No sessions recorded yet.</p>
                : dash!.recentSessions.map(s => <SessionRow key={s.id} s={s} />)}
          </div>
        </div>
      </Section>

    </div>
  );
}

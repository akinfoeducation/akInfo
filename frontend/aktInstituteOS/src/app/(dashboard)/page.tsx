"use client";

import { useQuery }     from "@tanstack/react-query";
import { format }       from "date-fns";
import Link             from "next/link";
import {
  Users, UserCheck, BookOpen, IndianRupee, AlertCircle,
  PhoneCall, Plus, ReceiptText, Layers, ArrowUpRight,
  TrendingUp, Wallet,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

import { getDashboardSummary, getDashboardRecent } from "@/lib/api/dashboard.api";
import { getRevenueTrend, getAdmissionsTrend }     from "@/lib/api/reports.api";
import { useAuthStore }       from "@/lib/stores/auth.store";
import { Skeleton }           from "@/components/ui/skeleton";
import FacultyDashboard       from "@/components/dashboard/FacultyDashboard";
import CallerDashboard        from "@/components/dashboard/CallerDashboard";
import CounsellorDashboard    from "@/components/dashboard/CounsellorDashboard";
import AccountantDashboard    from "@/components/dashboard/AccountantDashboard";

// ── Helpers ───────────────────────────────────────────────────────────────

function inr(n: number) {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  try { return format(new Date(s), "dd MMM, h:mm a"); } catch { return "—"; }
}

function fmtShort(s: string | null | undefined) {
  if (!s) return "—";
  try { return format(new Date(s), "dd MMM yyyy"); } catch { return "—"; }
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  DOCUMENTS_PENDING: "bg-amber-100 text-amber-700",
  ENROLLED: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-teal-100 text-teal-700",
  CANCELLED: "bg-red-100 text-red-600",
  NEW: "bg-gray-100 text-gray-600",
  CONTACTED: "bg-blue-100 text-blue-700",
  FOLLOW_UP: "bg-violet-100 text-violet-700",
  DEMO_SCHEDULED: "bg-indigo-100 text-indigo-700",
  NEGOTIATION: "bg-amber-100 text-amber-700",
  CONVERTED: "bg-emerald-100 text-emerald-700",
  LOST: "bg-red-100 text-red-600",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700", "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700", "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",     "bg-cyan-100 text-cyan-700",
];

function Avatar({ name, idx }: { name: string; idx: number }) {
  return (
    <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}`}>
      {initials(name)}
    </div>
  );
}

// ── Summary card ──────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accentBg: string;
  accentIcon: string;
  href?: string;
  loading?: boolean;
}

function SummaryCard({ label, value, sub, icon: Icon, accentBg, accentIcon, href, loading }: SummaryCardProps) {
  const inner = (
    <div className={`bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-md transition-all duration-200 ${href ? "cursor-pointer hover:-translate-y-0.5" : ""}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={`size-9 rounded-xl flex items-center justify-center ${accentBg}`}>
          <Icon className={`size-4 ${accentIcon}`} />
        </div>
      </div>
      {loading ? (
        <>
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-28" />
        </>
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

// ── Quick action button ───────────────────────────────────────────────────

function QuickAction({ label, icon: Icon, href, color }: {
  label: string; icon: React.ElementType; href: string; color: string;
}) {
  return (
    <Link href={href}
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-200 bg-white hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group`}>
      <div className={`size-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="size-5" />
      </div>
      <span className="text-xs font-medium text-gray-700 text-center leading-tight">{label}</span>
    </Link>
  );
}

// ── Section heading ───────────────────────────────────────────────────────

function SectionHeading({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-gray-800">{children}</h2>
      {action}
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

// ── Chart tooltip ─────────────────────────────────────────────────────────

function ChartTip({ active, payload, label, money = false }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string | number;
  money?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2.5 text-xs">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map(item => (
        <div key={item.name} className="flex items-center gap-2 py-0.5">
          <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
          <span className="text-gray-500 flex-1">{item.name}</span>
          <span className="font-semibold text-gray-800">{money ? inr(item.value) : item.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const user = useAuthStore(s => s.user);
  const roles = user?.roles ?? [];
  const isFaculty    = roles.includes("FACULTY") && !roles.includes("SUPER_ADMIN") && !roles.includes("INSTITUTE_ADMIN");
  const isCaller     = roles.includes("CALLER") && !roles.includes("SUPER_ADMIN") && !roles.includes("INSTITUTE_ADMIN");
  const isCounsellor = roles.includes("COUNSELLOR") && !isFaculty && !isCaller;
  const isAccountant = roles.includes("ACCOUNTANT") && !roles.includes("SUPER_ADMIN") && !roles.includes("INSTITUTE_ADMIN") && !isCounsellor;

  // All hooks must be called unconditionally — early returns are below
  const { data: summary, isLoading: loadingSum } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn:  getDashboardSummary,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    enabled: !isFaculty && !isCaller && !isAccountant,
  });

  const { data: recent, isLoading: loadingRecent } = useQuery({
    queryKey: ["dashboard-recent"],
    queryFn:  getDashboardRecent,
    staleTime: 60_000,
    enabled: !isFaculty && !isCaller && !isAccountant,
  });

  const { data: revTrend = [] } = useQuery({
    queryKey: ["dash-rev-6"],
    queryFn:  () => getRevenueTrend(6),
    staleTime: 5 * 60_000,
    enabled: !isFaculty && !isCaller && !isAccountant,
  });

  const { data: admTrend = [] } = useQuery({
    queryKey: ["dash-adm-6"],
    queryFn:  () => getAdmissionsTrend(6),
    staleTime: 5 * 60_000,
    enabled: !isFaculty && !isCaller && !isAccountant,
  });

  const today = format(new Date(), "EEEE, d MMMM yyyy");

  // Role-scoped dashboards — safe to return after all hooks
  if (isFaculty)    return <FacultyDashboard />;
  if (isCaller)     return <CallerDashboard />;
  if (isCounsellor) return <CounsellorDashboard />;
  if (isAccountant) return <AccountantDashboard />;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Good {getGreeting()}, {user?.firstName ?? "Admin"} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{today}</p>
        </div>
        {summary && summary.todayFollowUps > 0 && (
          <Link href="/leads" className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-3.5 py-2 text-sm font-medium hover:bg-amber-100 transition-colors">
            <PhoneCall className="size-4" />
            {summary.todayFollowUps} follow-up{summary.todayFollowUps !== 1 ? "s" : ""} due today
          </Link>
        )}
      </div>

      {/* ── Summary cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard
          label="Total Students"
          value={summary?.totalStudents.toLocaleString() ?? "—"}
          sub="All enrolled"
          icon={Users}
          accentBg="bg-indigo-50"
          accentIcon="text-indigo-600"
          href="/students"
          loading={loadingSum}
        />
        <SummaryCard
          label="Today Admissions"
          value={summary?.todayAdmissions ?? "—"}
          sub={summary ? `${summary.monthAdmissions} this month` : undefined}
          icon={UserCheck}
          accentBg="bg-emerald-50"
          accentIcon="text-emerald-600"
          href="/admissions"
          loading={loadingSum}
        />
        <SummaryCard
          label="Active Batches"
          value={summary?.activeBatches ?? "—"}
          sub="Currently running"
          icon={BookOpen}
          accentBg="bg-blue-50"
          accentIcon="text-blue-600"
          href="/courses"
          loading={loadingSum}
        />
        <SummaryCard
          label="Today Collection"
          value={summary ? inr(summary.todayFeeCollection) : "—"}
          sub={summary ? `${summary.todayFeeCount} receipt${summary.todayFeeCount !== 1 ? "s" : ""}` : undefined}
          icon={IndianRupee}
          accentBg="bg-emerald-50"
          accentIcon="text-emerald-600"
          href="/fees"
          loading={loadingSum}
        />
        <SummaryCard
          label="Pending Fees"
          value={summary ? inr(summary.pendingFees) : "—"}
          sub={summary ? `${summary.overdueCount} students with dues` : undefined}
          icon={AlertCircle}
          accentBg="bg-amber-50"
          accentIcon="text-amber-600"
          href="/fees?tab=dues"
          loading={loadingSum}
        />
        <SummaryCard
          label="Total Enquiries"
          value={summary?.totalEnquiries.toLocaleString() ?? "—"}
          sub={summary ? `${summary.monthEnquiries} this month` : undefined}
          icon={Wallet}
          accentBg="bg-violet-50"
          accentIcon="text-violet-600"
          href="/leads"
          loading={loadingSum}
        />
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      {!isFaculty && (
        <div>
          <SectionHeading>Quick Actions</SectionHeading>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            <QuickAction label="Add Admission"  icon={UserCheck}    href="/admissions/new"  color="bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100" />
            <QuickAction label="Add Enquiry"    icon={Plus}         href="/leads/new"       color="bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100"   />
            <QuickAction label="Collect Fee"    icon={IndianRupee}  href="/fees"            color="bg-blue-50 text-blue-600 group-hover:bg-blue-100"         />
            {!isCounsellor && (
              <QuickAction label="Create Batch" icon={Layers}       href="/courses/new"     color="bg-amber-50 text-amber-600 group-hover:bg-amber-100"      />
            )}
            {!isCounsellor && (
              <QuickAction label="Add Expense"  icon={ReceiptText}  href="/fees"            color="bg-rose-50 text-rose-600 group-hover:bg-rose-100"         />
            )}
          </div>
        </div>
      )}

      {/* ── Charts ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Revenue trend */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Fee Collection Trend</p>
              <p className="text-xs text-muted-foreground">Last 6 months</p>
            </div>
            <TrendingUp className="size-4 text-emerald-500" />
          </div>
          {revTrend.length === 0 ? (
            <Skeleton className="h-[180px] rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={revTrend} barCategoryGap="45%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 10 }} width={36}
                  tickFormatter={(v: unknown) => inr(v as number)} />
                <Tooltip
                  content={({ active, payload, label }) => (
                    <ChartTip active={active} payload={payload as never} label={label} money />
                  )}
                  cursor={{ fill: "rgba(0,0,0,0.03)", radius: 4 }}
                />
                <Bar dataKey="amount" name="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Admissions trend */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Monthly Admissions</p>
              <p className="text-xs text-muted-foreground">Last 6 months</p>
            </div>
            <UserCheck className="size-4 text-indigo-500" />
          </div>
          {admTrend.length === 0 ? (
            <Skeleton className="h-[180px] rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={admTrend} barCategoryGap="45%">
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 10 }} width={28} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload, label }) => (
                    <ChartTip active={active} payload={payload as never} label={label} />
                  )}
                  cursor={{ fill: "rgba(0,0,0,0.03)", radius: 4 }}
                />
                <Bar dataKey="count" name="Admissions" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Recent Activity ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Recent Admissions */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <SectionHeading action={<ViewAll href="/admissions" />}>
            Latest Admissions
          </SectionHeading>
          <div className="space-y-3">
            {loadingRecent
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)
              : (recent?.admissions ?? []).length === 0
                ? <p className="text-xs text-muted-foreground py-4 text-center">No admissions yet.</p>
                : recent!.admissions.map((a, i) => (
                  <Link key={a.id} href={`/admissions/${a.id}`}
                    className="flex items-center gap-3 hover:bg-gray-50 rounded-xl p-1.5 -m-1.5 transition-colors">
                    <Avatar name={a.studentName} idx={i} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.studentName}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.courseName ?? "—"}</p>
                    </div>
                    <StatusPill status={a.status} />
                  </Link>
                ))
            }
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <SectionHeading action={<ViewAll href="/fees" />}>
            Recent Payments
          </SectionHeading>
          <div className="space-y-3">
            {loadingRecent
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)
              : (recent?.payments ?? []).length === 0
                ? <p className="text-xs text-muted-foreground py-4 text-center">No payments yet.</p>
                : recent!.payments.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <Avatar name={p.studentName} idx={i + 2} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.studentName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.paymentMode} · {fmtShort(p.paymentDate)}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-emerald-700 shrink-0">{inr(p.amount)}</span>
                  </div>
                ))
            }
          </div>
        </div>

        {/* Recent Enquiries */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <SectionHeading action={<ViewAll href="/leads" />}>
            Recent Enquiries
          </SectionHeading>
          <div className="space-y-3">
            {loadingRecent
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)
              : (recent?.enquiries ?? []).length === 0
                ? <p className="text-xs text-muted-foreground py-4 text-center">No enquiries yet.</p>
                : recent!.enquiries.map((e, i) => (
                  <Link key={e.id} href={`/leads/${e.id}`}
                    className="flex items-center gap-3 hover:bg-gray-50 rounded-xl p-1.5 -m-1.5 transition-colors">
                    <Avatar name={e.leadName} idx={i + 4} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{e.leadName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {e.courseInterested ?? e.source.replace(/_/g, " ")}
                      </p>
                    </div>
                    <StatusPill status={e.status} />
                  </Link>
                ))
            }
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Greeting ──────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

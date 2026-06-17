"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth } from "date-fns";
import {
  Clock, ArrowUpRight, TrendingUp, Wallet, Scale, AlertCircle,
} from "lucide-react";
import { listBookings } from "@/lib/api/leads.api";
import { getReportSummary } from "@/lib/api/reports.api";
import { useAuthStore } from "@/lib/stores/auth.store";
import { Skeleton } from "@/components/ui/skeleton";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export default function AccountantDashboard() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.firstName || user?.fullName || "there";

  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: pending, isLoading: loadingPending } = useQuery({
    queryKey: ["payments-count", "PAYMENT_PENDING"],
    queryFn: () => listBookings({ status: "PAYMENT_PENDING", size: 1 }),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    select: (res) => res.meta?.total ?? 0,
  });

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["finance-summary", monthStart, today],
    queryFn: () => getReportSummary(monthStart, today),
    staleTime: 60_000,
  });

  const stats = [
    { label: "Revenue (this month)", value: summary?.totalFeeCollected, icon: TrendingUp, href: "/reports?tab=monthly-revenue", tone: "text-emerald-700" },
    { label: "Expenses (this month)", value: summary?.totalExpenses, icon: Wallet, href: "/expenses", tone: "text-gray-900" },
    { label: "Profit (this month)", value: summary?.netRevenue, icon: Scale, href: "/reports?tab=daily-collection", tone: (summary?.netRevenue ?? 0) >= 0 ? "text-emerald-700" : "text-red-600" },
    { label: "Pending dues", value: summary?.pendingFees, icon: AlertCircle, href: "/fees?tab=dues", tone: "text-red-600" },
  ];

  return (
    <div className="max-w-[1100px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hi {firstName} 👋</h1>
        <p className="text-sm text-muted-foreground">Here’s your finance workspace.</p>
      </div>

      {/* Primary — payments awaiting verification */}
      <Link
        href="/payments"
        className="group flex items-center justify-between rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 transition-shadow hover:shadow-md"
      >
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <Clock className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-800">Payments awaiting verification</p>
            {loadingPending ? (
              <Skeleton className="mt-1 h-8 w-16" />
            ) : (
              <p className="text-3xl font-bold text-emerald-700">{pending ?? 0}</p>
            )}
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 group-hover:underline">
          Review now <ArrowUpRight className="size-4" />
        </span>
      </Link>

      {/* Finance stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href, tone }) => (
          <Link key={label} href={href} className="rounded-xl border bg-white p-5 transition-colors hover:bg-gray-50">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Icon className="size-4 text-emerald-500" />
              <span className="text-sm">{label}</span>
            </div>
            {loadingSummary ? (
              <Skeleton className="mt-2 h-7 w-24" />
            ) : (
              <p className={`mt-1 text-2xl font-semibold ${tone}`}>{formatCurrency(value ?? 0)}</p>
            )}
          </Link>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Figures are for the current month. Open{" "}
        <Link href="/reports" className="text-emerald-700 hover:underline">Finance Reports</Link>{" "}
        for full breakdowns and date ranges.
      </p>
    </div>
  );
}

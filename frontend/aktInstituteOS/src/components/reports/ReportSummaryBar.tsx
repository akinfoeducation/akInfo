"use client";

import { IndianRupee, Users, AlertCircle, TrendingUp, Minus, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReportSummary } from "@/types/report";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function compact(n: number) {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
}

interface Tile {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent: string;
  iconAccent: string;
}

export function ReportSummaryBar({
  summary,
  loading,
}: {
  summary?: ReportSummary;
  loading?: boolean;
}) {
  const tiles: Tile[] = [
    {
      label: "Total Admissions",
      value: summary ? summary.totalAdmissions.toLocaleString() : "—",
      icon: Users,
      accent: "bg-indigo-50",
      iconAccent: "text-indigo-600",
    },
    {
      label: "Fee Collected",
      value: summary ? compact(summary.totalFeeCollected) : "—",
      sub: summary ? fmt(summary.totalFeeCollected) : undefined,
      icon: IndianRupee,
      accent: "bg-emerald-50",
      iconAccent: "text-emerald-600",
    },
    {
      label: "Pending Fees",
      value: summary ? compact(summary.pendingFees) : "—",
      sub: summary ? `${summary.partialPayments} partial payments` : undefined,
      icon: AlertCircle,
      accent: "bg-amber-50",
      iconAccent: "text-amber-600",
    },
    {
      label: "Total Expenses",
      value: summary ? compact(summary.totalExpenses) : "—",
      icon: TrendingDown,
      accent: "bg-rose-50",
      iconAccent: "text-rose-500",
    },
    {
      label: "Net Revenue",
      value: summary ? compact(summary.netRevenue) : "—",
      sub: summary
        ? summary.netRevenue >= 0 ? "Positive cashflow" : "Negative cashflow"
        : undefined,
      icon: summary && summary.netRevenue < 0 ? Minus : TrendingUp,
      accent: summary && summary.netRevenue < 0 ? "bg-red-50" : "bg-teal-50",
      iconAccent: summary && summary.netRevenue < 0 ? "text-red-600" : "text-teal-600",
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {tiles.map(t => (
        <Card key={t.label} className={`p-4 ${t.accent}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">{t.label}</p>
            <t.icon className={`size-4 ${t.iconAccent}`} />
          </div>
          <p className="text-xl font-bold text-gray-900">{t.value}</p>
          {t.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{t.sub}</p>}
        </Card>
      ))}
    </div>
  );
}

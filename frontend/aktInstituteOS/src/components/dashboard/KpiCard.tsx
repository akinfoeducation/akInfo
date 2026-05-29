import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  growth: string;
  positive: boolean;
  icon: LucideIcon;
}

export function KpiCard({ title, value, growth, positive, icon: Icon }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
      {/* Icon + badge row */}
      <div className="flex items-center justify-between mb-4">
        <div className="size-10 rounded-xl bg-gray-100 flex items-center justify-center">
          <Icon className="size-5 text-gray-600" />
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
            positive
              ? "bg-emerald-50 text-emerald-600"
              : "bg-orange-50 text-orange-600"
          )}
        >
          {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
          {growth}
        </span>
      </div>

      {/* Value + title */}
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{title}</p>

      {/* See details */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <span className="text-xs font-medium text-emerald-600 group-hover:underline cursor-pointer">
          See details →
        </span>
      </div>
    </div>
  );
}

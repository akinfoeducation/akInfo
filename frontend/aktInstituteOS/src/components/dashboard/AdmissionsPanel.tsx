import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdmissionStat {
  period: string;
  value: number;
  trend: string;
  positive: boolean;
  trendLabel: string;
}

const STATS: AdmissionStat[] = [
  { period: "Today",      value: 3,  trend: "+2",  positive: true,  trendLabel: "vs yesterday" },
  { period: "This Week",  value: 18, trend: "+5",  positive: true,  trendLabel: "vs last week"  },
  { period: "This Month", value: 72, trend: "-4",  positive: false, trendLabel: "vs last month" },
];

export function AdmissionsPanel() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">Admissions</h3>
        <p className="text-xs text-gray-400 mt-0.5">New enrollments by period</p>
      </div>

      <div className="space-y-3">
        {STATS.map(({ period, value, trend, positive, trendLabel }) => (
          <div
            key={period}
            className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 hover:bg-gray-100 transition-colors"
          >
            {/* Period label */}
            <div className="flex items-center gap-3">
              <div className={cn(
                "size-2 rounded-full shrink-0",
                period === "Today"      ? "bg-emerald-500" :
                period === "This Week"  ? "bg-indigo-400" : "bg-violet-400"
              )} />
              <span className="text-sm text-gray-600">{period}</span>
            </div>

            {/* Value + trend */}
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-gray-900">{value}</span>
              <span className={cn(
                "flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full",
                positive ? "text-emerald-600 bg-emerald-50" : "text-red-600 bg-red-50"
              )}>
                {positive
                  ? <TrendingUp className="size-3" />
                  : <TrendingDown className="size-3" />
                }
                {trend}
                <span className="text-[10px] font-normal ml-1 opacity-70">{trendLabel}</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 mt-2 border-t border-gray-100">
        <button className="w-full text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
          View all admissions →
        </button>
      </div>
    </div>
  );
}

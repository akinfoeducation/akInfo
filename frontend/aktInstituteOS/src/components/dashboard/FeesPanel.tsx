import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeesStat {
  label: string;
  value: string;
  subtext: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  border: string;
}

const STATS: FeesStat[] = [
  {
    label:      "Collected Today",
    value:      "₹42,500",
    subtext:    "12 payments received",
    icon:       CheckCircle2,
    iconBg:     "bg-emerald-100",
    iconColor:  "text-emerald-600",
    valueColor: "text-emerald-700",
    border:     "border-emerald-100",
  },
  {
    label:      "Pending Fees",
    value:      "₹1,87,000",
    subtext:    "Across 34 students",
    icon:       Clock,
    iconBg:     "bg-amber-100",
    iconColor:  "text-amber-600",
    valueColor: "text-amber-700",
    border:     "border-amber-100",
  },
  {
    label:      "Overdue Students",
    value:      "12",
    subtext:    "Overdue by 30+ days",
    icon:       AlertTriangle,
    iconBg:     "bg-red-100",
    iconColor:  "text-red-600",
    valueColor: "text-red-700",
    border:     "border-red-100",
  },
];

export function FeesPanel() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">Fees Overview</h3>
        <p className="text-xs text-gray-400 mt-0.5">Collection status at a glance</p>
      </div>

      <div className="space-y-3">
        {STATS.map(({ label, value, subtext, icon: Icon, iconBg, iconColor, valueColor, border }) => (
          <div
            key={label}
            className={cn(
              "flex items-center gap-4 rounded-xl border p-3.5 hover:shadow-sm transition-all cursor-pointer",
              border
            )}
          >
            <div className={cn("size-9 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
              <Icon className={cn("size-4", iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">{label}</p>
              <p className={cn("text-lg font-bold leading-tight", valueColor)}>{value}</p>
              <p className="text-[11px] text-gray-400">{subtext}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 mt-2 border-t border-gray-100">
        <button className="w-full text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
          View full fee report →
        </button>
      </div>
    </div>
  );
}

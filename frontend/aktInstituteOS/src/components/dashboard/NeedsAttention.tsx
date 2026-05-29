import { IndianRupee, PhoneMissed, UserX, CalendarOff, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertItem {
  id: number;
  icon: React.ElementType;
  label: string;
  count: number;
  iconBg: string;
  iconColor: string;
  countColor: string;
}

const ALERTS: AlertItem[] = [
  { id: 1, icon: IndianRupee,  label: "pending fee payments",  count: 8, iconBg: "bg-orange-100", iconColor: "text-orange-600", countColor: "text-orange-700 bg-orange-50" },
  { id: 2, icon: PhoneMissed,  label: "missed follow-ups",     count: 3, iconBg: "bg-red-100",    iconColor: "text-red-600",    countColor: "text-red-700 bg-red-50"       },
  { id: 3, icon: UserX,        label: "inactive leads",        count: 2, iconBg: "bg-gray-100",   iconColor: "text-gray-600",   countColor: "text-gray-700 bg-gray-100"    },
  { id: 4, icon: CalendarOff,  label: "faculty leave request", count: 1, iconBg: "bg-amber-100",  iconColor: "text-amber-600",  countColor: "text-amber-700 bg-amber-50"   },
];

export function NeedsAttention() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="size-2 rounded-full bg-red-500 animate-pulse" />
        <h3 className="text-base font-semibold text-gray-900">Needs Attention</h3>
      </div>

      <div className="space-y-2">
        {ALERTS.map(({ id, icon: Icon, label, count, iconBg, iconColor, countColor }) => (
          <div
            key={id}
            className="flex items-center gap-3 rounded-xl p-3 hover:bg-gray-50 cursor-pointer transition-colors group"
          >
            <div className={cn("size-8 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
              <Icon className={cn("size-4", iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700">
                <span className={cn("font-bold mr-1 text-sm px-1.5 py-0.5 rounded-md", countColor)}>
                  {count}
                </span>
                {label}
              </p>
            </div>
            <ChevronRight className="size-4 text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

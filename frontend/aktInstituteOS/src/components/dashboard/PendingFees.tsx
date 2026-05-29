import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface FeeEntry {
  id: number;
  name: string;
  initials: string;
  avatarBg: string;
  course: string;
  amount: string;
  daysOverdue: number;
}

const PENDING: FeeEntry[] = [
  { id: 1, name: "Arjun Sharma",   initials: "AS", avatarBg: "bg-indigo-100 text-indigo-600",   course: "Full Stack Dev",    amount: "₹12,500", daysOverdue: 32 },
  { id: 2, name: "Priya Patel",    initials: "PP", avatarBg: "bg-violet-100 text-violet-600",   course: "Data Science",      amount: "₹8,000",  daysOverdue: 18 },
  { id: 3, name: "Rohit Verma",    initials: "RV", avatarBg: "bg-emerald-100 text-emerald-600", course: "UI/UX Design",      amount: "₹6,500",  daysOverdue: 7  },
  { id: 4, name: "Sneha Gupta",    initials: "SG", avatarBg: "bg-rose-100 text-rose-600",       course: "Digital Marketing", amount: "₹5,000",  daysOverdue: 45 },
  { id: 5, name: "Karan Mehta",    initials: "KM", avatarBg: "bg-amber-100 text-amber-600",     course: "Full Stack Dev",    amount: "₹12,500", daysOverdue: 3  },
];

function overdueColor(days: number) {
  if (days >= 30) return "text-red-600 bg-red-50";
  if (days >= 15) return "text-orange-600 bg-orange-50";
  return "text-amber-600 bg-amber-50";
}

function overdueLabel(days: number) {
  if (days >= 30) return `${days}d overdue`;
  if (days >= 15) return `${days}d overdue`;
  return `${days}d due`;
}

export function PendingFees() {
  const totalPending = PENDING.reduce((sum, f) => {
    const num = parseInt(f.amount.replace(/[₹,]/g, ""), 10);
    return sum + num;
  }, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Pending Fee Collections</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Total outstanding:{" "}
            <span className="font-semibold text-red-600">
              ₹{totalPending.toLocaleString("en-IN")}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
          <AlertCircle className="size-3" />
          {PENDING.length} pending
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col divide-y divide-gray-100">
        {PENDING.map((fee) => (
          <div
            key={fee.id}
            className="flex items-center gap-3 py-3 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
          >
            <div className={cn("size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", fee.avatarBg)}>
              {fee.initials}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{fee.name}</p>
              <p className="text-xs text-gray-400 truncate">{fee.course}</p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-gray-900">{fee.amount}</p>
              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", overdueColor(fee.daysOverdue))}>
                {overdueLabel(fee.daysOverdue)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 mt-1 border-t border-gray-100">
        <button className="w-full text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
          View all pending collections →
        </button>
      </div>
    </div>
  );
}

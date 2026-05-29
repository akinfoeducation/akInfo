import { cn } from "@/lib/utils";
import { Phone, Clock } from "lucide-react";

type Stage = "New Inquiry" | "Demo Scheduled" | "Follow-up" | "Negotiation";

interface Followup {
  id: number;
  name: string;
  initials: string;
  avatarBg: string;
  phone: string;
  stage: Stage;
  lastContact: string;
  note: string;
}

const FOLLOWUPS: Followup[] = [
  { id: 1, name: "Anjali Nair",    initials: "AN", avatarBg: "bg-indigo-100 text-indigo-600",   phone: "+91 98765 43210", stage: "Demo Scheduled",  lastContact: "Today, 10 AM",    note: "Demo at 3 PM today" },
  { id: 2, name: "Dev Patel",      initials: "DP", avatarBg: "bg-emerald-100 text-emerald-600", phone: "+91 87654 32109", stage: "New Inquiry",      lastContact: "Yesterday",       note: "Interested in Full Stack" },
  { id: 3, name: "Riya Sharma",    initials: "RS", avatarBg: "bg-rose-100 text-rose-600",       phone: "+91 76543 21098", stage: "Follow-up",        lastContact: "2 days ago",      note: "Send fee details" },
  { id: 4, name: "Akash Singh",    initials: "AS", avatarBg: "bg-amber-100 text-amber-600",     phone: "+91 65432 10987", stage: "Negotiation",      lastContact: "3 days ago",      note: "Discussing discount" },
  { id: 5, name: "Pooja Iyer",     initials: "PI", avatarBg: "bg-violet-100 text-violet-600",   phone: "+91 54321 09876", stage: "Follow-up",        lastContact: "Yesterday",       note: "Callback requested" },
];

const STAGE_STYLES: Record<Stage, string> = {
  "New Inquiry":    "bg-blue-50 text-blue-600",
  "Demo Scheduled": "bg-emerald-50 text-emerald-600",
  "Follow-up":      "bg-amber-50 text-amber-600",
  "Negotiation":    "bg-violet-50 text-violet-600",
};

export function TodaysFollowups() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Today&apos;s Follow-ups</h3>
          <p className="text-xs text-gray-400 mt-0.5">Leads that need attention today</p>
        </div>
        <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full">
          {FOLLOWUPS.length} due
        </span>
      </div>

      {/* List */}
      <div className="flex flex-col divide-y divide-gray-100">
        {FOLLOWUPS.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 py-3 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors cursor-pointer group"
          >
            <div className={cn("size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5", item.avatarBg)}>
              {item.initials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-gray-800">{item.name}</p>
                <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", STAGE_STYLES[item.stage])}>
                  {item.stage}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{item.note}</p>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                <Clock className="size-2.5" />
                {item.lastContact}
              </div>
            </div>

            <button
              className="shrink-0 size-7 rounded-lg border border-gray-200 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-colors opacity-0 group-hover:opacity-100"
              title={`Call ${item.name}`}
            >
              <Phone className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="pt-4 mt-1 border-t border-gray-100">
        <button className="w-full text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
          View all leads →
        </button>
      </div>
    </div>
  );
}

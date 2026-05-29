import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface Meeting {
  id: number;
  name: string;
  topic: string;
  time: string;
  day: "Today" | "Tomorrow" | "Yesterday";
  initials: string;
  avatarBg: string;
}

const MEETINGS: Meeting[] = [
  {
    id: 1,
    name: "Saman Blake",
    topic: "Product Demo",
    time: "11:00 AM",
    day: "Tomorrow",
    initials: "SB",
    avatarBg: "bg-indigo-100 text-indigo-600",
  },
  {
    id: 2,
    name: "Michael Smith",
    topic: "Proposal Discussion",
    time: "03:00 PM",
    day: "Today",
    initials: "MS",
    avatarBg: "bg-amber-100 text-amber-600",
  },
  {
    id: 3,
    name: "Hessila Ral",
    topic: "Onboarding Call",
    time: "02:00 PM",
    day: "Yesterday",
    initials: "HR",
    avatarBg: "bg-rose-100 text-rose-600",
  },
  {
    id: 4,
    name: "Daniel Lee",
    topic: "Lead Qualification",
    time: "12:00 PM",
    day: "Tomorrow",
    initials: "DL",
    avatarBg: "bg-emerald-100 text-emerald-600",
  },
  {
    id: 5,
    name: "Emma James",
    topic: "Contract Signing",
    time: "01:00 PM",
    day: "Today",
    initials: "EJ",
    avatarBg: "bg-violet-100 text-violet-600",
  },
];

const DAY_COLOR: Record<Meeting["day"], string> = {
  Today: "text-emerald-600",
  Tomorrow: "text-blue-500",
  Yesterday: "text-gray-400",
};

export function MeetingSchedule() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-gray-900">Meeting Schedule</h3>
        <button className="size-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
          <MoreHorizontal className="size-4" />
        </button>
      </div>

      {/* Meetings */}
      <div className="flex flex-col divide-y divide-gray-100 flex-1">
        {MEETINGS.map((meeting) => (
          <div
            key={meeting.id}
            className="flex items-center gap-3 py-3 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
          >
            {/* Avatar */}
            <div
              className={cn(
                "size-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                meeting.avatarBg
              )}
            >
              {meeting.initials}
            </div>

            {/* Name + topic */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{meeting.name}</p>
              <p className="text-xs text-gray-400 truncate">{meeting.topic}</p>
            </div>

            {/* Time + day */}
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-gray-700">{meeting.time}</p>
              <p className={cn("text-xs", DAY_COLOR[meeting.day])}>{meeting.day}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

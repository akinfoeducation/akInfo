"use client";

import { useQuery } from "@tanstack/react-query";
import { Calendar, Clock, MapPin, Wifi } from "lucide-react";
import { getPortalSchedule } from "@/lib/api/academic.api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TODAY_DOW = new Date().getDay() === 0 ? 7 : new Date().getDay(); // ISO day of week

export default function PortalSchedulePage() {
  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["portal-schedule"],
    queryFn: getPortalSchedule,
  });

  const grouped = slots.reduce((acc, slot) => {
    if (slot.dayOfWeek) {
      if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
      acc[slot.dayOfWeek].push(slot);
    }
    return acc;
  }, {} as Record<number, typeof slots>);

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">My Schedule</h1>
        <p className="text-sm text-gray-400 mt-0.5">Weekly class timetable for your batch</p>
      </div>

      {isLoading ? (
        <div className="space-y-6">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Calendar className="size-10 mx-auto mb-3 text-gray-200" />
          <p>No schedule available yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {[1,2,3,4,5,6,7].filter(d => grouped[d]?.length).map(dow => (
            <div key={dow}>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-gray-700">{DAYS[dow]}</h3>
                {dow === TODAY_DOW && (
                  <span className="text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">Today</span>
                )}
              </div>
              <div className="space-y-2">
                {grouped[dow].sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? "")).map(slot => (
                  <div key={slot.id}
                    className={`bg-white rounded-xl border px-5 py-4 flex items-center gap-4 ${
                      dow === TODAY_DOW ? "border-emerald-200 bg-emerald-50/30" : "border-gray-200"
                    }`}>
                    <div className="flex items-center gap-1.5 text-sm font-mono text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg shrink-0">
                      <Clock className="size-3.5" />
                      {slot.startTime?.slice(0,5)} – {slot.endTime?.slice(0,5)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{slot.subject ?? "Class"}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                        {slot.facultyName && <span>{slot.facultyName}</span>}
                        {slot.classroom && (
                          <span className="flex items-center gap-1"><MapPin className="size-3" />{slot.classroom}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {slot.mode === "ONLINE" ? <><Wifi className="size-3 mr-1" />Online</> : slot.mode ?? "Offline"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

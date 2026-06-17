"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { BarChart2 } from "lucide-react";
import { getPortalAttendance, getPortalAttendanceSummary } from "@/lib/api/academic.api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS_COLORS = {
  PRESENT: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ABSENT:  "bg-red-50 text-red-700 border-red-200",
  LATE:    "bg-yellow-50 text-yellow-700 border-yellow-200",
  HOLIDAY: "bg-gray-50 text-gray-600 border-gray-200",
};

export default function PortalAttendancePage() {
  const [from, setFrom] = useState(() => format(new Date(Date.now() - 90*86400000), "yyyy-MM-dd"));
  const [to, setTo]     = useState(() => format(new Date(), "yyyy-MM-dd"));

  const { data: summary, isLoading: loadingSum } = useQuery({
    queryKey: ["portal-attendance-summary"],
    queryFn: getPortalAttendanceSummary,
  });

  const { data: history = [], isLoading: loadingHist } = useQuery({
    queryKey: ["portal-attendance", from, to],
    queryFn: () => getPortalAttendance({ from, to }),
    placeholderData: prev => prev,
  });

  const pct = summary?.attendancePercent ?? 0;
  const pctColor = pct >= 75 ? "text-emerald-600" : pct >= 60 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">My Attendance</h1>
        <p className="text-sm text-gray-400 mt-0.5">Track your class attendance history</p>
      </div>

      {/* Summary card */}
      {loadingSum ? <Skeleton className="h-28 rounded-xl" /> : summary && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className={`text-4xl font-bold ${pctColor}`}>{pct.toFixed(1)}%</p>
              <p className="text-xs text-gray-400 mt-1">Overall Attendance</p>
            </div>
            <div className="h-16 w-px bg-gray-100" />
            <div className="grid grid-cols-4 gap-4 flex-1">
              {[
                { label: "Present", value: summary.present, color: "text-emerald-600" },
                { label: "Late",    value: summary.late,    color: "text-yellow-600" },
                { label: "Absent",  value: summary.absent,  color: "text-red-500" },
                { label: "Total",   value: summary.totalSessions, color: "text-gray-500" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          {pct < 75 && (
            <div className="mt-4 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2.5 text-sm text-amber-800">
              ⚠️ Attendance below 75%. Minimum required: 75%.
            </div>
          )}
        </div>
      )}

      {/* Date filter */}
      <div className="flex gap-3 items-center">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-gray-500">From</Label>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 w-36 text-xs" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-gray-500">To</Label>
          <Input type="date" value={to}   onChange={e => setTo(e.target.value)}   className="h-8 w-36 text-xs" />
        </div>
      </div>

      {/* History */}
      {loadingHist ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : history.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <BarChart2 className="size-10 mx-auto mb-3 text-gray-200" />
          <p>No attendance records in this range</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {history.map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{r.sessionDate ? format(new Date(r.sessionDate), "dd MMM yyyy") : "—"}</p>
                  <p className="text-xs text-gray-400">{r.subject ?? r.batchName}</p>
                </div>
                <div className="flex items-center gap-3">
                  {r.remarks && <p className="text-xs text-gray-400 italic">{r.remarks}</p>}
                  <Badge variant="outline" className={`text-xs ${STATUS_COLORS[r.status as keyof typeof STATUS_COLORS]}`}>
                    {r.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

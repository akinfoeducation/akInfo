"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, Calendar, Clock, TrendingUp, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getPortalDashboard } from "@/lib/api/academic.api";

export default function PortalDashboardPage() {
  const { data: dash, isLoading } = useQuery({
    queryKey: ["portal-dashboard"],
    queryFn: getPortalDashboard,
  });

  if (isLoading) return (
    <div className="space-y-5">
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    </div>
  );

  if (!dash) return <div className="text-center py-20 text-gray-400">Unable to load dashboard</div>;

  const att = dash.attendanceSummary;
  const pct = att?.attendancePercent ?? 0;
  const pctColor = pct >= 75 ? "text-emerald-600" : pct >= 60 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-emerald-100 text-sm">Welcome back,</p>
            <h1 className="text-2xl font-bold mt-0.5">{dash.fullName}</h1>
            <p className="text-emerald-100 text-sm mt-1 font-mono">{dash.studentNumber}</p>
          </div>
          <div className="size-14 rounded-full bg-white/20 flex items-center justify-center">
            {dash.avatarUrl
              ? <img src={dash.avatarUrl} className="size-14 rounded-full object-cover" alt="" />
              : <User className="size-7 text-white" />}
          </div>
        </div>
      </div>

      {/* Enrollment card */}
      {dash.courseName && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Current Enrollment</h2>
          <div className="flex items-start gap-4">
            <div className="size-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <BookOpen className="size-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{dash.courseName}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {dash.batchName}
                {dash.batchTiming && ` · ${dash.batchTiming}`}
              </p>
              {dash.facultyName && (
                <p className="text-xs text-gray-400 mt-1">Faculty: {dash.facultyName}</p>
              )}
            </div>
            <div className="shrink-0">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                dash.batchMode === "ONLINE" ? "bg-blue-50 text-blue-700" :
                dash.batchMode === "HYBRID" ? "bg-purple-50 text-purple-700" :
                "bg-gray-50 text-gray-600"
              }`}>
                {dash.batchMode ?? "OFFLINE"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Attendance snapshot */}
      {att && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Attendance Summary</h2>
          <div className="flex items-center gap-6">
            {/* Donut */}
            <div className="relative size-24 shrink-0">
              <svg viewBox="0 0 36 36" className="size-24 -rotate-90">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f3f4f6" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.915" fill="none" stroke={pct >= 75 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="3" strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-xl font-bold ${pctColor}`}>{pct.toFixed(0)}%</span>
              </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 flex-1">
              {[
                { label: "Present", value: att.present, color: "text-emerald-600" },
                { label: "Absent",  value: att.absent,  color: "text-red-500" },
                { label: "Late",    value: att.late,    color: "text-yellow-500" },
                { label: "Total",   value: att.totalSessions, color: "text-gray-500" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          {pct < 75 && (
            <div className="mt-4 bg-red-50 border border-red-100 rounded-lg px-4 py-2.5 text-sm text-red-700">
              ⚠️ Your attendance is below 75%. Please attend classes regularly.
            </div>
          )}
        </div>
      )}

      {/* Today's schedule */}
      {dash.todaySchedule.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar className="size-3.5" /> Today's Classes
          </h2>
          <div className="space-y-2">
            {dash.todaySchedule.map(slot => (
              <div key={slot.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-1 text-sm font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded shrink-0">
                  <Clock className="size-3" />
                  {slot.startTime?.slice(0,5)}
                </div>
                <div>
                  <p className="text-sm font-medium">{slot.subject ?? "Class"}</p>
                  {slot.classroom && <p className="text-xs text-gray-400">{slot.classroom}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

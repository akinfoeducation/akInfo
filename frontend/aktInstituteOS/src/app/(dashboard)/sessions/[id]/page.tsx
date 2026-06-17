"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Users, CheckCircle2, Save, Loader2 } from "lucide-react";
import { format } from "date-fns";

import { getSession, updateSession, getSessionRoster, markAttendance } from "@/lib/api/academic.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { AttendanceStatus, AttendanceEntryRequest } from "@/types/academic";

const STATUS_OPTIONS: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "HOLIDAY"];
const STATUS_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: "bg-emerald-500 text-white border-emerald-500",
  ABSENT:  "bg-red-500 text-white border-red-500",
  LATE:    "bg-yellow-500 text-white border-yellow-500",
  HOLIDAY: "bg-gray-400 text-white border-gray-400",
};

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = Number(id);
  const router = useRouter();
  const qc = useQueryClient();
  const [topicEdit, setTopicEdit] = useState("");
  const [notesEdit, setNotesEdit] = useState("");
  const [hwEdit, setHwEdit]       = useState("");
  const [editingInfo, setEditingInfo] = useState(false);

  // Attendance state: studentId → status
  const [attendance, setAttendance] = useState<Record<number, AttendanceStatus>>({});
  const [remarks, setRemarks]       = useState<Record<number, string>>({});

  const { data: session, isLoading: loadingSession } = useQuery({
    queryKey: ["session", sessionId],
    queryFn: () => getSession(sessionId),
  });

  useEffect(() => {
    if (session) {
      setTopicEdit(session.topicCovered ?? "");
      setNotesEdit(session.sessionNotes ?? "");
      setHwEdit(session.homeworkNotes ?? "");
    }
  }, [session]);

  const { data: roster = [], isLoading: loadingRoster } = useQuery({
    queryKey: ["session-roster", sessionId],
    queryFn: () => getSessionRoster(sessionId),
  });

  useEffect(() => {
    if (roster.length) {
      const init: Record<number, AttendanceStatus> = {};
      roster.forEach(r => { init[r.studentId] = r.status as AttendanceStatus; });
      setAttendance(init);
    }
  }, [roster]);

  const updateMut = useMutation({
    mutationFn: () => updateSession(sessionId, {
      batchId: session!.batchId,
      sessionDate: session!.sessionDate,
      topicCovered: topicEdit,
      sessionNotes: notesEdit,
      homeworkNotes: hwEdit,
      status: session!.status,
    }),
    onSuccess: () => { toast.success("Session updated"); qc.invalidateQueries({ queryKey: ["session", sessionId] }); setEditingInfo(false); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Failed"),
  });

  const markMut = useMutation({
    mutationFn: () => {
      const entries: AttendanceEntryRequest[] = roster.map(r => ({
        studentId: r.studentId,
        status: attendance[r.studentId] ?? "ABSENT",
        remarks: remarks[r.studentId],
      }));
      return markAttendance(sessionId, { entries });
    },
    onSuccess: () => {
      toast.success("Attendance saved");
      qc.invalidateQueries({ queryKey: ["session", sessionId] });
      qc.invalidateQueries({ queryKey: ["session-roster", sessionId] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Failed"),
  });

  function toggleStatus(studentId: number) {
    setAttendance(prev => {
      const cur = prev[studentId] ?? "ABSENT";
      const next: Record<AttendanceStatus, AttendanceStatus> = {
        PRESENT: "ABSENT", ABSENT: "LATE", LATE: "HOLIDAY", HOLIDAY: "PRESENT",
      };
      return { ...prev, [studentId]: next[cur] };
    });
  }

  if (loadingSession) return <div className="space-y-4 max-w-4xl mx-auto"><Skeleton className="h-32 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>;
  if (!session) return <div className="text-center py-20 text-gray-400">Session not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft className="size-4" /></Button>
        <div>
          <h1 className="text-xl font-semibold">
            {session.batchName ?? `Batch #${session.batchId}`}
            {session.subject && ` · ${session.subject}`}
          </h1>
          <p className="text-sm text-gray-400">
            {format(new Date(session.sessionDate), "EEEE, dd MMM yyyy")}
            {session.startTime && ` · ${session.startTime.slice(0,5)} – ${session.endTime?.slice(0,5)}`}
          </p>
        </div>
      </div>

      {/* Session info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-sm">Session Info</h2>
          {!editingInfo
            ? <Button variant="outline" size="sm" onClick={() => setEditingInfo(true)}>Edit</Button>
            : <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingInfo(false)}>Cancel</Button>
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={() => updateMut.mutate()} disabled={updateMut.isPending}>
                  {updateMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save
                </Button>
              </div>
          }
        </div>
        {editingInfo ? (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Topic Covered</Label>
              <Input value={topicEdit} onChange={e => setTopicEdit(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Session Notes</Label>
              <textarea value={notesEdit} onChange={e => setNotesEdit(e.target.value)}
                className="w-full mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none h-24" />
            </div>
            <div>
              <Label className="text-xs">Homework / Assignment Notes</Label>
              <Input value={hwEdit} onChange={e => setHwEdit(e.target.value)} className="mt-1" />
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-400 text-xs">Topic</span><p>{session.topicCovered || <span className="text-gray-300">Not recorded</span>}</p></div>
            {session.sessionNotes && <div><span className="text-gray-400 text-xs">Notes</span><p>{session.sessionNotes}</p></div>}
            {session.homeworkNotes && <div><span className="text-gray-400 text-xs">Homework</span><p>{session.homeworkNotes}</p></div>}
          </div>
        )}
      </div>

      {/* Attendance */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-gray-400" />
            <h2 className="font-medium text-sm">
              Attendance
              {roster.length > 0 && <span className="text-gray-400 font-normal"> · {roster.length} students</span>}
            </h2>
            {session.attendanceMarked && (
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="size-3 mr-1" /> Marked
              </Badge>
            )}
          </div>
          <Button onClick={() => markMut.mutate()} disabled={markMut.isPending || roster.length === 0}
            className="bg-emerald-500 hover:bg-emerald-600 text-white">
            {markMut.isPending ? <><Loader2 className="size-4 mr-2 animate-spin" />Saving…</> : "Save Attendance"}
          </Button>
        </div>

        {loadingRoster ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex gap-4"><Skeleton className="h-4 w-full" /></div>
            ))}
          </div>
        ) : roster.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            No students enrolled in this batch yet
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Legend */}
            <div className="px-5 py-2 bg-gray-50 text-xs text-gray-400 flex gap-3">
              Click a student's status to cycle: PRESENT → ABSENT → LATE → HOLIDAY
            </div>
            {roster.map(student => {
              const status = attendance[student.studentId] ?? "ABSENT";
              return (
                <div key={student.studentId} className="px-5 py-3 flex items-center gap-4">
                  <div className="w-32 shrink-0">
                    <p className="font-medium text-sm">{student.studentName}</p>
                    <p className="text-xs text-gray-400 font-mono">{student.studentNumber}</p>
                  </div>
                  <button
                    onClick={() => toggleStatus(student.studentId)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${STATUS_COLORS[status]}`}>
                    {status}
                  </button>
                  <Input
                    placeholder="Remarks (optional)"
                    value={remarks[student.studentId] ?? ""}
                    onChange={e => setRemarks(prev => ({ ...prev, [student.studentId]: e.target.value }))}
                    className="flex-1 h-8 text-xs"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

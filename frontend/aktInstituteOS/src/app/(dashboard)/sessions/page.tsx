"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, BookOpen, CheckCircle2, Clock, XCircle, Loader2, Save, X } from "lucide-react";
import { format } from "date-fns";

import { listSessions, createSession } from "@/lib/api/academic.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { ClassSessionResponse } from "@/types/academic";

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED:  "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED:  "bg-red-50 text-red-700 border-red-200",
  HOLIDAY:    "bg-orange-50 text-orange-700 border-orange-200",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  SCHEDULED:  <Clock className="size-3 mr-1" />,
  COMPLETED:  <CheckCircle2 className="size-3 mr-1" />,
  CANCELLED:  <XCircle className="size-3 mr-1" />,
  HOLIDAY:    <span className="mr-1">🏖</span>,
};

export default function SessionsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [fromDate, setFrom] = useState(() => format(new Date(Date.now() - 30*86400000), "yyyy-MM-dd"));
  const [toDate, setTo]     = useState(() => format(new Date(), "yyyy-MM-dd"));

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["sessions", fromDate, toDate],
    queryFn: () => listSessions({ from: fromDate, to: toDate }),
    placeholderData: prev => prev,
  });

  const createMut = useMutation({
    mutationFn: createSession,
    onSuccess: () => { toast.success("Session created"); qc.invalidateQueries({ queryKey: ["sessions"] }); setShowForm(false); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Failed"),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Class Sessions</h1>
          <p className="text-sm text-gray-500 mt-0.5">Record topics, mark attendance, track completion</p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => setShowForm(true)}>
          <Plus className="size-4 mr-2" /> New Session
        </Button>
      </div>

      {/* Date filter */}
      <div className="flex gap-3 items-center">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-gray-500">From</Label>
          <Input type="date" value={fromDate} onChange={e => setFrom(e.target.value)} className="h-8 w-36 text-xs" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-gray-500">To</Label>
          <Input type="date" value={toDate}   onChange={e => setTo(e.target.value)}   className="h-8 w-36 text-xs" />
        </div>
      </div>

      {showForm && (
        <QuickSessionForm
          onSave={(p) => createMut.mutate(p)}
          onCancel={() => setShowForm(false)}
          busy={createMut.isPending}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="size-10 mx-auto mb-3 text-gray-200" />
          <p>No sessions in this date range.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Link key={s.id} href={`/sessions/${s.id}`}
              className="block bg-white rounded-xl border border-gray-200 px-5 py-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{s.batchName ?? `Batch #${s.batchId}`}</span>
                    {s.subject && <span className="text-xs text-gray-400">· {s.subject}</span>}
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[s.status]}`}>
                      {STATUS_ICONS[s.status]}{s.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(s.sessionDate), "dd MMM yyyy")}
                    {s.startTime && ` · ${s.startTime.slice(0,5)} – ${s.endTime?.slice(0,5)}`}
                    {s.facultyName && ` · ${s.facultyName}`}
                  </p>
                  {s.topicCovered && (
                    <p className="text-sm text-gray-600 mt-1 truncate max-w-xl">📘 {s.topicCovered}</p>
                  )}
                </div>
                <div className="text-right text-xs text-gray-400 shrink-0 ml-4">
                  {s.attendanceMarked
                    ? <span className="text-emerald-600 font-medium">✓ {s.presentCount}/{s.totalStudents}</span>
                    : s.status === "COMPLETED" ? <span className="text-orange-500">Attendance pending</span>
                    : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickSessionForm({ onSave, onCancel, busy }: {
  onSave: (p: any) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [batchId, setBatchId]     = useState("");
  const [date, setDate]           = useState(format(new Date(), "yyyy-MM-dd"));
  const [subject, setSubject]     = useState("");
  const [startTime, setStart]     = useState("09:00");
  const [endTime, setEnd]         = useState("10:30");
  const [topic, setTopic]         = useState("");

  function submit() {
    if (!batchId || !date) return toast.error("Batch and date are required");
    onSave({ batchId: Number(batchId), sessionDate: date, subject, startTime, endTime, topicCovered: topic, status: "SCHEDULED" });
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-4">
      <p className="font-medium text-sm">New Session</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs">Batch ID *</Label>
          <Input value={batchId} onChange={e => setBatchId(e.target.value)} className="mt-1" placeholder="Batch ID" />
        </div>
        <div>
          <Label className="text-xs">Date *</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Subject</Label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} className="mt-1" placeholder="Subject" />
        </div>
        <div>
          <Label className="text-xs">Start</Label>
          <Input type="time" value={startTime} onChange={e => setStart(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">End</Label>
          <Input type="time" value={endTime} onChange={e => setEnd(e.target.value)} className="mt-1" />
        </div>
        <div className="md:col-span-3">
          <Label className="text-xs">Topic Covered</Label>
          <Input value={topic} onChange={e => setTopic(e.target.value)} className="mt-1" placeholder="Topic or chapter covered today" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}><X className="size-4 mr-1" /> Cancel</Button>
        <Button onClick={submit} disabled={busy} className="bg-emerald-500 hover:bg-emerald-600 text-white">
          {busy ? <><Loader2 className="size-4 mr-2 animate-spin" />Saving…</> : <><Save className="size-4 mr-2" />Create Session</>}
        </Button>
      </div>
    </div>
  );
}

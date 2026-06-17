"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Calendar, Clock, MapPin, Wifi, Trash2, Edit3, X, Save, Loader2 } from "lucide-react";

import { listTimetable, createTimetableSlot, updateTimetableSlot, deleteTimetableSlot } from "@/lib/api/academic.api";
import { listBranches } from "@/lib/api/branches.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { TimetableResponse, TimetableRequest } from "@/types/academic";

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MODE_LABELS: Record<string, string> = { OFFLINE: "In-person", ONLINE: "Online", HYBRID: "Hybrid" };

export default function SchedulePage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TimetableResponse | null>(null);
  const [filterDay, setFilterDay] = useState<string>("all");

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["timetable"],
    queryFn: () => listTimetable(),
  });

  const deleteMut = useMutation({
    mutationFn: deleteTimetableSlot,
    onSuccess: () => { toast.success("Slot deleted"); qc.invalidateQueries({ queryKey: ["timetable"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Delete failed"),
  });

  const filtered = filterDay === "all" ? slots : slots.filter(s => String(s.dayOfWeek) === filterDay);

  const grouped = DAYS.slice(1).reduce((acc, day, i) => {
    const dow = i + 1;
    const daySlots = filtered.filter(s => s.dayOfWeek === dow);
    if (daySlots.length) acc[dow] = daySlots;
    return acc;
  }, {} as Record<number, TimetableResponse[]>);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Timetable</h1>
          <p className="text-sm text-gray-500 mt-0.5">Weekly class schedule for all batches</p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white"
          onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="size-4 mr-2" /> Add Slot
        </Button>
      </div>

      {/* Day filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "1","2","3","4","5","6","7"].map((d) => (
          <button key={d}
            onClick={() => setFilterDay(d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterDay === d
                ? "bg-emerald-500 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}>
            {d === "all" ? "All Days" : DAYS[Number(d)]}
          </button>
        ))}
      </div>

      {(showForm || editing) && (
        <SlotForm
          initial={editing ?? undefined}
          onSave={async (payload) => {
            if (editing) {
              await updateTimetableSlot(editing.id, payload);
              toast.success("Slot updated");
            } else {
              await createTimetableSlot(payload);
              toast.success("Slot created");
            }
            qc.invalidateQueries({ queryKey: ["timetable"] });
            setShowForm(false); setEditing(null);
          }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Calendar className="size-10 mx-auto mb-3 text-gray-200" />
          <p>No timetable slots yet. Add the first one.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dow, daySlots]) => (
            <div key={dow}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
                {DAYS[Number(dow)]}
              </h3>
              <div className="space-y-2">
                {daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((slot) => (
                  <SlotCard key={slot.id} slot={slot}
                    onEdit={() => { setEditing(slot); setShowForm(false); }}
                    onDelete={() => deleteMut.mutate(slot.id)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SlotCard({ slot, onEdit, onDelete }: {
  slot: TimetableResponse;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-sm font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
          <Clock className="size-3.5" />
          {slot.startTime?.slice(0,5)} – {slot.endTime?.slice(0,5)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{slot.batchName ?? `Batch #${slot.batchId}`}</span>
            {slot.subject && <span className="text-xs text-gray-400">· {slot.subject}</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
            {slot.facultyName && <span>{slot.facultyName}</span>}
            {slot.classroom && (
              <span className="flex items-center gap-1"><MapPin className="size-3" />{slot.classroom}</span>
            )}
            <Badge variant="outline" className="text-xs">
              {slot.mode === "ONLINE" ? <><Wifi className="size-2.5 mr-1" />{MODE_LABELS[slot.mode]}</> : MODE_LABELS[slot.mode]}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" className="size-8 p-0" onClick={onEdit}><Edit3 className="size-3.5" /></Button>
        <Button variant="ghost" size="sm" className="size-8 p-0 text-red-400 hover:text-red-600" onClick={onDelete}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function SlotForm({ initial, onSave, onCancel }: {
  initial?: TimetableResponse;
  onSave: (p: TimetableRequest) => Promise<void>;
  onCancel: () => void;
}) {
  const [batchId, setBatchId] = useState(String(initial?.batchId ?? ""));
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [dayOfWeek, setDayOfWeek] = useState(String(initial?.dayOfWeek ?? "1"));
  const [startTime, setStart] = useState(initial?.startTime?.slice(0,5) ?? "09:00");
  const [endTime, setEnd]     = useState(initial?.endTime?.slice(0,5)   ?? "10:30");
  const [classroom, setRoom]  = useState(initial?.classroom ?? "");
  const [mode, setMode]       = useState(initial?.mode ?? "OFFLINE");
  const [busy, setBusy]       = useState(false);

  async function submit() {
    if (!batchId) return toast.error("Batch is required");
    setBusy(true);
    try {
      await onSave({ batchId: Number(batchId), subject, dayOfWeek: Number(dayOfWeek), startTime, endTime, classroom, mode });
    } finally { setBusy(false); }
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-4">
      <p className="font-medium text-sm">{initial ? "Edit Slot" : "New Timetable Slot"}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs">Batch ID *</Label>
          <Input value={batchId} onChange={e => setBatchId(e.target.value)} className="mt-1" placeholder="Batch ID" />
        </div>
        <div>
          <Label className="text-xs">Subject</Label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} className="mt-1" placeholder="e.g. Quantitative Aptitude" />
        </div>
        <div>
          <Label className="text-xs">Day *</Label>
          <Select value={dayOfWeek} onValueChange={v => setDayOfWeek(v ?? "1")}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DAYS.slice(1).map((d, i) => <SelectItem key={i+1} value={String(i+1)}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Start Time *</Label>
          <Input type="time" value={startTime} onChange={e => setStart(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">End Time *</Label>
          <Input type="time" value={endTime} onChange={e => setEnd(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Classroom</Label>
          <Input value={classroom} onChange={e => setRoom(e.target.value)} className="mt-1" placeholder="Room 101" />
        </div>
        <div>
          <Label className="text-xs">Mode</Label>
          <Select value={mode} onValueChange={v => setMode(v ?? "OFFLINE")}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="OFFLINE">Offline</SelectItem>
              <SelectItem value="ONLINE">Online</SelectItem>
              <SelectItem value="HYBRID">Hybrid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}><X className="size-4 mr-1" /> Cancel</Button>
        <Button onClick={submit} disabled={busy} className="bg-emerald-500 hover:bg-emerald-600 text-white">
          {busy ? <><Loader2 className="size-4 mr-2 animate-spin" />Saving…</> : <><Save className="size-4 mr-2" />Save</>}
        </Button>
      </div>
    </div>
  );
}

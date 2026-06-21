"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  PhoneMissed, Flame, ThumbsDown, AlertTriangle,
  Calendar, MapPin, CreditCard, ChevronLeft, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CourseCombobox } from "@/components/leads/CourseCombobox";
import { performLeadAction, updateLead } from "@/lib/api/leads.api";
import type { Lead } from "@/types/lead";

function apiErr(err: unknown): string {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message
    ?? "Something went wrong. Please try again.";
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
      <ChevronLeft className="size-3.5" /> Back
    </button>
  );
}

// Which call states show the 4-button disposition (the "callable" pre-visit states).
export const CALLABLE_STATES = [
  "NEW_LEAD", "ASSIGNED", "CONTACTED", "INTERESTED", "FOLLOW_UP", "CALLBACK", "NOT_CONNECTED",
];

type View =
  | null            // the top buttons
  | "interested"    // the 3 Interested sub-buttons
  | "callback" | "followup" | "visit" | "booking" | "notinterested" | "invalid";

export function CallerDisposition({ lead, onActionComplete }: {
  lead: Lead;
  onActionComplete: (updated: Lead) => void;
}) {
  const qc = useQueryClient();
  const [view, setView] = useState<View>(null);
  const [pending, setPending] = useState(false);

  // form fields (reused across the small inline forms)
  const [date, setDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [reason, setReason] = useState("");
  const [name, setName] = useState(lead.firstName && lead.firstName !== lead.phone ? lead.firstName : "");
  const [course, setCourse] = useState(lead.courseInterested ?? "");

  // "Invalid" (wrong number / fake) only applies while contact validity is still
  // unestablished — early call states. Hidden once the lead has engaged.
  const showInvalid = ["NEW_LEAD", "ASSIGNED", "CONTACTED", "NOT_CONNECTED"].includes(lead.status);

  function reset() { setView(null); setDate(""); setRemarks(""); setReason(""); }

  async function run(fn: () => Promise<Lead>) {
    setPending(true);
    try {
      const updated = await fn();
      onActionComplete(updated);
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead-activities", lead.id] });
      qc.invalidateQueries({ queryKey: ["lead-available-actions", lead.id] });
      reset();
      toast.success("Done ✓");
    } catch (e) {
      toast.error(apiErr(e));
    } finally {
      setPending(false);
    }
  }

  const couldntConnect = () => run(() => performLeadAction(lead.id, { action: "CALL_NOT_CONNECTED" }));

  // Call Back Later = reached, but busy. Intent unknown → stays with this caller
  // (not the retry pool), counts as a connected call, does NOT advance to Interested.
  const callback = () => run(() => performLeadAction(lead.id, {
    action: "REQUEST_CALLBACK", followUpAt: date, notes: remarks || undefined,
  }));

  // Follow-up Later → capture name + course so the next call doesn't start cold.
  const followUp = () => run(async () => {
    await updateLead(lead.id, { firstName: name || undefined, courseInterested: course || undefined });
    return performLeadAction(lead.id, { action: "SCHEDULE_FOLLOW_UP", followUpAt: date, notes: remarks || undefined });
  });

  // Plan Visit = offline path → capture the student's details, set delivery mode
  // (the gate requires it), then plan the visit.
  const planVisit = () => run(async () => {
    await updateLead(lead.id, {
      deliveryMode: "OFFLINE", firstName: name || undefined, courseInterested: course || undefined,
    });
    return performLeadAction(lead.id, { action: "PLAN_VISIT", visitDate: date, notes: remarks || undefined });
  });

  // Proceed to Booking = online path → capture details, set delivery mode online,
  // then confirm remote admission.
  const proceedBooking = () => run(async () => {
    await updateLead(lead.id, {
      deliveryMode: "ONLINE", firstName: name || undefined, courseInterested: course || undefined,
    });
    return performLeadAction(lead.id, { action: "CONFIRM_REMOTE_ADMISSION", notes: remarks || undefined });
  });

  const notInterested = () => run(() => performLeadAction(lead.id, {
    action: "MARK_NOT_INTERESTED", reason: reason || undefined, notes: remarks || undefined,
  }));

  const invalid = () => run(() => performLeadAction(lead.id, {
    action: "MARK_INVALID", reason, notes: remarks || undefined,
  }));

  // ── Small inline forms ────────────────────────────────────────────────────
  if (view === "callback") {
    return (
      <div className="space-y-3 p-4 rounded-lg border bg-cyan-50/40 border-cyan-200">
        <BackBtn onClick={reset} />
        <p className="text-xs font-semibold text-cyan-800">⏰ Call Back Later — reached, but they&apos;re busy. When should we call?</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Call back at</Label>
            <Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} /></div>
          <div><Label className="text-xs">Remarks</Label>
            <Input placeholder="e.g. after 6 PM, in a meeting" value={remarks} onChange={e => setRemarks(e.target.value)} /></div>
        </div>
        <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white"
          disabled={!date || pending} onClick={callback}>{pending ? "Saving…" : "Set Callback"}</Button>
      </div>
    );
  }

  if (view === "followup") {
    return (
      <div className="space-y-3 p-4 rounded-lg border bg-amber-50/40 border-amber-200">
        <BackBtn onClick={reset} />
        <p className="text-xs font-semibold text-amber-800">🔁 Follow-up Later — capture details so the next call doesn&apos;t start from scratch.</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Name <span className="text-red-500">*</span></Label>
            <Input placeholder="Student name" value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label className="text-xs">Next follow-up <span className="text-red-500">*</span></Label>
            <Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} /></div>
        </div>
        <div><Label className="text-xs">Course interested (optional)</Label>
          <CourseCombobox value={course} onChange={setCourse} /></div>
        <div><Label className="text-xs">Remarks <span className="text-red-500">*</span></Label>
          <Input placeholder="e.g. discuss fees with father, send brochure" value={remarks} onChange={e => setRemarks(e.target.value)} /></div>
        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white"
          disabled={!name.trim() || !date || !remarks.trim() || pending} onClick={followUp}>{pending ? "Saving…" : "Schedule Follow-up"}</Button>
      </div>
    );
  }

  if (view === "visit") {
    return (
      <div className="space-y-3 p-4 rounded-lg border bg-blue-50/40 border-blue-200">
        <BackBtn onClick={reset} />
        <p className="text-xs font-semibold text-blue-800">📅 Plan Visit — student will come to the institute (Offline)</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Name <span className="text-red-500">*</span></Label>
            <Input placeholder="Student name" value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label className="text-xs">Course interested</Label>
            <CourseCombobox value={course} onChange={setCourse} /></div>
        </div>
        <div><Label className="text-xs">Visit date &amp; time <span className="text-red-500">*</span></Label>
          <Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} /></div>
        <Input placeholder="Remarks (optional)" value={remarks} onChange={e => setRemarks(e.target.value)} />
        <p className="text-[11px] text-muted-foreground">City &amp; branch can be added on the lead&apos;s qualify screen.</p>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={!name.trim() || !date || pending} onClick={planVisit}>{pending ? "Saving…" : "Confirm Visit"}</Button>
      </div>
    );
  }

  if (view === "booking") {
    return (
      <div className="space-y-3 p-4 rounded-lg border bg-violet-50/40 border-violet-200">
        <BackBtn onClick={reset} />
        <p className="text-xs font-semibold text-violet-800">💳 Proceed to Booking — online admission (no visit)</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Name <span className="text-red-500">*</span></Label>
            <Input placeholder="Student name" value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label className="text-xs">Course interested</Label>
            <CourseCombobox value={course} onChange={setCourse} /></div>
        </div>
        <Input placeholder="Remarks (optional)" value={remarks} onChange={e => setRemarks(e.target.value)} />
        <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white"
          disabled={!name.trim() || pending} onClick={proceedBooking}>{pending ? "Saving…" : "Confirm — Proceed to Booking"}</Button>
      </div>
    );
  }

  if (view === "notinterested") {
    return (
      <div className="space-y-3 p-4 rounded-lg border bg-red-50/40 border-red-200">
        <BackBtn onClick={reset} />
        <p className="text-xs font-semibold text-red-800">🚫 Not Interested — why?</p>
        <Input placeholder="Reason (e.g. joined elsewhere, fee too high)" value={reason} onChange={e => setReason(e.target.value)} />
        <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white"
          disabled={pending} onClick={notInterested}>{pending ? "Saving…" : "Mark Not Interested"}</Button>
      </div>
    );
  }

  if (view === "invalid") {
    return (
      <div className="space-y-3 p-4 rounded-lg border bg-slate-50 border-slate-200">
        <BackBtn onClick={reset} />
        <p className="text-xs font-semibold text-slate-800">⚠️ Invalid Lead — why? <span className="text-red-600">(required)</span></p>
        <Input placeholder="Reason (e.g. wrong number, fake, no valid contact)" value={reason} onChange={e => setReason(e.target.value)} />
        <Button size="sm" className="bg-slate-600 hover:bg-slate-700 text-white"
          disabled={!reason.trim() || pending} onClick={invalid}>{pending ? "Saving…" : "Mark Invalid"}</Button>
      </div>
    );
  }

  // ── Interested → 3 next-action sub-buttons ────────────────────────────────
  if (view === "interested") {
    return (
      <div className="space-y-3 p-4 rounded-lg border bg-emerald-50/40 border-emerald-200">
        <BackBtn onClick={reset} />
        <p className="text-xs font-semibold text-emerald-800">🔥 Interested — what&apos;s the next step?</p>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" className="h-auto py-3 flex-col gap-1 border-amber-200 text-amber-700 hover:bg-amber-50"
            onClick={() => setView("followup")}><Calendar className="size-4" /><span className="text-xs">Follow-up Later</span></Button>
          <Button variant="outline" className="h-auto py-3 flex-col gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
            onClick={() => setView("visit")}><MapPin className="size-4" /><span className="text-xs">Plan Visit</span></Button>
          <Button variant="outline" className="h-auto py-3 flex-col gap-1 border-violet-200 text-violet-700 hover:bg-violet-50"
            onClick={() => setView("booking")}><CreditCard className="size-4" /><span className="text-xs">Proceed to Booking</span></Button>
        </div>
      </div>
    );
  }

  // ── The top buttons ───────────────────────────────────────────────────────
  // Grouped: connection results on top, the positive outcome highlighted in the
  // middle, negatives at the bottom.
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-auto py-3 flex-col gap-0.5 border-slate-200 hover:bg-slate-50"
          disabled={pending} onClick={couldntConnect}>
          <PhoneMissed className="size-5 text-slate-500" />
          <span className="text-sm font-medium">📞 Couldn&apos;t Connect</span>
          <span className="text-[10px] text-muted-foreground">no answer</span>
        </Button>
        <Button variant="outline" className="h-auto py-3 flex-col gap-0.5 border-cyan-200 text-cyan-700 hover:bg-cyan-50"
          disabled={pending} onClick={() => setView("callback")}>
          <Clock className="size-5" />
          <span className="text-sm font-medium">⏰ Call Back Later</span>
          <span className="text-[10px] text-muted-foreground">reached, but busy</span>
        </Button>
      </div>
      <Button className="w-full h-auto py-3 flex-col gap-1 bg-emerald-500 hover:bg-emerald-600 text-white"
        disabled={pending} onClick={() => setView("interested")}>
        <Flame className="size-5" /><span className="text-sm font-medium">🔥 Interested</span>
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline"
          className={`h-auto py-3 flex-col gap-1 border-red-200 text-red-700 hover:bg-red-50 ${showInvalid ? "" : "col-span-2"}`}
          disabled={pending} onClick={() => setView("notinterested")}>
          <ThumbsDown className="size-5" /><span className="text-sm font-medium">🚫 Not Interested</span>
        </Button>
        {showInvalid && (
          <Button variant="outline" className="h-auto py-3 flex-col gap-1 border-slate-200 text-slate-600 hover:bg-slate-50"
            disabled={pending} onClick={() => setView("invalid")}>
            <AlertTriangle className="size-5" /><span className="text-sm font-medium">⚠️ Invalid</span>
          </Button>
        )}
      </div>
    </div>
  );
}

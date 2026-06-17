"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Phone, PhoneMissed, UserCheck, Calendar, Handshake, ThumbsDown,
  FileText, ClipboardList, CheckCircle2, ChevronDown, AlertTriangle,
  GitBranch, DoorOpen, MessageSquare, Clock, Repeat, Building2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { getAvailableActions, performLeadAction, listCounsellors, counsellorLabel } from "@/lib/api/leads.api";
import type { Lead, AvailableAction, LeadActionRequest } from "@/types/lead";

// ── Helpers ───────────────────────────────────────────────────────────────────

function apiErr(err: unknown): string {
  return (err as { response?: { data?: { message?: string } } })
    ?.response?.data?.message ?? "Something went wrong. Please try again.";
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  STUDENT_VISITED: <Building2 className="size-3.5" />,
  MARK_CONTACTED:               <Phone className="size-3.5" />,
  MARK_INTERESTED:              <CheckCircle2 className="size-3.5" />,
  REQUEST_CALLBACK:             <Clock className="size-3.5" />,
  SCHEDULE_FOLLOW_UP:           <Calendar className="size-3.5" />,
  PLAN_VISIT:                   <Calendar className="size-3.5" />,
  RESCHEDULE_VISIT:             <Repeat className="size-3.5" />,
  CONFIRM_REMOTE_ADMISSION:     <UserCheck className="size-3.5" />,
  CALL_NOT_CONNECTED:           <PhoneMissed className="size-3.5" />,
  MARK_NOT_INTERESTED:          <ThumbsDown className="size-3.5" />,
  MARK_NOT_REACHABLE:           <PhoneMissed className="size-3.5" />,
  TRANSFER_BRANCH:              <GitBranch className="size-3.5" />,
  CONFIRM_VISIT:                <DoorOpen className="size-3.5" />,
  SCHEDULE_POST_VISIT_FOLLOWUP: <Calendar className="size-3.5" />,
  START_NEGOTIATION:            <MessageSquare className="size-3.5" />,
  REQUEST_DOCUMENTS:            <FileText className="size-3.5" />,
  MARK_DOCUMENTS_RECEIVED:      <CheckCircle2 className="size-3.5" />,
  START_ADMISSION:              <ClipboardList className="size-3.5" />,
  COMPLETE_ADMISSION:           <CheckCircle2 className="size-3.5" />,
  ADMIN_STATUS_OVERRIDE:        <AlertTriangle className="size-3.5" />,
  REASSIGN_COUNSELLOR:          <Handshake className="size-3.5" />,
};

const CALL_OUTCOME_OPTIONS = [
  { value: "INTERESTED",    label: "She's / He's interested" },
  { value: "CALLBACK",      label: "Asked for a callback" },
  { value: "FOLLOW_UP",     label: "Wants a follow-up" },
  { value: "NOT_INTERESTED",label: "Not interested" },
];

// ── Input panels per action ───────────────────────────────────────────────────

function ContactedPanel({ onSubmit, onCancel, isPending }: {
  onSubmit: (r: Partial<LeadActionRequest>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [outcome, setOutcome] = useState("");
  const [notes,   setNotes]   = useState("");
  return (
    <div className="space-y-3 p-4 rounded-lg border bg-emerald-50/40 border-emerald-200">
      <p className="text-xs font-semibold text-emerald-800">What was the outcome of the call?</p>
      <Select value={outcome} onValueChange={(v) => setOutcome(v ?? "")}>
        <SelectTrigger className="bg-white"><SelectValue placeholder="Select outcome…" /></SelectTrigger>
        <SelectContent>
          {CALL_OUTCOME_OPTIONS.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input placeholder="Notes (optional)…" value={notes} onChange={e => setNotes(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white"
          disabled={!outcome || isPending}
          onClick={() => onSubmit({ outcome, notes: notes || undefined })}>
          {isPending ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function DateInputPanel({ label, actionLabel, onSubmit, onCancel, isPending, field }: {
  label: string; actionLabel: string;
  onSubmit: (r: Partial<LeadActionRequest>) => void;
  onCancel: () => void; isPending: boolean;
  field: "visitDate" | "followUpAt";
}) {
  const [date,  setDate]  = useState("");
  const [notes, setNotes] = useState("");
  return (
    <div className="space-y-3 p-4 rounded-lg border bg-sky-50/40 border-sky-200">
      <p className="text-xs font-semibold text-sky-800">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Date & Time</Label>
          <Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Notes (optional)</Label>
          <Input placeholder="Quick note…" value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white"
          disabled={!date || isPending}
          onClick={() => onSubmit({ [field]: date, notes: notes || undefined })}>
          {isPending ? "Saving…" : actionLabel}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function ReasonPanel({ label, actionLabel, color = "red", onSubmit, onCancel, isPending }: {
  label: string; actionLabel: string; color?: "red" | "slate";
  onSubmit: (r: Partial<LeadActionRequest>) => void;
  onCancel: () => void; isPending: boolean;
}) {
  const [reason, setReason] = useState("");
  const bg    = color === "red"   ? "bg-red-50/40 border-red-200"     : "bg-slate-50/40 border-slate-200";
  const title = color === "red"   ? "text-red-800"                    : "text-slate-800";
  const btn   = color === "red"   ? "bg-red-500 hover:bg-red-600"     : "bg-slate-600 hover:bg-slate-700";
  return (
    <div className={`space-y-3 p-4 rounded-lg border ${bg}`}>
      <p className={`text-xs font-semibold ${title}`}>{label}</p>
      <Input placeholder="Reason (optional)…" value={reason} onChange={e => setReason(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" className={`${btn} text-white`}
          disabled={isPending}
          onClick={() => onSubmit({ reason: reason || undefined })}>
          {isPending ? "Saving…" : actionLabel}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function AdminOverridePanel({ onSubmit, onCancel, isPending }: {
  onSubmit: (r: Partial<LeadActionRequest>) => void;
  onCancel: () => void; isPending: boolean;
}) {
  const ALL_STATUSES = [
    "NEW_LEAD","ASSIGNED","CONTACTED","INTERESTED","FOLLOW_UP","CALLBACK",
    "VISIT_PLANNED","ADMISSION_INTERESTED","PAYMENT_PENDING","BOOKING_CONFIRMED",
    "VISIT_PENDING","VISIT_DONE","FOLLOW_UP_AFTER_VISIT","NEGOTIATION",
    "DOCUMENT_PENDING","ADMISSION_IN_PROGRESS","NOT_CONNECTED","NOT_INTERESTED",
    "NOT_REACHABLE","ADMISSION_DONE","CLOSED",
  ];
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  return (
    <div className="space-y-3 p-4 rounded-lg border bg-amber-50/40 border-amber-300">
      <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
        <AlertTriangle className="size-3.5" /> Admin Override — bypasses workflow
      </p>
      <Select value={status} onValueChange={(v) => setStatus(v ?? "")}>
        <SelectTrigger className="bg-white"><SelectValue placeholder="Set status to…" /></SelectTrigger>
        <SelectContent>
          {ALL_STATUSES.map(s => (
            <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Textarea
        placeholder="Reason (required — why are you bypassing the workflow?)"
        value={reason} onChange={e => setReason(e.target.value)} rows={2}
        className="text-sm"
      />
      <div className="flex gap-2">
        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white"
          disabled={!status || !reason.trim() || isPending}
          onClick={() => onSubmit({ overrideStatus: status, reason })}>
          {isPending ? "Applying…" : "Apply Override"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function StudentVisitedPanel({ onSubmit, onCancel, isPending }: {
  onSubmit: (r: Partial<LeadActionRequest>) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [counsellorId, setCounsellorId] = useState("");
  const [notes,        setNotes]        = useState("");
  const { data: counsellors = [] } = useQuery({
    queryKey: ["counsellors-for-handoff"],
    queryFn: listCounsellors,
    staleTime: 5 * 60_000,
  });
  return (
    <div className="space-y-3 p-4 rounded-lg border bg-emerald-50/50 border-emerald-300">
      <div className="flex items-center gap-2">
        <Building2 className="size-4 text-emerald-700 shrink-0" />
        <p className="text-sm font-semibold text-emerald-800">
          Student Visited — Hand Off to Counsellor
        </p>
      </div>
      <p className="text-xs text-emerald-700">
        This will mark the visit as done and transfer ownership to the selected counsellor.
        The counsellor will take over from here.
      </p>
      <div className="space-y-1">
        <label className="text-xs font-medium text-emerald-800">Assign Counsellor *</label>
        <Select value={counsellorId} onValueChange={(v) => setCounsellorId(v ?? "")}>
          <SelectTrigger className="bg-white border-emerald-200">
            <SelectValue placeholder="Select counsellor…" />
          </SelectTrigger>
          <SelectContent>
            {counsellors.map(c => (
              <SelectItem key={c.id} value={String(c.id)}>
                {counsellorLabel(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Input
        placeholder="Notes for counsellor (optional)…"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        className="bg-white border-emerald-200"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={!counsellorId || isPending}
          onClick={() => onSubmit({ counsellorId: Number(counsellorId), notes: notes || undefined })}
        >
          {isPending ? "Handing off…" : "Confirm — Student Visited"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function ReassignCounsellorPanel({ onSubmit, onCancel, isPending }: {
  onSubmit: (r: Partial<LeadActionRequest>) => void;
  onCancel: () => void; isPending: boolean;
}) {
  const [counsellorId, setCounsellorId] = useState("");
  const [reason,       setReason]       = useState("");
  const { data: counsellors = [] } = useQuery({
    queryKey: ["counsellors-for-handoff"],
    queryFn: listCounsellors,
    staleTime: 5 * 60_000,
  });
  return (
    <div className="space-y-3 p-4 rounded-lg border bg-sky-50/40 border-sky-200">
      <p className="text-xs font-semibold text-sky-800">Reassign to another Counsellor</p>
      <Select value={counsellorId} onValueChange={(v) => setCounsellorId(v ?? "")}>
        <SelectTrigger className="bg-white"><SelectValue placeholder="Select counsellor…" /></SelectTrigger>
        <SelectContent>
          {counsellors.map(c => (
            <SelectItem key={c.id} value={String(c.id)}>
              {c.fullName ?? `${c.firstName} ${c.lastName ?? ""}`.trim()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input placeholder="Reason (optional)…" value={reason} onChange={e => setReason(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white"
          disabled={!counsellorId || isPending}
          onClick={() => onSubmit({ counsellorId: Number(counsellorId), reason: reason || undefined })}>
          {isPending ? "Reassigning…" : "Confirm Reassign"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ── Main ActionPanel component ────────────────────────────────────────────────

interface ActionPanelProps {
  lead: Lead;
  onActionComplete: (updated: Lead) => void;
}

export function ActionPanel({ lead, onActionComplete }: ActionPanelProps) {
  const qc = useQueryClient();
  const router = useRouter();
  const [openAction, setOpenAction] = useState<string | null>(null);
  const [showAdminSection, setShowAdminSection] = useState(false);

  // "Start / Continue Admission Form" opens the admission form (prefilled from the
  // lead) rather than firing a workflow action. The lead advances to
  // ADMISSION_IN_PROGRESS when the admission record is created on that form.
  function goToAdmissionForm() {
    const params = new URLSearchParams({ leadId: String(lead.id) });
    if (lead.firstName) params.set("firstName", lead.firstName);
    if (lead.lastName) params.set("lastName", lead.lastName);
    if (lead.phone) params.set("phone", lead.phone);
    if (lead.email) params.set("email", lead.email);
    if (lead.courseInterested) params.set("course", lead.courseInterested);
    router.push(`/admissions/new?${params.toString()}`);
  }

  const { data: availableActions = [], isLoading } = useQuery({
    queryKey: ["lead-available-actions", lead.id],
    queryFn: () => getAvailableActions(lead.id),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const actionMutation = useMutation({
    mutationFn: (request: LeadActionRequest) => performLeadAction(lead.id, request),
    onSuccess: (updated) => {
      onActionComplete(updated);
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead-activities", lead.id] });
      qc.invalidateQueries({ queryKey: ["lead-available-actions", lead.id] });
      setOpenAction(null);
      toast.success("Done ✓");
    },
    onError: (err) => {
      toast.error(apiErr(err));
    },
  });

  function submit(action: string, extra: Partial<LeadActionRequest> = {}) {
    actionMutation.mutate({ action: action as LeadActionRequest["action"], ...extra });
  }

  // Group actions
  const groups: Record<string, AvailableAction[]> = {};
  for (const a of availableActions) {
    if (a.group === "Admin") continue; // rendered separately
    if (!groups[a.group]) groups[a.group] = [];
    groups[a.group].push(a);
  }
  const adminActions = availableActions.filter(a => a.group === "Admin");

  if (isLoading) {
    return <div className="h-12 rounded-lg bg-gray-100 animate-pulse" />;
  }

  if (availableActions.length === 0) return null;

  // ── Render input panel for the open action ────────────────────────────────

  function renderInputPanel(action: AvailableAction) {
    const a = action.action;
    if (a === "MARK_CONTACTED") {
      return <ContactedPanel
        onSubmit={r => submit(a, r)} onCancel={() => setOpenAction(null)}
        isPending={actionMutation.isPending} />;
    }
    if (a === "PLAN_VISIT" || a === "RESCHEDULE_VISIT") {
      return <DateInputPanel
        label={a === "PLAN_VISIT" ? "When will the student visit?" : "New visit date?"}
        actionLabel={a === "PLAN_VISIT" ? "Confirm Visit Date" : "Reschedule"}
        field="visitDate"
        onSubmit={r => submit(a, r)} onCancel={() => setOpenAction(null)}
        isPending={actionMutation.isPending} />;
    }
    if (a === "SCHEDULE_FOLLOW_UP" || a === "REQUEST_CALLBACK" || a === "SCHEDULE_POST_VISIT_FOLLOWUP") {
      return <DateInputPanel
        label="When should the follow-up happen?"
        actionLabel="Confirm"
        field="followUpAt"
        onSubmit={r => submit(a, r)} onCancel={() => setOpenAction(null)}
        isPending={actionMutation.isPending} />;
    }
    if (a === "MARK_NOT_INTERESTED") {
      return <ReasonPanel
        label="Why is the lead not interested?"
        actionLabel="Mark Not Interested"
        color="red"
        onSubmit={r => submit(a, r)} onCancel={() => setOpenAction(null)}
        isPending={actionMutation.isPending} />;
    }
    if (a === "REQUEST_DOCUMENTS") {
      return <ReasonPanel
        label="What documents are needed?"
        actionLabel="Request Documents"
        color="slate"
        onSubmit={r => submit(a, r)} onCancel={() => setOpenAction(null)}
        isPending={actionMutation.isPending} />;
    }
    if (a === "STUDENT_VISITED") {
      return <StudentVisitedPanel
        onSubmit={r => submit(a, r)} onCancel={() => setOpenAction(null)}
        isPending={actionMutation.isPending} />;
    }
    if (a === "ADMIN_STATUS_OVERRIDE") {
      return <AdminOverridePanel
        onSubmit={r => submit(a, r)} onCancel={() => setOpenAction(null)}
        isPending={actionMutation.isPending} />;
    }
    if (a === "REASSIGN_COUNSELLOR") {
      return <ReassignCounsellorPanel
        onSubmit={r => submit(a, r)} onCancel={() => setOpenAction(null)}
        isPending={actionMutation.isPending} />;
    }
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Action groups */}
      {Object.entries(groups).map(([group, actions]) => (
        <div key={group} className="space-y-2">
          {Object.keys(groups).length > 1 && (
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-0.5">
              {group}
            </p>
          )}
          {/* Show input panel if this group has the open action */}
          {actions.some(a => a.action === openAction) ? (
            renderInputPanel(actions.find(a => a.action === openAction)!)
          ) : (
            <div className="flex flex-wrap gap-2">
              {actions.map(action => {
                const icon = ACTION_ICONS[action.action];
                const isPrimary = action.primary;
                return (
                  <Button
                    key={action.action}
                    size="sm"
                    disabled={actionMutation.isPending}
                    className={
                      isPrimary
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white font-medium"
                        : "border border-slate-200 text-slate-700 hover:bg-slate-50 bg-white"
                    }
                    variant={isPrimary ? "default" : "outline"}
                    onClick={() => {
                      if (action.action === "START_ADMISSION") {
                        goToAdmissionForm();
                      } else if (action.requiresInput) {
                        setOpenAction(action.action);
                      } else {
                        submit(action.action);
                      }
                    }}
                  >
                    {icon}
                    {action.label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Admin override section — collapsed by default */}
      {adminActions.length > 0 && (
        <div className="pt-1">
          <button
            onClick={() => setShowAdminSection(v => !v)}
            className="flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 font-medium"
          >
            <AlertTriangle className="size-3" />
            Admin Override
            <ChevronDown className={`size-3 transition-transform ${showAdminSection ? "rotate-180" : ""}`} />
          </button>
          {showAdminSection && (
            <div className="mt-2">
              {openAction === "ADMIN_STATUS_OVERRIDE"
                ? renderInputPanel(adminActions.find(a => a.action === "ADMIN_STATUS_OVERRIDE")!)
                : openAction === "REASSIGN_COUNSELLOR"
                ? renderInputPanel(adminActions.find(a => a.action === "REASSIGN_COUNSELLOR")!)
                : (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {adminActions.map(action => (
                      <Button
                        key={action.action}
                        size="sm"
                        variant="outline"
                        disabled={actionMutation.isPending}
                        className="border-amber-300 text-amber-700 hover:bg-amber-50 text-xs"
                        onClick={() => setOpenAction(action.action)}
                      >
                        {ACTION_ICONS[action.action]}
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}

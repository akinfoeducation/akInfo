"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listCourses } from "@/lib/api/courses.api";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeft, Phone, Mail, Calendar, BookOpen, Edit2, Trash2,
  CheckCircle2, MessageCircle, ClipboardList, Plus, Clock,
  MapPin, Briefcase, Star, Users, UserMinus, History,
  GitBranch, UserCheck, DoorOpen, XCircle,
  GraduationCap, Handshake,
} from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { LeadSourceBadge } from "@/components/leads/LeadSourceBadge";
import {
  getLead, updateLead, deleteLead,
  listFollowUps, createFollowUp, markFollowUpDone,
  unassignLead, assignLead, listLeadActivities,
  listBranches, transferToBranch, listLeadTransfers,
  handoffToCounsellor, claimWalkIn, listCounsellors, counsellorLabel,
  createBooking, getLeadBooking, uploadPaymentProof, verifyPayment, cancelBooking,
} from "@/lib/api/leads.api";
import { ActionPanel } from "@/components/leads/ActionPanel";
import { listUsers } from "@/lib/api/users.api";
import { listAllBatches } from "@/lib/api/batches.api";
import type { Batch } from "@/types/course";
import { usePermissions } from "@/lib/hooks/usePermissions";
import type {
  Lead, LeadStatus, CurrentWork, InterestedFor,
  FollowUp, LeadActivity, Branch, LeadTransfer, AdmissionBooking,
} from "@/types/lead";

// ── Status option sets (role-aware) ──────────────────────────────────────────

// ── (Status arrays removed — action-driven workflow uses ActionPanel) ─────────


const CURRENT_WORK_OPTIONS: Array<{ value: CurrentWork; label: string }> = [
  { value: "JOB", label: "Job" }, { value: "FARMER", label: "Farmer" },
  { value: "STUDENT", label: "Student" }, { value: "BUSINESS", label: "Business" },
  { value: "NO_WORK", label: "No Work" },
];

const INTERESTED_FOR_OPTIONS: Array<{ value: InterestedFor; label: string }> = [
  { value: "JOB", label: "Job" }, { value: "ABROAD", label: "Abroad" },
  { value: "HOBBY", label: "Hobby" }, { value: "BUSINESS", label: "Business" },
  { value: "JOB_AND_BUSINESS", label: "Job & Business" },
];

const editSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid mobile number"),
  whatsappNumber: z.string().regex(/^[6-9]\d{9}$/, "Invalid number").optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  courseInterested: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  currentWork: z.string().optional().or(z.literal("")),
  interestedFor: z.string().optional().or(z.literal("")),
  nextFollowUpAt: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});
type EditForm = z.infer<typeof editSchema>;

// ── Small helpers ─────────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

function apiErr(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

function transferLabel(t: LeadTransfer): string {
  switch (t.transferType) {
    case "BRANCH_TRANSFER":    return `Transferred to ${t.toBranchName ?? "branch"}`;
    case "POOL_CLAIM":         return "Claimed from retry pool";
    case "COUNSELLOR_HANDOFF": return `Handed off to counsellor (ID ${t.toCallerId})`;
    case "WALK_IN_CLAIM":      return `Walk-in claimed by counsellor (ID ${t.toCallerId})`;
    case "REASSIGN":           return "Reassigned";
    default:                   return t.transferType.replace(/_/g, " ");
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const leadId = Number(id);
  const router = useRouter();
  const qc = useQueryClient();
  const perms = usePermissions();

  const isCounsellor = perms.isCounsellor();
  const canHandoff   = perms.canHandoff();
  const canAssign    = perms.canAssignCaller();
  const isAdmin      = perms.isAdmin();
  // Payment verification is gated on the permission, not the role, so the
  // ACCOUNTANT (primary authority) sees it too — not just admins (the fallback).
  const canVerify    = perms.has("BOOKING_VERIFY");
  const userId       = perms.userId;

  // ── Local state ──────────────────────────────────────────────────────────
  const [editing, setEditing]                       = useState(false);
  const [confirmDelete, setConfirmDelete]           = useState(false);
  const [showFollowUpForm, setShowFollowUpForm]     = useState(false);
  const [followUpDate, setFollowUpDate]             = useState("");
  const [followUpRemarks, setFollowUpRemarks]       = useState("");
  const [reassignCallerId, setReassignCallerId]     = useState("");
  const [showReassign, setShowReassign]             = useState(false);
  const [showTransfer, setShowTransfer]             = useState(false);
  const [transferBranchId, setTransferBranchId]     = useState("");
  const [transferNotes, setTransferNotes]           = useState("");
  const [showHandoff, setShowHandoff]               = useState(false);
  const [handoffCounsellorId, setHandoffCounsellorId] = useState("");
  const [handoffNotes, setHandoffNotes]             = useState("");
  const [showBookingForm, setShowBookingForm]       = useState(false);
  const [bookingBatchId, setBookingBatchId]         = useState("");
  const [bookingAmount, setBookingAmount]           = useState("");
  const [bookingNotes, setBookingNotes]             = useState("");
  const [proofUrl, setProofUrl]                     = useState("");
  const [confirmCancel, setConfirmCancel]           = useState(false);
  const [cancelReason, setCancelReason]             = useState("");

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => getLead(leadId),
    staleTime: 30_000, refetchOnWindowFocus: false,
  });

  const { data: followUps = [] } = useQuery({
    queryKey: ["follow-ups", leadId],
    queryFn: () => listFollowUps(leadId),
    enabled: !!leadId, staleTime: 30_000, refetchOnWindowFocus: false,
  });

  const { data: coursesData } = useQuery({
    queryKey: ["courses", "ACTIVE"],
    queryFn: () => listCourses("ACTIVE"),
    staleTime: 5 * 60_000,
  });
  const courses = coursesData?.data ?? [];

  const { data: callersData } = useQuery({
    queryKey: ["users", "CALLER"],
    queryFn: () => listUsers({ role: "CALLER", size: 100, status: "active" }),
    staleTime: 2 * 60_000, enabled: canAssign || isAdmin,
  });
  const callers = callersData?.data ?? [];

  const { data: counsellors = [] } = useQuery({
    queryKey: ["counsellors-for-handoff"],
    queryFn: listCounsellors,
    staleTime: 5 * 60_000,
    enabled: canHandoff || isAdmin,
  });

  const { data: activities = [] } = useQuery<LeadActivity[]>({
    queryKey: ["lead-activities", leadId],
    queryFn: () => listLeadActivities(leadId),
    staleTime: 30_000, refetchOnWindowFocus: false,
  });

  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: listBranches,
    staleTime: 5 * 60_000,
  });

  const { data: transferHistory = [] } = useQuery<LeadTransfer[]>({
    queryKey: ["lead-transfers", leadId],
    queryFn: () => listLeadTransfers(leadId),
    staleTime: 30_000, refetchOnWindowFocus: false,
  });

  const { data: booking = null } = useQuery<AdmissionBooking | null>({
    queryKey: ["lead-booking", leadId],
    queryFn: async () => {
      try { return await getLeadBooking(leadId); } catch { return null; }
    },
    staleTime: 30_000, refetchOnWindowFocus: false,
  });

  const { data: batches = [] } = useQuery<Batch[]>({
    queryKey: ["batches", "ACTIVE"],
    queryFn: () => listAllBatches({ status: "ACTIVE" }),
    staleTime: 5 * 60_000, enabled: showBookingForm,
  });

  const invalidateLead = () => {
    qc.invalidateQueries({ queryKey: ["lead", leadId] });
    qc.invalidateQueries({ queryKey: ["leads"] });
    qc.invalidateQueries({ queryKey: ["lead-activities", leadId] });
  };

  // ── Form ─────────────────────────────────────────────────────────────────
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  });
  const courseInterestedValue = watch("courseInterested");
  const currentWorkValue      = watch("currentWork");
  const interestedForValue    = watch("interestedFor");

  function startEditing() {
    if (!lead) return;
    reset({
      firstName: lead.firstName, lastName: lead.lastName ?? "",
      phone: lead.phone, whatsappNumber: lead.whatsappNumber ?? "",
      email: lead.email ?? "", courseInterested: lead.courseInterested ?? "",
      address: lead.address ?? "", currentWork: lead.currentWork ?? "",
      interestedFor: lead.interestedFor ?? "",
      nextFollowUpAt: lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toISOString().slice(0, 16) : "",
      notes: lead.notes ?? "",
    });
    setEditing(true);
  }

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (values: EditForm) => updateLead(leadId, {
      ...values,
      whatsappNumber: values.whatsappNumber || undefined,
      email: values.email || undefined,
      courseInterested: values.courseInterested || undefined,
      address: values.address || undefined,
      currentWork: (values.currentWork as CurrentWork) || undefined,
      interestedFor: (values.interestedFor as InterestedFor) || undefined,
      nextFollowUpAt: values.nextFollowUpAt || undefined,
      notes: values.notes || undefined,
    }),
    onSuccess: (updated) => {
      qc.setQueryData(["lead", leadId], updated);
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead updated");
      setEditing(false);
    },
    onError: (err) => {
      const msg = apiErr(err) ?? "Failed to update lead.";
      if (msg.includes("modified by another")) {
        toast.error("This lead was updated by someone else. Reloading…");
        qc.invalidateQueries({ queryKey: ["lead", leadId] });
      } else toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteLead(leadId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead deleted");
      router.push("/leads");
    },
    onError: () => { toast.error("Failed to delete lead."); setConfirmDelete(false); },
  });

  const unassignMutation = useMutation({
    mutationFn: () => unassignLead(leadId),
    onSuccess: updated => { qc.setQueryData(["lead", leadId], updated); invalidateLead(); toast.success("Unassigned"); },
    onError: () => toast.error("Failed to unassign."),
  });

  const reassignMutation = useMutation({
    mutationFn: (callerId: number) => assignLead(leadId, callerId),
    onSuccess: updated => {
      qc.setQueryData(["lead", leadId], updated); invalidateLead();
      toast.success("Reassigned"); setShowReassign(false); setReassignCallerId("");
    },
    onError: () => toast.error("Failed to reassign."),
  });

  const branchTransferMutation = useMutation({
    mutationFn: () => transferToBranch(leadId, { branchId: Number(transferBranchId), notes: transferNotes || undefined }),
    onSuccess: (updated) => {
      qc.setQueryData(["lead", leadId], updated); invalidateLead();
      qc.invalidateQueries({ queryKey: ["lead-transfers", leadId] });
      toast.success("Transferred to branch");
      setShowTransfer(false); setTransferBranchId(""); setTransferNotes("");
    },
    onError: (err) => toast.error(apiErr(err) ?? "Transfer failed."),
  });

  const handoffMutation = useMutation({
    mutationFn: () => handoffToCounsellor(leadId, { counsellorId: Number(handoffCounsellorId), notes: handoffNotes || undefined }),
    onSuccess: (updated) => {
      qc.setQueryData(["lead", leadId], updated); invalidateLead();
      qc.invalidateQueries({ queryKey: ["lead-transfers", leadId] });
      toast.success("Lead handed off to counsellor successfully");
      setShowHandoff(false); setHandoffCounsellorId(""); setHandoffNotes("");
    },
    onError: (err) => toast.error(apiErr(err) ?? "Handoff failed."),
  });

  const walkInClaimMutation = useMutation({
    mutationFn: () => claimWalkIn(leadId),
    onSuccess: (updated) => {
      qc.setQueryData(["lead", leadId], updated); invalidateLead();
      qc.invalidateQueries({ queryKey: ["lead-transfers", leadId] });
      toast.success("Walk-in claimed — lead is now yours");
    },
    onError: (err) => toast.error(apiErr(err) ?? "Could not claim."),
  });

  const followUpMutation = useMutation({
    mutationFn: () => createFollowUp(leadId, { scheduledAt: followUpDate, remarks: followUpRemarks }),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["follow-ups", leadId] });
      const previous = qc.getQueryData<FollowUp[]>(["follow-ups", leadId]) ?? [];
      const optimistic: FollowUp = { id: -Date.now(), leadId, scheduledAt: followUpDate, remarks: followUpRemarks, done: false, createdAt: new Date().toISOString() };
      qc.setQueryData(["follow-ups", leadId], [...previous, optimistic]);
      return { previous };
    },
    onSuccess: (saved) => {
      qc.setQueryData<FollowUp[]>(["follow-ups", leadId], (old) => (old ?? []).map(fu => fu.id < 0 ? saved : fu));
      qc.invalidateQueries({ queryKey: ["follow-ups", "pending"] });
      toast.success("Follow-up scheduled");
      setShowFollowUpForm(false); setFollowUpDate(""); setFollowUpRemarks("");
    },
    onError: (_err, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(["follow-ups", leadId], ctx.previous);
      toast.error("Failed to schedule follow-up.");
    },
  });

  const markDoneMutation = useMutation({
    mutationFn: (fuId: number) => markFollowUpDone(fuId),
    onMutate: async (fuId) => {
      await qc.cancelQueries({ queryKey: ["follow-ups", leadId] });
      const previous = qc.getQueryData<FollowUp[]>(["follow-ups", leadId]) ?? [];
      qc.setQueryData<FollowUp[]>(["follow-ups", leadId], previous.map(fu => fu.id === fuId ? { ...fu, done: true, completedAt: new Date().toISOString() } : fu));
      return { previous };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["follow-ups", "pending"] }),
    onError: (_err, _id, ctx) => { if (ctx?.previous) qc.setQueryData(["follow-ups", leadId], ctx.previous); toast.error("Failed."); },
  });

  const createBookingMutation = useMutation({
    mutationFn: () => createBooking(leadId, {
      batchId: Number(bookingBatchId),
      paymentAmount: bookingAmount ? Number(bookingAmount) : undefined,
      notes: bookingNotes || undefined,
      bookingType: isCounsellor ? "ADMISSION_CLOSING" : "REMOTE_TOKEN",
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-booking", leadId] });
      qc.setQueryData<Lead>(["lead", leadId], old => old ? { ...old, status: "PAYMENT_PENDING" } : old);
      toast.success("Booking created — awaiting payment proof");
      setShowBookingForm(false); setBookingBatchId(""); setBookingAmount(""); setBookingNotes("");
    },
    onError: (err) => toast.error(apiErr(err) ?? "Failed to create booking."),
  });

  const uploadProofMutation = useMutation({
    mutationFn: ({ bookingId, url }: { bookingId: number; url: string }) => uploadPaymentProof(bookingId, url),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lead-booking", leadId] }); toast.success("Payment proof uploaded"); setProofUrl(""); },
    onError: (err) => toast.error(apiErr(err) ?? "Upload failed."),
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: (bookingId: number) => verifyPayment(bookingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-booking", leadId] });
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
      toast.success("Payment verified — seat reserved!");
    },
    onError: (err) => toast.error(apiErr(err) ?? "Verification failed."),
  });

  const cancelBookingMutation = useMutation({
    mutationFn: (bookingId: number) => cancelBooking(bookingId, cancelReason || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-booking", leadId] });
      qc.invalidateQueries({ queryKey: ["lead", leadId] });
      toast.success("Booking cancelled");
      setConfirmCancel(false); setCancelReason("");
    },
    onError: (err) => toast.error(apiErr(err) ?? "Cancel failed."),
  });

  // ── Guards ────────────────────────────────────────────────────────────────
  if (isLoading) return (
    <div className="max-w-3xl space-y-6">
      <Skeleton className="h-8 w-48" /><Skeleton className="h-48 w-full" /><Skeleton className="h-32 w-full" />
    </div>
  );

  if (!lead) return (
    <div className="text-center py-20 text-muted-foreground">
      Lead not found. <Link href="/leads" className="text-emerald-600 hover:underline">Back to leads</Link>
    </div>
  );

  // ── Derived flags ─────────────────────────────────────────────────────────
  // Use stage when available (new action-driven model); fall back to status inference
  const isTerminal = lead.stage === "ADMITTED" || lead.stage === "DEAD"
    || lead.status === "ADMISSION_DONE" || lead.status === "CLOSED";

  // Post-visit = counsellor pipeline stage OR counsellor assigned OR status in counsellor phase
  const COUNSELLOR_PHASE_STATUSES: LeadStatus[] = [
    "VISIT_DONE", "FOLLOW_UP_AFTER_VISIT", "NEGOTIATION",
    "DOCUMENT_PENDING", "ADMISSION_IN_PROGRESS",
  ];
  const isPostVisit = lead.stage === "COUNSELLOR_PIPELINE"
    || !!lead.counsellorId
    || COUNSELLOR_PHASE_STATUSES.includes(lead.status);

  const isMyLead   = lead.assignedToId === userId;
  const canEdit    = isAdmin || isMyLead;

  const showCallerActions = !isTerminal && !isPostVisit && !isCounsellor;

  // Handoff is allowed when:
  //  - OFFLINE: status is VISIT_DONE, BOOKING_CONFIRMED, or VISIT_PENDING (student arrived)
  //  - ONLINE:  status is ADMISSION_INTERESTED or BOOKING_CONFIRMED (remote, no visit)
  //  - No counsellor assigned yet
  // NOTE: VISIT_PLANNED is intentionally excluded — handoff from a planned visit
  // happens through the "Student Visited — Hand Off to Counsellor" action in the
  // ActionPanel, which marks VISIT_DONE and assigns the counsellor in one step.
  const HANDOFF_ELIGIBLE_STATUSES: LeadStatus[] = [
    "VISIT_DONE", "VISIT_PENDING",
    "ADMISSION_INTERESTED", "BOOKING_CONFIRMED",
  ];
  const canDoHandoff = canHandoff && !isTerminal && !lead.counsellorId
    && (isAdmin || HANDOFF_ELIGIBLE_STATUSES.includes(lead.status));

  const canClaimWalkIn = canHandoff && isCounsellor && !lead.counsellorId && !isTerminal;

  // Booking can be created when:
  //  - No active booking exists
  //  - Lead is at ADMISSION_INTERESTED (caller remote booking) OR in counsellor phase (in-person closing)
  const BOOKING_ELIGIBLE_STATUSES: LeadStatus[] = [
    "ADMISSION_INTERESTED", "VISIT_DONE", "FOLLOW_UP_AFTER_VISIT",
    "NEGOTIATION", "BOOKING_CONFIRMED",
  ];
  const canCreateBooking = !booking && !isTerminal && (isAdmin || isMyLead)
    && BOOKING_ELIGIBLE_STATUSES.includes(lead.status);

  return (
    <div className="max-w-3xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/leads">
            <Button variant="ghost" size="icon-sm"><ArrowLeft className="size-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold">{lead.fullName}</h1>
              <LeadStatusBadge status={lead.status} />
              {isPostVisit && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  Counsellor
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Added {format(new Date(lead.createdAt), "dd MMM yyyy")}
              {lead.visitDoneAt && <> · Visited {format(new Date(lead.visitDoneAt), "dd MMM yyyy")}</>}
              {lead.admissionDoneAt && <> · Admitted {format(new Date(lead.admissionDoneAt), "dd MMM yyyy")}</>}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {!editing && canEdit && lead.status !== "ADMISSION_DONE" && lead.status !== "CLOSED" && (
            <Button variant="outline" size="sm" onClick={startEditing}><Edit2 className="size-3.5" /> Edit</Button>
          )}
          {isAdmin && (
            !confirmDelete
              ? <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setConfirmDelete(true)}><Trash2 className="size-3.5" /></Button>
              : <div className="flex gap-1">
                  <Button size="sm" variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
                    {deleteMutation.isPending ? "…" : "Confirm Delete"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                </div>
          )}
        </div>
      </div>

      {/* Counsellor ownership banner */}
      {isPostVisit && lead.counsellorId && (
        <Card className="p-4 flex items-center gap-3 bg-sky-50 border-sky-200">
          <UserCheck className="size-5 text-sky-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-sky-800">
              Counsellor assigned
              {lead.counsellorId === userId && <span className="ml-1.5 text-sky-600 font-semibold">(you)</span>}
            </p>
            {lead.handedOffAt && (
              <p className="text-xs text-sky-600">
                Handed off {formatDistanceToNow(new Date(lead.handedOffAt), { addSuffix: true })}
              </p>
            )}
          </div>
          {lead.callerId && (
            <p className="text-xs text-muted-foreground">Original caller: ID {lead.callerId}</p>
          )}
        </Card>
      )}

      {/* Admission Done milestone */}
      {lead.status === "ADMISSION_DONE" && (
        <Card className="p-4 flex items-center gap-3 bg-green-50 border-green-200">
          <GraduationCap className="size-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">Admission Complete</p>
            {lead.admissionDoneAt && (
              <p className="text-xs text-green-600">{format(new Date(lead.admissionDoneAt), "dd MMM yyyy 'at' hh:mm a")}</p>
            )}
          </div>
        </Card>
      )}

      {/* Booking confirmed milestone */}
      {lead.status === "BOOKING_CONFIRMED" && (
        <Card className="p-4 flex items-center gap-3 bg-emerald-50 border-emerald-200">
          <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-800">Seat Reserved — Booking Confirmed</p>
            <p className="text-xs text-emerald-600">
              {lead.bookingConfirmedAt
                ? format(new Date(lead.bookingConfirmedAt), "dd MMM yyyy 'at' hh:mm a")
                : "Admission process not yet complete"}
            </p>
          </div>
        </Card>
      )}

      {/* Action Panel — action-driven workflow (Callers & Counsellors) */}
      {!isTerminal && canEdit && !isAdmin && (
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            What happened?
          </p>
          <ActionPanel
            lead={lead}
            onActionComplete={(updated) => {
              qc.setQueryData(["lead", leadId], updated);
              qc.invalidateQueries({ queryKey: ["leads"] });
              qc.invalidateQueries({ queryKey: ["lead-activities", leadId] });
            }}
          />
        </Card>
      )}

      {/* Status change — Admin override dropdown (Admin only) */}
      {!isTerminal && isAdmin && (
        <Card className="p-4 space-y-3">
          <ActionPanel
            lead={lead}
            onActionComplete={(updated) => {
              qc.setQueryData(["lead", leadId], updated);
              qc.invalidateQueries({ queryKey: ["leads"] });
              qc.invalidateQueries({ queryKey: ["lead-activities", leadId] });
            }}
          />
        </Card>
      )}

      {/* Caller quick actions — Branch transfer only; it has no ActionPanel
          equivalent. "Not Connected" lives in the ActionPanel now (and is gated
          to pre-visit states), so the old standalone button was removed. */}
      {showCallerActions && branches.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="border-violet-300 text-violet-700 hover:bg-violet-50"
            onClick={() => setShowTransfer(v => !v)}>
            <GitBranch className="size-3.5" /> Transfer to Branch
          </Button>
        </div>
      )}

      {/* Walk-in claim card */}
      {canClaimWalkIn && !isPostVisit && (
        <Card className="p-4 flex items-center gap-3 bg-sky-50/50 border-sky-200 border-dashed">
          <DoorOpen className="size-5 text-sky-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-sky-800">Walk-in Lead</p>
            <p className="text-xs text-sky-600">Claim this lead to start counselling directly</p>
          </div>
          <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white"
            disabled={walkInClaimMutation.isPending} onClick={() => walkInClaimMutation.mutate()}>
            {walkInClaimMutation.isPending ? "Claiming…" : "Claim as Walk-in"}
          </Button>
        </Card>
      )}

      {/* Branch Transfer panel */}
      {showTransfer && (
        <Card className="p-4 space-y-3 border-violet-200 bg-violet-50/40">
          <h3 className="text-sm font-medium text-violet-900">Transfer Lead to Branch</h3>
          <Select value={transferBranchId} onValueChange={(v) => setTransferBranchId(v ?? "")}>
            <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Select branch…" /></SelectTrigger>
            <SelectContent>
              {branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <textarea
            className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="Transfer notes (optional)…" value={transferNotes} onChange={e => setTransferNotes(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white"
              disabled={!transferBranchId || branchTransferMutation.isPending}
              onClick={() => branchTransferMutation.mutate()}>
              {branchTransferMutation.isPending ? "Transferring…" : "Confirm Transfer"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowTransfer(false); setTransferBranchId(""); setTransferNotes(""); }}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Handoff to Counsellor */}
      {canDoHandoff && (
        <div>
          {!showHandoff ? (
            <Button variant="outline" size="sm" className="border-sky-300 text-sky-700 hover:bg-sky-50"
              onClick={() => setShowHandoff(true)}>
              <Handshake className="size-3.5" /> Hand off to Counsellor
            </Button>
          ) : (
            <Card className="p-4 space-y-3 border-sky-200 bg-sky-50/40">
              <h3 className="text-sm font-medium text-sky-900 flex items-center gap-2">
                <Handshake className="size-4" /> Hand Off to Counsellor
              </h3>
              <p className="text-xs text-sky-700">
                Marks the lead as <strong>Visit Done</strong> and transfers ownership to the selected counsellor.
              </p>
              <Select value={handoffCounsellorId} onValueChange={(v) => setHandoffCounsellorId(v ?? "")}>
                <SelectTrigger className="w-full bg-white"><SelectValue placeholder="Select counsellor…" /></SelectTrigger>
                <SelectContent>
                  {counsellors.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {counsellorLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Handoff notes (optional)…" value={handoffNotes} onChange={e => setHandoffNotes(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white"
                  disabled={!handoffCounsellorId || handoffMutation.isPending}
                  onClick={() => handoffMutation.mutate()}>
                  {handoffMutation.isPending ? "Handing off…" : "Confirm Handoff"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowHandoff(false); setHandoffCounsellorId(""); setHandoffNotes(""); }}>Cancel</Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Booking section */}
      {(booking || canCreateBooking) && (
        <Card className="p-6 space-y-4">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <ClipboardList className="size-3.5" /> Admission Booking
          </h2>

          {/* Active booking detail */}
          {booking && booking.active !== false && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {booking.batchName ?? `Batch #${booking.batchId}`}
                    {booking.bookingType && (
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded font-medium ${
                        booking.bookingType === "REMOTE_TOKEN"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}>
                        {booking.bookingType === "REMOTE_TOKEN" ? "Remote Token" : "In-person"}
                      </span>
                    )}
                  </p>
                  {booking.paymentAmount && (
                    <p className="text-xs text-muted-foreground mt-0.5">Amount: ₹{booking.paymentAmount.toLocaleString()}</p>
                  )}
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-md border ${
                  booking.bookingStatus === "BOOKING_CONFIRMED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : booking.bookingStatus === "PAYMENT_PENDING"
                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                    : "bg-gray-50 text-gray-600 border-gray-200"
                }`}>
                  {booking.bookingStatus.replace(/_/g, " ")}
                </span>
              </div>

              {/* Upload proof */}
              {booking.bookingStatus === "PAYMENT_PENDING" && !booking.paymentProofUrl && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Payment proof URL (UTR / screenshot link)…"
                    className="text-sm" value={proofUrl} onChange={e => setProofUrl(e.target.value)}
                  />
                  <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white shrink-0"
                    disabled={!proofUrl || uploadProofMutation.isPending}
                    onClick={() => uploadProofMutation.mutate({ bookingId: booking.id, url: proofUrl })}>
                    {uploadProofMutation.isPending ? "Uploading…" : "Upload Proof"}
                  </Button>
                </div>
              )}
              {booking.paymentProofUrl && booking.bookingStatus === "PAYMENT_PENDING" && (
                <p className="text-xs text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" /> Proof uploaded ·{" "}
                  <a href={booking.paymentProofUrl} target="_blank" rel="noreferrer" className="underline">View</a>
                </p>
              )}

              {/* Payment verification — ACCOUNTANT (primary) or Admin (fallback) */}
              {canVerify && booking.bookingStatus === "PAYMENT_PENDING" && booking.paymentProofUrl && (
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={verifyPaymentMutation.isPending}
                  onClick={() => verifyPaymentMutation.mutate(booking.id)}>
                  {verifyPaymentMutation.isPending ? "Verifying…" : "Verify & Confirm Booking"}
                </Button>
              )}

              {booking.paymentVerifiedAt && (
                <p className="text-xs text-muted-foreground">
                  Verified {format(new Date(booking.paymentVerifiedAt), "dd MMM yyyy 'at' hh:mm a")}
                </p>
              )}

              {/* Cancel booking */}
              {(isAdmin || isCounsellor) && booking.bookingStatus !== "CANCELLED" && (
                <div>
                  {!confirmCancel ? (
                    <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => setConfirmCancel(true)}>
                      <XCircle className="size-3.5" /> Cancel Booking
                    </Button>
                  ) : (
                    <div className="space-y-2 p-3 rounded-lg border border-red-200 bg-red-50/40">
                      <p className="text-xs font-medium text-red-800">
                        Cancel this booking?
                        {booking.bookingStatus === "BOOKING_CONFIRMED" && " Seat will be restored."}
                      </p>
                      <Input placeholder="Reason (optional)…" value={cancelReason} onChange={e => setCancelReason(e.target.value)} className="text-sm" />
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" disabled={cancelBookingMutation.isPending}
                          onClick={() => cancelBookingMutation.mutate(booking.id)}>
                          {cancelBookingMutation.isPending ? "Cancelling…" : "Confirm Cancel"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setConfirmCancel(false); setCancelReason(""); }}>Keep Booking</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Create booking */}
          {canCreateBooking && !booking && (
            <div>
              {!showBookingForm ? (
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={() => setShowBookingForm(true)}>
                  <Plus className="size-3.5" /> Create Booking
                </Button>
              ) : (
                <div className="space-y-3 p-4 rounded-lg border bg-gray-50/50">
                  <p className="text-xs font-medium text-gray-700">
                    {isCounsellor ? "In-person Admission Booking" : "Remote Token Booking"}
                  </p>
                  <Select value={bookingBatchId} onValueChange={(v) => setBookingBatchId(v ?? "")}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="Select batch…" /></SelectTrigger>
                    <SelectContent>
                      {batches.map((b: Batch) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          {b.name}{b.availableSeats != null ? ` (${b.availableSeats} seats)` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Amount (₹)</Label>
                      <Input type="number" placeholder="e.g. 1000" value={bookingAmount} onChange={e => setBookingAmount(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Notes</Label>
                      <Input placeholder="Optional…" value={bookingNotes} onChange={e => setBookingNotes(e.target.value)} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      disabled={!bookingBatchId || createBookingMutation.isPending}
                      onClick={() => createBookingMutation.mutate()}>
                      {createBookingMutation.isPending ? "Creating…" : "Create Booking"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowBookingForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Transfer / Handoff history */}
      {transferHistory.length > 0 && (
        <Card className="p-4">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Transfer & Handoff History</h2>
          <div className="space-y-2">
            {transferHistory.map(t => (
              <div key={t.id} className="flex items-start gap-2 text-sm">
                <GitBranch className="size-3.5 mt-0.5 text-violet-500 shrink-0" />
                <div>
                  <span className="font-medium text-gray-700">{transferLabel(t)}</span>
                  {t.notes && <span className="text-muted-foreground"> — {t.notes}</span>}
                  <p className="text-xs text-muted-foreground">{format(new Date(t.transferredAt), "dd MMM yyyy 'at' hh:mm a")}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* View / Edit profile */}
      {!editing ? (
        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Contact Info</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
              <InfoRow icon={<Phone className="size-4" />}      label="Phone"             value={lead.phone} />
              <InfoRow icon={<MessageCircle className="size-4" />} label="WhatsApp"       value={lead.whatsappNumber} />
              <InfoRow icon={<Mail className="size-4" />}       label="Email"             value={lead.email} />
              <InfoRow icon={<MapPin className="size-4" />}     label="Address"           value={lead.address} />
              <InfoRow icon={<BookOpen className="size-4" />}   label="Course Interested" value={lead.courseInterested} />
              <InfoRow icon={<Briefcase className="size-4" />}  label="Current Work"      value={lead.currentWork?.replace(/_/g, " ")} />
              <InfoRow icon={<Star className="size-4" />}       label="Interested For"    value={lead.interestedFor?.replace(/_/g, " ")} />
              <InfoRow icon={<div />}                           label="Source"            value={<LeadSourceBadge source={lead.source} />} />
              <InfoRow
                icon={<Calendar className="size-4" />}
                label="Next Follow-up"
                value={lead.nextFollowUpAt ? format(new Date(lead.nextFollowUpAt), "dd MMM yyyy 'at' hh:mm a") : undefined}
              />
            </div>
          </Card>
          {lead.notes && (
            <Card className="p-6">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Notes</h2>
              <p className="text-sm whitespace-pre-wrap text-gray-700">{lead.notes}</p>
            </Card>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit((v) => updateMutation.mutate(v))} className="space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Edit Lead</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name" error={errors.firstName?.message}><Input {...register("firstName")} /></Field>
              <Field label="Last Name"><Input {...register("lastName")} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone" error={errors.phone?.message}><Input maxLength={10} {...register("phone")} /></Field>
              <Field label="WhatsApp" error={errors.whatsappNumber?.message}><Input maxLength={10} {...register("whatsappNumber")} /></Field>
            </div>
            <Field label="Email" error={errors.email?.message}><Input type="email" {...register("email")} /></Field>
            <Field label="Address"><Input {...register("address")} placeholder="City, area…" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Current Work">
                <Select value={currentWorkValue || "__none"} onValueChange={(v) => setValue("currentWork", !v || v === "__none" ? "" : v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Not specified —</SelectItem>
                    {CURRENT_WORK_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Interested For">
                <Select value={interestedForValue || "__none"} onValueChange={(v) => setValue("interestedFor", !v || v === "__none" ? "" : v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Not specified —</SelectItem>
                    {INTERESTED_FOR_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Course Interested">
                <Select value={courseInterestedValue || "__none"} onValueChange={(v) => setValue("courseInterested", !v || v === "__none" ? "" : v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select a course…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">— Not specified —</SelectItem>
                    {courses.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Next Follow-up"><Input type="datetime-local" {...register("nextFollowUpAt")} /></Field>
            </div>
            <Field label="Notes"><Textarea rows={3} {...register("notes")} /></Field>
          </Card>
          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting || updateMutation.isPending} className="bg-emerald-500 hover:bg-emerald-600 text-white">
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Follow-ups */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Follow-ups</h2>
          {(canEdit || isCounsellor) && (
            <Button variant="outline" size="sm" onClick={() => setShowFollowUpForm(v => !v)}>
              <Plus className="size-3.5" /> Schedule
            </Button>
          )}
        </div>
        {showFollowUpForm && (
          <div className="border rounded-lg p-4 mb-4 space-y-3 bg-gray-50">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Date & Time</Label><Input type="datetime-local" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Remarks</Label><Input value={followUpRemarks} onChange={e => setFollowUpRemarks(e.target.value)} placeholder="Quick note…" /></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white"
                disabled={!followUpDate || followUpMutation.isPending} onClick={() => followUpMutation.mutate()}>
                {followUpMutation.isPending ? "Saving…" : "Save Follow-up"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowFollowUpForm(false)}>Cancel</Button>
            </div>
          </div>
        )}
        {followUps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No follow-ups scheduled yet.</p>
        ) : (
          <div className="space-y-2">
            {followUps.map(fu => (
              <div key={fu.id} className={`flex items-start justify-between p-3 rounded-lg border ${fu.done ? "opacity-50 bg-gray-50" : "bg-white"}`}>
                <div className="flex items-start gap-2.5">
                  <Clock className={`size-4 mt-0.5 shrink-0 ${fu.done ? "text-gray-400" : "text-amber-500"}`} />
                  <div>
                    <p className="text-sm font-medium">{format(new Date(fu.scheduledAt), "dd MMM yyyy 'at' hh:mm a")}</p>
                    {fu.remarks && <p className="text-xs text-muted-foreground mt-0.5">{fu.remarks}</p>}
                    {fu.done && fu.completedAt && <p className="text-xs text-emerald-600 mt-0.5">Done · {format(new Date(fu.completedAt), "dd MMM")}</p>}
                  </div>
                </div>
                {!fu.done && fu.id > 0 && (
                  <Button size="sm" variant="outline" className="shrink-0 text-emerald-700 border-emerald-200"
                    disabled={markDoneMutation.isPending} onClick={() => markDoneMutation.mutate(fu.id)}>
                    <CheckCircle2 className="size-3.5" /> Done
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {lead.lastContactedAt && (
        <p className="text-xs text-muted-foreground">
          Last contacted: {format(new Date(lead.lastContactedAt), "dd MMM yyyy 'at' hh:mm a")}
        </p>
      )}

      {/* Caller Assignment (admin only, pre-handoff) */}
      {(isAdmin || canAssign) && !isPostVisit && (
        <Card className="p-6">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
            <Users className="size-3.5" /> Caller Assignment
          </h2>
          {lead.assignedToId ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Assigned to caller ID {lead.callerId ?? lead.assignedToId}</p>
                  {lead.assignedAt && (
                    <p className="text-xs text-muted-foreground mt-0.5">Since {format(new Date(lead.assignedAt), "dd MMM yyyy")}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                    disabled={unassignMutation.isPending} onClick={() => unassignMutation.mutate()}>
                    <UserMinus className="size-3.5" />{unassignMutation.isPending ? "…" : "Unassign"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowReassign(v => !v)}>
                    <Users className="size-3.5" /> Reassign
                  </Button>
                </div>
              </div>
              {showReassign && (
                <div className="flex items-center gap-3 pt-2 border-t">
                  <Select value={reassignCallerId} onValueChange={(v) => setReassignCallerId(v ?? "")}>
                    <SelectTrigger className="flex-1 h-9 text-sm"><SelectValue placeholder="Select new caller…" /></SelectTrigger>
                    <SelectContent>
                      {callers.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {counsellorLabel(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white shrink-0"
                    disabled={!reassignCallerId || reassignMutation.isPending}
                    onClick={() => reassignMutation.mutate(Number(reassignCallerId))}>
                    {reassignMutation.isPending ? "Saving…" : "Confirm Reassign"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowReassign(false); setReassignCallerId(""); }}>Cancel</Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground flex-1">Not assigned to any caller</p>
              <Select value={reassignCallerId} onValueChange={(v) => setReassignCallerId(v ?? "")}>
                <SelectTrigger className="w-52 h-9 text-sm"><SelectValue placeholder="Select caller…" /></SelectTrigger>
                <SelectContent>
                  {callers.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {counsellorLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white"
                disabled={!reassignCallerId || reassignMutation.isPending}
                onClick={() => reassignMutation.mutate(Number(reassignCallerId))}>
                {reassignMutation.isPending ? "Assigning…" : "Assign"}
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Activity Timeline */}
      {activities.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
            <History className="size-3.5" /> Activity Timeline
          </h2>
          <div className="relative">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />
            <div className="space-y-4">
              {activities.map(act => (
                <div key={act.id} className="flex gap-3 relative">
                  <div className={`size-3.5 rounded-full border-2 mt-0.5 shrink-0 z-10 ${
                    act.actionType === "ASSIGNED"           ? "bg-emerald-100 border-emerald-400" :
                    act.actionType === "REASSIGNED"         ? "bg-blue-100 border-blue-400" :
                    act.actionType === "UNASSIGNED"         ? "bg-red-100 border-red-400" :
                    act.actionType === "COUNSELLOR_HANDOFF" ? "bg-sky-100 border-sky-400" :
                    act.actionType === "WALK_IN_CLAIM"      ? "bg-teal-100 border-teal-400" :
                    act.actionType === "NOT_CONNECTED"      ? "bg-slate-100 border-slate-400" :
                    act.actionType === "BRANCH_TRANSFER"    ? "bg-violet-100 border-violet-400" :
                    "bg-gray-100 border-gray-300"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                        act.actionType === "ASSIGNED"           ? "bg-emerald-50 text-emerald-700" :
                        act.actionType === "REASSIGNED"         ? "bg-blue-50 text-blue-700" :
                        act.actionType === "UNASSIGNED"         ? "bg-red-50 text-red-600" :
                        act.actionType === "COUNSELLOR_HANDOFF" ? "bg-sky-50 text-sky-700" :
                        act.actionType === "WALK_IN_CLAIM"      ? "bg-teal-50 text-teal-700" :
                        act.actionType === "BRANCH_TRANSFER"    ? "bg-violet-50 text-violet-700" :
                        "bg-gray-50 text-gray-600"
                      }`}>
                        {act.actionType.replace(/_/g, " ")}
                      </span>
                      {act.performedByName && <span className="text-xs text-muted-foreground">by {act.performedByName}</span>}
                    </div>
                    {act.description && <p className="text-xs text-muted-foreground mt-0.5">{act.description}</p>}
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {format(new Date(act.createdAt), "dd MMM yyyy 'at' hh:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

    </div>
  );
}

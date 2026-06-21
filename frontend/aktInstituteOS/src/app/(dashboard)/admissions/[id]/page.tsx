"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Phone,
  Mail,
  BookOpen,
  Edit2,
  Trash2,
  IndianRupee,
  Users,
  UserPlus,
  X,
  Receipt,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { selectLabel } from "@/lib/ui/select-label";
import { Skeleton } from "@/components/ui/skeleton";
import { AdmissionStatusBadge } from "@/components/admissions/AdmissionStatusBadge";
import {
  getAdmission,
  updateAdmission,
  updateAdmissionStatus,
  deleteAdmission,
} from "@/lib/api/admissions.api";
import { collectPayment } from "@/lib/api/fees.api";
import { listAllBatches, assignBatchToAdmission } from "@/lib/api/batches.api";
import type { AdmissionStatus } from "@/types/admission";

const EDITABLE_STATUSES: Array<{ value: AdmissionStatus; label: string }> = [
  { value: "PENDING",           label: "Pending" },
  { value: "DOCUMENTS_PENDING", label: "Docs Pending" },
  { value: "ENROLLED",          label: "Enrolled" },
  { value: "ACTIVE",            label: "Active" },
  { value: "COMPLETED",         label: "Completed" },
  { value: "CANCELLED",         label: "Cancelled" },
];

// ── Collect payment schema ─────────────────────────────────────────────────────

const paySchema = z.object({
  amount:          z.coerce.number().min(1, "Amount must be at least ₹1"),
  paymentDate:     z.string().optional().or(z.literal("")),
  paymentMode:     z.enum(["CASH","UPI","CHEQUE","BANK_TRANSFER","OTHER"]).default("CASH"),
  referenceNumber: z.string().max(100).optional().or(z.literal("")),
  notes:           z.string().max(500).optional().or(z.literal("")),
});
type PayForm = z.infer<typeof paySchema>;

// ── Edit schema ─────────────────────────────────────────────────────────────────

const editSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid mobile number"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  courseName: z.string().optional().or(z.literal("")),
  batchName: z.string().optional().or(z.literal("")),
  feesAgreed: z.coerce.number().min(0).optional(),
  feesPaid: z.coerce.number().min(0).optional(),
  enrollmentDate: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type EditForm = z.infer<typeof editSchema>;

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export default function AdmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const admissionId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);

  const { data: admission, isLoading } = useQuery({
    queryKey: ["admission", admissionId],
    queryFn: () => getAdmission(admissionId),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditForm>({ resolver: zodResolver(editSchema) as Resolver<EditForm> });

  // ── Payment form ──────────────────────────────────────────────────────────

  const {
    register:     regPay,
    handleSubmit: hPay,
    reset:        resetPay,
    watch:        watchPay,
    setValue:     setPayValue,
    formState:    { errors: payErrors },
  } = useForm<PayForm>({
    resolver: zodResolver(paySchema) as Resolver<PayForm>,
    defaultValues: { paymentMode: "CASH", paymentDate: format(new Date(), "yyyy-MM-dd") },
  });

  const payMode = watchPay("paymentMode");
  const needsRef = ["CHEQUE","UPI","BANK_TRANSFER"].includes(payMode);

  const payMutation = useMutation({
    mutationFn: (data: PayForm) =>
      collectPayment({
        admissionId:     admissionId,
        amount:          data.amount,
        paymentDate:     data.paymentDate || undefined,
        paymentMode:     data.paymentMode,
        referenceNumber: data.referenceNumber || undefined,
        notes:           data.notes || undefined,
      }),
    onSuccess: (payment) => {
      toast.success(`Receipt ${payment.receiptNumber} generated — ₹${payment.amount.toLocaleString("en-IN")} collected`);
      queryClient.invalidateQueries({ queryKey: ["admission", admissionId] });
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      setShowPayModal(false);
      resetPay({ paymentMode: "CASH", paymentDate: format(new Date(), "yyyy-MM-dd") });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to record payment.";
      toast.error(msg);
    },
  });

  function openPayModal() {
    if (!admission) return;
    resetPay({
      amount:      admission.feesDue > 0 ? admission.feesDue : undefined,
      paymentMode: "CASH",
      paymentDate: format(new Date(), "yyyy-MM-dd"),
    });
    setShowPayModal(true);
  }

  function startEditing() {
    if (!admission) return;
    reset({
      firstName: admission.firstName,
      lastName: admission.lastName ?? "",
      phone: admission.phone,
      email: admission.email ?? "",
      courseName: admission.courseName ?? "",
      batchName: admission.batchName ?? "",
      feesAgreed: admission.feesAgreed,
      feesPaid: admission.feesPaid,
      enrollmentDate: admission.enrollmentDate ?? "",
      notes: admission.notes ?? "",
    });
    setEditing(true);
  }

  const updateMutation = useMutation({
    mutationFn: (values: EditForm) =>
      updateAdmission(admissionId, {
        ...values,
        email: values.email || undefined,
        courseName: values.courseName || undefined,
        batchName: values.batchName || undefined,
        enrollmentDate: values.enrollmentDate || undefined,
        notes: values.notes || undefined,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["admission", admissionId], updated);
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      toast.success("Admission updated");
      setEditing(false);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to update admission.";
      toast.error(msg);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: AdmissionStatus) => updateAdmissionStatus(admissionId, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(["admission", admissionId], updated);
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      toast.success(`Status updated to ${updated.status.replace("_", " ")}`);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to update status.";
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAdmission(admissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admissions"] });
      toast.success("Admission deleted");
      router.push("/admissions");
    },
    onError: () => {
      toast.error("Failed to delete admission.");
      setConfirmDelete(false);
    },
  });

  // ── Batch assignment ──────────────────────────────────────────────────────

  const { data: courseBatches = [] } = useQuery({
    queryKey: ["batches", "all-for-admission"],
    queryFn: () => listAllBatches({}),
    enabled: !admission?.batchId,
    staleTime: 60_000,
  });

  const batchAssignMutation = useMutation({
    mutationFn: (batchId: number | null) =>
      assignBatchToAdmission(admissionId, batchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admission", admissionId] });
      toast.success(selectedBatchId ? "Batch assigned" : "Batch removed");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to assign batch";
      toast.error(msg);
    },
  });


  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!admission) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Admission not found.{" "}
        <Link href="/admissions" className="text-emerald-600 hover:underline">
          Back to admissions
        </Link>
      </div>
    );
  }

  const isClosed = admission.status === "COMPLETED" || admission.status === "CANCELLED";

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admissions">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{admission.fullName}</h1>
              <AdmissionStatusBadge status={admission.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 font-mono">
              {admission.admissionNumber}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {!isClosed && !editing && (
            <Button variant="outline" size="sm" onClick={startEditing}>
              <Edit2 className="size-3.5" />
              Edit
            </Button>
          )}
          {!confirmDelete ? (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                {deleteMutation.isPending ? "Deleting…" : "Confirm Delete"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Fees summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Fees Agreed</p>
          <p className="text-xl font-semibold mt-1">{formatCurrency(admission.feesAgreed)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Fees Paid</p>
          <p className="text-xl font-semibold mt-1 text-emerald-600">{formatCurrency(admission.feesPaid)}</p>
        </Card>
        <Card className={`p-4 ${admission.feesDue > 0 ? "bg-red-50 border-red-200" : ""}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Fees Due</p>
            {admission.feesDue > 0 && !isClosed && (
              <button
                onClick={openPayModal}
                className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg px-2 py-0.5 transition-colors"
              >
                <Receipt className="size-3" /> Collect
              </button>
            )}
          </div>
          <p className={`text-xl font-semibold mt-1 ${admission.feesDue > 0 ? "text-red-600" : "text-emerald-600"}`}>
            {formatCurrency(admission.feesDue)}
          </p>
        </Card>
      </div>

      {/* Stage + quick actions */}
      <Card className="p-4 flex items-center gap-4 flex-wrap">
        {!isClosed && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Move Stage</p>
            <Select
              value={admission.status}
              onValueChange={(val) => statusMutation.mutate(val as AdmissionStatus)}
              disabled={statusMutation.isPending}
            >
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EDITABLE_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex gap-2 ml-auto flex-wrap">
          {admission.feesDue > 0 && !isClosed && (
            <Button
              variant="outline"
              size="sm"
              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              onClick={openPayModal}
            >
              <IndianRupee className="size-3.5" />
              Collect Fee
            </Button>
          )}
          {admission.leadId && (
            <Link href={`/leads/${admission.leadId}`}>
              <Button variant="outline" size="sm">
                View Lead
              </Button>
            </Link>
          )}
          {admission.studentId ? (
            <Link href={`/students/${admission.studentId}`}>
              <Button variant="outline" size="sm">
                <Users className="size-3.5" />
                View Student
              </Button>
            </Link>
          ) : admission.status !== "CANCELLED" ? (
            <Link href={`/admissions/${admissionId}/enroll`}>
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              >
                <UserPlus className="size-3.5" />
                Create Student Record
              </Button>
            </Link>
          ) : null}
        </div>
      </Card>

      {/* View / Edit */}
      {!editing ? (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
              Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
              <div className="flex items-center gap-2.5">
                <Phone className="size-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{admission.phone}</p>
                </div>
              </div>
              {admission.email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{admission.email}</p>
                  </div>
                </div>
              )}
              {admission.courseName && (
                <div className="flex items-center gap-2.5">
                  <BookOpen className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Course</p>
                    <p className="text-sm font-medium">{admission.courseName}</p>
                  </div>
                </div>
              )}
              {admission.batchName && (
                <div className="flex items-center gap-2.5">
                  <Users className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Batch</p>
                    <p className="text-sm font-medium">{admission.batchName}</p>
                  </div>
                </div>
              )}
              {admission.enrollmentDate && (
                <div className="flex items-center gap-2.5">
                  <IndianRupee className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Enrollment Date</p>
                    <p className="text-sm font-medium">
                      {format(new Date(admission.enrollmentDate), "dd MMM yyyy")}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2.5">
                <div className="size-4 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm">{format(new Date(admission.createdAt), "dd MMM yyyy")}</p>
                </div>
              </div>
            </div>
          </Card>

          {admission.notes && (
            <Card className="p-6">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Notes
              </h2>
              <p className="text-sm whitespace-pre-wrap text-gray-700">{admission.notes}</p>
            </Card>
          )}

          {/* Batch Assignment Card */}
          {!isClosed && (
            <Card className="p-6 space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Batch Assignment
              </h2>
              {admission.batchName ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{admission.batchName}</p>
                    {admission.batchId && (
                      <Link href={`/batches/${admission.batchId}`} className="text-xs text-emerald-600 hover:underline">
                        View batch →
                      </Link>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200"
                    disabled={batchAssignMutation.isPending}
                    onClick={() => { setSelectedBatchId(null); batchAssignMutation.mutate(null); }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">No batch assigned yet.</p>
                  <div className="flex gap-2">
                    <Select
                      value={selectedBatchId ? String(selectedBatchId) : "__none"}
                      onValueChange={(v) => setSelectedBatchId(v === "__none" ? null : Number(v))}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a batch…">
                          {selectLabel(courseBatches, b => b.name, "Select a batch…", { "__none": "— Select batch —" })}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">— Select batch —</SelectItem>
                        {courseBatches
                          .filter((b) => ["ACTIVE", "PLANNED"].includes(b.status))
                          .map((b) => (
                            <SelectItem key={b.id} value={String(b.id)}>
                              {b.name}
                              {b.maxCapacity != null && ` (${b.availableSeats} seats)`}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      disabled={!selectedBatchId || batchAssignMutation.isPending}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white"
                      onClick={() => { if (selectedBatchId) batchAssignMutation.mutate(selectedBatchId); }}
                    >
                      {batchAssignMutation.isPending ? "Assigning…" : "Assign"}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit((v) => updateMutation.mutate(v))} className="space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Edit Admission
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name" error={errors.firstName?.message}>
                <Input {...register("firstName")} aria-invalid={!!errors.firstName} />
              </Field>
              <Field label="Last Name" error={errors.lastName?.message}>
                <Input {...register("lastName")} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone" error={errors.phone?.message}>
                <Input maxLength={10} {...register("phone")} aria-invalid={!!errors.phone} />
              </Field>
              <Field label="Email" error={errors.email?.message}>
                <Input type="email" {...register("email")} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Course" error={errors.courseName?.message}>
                <Input {...register("courseName")} />
              </Field>
              <Field label="Batch" error={errors.batchName?.message}>
                <Input {...register("batchName")} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Fees Agreed (₹)" error={errors.feesAgreed?.message}>
                <Input type="number" min={0} {...register("feesAgreed")} />
              </Field>
              <Field label="Fees Paid (₹)" error={errors.feesPaid?.message}>
                <Input type="number" min={0} {...register("feesPaid")} />
              </Field>
              <Field label="Enrollment Date" error={errors.enrollmentDate?.message}>
                <Input type="date" {...register("enrollmentDate")} />
              </Field>
            </div>
            <Field label="Notes" error={errors.notes?.message}>
              <Textarea rows={3} {...register("notes")} />
            </Field>
          </Card>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isSubmitting || updateMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {isSubmitting || updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* ── Collect Fee Modal ───────────────────────────────────────────── */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowPayModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">

            {/* Modal header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Collect Payment</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {admission.fullName} · {admission.admissionNumber}
                </p>
              </div>
              <button onClick={() => setShowPayModal(false)}
                className="size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400">
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={hPay((d) => payMutation.mutate(d))} className="space-y-4">

              {/* Amount + Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Amount (₹) <span className="text-destructive">*</span></Label>
                  <Input type="number" min={1} placeholder="5000"
                    aria-invalid={!!payErrors.amount} {...regPay("amount")} />
                  {payErrors.amount && <p className="text-xs text-destructive">{payErrors.amount.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Date</Label>
                  <Input type="date" {...regPay("paymentDate")} />
                </div>
              </div>

              {/* Payment mode */}
              <div className="space-y-1.5">
                <Label>Payment Mode</Label>
                <Select defaultValue="CASH"
                  onValueChange={(v) => setPayValue("paymentMode", v as PayForm["paymentMode"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">💵 Cash</SelectItem>
                    <SelectItem value="UPI">📱 UPI</SelectItem>
                    <SelectItem value="CHEQUE">📄 Cheque</SelectItem>
                    <SelectItem value="BANK_TRANSFER">🏦 Bank Transfer</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {needsRef && (
                <div className="space-y-1.5">
                  <Label>{payMode === "CHEQUE" ? "Cheque Number" : "Transaction / UTR Reference"}</Label>
                  <Input placeholder={payMode === "CHEQUE" ? "012345" : "UTR / transaction ID"}
                    {...regPay("referenceNumber")} />
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea placeholder="Optional notes…" rows={2} {...regPay("notes")} />
              </div>

              {/* Outstanding hint */}
              {admission.feesDue > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  Outstanding balance: <strong>{formatCurrency(admission.feesDue)}</strong>
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <Button type="submit" disabled={payMutation.isPending}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white">
                  {payMutation.isPending ? "Recording…" : "Record & Generate Receipt"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowPayModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

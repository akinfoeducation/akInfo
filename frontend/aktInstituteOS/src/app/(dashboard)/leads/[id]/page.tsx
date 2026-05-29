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
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  BookOpen,
  Edit2,
  Trash2,
  CheckCircle2,
  MessageCircle,
  ClipboardList,
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
import { Skeleton } from "@/components/ui/skeleton";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { LeadSourceBadge } from "@/components/leads/LeadSourceBadge";
import {
  getLead,
  updateLead,
  updateLeadStatus,
  convertLead,
  deleteLead,
} from "@/lib/api/leads.api";
import type { LeadStatus } from "@/types/lead";

const EDITABLE_STATUSES: Array<{ value: LeadStatus; label: string }> = [
  { value: "NEW",            label: "New" },
  { value: "CONTACTED",      label: "Contacted" },
  { value: "FOLLOW_UP",      label: "Follow Up" },
  { value: "DEMO_SCHEDULED", label: "Demo Scheduled" },
  { value: "NEGOTIATION",    label: "Negotiation" },
  { value: "LOST",           label: "Lost" },
];

const editSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Invalid mobile number"),
  whatsappNumber: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Invalid number")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  courseInterested: z.string().optional().or(z.literal("")),
  nextFollowUpAt: z.string().optional().or(z.literal("")),
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

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const leadId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmConvert, setConfirmConvert] = useState(false);

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => getLead(leadId),
  });

  const { data: coursesData } = useQuery({
    queryKey: ["courses", "ACTIVE"],
    queryFn: () => listCourses("ACTIVE"),
    staleTime: 60_000,
  });
  const courses = coursesData?.data ?? [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditForm>({ resolver: zodResolver(editSchema) });

  const courseInterestedValue = watch("courseInterested");

  function startEditing() {
    if (!lead) return;
    reset({
      firstName: lead.firstName,
      lastName: lead.lastName ?? "",
      phone: lead.phone,
      whatsappNumber: lead.whatsappNumber ?? "",
      email: lead.email ?? "",
      courseInterested: lead.courseInterested ?? "",
      nextFollowUpAt: lead.nextFollowUpAt
        ? new Date(lead.nextFollowUpAt).toISOString().slice(0, 16)
        : "",
      notes: lead.notes ?? "",
    });
    setEditing(true);
  }

  const updateMutation = useMutation({
    mutationFn: (values: EditForm) =>
      updateLead(leadId, {
        ...values,
        whatsappNumber: values.whatsappNumber || undefined,
        email: values.email || undefined,
        courseInterested: values.courseInterested || undefined,
        nextFollowUpAt: values.nextFollowUpAt || undefined,
        notes: values.notes || undefined,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["lead", leadId], updated);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead updated");
      setEditing(false);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to update lead.";
      toast.error(msg);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: LeadStatus) => updateLeadStatus(leadId, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(["lead", leadId], updated);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success(`Status updated to ${updated.status.replace("_", " ")}`);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to update status.";
      toast.error(msg);
    },
  });

  const convertMutation = useMutation({
    mutationFn: () => convertLead(leadId),
    onSuccess: (updated) => {
      queryClient.setQueryData(["lead", leadId], updated);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead converted successfully!");
      setConfirmConvert(false);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to convert lead.";
      toast.error(msg);
      setConfirmConvert(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteLead(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead deleted");
      router.push("/leads");
    },
    onError: () => {
      toast.error("Failed to delete lead.");
      setConfirmDelete(false);
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Lead not found.{" "}
        <Link href="/leads" className="text-emerald-600 hover:underline">
          Back to leads
        </Link>
      </div>
    );
  }

  const isConverted = lead.status === "CONVERTED";
  const isLost = lead.status === "LOST";

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/leads">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{lead.fullName}</h1>
              <LeadStatusBadge status={lead.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Added {format(new Date(lead.createdAt), "dd MMM yyyy")}
              {lead.convertedAt && (
                <> · Converted {format(new Date(lead.convertedAt), "dd MMM yyyy")}</>
              )}
            </p>
          </div>
        </div>

        {!isConverted && (
          <div className="flex gap-2">
            {!editing && (
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
        )}
      </div>

      {/* Status pipeline + Convert */}
      {!isConverted && !isLost && (
        <Card className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Move Stage</p>
            <Select
              value={lead.status}
              onValueChange={(val) => statusMutation.mutate(val as LeadStatus)}
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
          <div className="shrink-0">
            {!confirmConvert ? (
              <Button
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={() => setConfirmConvert(true)}
              >
                <CheckCircle2 className="size-4" />
                Convert to Admission
              </Button>
            ) : (
              <div className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground">Are you sure?</span>
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  disabled={convertMutation.isPending}
                  onClick={() => convertMutation.mutate()}
                >
                  {convertMutation.isPending ? "Converting…" : "Yes, Convert"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setConfirmConvert(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {isConverted && (
        <Card className="p-4 flex items-center justify-between bg-emerald-50 border-emerald-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-800">Lead Converted</p>
              <p className="text-xs text-emerald-600">
                Converted on {lead.convertedAt ? format(new Date(lead.convertedAt), "dd MMM yyyy 'at' hh:mm a") : "—"}
              </p>
            </div>
          </div>
          {lead.admissionId ? (
            <Link href={`/admissions/${lead.admissionId}`}>
              <Button variant="outline" size="sm" className="border-emerald-300 text-emerald-700 hover:bg-emerald-100">
                <ClipboardList className="size-3.5" />
                View Admission
              </Button>
            </Link>
          ) : (
            <Link href={`/admissions/new?leadId=${lead.id}&firstName=${encodeURIComponent(lead.firstName)}&lastName=${encodeURIComponent(lead.lastName ?? "")}&phone=${encodeURIComponent(lead.phone)}&email=${encodeURIComponent(lead.email ?? "")}&course=${encodeURIComponent(lead.courseInterested ?? "")}`}>
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" size="sm">
                <ClipboardList className="size-3.5" />
                Create Admission
              </Button>
            </Link>
          )}
        </Card>
      )}

      {/* View / Edit Form */}
      {!editing ? (
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
              Contact Info
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
              <div className="flex items-center gap-2.5">
                <Phone className="size-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{lead.phone}</p>
                </div>
              </div>
              {lead.whatsappNumber && (
                <div className="flex items-center gap-2.5">
                  <MessageCircle className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">WhatsApp</p>
                    <p className="text-sm font-medium">{lead.whatsappNumber}</p>
                  </div>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{lead.email}</p>
                  </div>
                </div>
              )}
              {lead.courseInterested && (
                <div className="flex items-center gap-2.5">
                  <BookOpen className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Course Interested</p>
                    <p className="text-sm font-medium">{lead.courseInterested}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <div className="size-4 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <LeadSourceBadge source={lead.source} />
                </div>
              </div>
              {lead.nextFollowUpAt && (
                <div className="flex items-center gap-2.5">
                  <Calendar className="size-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Next Follow-up</p>
                    <p className="text-sm font-medium">
                      {format(new Date(lead.nextFollowUpAt), "dd MMM yyyy 'at' hh:mm a")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {lead.notes && (
            <Card className="p-6">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Notes
              </h2>
              <p className="text-sm whitespace-pre-wrap text-gray-700">{lead.notes}</p>
            </Card>
          )}

          {lead.lastContactedAt && (
            <p className="text-xs text-muted-foreground">
              Last contacted: {format(new Date(lead.lastContactedAt), "dd MMM yyyy 'at' hh:mm a")}
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit((v) => updateMutation.mutate(v))} className="space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Edit Lead
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
              <Field label="WhatsApp" error={errors.whatsappNumber?.message}>
                <Input maxLength={10} {...register("whatsappNumber")} />
              </Field>
            </div>
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" {...register("email")} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Course Interested" error={errors.courseInterested?.message}>
                <Select
                  value={courseInterestedValue || "__none"}
                  onValueChange={(v) =>
                    setValue("courseInterested", !v || v === "__none" ? "" : v)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a course…" />
                  </SelectTrigger>
                  <SelectContent className="w-auto min-w-[var(--anchor-width)]">
                    <SelectItem value="__none">— Not specified —</SelectItem>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Next Follow-up" error={errors.nextFollowUpAt?.message}>
                <Input type="datetime-local" {...register("nextFollowUpAt")} />
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

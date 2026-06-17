"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Wifi, MapPin } from "lucide-react";
import Link from "next/link";

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
import { createLead } from "@/lib/api/leads.api";
import { listCourses } from "@/lib/api/courses.api";

const schema = z.object({
  firstName:       z.string().min(1, "First name is required"),
  lastName:        z.string().optional(),
  phone:           z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  whatsappNumber:  z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit number").optional().or(z.literal("")),
  email:           z.string().email("Enter a valid email").optional().or(z.literal("")),
  address:         z.string().optional().or(z.literal("")),
  courseInterested:z.string().optional().or(z.literal("")),
  currentWork:     z.enum(["JOB", "FARMER", "STUDENT", "BUSINESS", "NO_WORK"]).optional(),
  interestedFor:   z.enum(["JOB", "ABROAD", "HOBBY", "BUSINESS", "JOB_AND_BUSINESS"]).optional(),
  source:          z.enum(["WALK_IN", "REFERRAL", "SOCIAL_MEDIA", "WEBSITE", "GOOGLE_ADS", "OTHER"]).optional(),
  // Delivery mode — required
  deliveryMode:    z.enum(["ONLINE", "OFFLINE"], { message: "Please select Online or Offline" }),
  preferredBatch:  z.string().optional().or(z.literal("")),
  preferredBranch: z.string().optional().or(z.literal("")),
  // Parent info
  parentName:      z.string().optional().or(z.literal("")),
  parentPhone:     z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit number").optional().or(z.literal("")),
  parentEmail:     z.string().email("Enter a valid email").optional().or(z.literal("")),
  nextFollowUpAt:  z.string().optional().or(z.literal("")),
  notes:           z.string().optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

function Field({
  label, error, children, required,
}: {
  label: string; error?: string; children: React.ReactNode; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function NewLeadPage() {
  const router = useRouter();

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
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const deliveryMode = watch("deliveryMode");

  async function onSubmit(values: FormData) {
    try {
      const payload = {
        ...values,
        whatsappNumber:  values.whatsappNumber  || undefined,
        email:           values.email           || undefined,
        address:         values.address         || undefined,
        courseInterested:values.courseInterested|| undefined,
        preferredBatch:  values.preferredBatch  || undefined,
        preferredBranch: values.preferredBranch || undefined,
        parentName:      values.parentName      || undefined,
        parentPhone:     values.parentPhone     || undefined,
        parentEmail:     values.parentEmail     || undefined,
        nextFollowUpAt:  values.nextFollowUpAt  || undefined,
        notes:           values.notes           || undefined,
      };
      const lead = await createLead(payload);
      toast.success(`Lead ${lead.fullName} added successfully`);
      router.push(`/leads/${lead.id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to create lead.";
      toast.error(msg);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/leads">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Add Lead</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Capture a new inquiry or walk-in
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Delivery Mode — first & prominent ─────────────────────── */}
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Delivery Mode
          </h2>
          <Field label="How will this student attend?" error={errors.deliveryMode?.message} required>
            <div className="grid grid-cols-2 gap-3">
              {(["ONLINE", "OFFLINE"] as const).map((mode) => {
                const active = deliveryMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setValue("deliveryMode", mode, { shouldValidate: true })}
                    className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                      active
                        ? mode === "ONLINE"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {mode === "ONLINE" ? (
                      <Wifi className="size-5 shrink-0" />
                    ) : (
                      <MapPin className="size-5 shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold text-sm">{mode === "ONLINE" ? "Online" : "Offline"}</p>
                      <p className="text-xs opacity-70 mt-0.5">
                        {mode === "ONLINE" ? "Remote / LMS based" : "Physical class / centre"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Preferred Batch" error={errors.preferredBatch?.message}>
              <Input placeholder="e.g. Morning batch, Weekend…" {...register("preferredBatch")} />
            </Field>
            {deliveryMode === "OFFLINE" && (
              <Field label="Preferred Branch" error={errors.preferredBranch?.message}>
                <Input placeholder="e.g. Delhi, Noida…" {...register("preferredBranch")} />
              </Field>
            )}
          </div>
        </Card>

        {/* ── Contact Info ───────────────────────────────────────────── */}
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Contact Info
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" error={errors.firstName?.message} required>
              <Input placeholder="Rahul" aria-invalid={!!errors.firstName} {...register("firstName")} />
            </Field>
            <Field label="Last Name" error={errors.lastName?.message}>
              <Input placeholder="Sharma" {...register("lastName")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone" error={errors.phone?.message} required>
              <Input placeholder="9876543210" maxLength={10} aria-invalid={!!errors.phone} {...register("phone")} />
            </Field>
            <Field label="WhatsApp Number" error={errors.whatsappNumber?.message}>
              <Input placeholder="9876543210 (if different)" maxLength={10} {...register("whatsappNumber")} />
            </Field>
          </div>
          <Field label="Email" error={errors.email?.message}>
            <Input type="email" placeholder="rahul@email.com" aria-invalid={!!errors.email} {...register("email")} />
          </Field>
          <Field label="Address">
            <Input placeholder="City, area…" {...register("address")} />
          </Field>
        </Card>

        {/* ── Parent Info ─────────────────────────────────────────────── */}
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Parent / Guardian Info
          </h2>
          <p className="text-xs text-muted-foreground -mt-2">Optional now — counsellor can fill during counselling session</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Parent Name" error={errors.parentName?.message}>
              <Input placeholder="Parent / Guardian name" {...register("parentName")} />
            </Field>
            <Field label="Parent Phone" error={errors.parentPhone?.message}>
              <Input placeholder="9876543210" maxLength={10} {...register("parentPhone")} />
            </Field>
          </div>
          <Field label="Parent Email" error={errors.parentEmail?.message}>
            <Input type="email" placeholder="parent@email.com" {...register("parentEmail")} />
          </Field>
        </Card>

        {/* ── Lead Details ───────────────────────────────────────────── */}
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Lead Details
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Current Work">
              <Select onValueChange={(v) => setValue("currentWork", v as FormData["currentWork"])}>
                <SelectTrigger className="w-full"><SelectValue placeholder="What do they do?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="JOB">Job</SelectItem>
                  <SelectItem value="FARMER">Farmer</SelectItem>
                  <SelectItem value="STUDENT">Student</SelectItem>
                  <SelectItem value="BUSINESS">Business</SelectItem>
                  <SelectItem value="NO_WORK">No Work</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Interested For">
              <Select onValueChange={(v) => setValue("interestedFor", v as FormData["interestedFor"])}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Goal?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="JOB">Job</SelectItem>
                  <SelectItem value="ABROAD">Abroad</SelectItem>
                  <SelectItem value="HOBBY">Hobby</SelectItem>
                  <SelectItem value="BUSINESS">Business</SelectItem>
                  <SelectItem value="JOB_AND_BUSINESS">Job &amp; Business</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Course Interested In" error={errors.courseInterested?.message}>
            <Select
              onValueChange={(v: string | null) =>
                setValue("courseInterested", !v || v === "__none" ? "" : v)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a course…" />
              </SelectTrigger>
              <SelectContent className="w-auto min-w-[var(--anchor-width)]">
                <SelectItem value="__none">— Not specified —</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Source" error={errors.source?.message}>
              <Select onValueChange={(val) => setValue("source", val as FormData["source"])}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="How did they find you?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WALK_IN">Walk In</SelectItem>
                  <SelectItem value="REFERRAL">Referral</SelectItem>
                  <SelectItem value="SOCIAL_MEDIA">Social Media</SelectItem>
                  <SelectItem value="WEBSITE">Website</SelectItem>
                  <SelectItem value="GOOGLE_ADS">Google Ads</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Next Follow-up" error={errors.nextFollowUpAt?.message}>
              <Input type="datetime-local" {...register("nextFollowUpAt")} />
            </Field>
          </div>
        </Card>

        {/* ── Notes ─────────────────────────────────────────────────── */}
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Notes
          </h2>
          <Field label="Internal Notes" error={errors.notes?.message}>
            <Textarea placeholder="Any additional notes about this lead…" rows={3} {...register("notes")} />
          </Field>
        </Card>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {isSubmitting ? "Adding Lead…" : "Add Lead"}
          </Button>
          <Link href="/leads">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

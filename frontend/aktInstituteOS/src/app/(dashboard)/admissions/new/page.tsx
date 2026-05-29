"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createAdmission } from "@/lib/api/admissions.api";
import { listCourses } from "@/lib/api/courses.api";
import { listAllBatches } from "@/lib/api/batches.api";

const schema = z.object({
  leadId:         z.coerce.number().min(1, "Lead ID is required"),
  firstName:      z.string().min(1, "First name is required"),
  lastName:       z.string().optional(),
  phone:          z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  email:          z.string().email("Enter a valid email").optional().or(z.literal("")),
  courseName:     z.string().optional().or(z.literal("")),
  batchId:        z.coerce.number().optional(),
  feesAgreed:     z.coerce.number().min(1, "Fees agreed must be at least ₹1"),
  enrollmentDate: z.string().optional().or(z.literal("")),
  notes:          z.string().optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

function Field({
  label, error, hint, children, required,
}: {
  label: string; error?: string; hint?: string; children: React.ReactNode; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint  && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function NewAdmissionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const leadId    = searchParams.get("leadId")    ?? "";
  const firstName = searchParams.get("firstName") ?? "";
  const lastName  = searchParams.get("lastName")  ?? "";
  const phone     = searchParams.get("phone")     ?? "";
  const email     = searchParams.get("email")     ?? "";
  const course    = searchParams.get("course")    ?? "";

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
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: {
      leadId:    leadId ? Number(leadId) : undefined,
      firstName,
      lastName,
      phone,
      email,
      courseName: course,
    },
  });

  const watchedCourse  = watch("courseName");
  const watchedBatchId = watch("batchId");

  // Find the selected course object for batch fetching
  const selectedCourse = courses.find((c) => c.name === watchedCourse);

  const { data: batchesData = [] } = useQuery({
    queryKey: ["batches", "course", selectedCourse?.id],
    queryFn:  () => listAllBatches({ courseId: selectedCourse!.id, status: "ACTIVE" }),
    enabled:  !!selectedCourse,
    staleTime: 60_000,
  });

  // Also fetch PLANNED batches and merge
  const { data: plannedBatches = [] } = useQuery({
    queryKey: ["batches", "course-planned", selectedCourse?.id],
    queryFn:  () => listAllBatches({ courseId: selectedCourse!.id, status: "PLANNED" }),
    enabled:  !!selectedCourse,
    staleTime: 60_000,
  });

  const availableBatches = [...batchesData, ...plannedBatches].filter(
    (b) => b.maxCapacity == null || b.availableSeats > 0,
  );

  // Auto-fill fees when course selected
  useEffect(() => {
    if (courses.length > 0 && watchedCourse) {
      const match = courses.find((c) => c.name === watchedCourse);
      if (match) setValue("feesAgreed", match.fees, { shouldValidate: true });
      // Clear batch when course changes
      setValue("batchId", undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedCourse]);

  // Auto-fill fees on initial load if course pre-filled
  useEffect(() => {
    if (courses.length > 0 && course) {
      const match = courses.find((c) => c.name === course);
      if (match) setValue("feesAgreed", match.fees, { shouldValidate: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses]);

  function handleCourseSelect(value: string | null) {
    if (!value || value === "__none") {
      setValue("courseName", "");
      return;
    }
    setValue("courseName", value, { shouldValidate: true });
    const selected = courses.find((c) => c.name === value);
    if (selected) {
      setValue("feesAgreed", selected.fees, { shouldValidate: true });
    }
  }

  async function onSubmit(values: FormData) {
    try {
      const payload = {
        ...values,
        email:          values.email          || undefined,
        courseName:     values.courseName     || undefined,
        batchId:        values.batchId        || undefined,
        enrollmentDate: values.enrollmentDate || undefined,
        notes:          values.notes          || undefined,
      };
      const admission = await createAdmission(payload);
      toast.success(`Admission ${admission.admissionNumber} created`);
      router.push(`/admissions/${admission.id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to create admission.";
      toast.error(msg);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={leadId ? `/leads/${leadId}` : "/admissions"}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">New Admission</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create an admission record from a converted lead
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <input type="hidden" {...register("leadId")} />

        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Student Info
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" error={errors.firstName?.message} required>
              <Input
                placeholder="Rahul"
                aria-invalid={!!errors.firstName}
                {...register("firstName")}
              />
            </Field>
            <Field label="Last Name" error={errors.lastName?.message}>
              <Input placeholder="Sharma" {...register("lastName")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone" error={errors.phone?.message} required>
              <Input
                placeholder="9876543210"
                maxLength={10}
                aria-invalid={!!errors.phone}
                {...register("phone")}
              />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" placeholder="rahul@email.com" {...register("email")} />
            </Field>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Enrollment Details
          </h2>

          <Field
            label="Course" error={errors.courseName?.message}
            hint="Selecting a course will auto-fill the standard fee below"
          >
            <input type="hidden" {...register("courseName")} />
            <Select
              value={watchedCourse || "__none"}
              onValueChange={handleCourseSelect}
            >
              <SelectTrigger className="w-full" aria-invalid={!!errors.courseName}>
                <SelectValue placeholder="Select a course…" />
              </SelectTrigger>
              <SelectContent className="w-auto min-w-[var(--anchor-width)]">
                <SelectItem value="__none">— Select course —</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.name}>
                    <span>{c.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ₹{c.fees.toLocaleString("en-IN")}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Batch selector — only shown when a course is selected */}
          <div className="space-y-1.5">
            <Label>Batch Assignment</Label>
            <input type="hidden" {...register("batchId")} />
            <Select
              value={watchedBatchId ? String(watchedBatchId) : "__skip"}
              onValueChange={(v) =>
                setValue("batchId", v === "__skip" ? undefined : Number(v), { shouldValidate: true })
              }
              disabled={!selectedCourse}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={selectedCourse ? "Select a batch (optional)…" : "Select a course first"} />
              </SelectTrigger>
              <SelectContent className="w-auto min-w-[var(--anchor-width)]">
                <SelectItem value="__skip">— Skip for now —</SelectItem>
                {availableBatches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    <span>{b.name}</span>
                    {b.timing && (
                      <span className="ml-2 text-xs text-muted-foreground">{b.timing}</span>
                    )}
                    {b.maxCapacity != null && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({b.availableSeats} seats left)
                      </span>
                    )}
                  </SelectItem>
                ))}
                {selectedCourse && availableBatches.length === 0 && (
                  <SelectItem value="__none" disabled>No available batches for this course</SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only batches for the selected course are shown. You can assign a batch later.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Fees Agreed (₹)" error={errors.feesAgreed?.message} required
              hint="Auto-filled from course; override if needed"
            >
              <Input
                type="number"
                min={1}
                placeholder="15000"
                aria-invalid={!!errors.feesAgreed}
                {...register("feesAgreed")}
              />
            </Field>
            <Field label="Enrollment Date" error={errors.enrollmentDate?.message}>
              <Input type="date" {...register("enrollmentDate")} />
            </Field>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Notes
          </h2>
          <Field label="Internal Notes" error={errors.notes?.message}>
            <Textarea placeholder="Any additional notes…" rows={3} {...register("notes")} />
          </Field>
        </Card>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {isSubmitting ? "Creating…" : "Create Admission"}
          </Button>
          <Link href={leadId ? `/leads/${leadId}` : "/admissions"}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function NewAdmissionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading…</div>}>
      <NewAdmissionForm />
    </Suspense>
  );
}

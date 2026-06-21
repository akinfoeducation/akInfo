"use client";

import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { selectLabel } from "@/lib/ui/select-label";
import { createBatch } from "@/lib/api/batches.api";
import { listCourses } from "@/lib/api/courses.api";

const schema = z.object({
  courseId:    z.coerce.number().min(1, "Course is required"),
  name:        z.string().min(1, "Batch name is required").max(200),
  batchCode:   z.string().max(30).optional().or(z.literal("")),
  mode:        z.enum(["ONLINE", "OFFLINE", "HYBRID"]).optional(),
  facultyName: z.string().max(200).optional().or(z.literal("")),
  timing:      z.string().max(100).optional().or(z.literal("")),
  startDate:   z.string().optional().or(z.literal("")),
  endDate:     z.string().optional().or(z.literal("")),
  maxCapacity: z.coerce.number().min(1).optional().or(z.literal("")),
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

export default function NewBatchPage() {
  const router = useRouter();

  const { data: coursesData } = useQuery({
    queryKey: ["courses", "ACTIVE"],
    queryFn:  () => listCourses("ACTIVE"),
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
    defaultValues: { mode: "OFFLINE" },
  });

  const watchedMode    = watch("mode");
  const watchedCourse  = watch("courseId");

  async function onSubmit(values: FormData) {
    try {
      const { courseId, ...rest } = values;
      const batch = await createBatch(courseId, {
        ...rest,
        batchCode:   rest.batchCode   || undefined,
        facultyName: rest.facultyName || undefined,
        timing:      rest.timing      || undefined,
        startDate:   rest.startDate   || undefined,
        endDate:     rest.endDate     || undefined,
        maxCapacity: rest.maxCapacity ? Number(rest.maxCapacity) : undefined,
      });
      toast.success(`Batch "${batch.name}" created`);
      router.push(`/batches/${batch.id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to create batch.";
      toast.error(msg);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/batches">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">New Batch</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create a training batch for a course
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Batch Details
          </h2>

          <Field label="Course" error={errors.courseId?.message} required>
            <input type="hidden" {...register("courseId")} />
            <Select
              value={watchedCourse ? String(watchedCourse) : "__none"}
              onValueChange={(v) => setValue("courseId", v === "__none" ? 0 : Number(v), { shouldValidate: true })}
            >
              <SelectTrigger className="w-full" aria-invalid={!!errors.courseId}>
                <SelectValue placeholder="Select a course…">
                  {selectLabel(courses, c => c.name, "Select a course…", { "__none": "— Select course —" })}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— Select course —</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Batch Name" error={errors.name?.message} required>
              <Input placeholder="e.g. Morning Batch — June 2025" {...register("name")} />
            </Field>
            <Field label="Batch Code" error={errors.batchCode?.message} hint="Short unique code (e.g. B-JUN-25)">
              <Input placeholder="B-JUN-25" {...register("batchCode")} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Mode" error={errors.mode?.message}>
              <input type="hidden" {...register("mode")} />
              <Select
                value={watchedMode ?? "OFFLINE"}
                onValueChange={(v) => setValue("mode", v as "ONLINE" | "OFFLINE" | "HYBRID")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OFFLINE">Offline</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                  <SelectItem value="HYBRID">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Capacity" error={errors.maxCapacity?.message} hint="Leave blank for unlimited">
              <Input type="number" min={1} placeholder="30" {...register("maxCapacity")} />
            </Field>
          </div>

          <Field label="Faculty / Trainer" error={errors.facultyName?.message}>
            <Input placeholder="Trainer name" {...register("facultyName")} />
          </Field>

          <Field label="Batch Timing" error={errors.timing?.message}>
            <Input placeholder="e.g. Mon–Fri 10:00 AM – 12:00 PM" {...register("timing")} />
          </Field>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Schedule
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date" error={errors.startDate?.message}>
              <Input type="date" {...register("startDate")} />
            </Field>
            <Field label="End Date" error={errors.endDate?.message}>
              <Input type="date" {...register("endDate")} />
            </Field>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {isSubmitting ? "Creating…" : "Create Batch"}
          </Button>
          <Link href="/batches">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

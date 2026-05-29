"use client";

import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { createCourse } from "@/lib/api/courses.api";

const schema = z.object({
  name:          z.string().min(1, "Course name is required").max(200),
  code:          z.string().min(1, "Course code is required").max(20)
                   .transform((v) => v.toUpperCase()),
  description:   z.string().optional().or(z.literal("")),
  durationWeeks: z.coerce.number().int().min(1, "Must be at least 1 week").optional(),
  fees:          z.coerce.number().min(0, "Must be non-negative").optional(),
});

type FormData = z.infer<typeof schema>;

function Field({ label, error, hint, children, required }: {
  label: string; error?: string; hint?: string;
  children: React.ReactNode; required?: boolean;
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

export default function NewCoursePage() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) as Resolver<FormData> });

  async function onSubmit(values: FormData) {
    try {
      const course = await createCourse({
        ...values,
        description:   values.description   || undefined,
        durationWeeks: values.durationWeeks || undefined,
        fees:          values.fees          ?? 0,
      });
      toast.success(`Course "${course.name}" created`);
      router.push(`/courses/${course.id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to create course.";
      toast.error(msg);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/courses">
          <Button variant="ghost" size="icon-sm"><ArrowLeft className="size-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Add Course</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create a new course offering</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Course Info
          </h2>
          <Field label="Course Name" error={errors.name?.message} required>
            <Input placeholder="Mobile Repairing Course" aria-invalid={!!errors.name} {...register("name")} />
          </Field>
          <Field
            label="Course Code" error={errors.code?.message} required
            hint="Short unique code, e.g. MRC, LRC. Auto-uppercased."
          >
            <Input placeholder="MRC" maxLength={20} aria-invalid={!!errors.code} {...register("code")} />
          </Field>
          <Field label="Description" error={errors.description?.message}>
            <Textarea
              placeholder="Brief description of what the course covers…"
              rows={3}
              {...register("description")}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Duration (weeks)" error={errors.durationWeeks?.message}>
              <Input type="number" min={1} placeholder="8" {...register("durationWeeks")} />
            </Field>
            <Field label="Standard Fees (₹)" error={errors.fees?.message}>
              <Input type="number" min={0} placeholder="15000" {...register("fees")} />
            </Field>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {isSubmitting ? "Creating…" : "Create Course"}
          </Button>
          <Link href="/courses">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

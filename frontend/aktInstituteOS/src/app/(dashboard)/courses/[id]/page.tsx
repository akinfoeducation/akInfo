"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeft, Edit2, Trash2, Plus, Clock,
  IndianRupee, Layers, X, Check,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseStatusBadge } from "@/components/courses/CourseStatusBadge";
import { BatchStatusBadge } from "@/components/courses/BatchStatusBadge";
import {
  getCourse, updateCourse, deleteCourse,
  createBatch, updateBatch, deleteBatch,
} from "@/lib/api/courses.api";
import { usePermissions } from "@/lib/hooks/usePermissions";
import type { CourseStatus, BatchStatus } from "@/types/course";

// ── schemas ──────────────────────────────────────────────────────────────────

const courseEditSchema = z.object({
  name:          z.string().min(1, "Required"),
  description:   z.string().optional().or(z.literal("")),
  durationWeeks: z.coerce.number().int().min(1).optional(),
  fees:          z.coerce.number().min(0).optional(),
  status:        z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
});

const batchSchema = z.object({
  name:        z.string().min(1, "Batch name is required"),
  timing:      z.string().optional().or(z.literal("")),
  startDate:   z.string().optional().or(z.literal("")),
  endDate:     z.string().optional().or(z.literal("")),
  maxCapacity: z.coerce.number().int().min(1).optional(),
});

type CourseEditForm = z.infer<typeof courseEditSchema>;
type BatchForm      = z.infer<typeof batchSchema>;

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

// ── Batch row with inline edit ────────────────────────────────────────────────

function BatchRow({
  batch, courseId, onDeleted, onUpdated,
}: {
  batch: NonNullable<Awaited<ReturnType<typeof getCourse>>["batches"]>[number];
  courseId: number;
  onDeleted: () => void;
  onUpdated: () => void;
}) {
  const { has } = usePermissions();
  const canEditBatch = has("BATCH_MANAGE");
  const [editing, setEditing] = useState(false);
  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } = useForm<BatchForm>({
    resolver: zodResolver(batchSchema) as Resolver<BatchForm>,
  });

  function startEdit() {
    reset({
      name:        batch.name,
      timing:      batch.timing ?? "",
      startDate:   batch.startDate ?? "",
      endDate:     batch.endDate   ?? "",
      maxCapacity: batch.maxCapacity,
    });
    setEditing(true);
  }

  const updateMut = useMutation({
    mutationFn: (v: BatchForm) =>
      updateBatch(courseId, batch.id, {
        ...v,
        timing:      v.timing      || undefined,
        startDate:   v.startDate   || undefined,
        endDate:     v.endDate     || undefined,
        maxCapacity: v.maxCapacity || undefined,
      }),
    onSuccess: () => { toast.success("Batch updated"); setEditing(false); onUpdated(); },
    onError: () => toast.error("Failed to update batch"),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteBatch(courseId, batch.id),
    onSuccess: () => { toast.success("Batch deleted"); onDeleted(); },
    onError: () => toast.error("Failed to delete batch"),
  });

  if (editing) {
    return (
      <form
        onSubmit={handleSubmit((v) => updateMut.mutate(v))}
        className="border border-emerald-200 rounded-lg p-4 space-y-3 bg-emerald-50/40"
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Batch Name" error={errors.name?.message}>
            <Input {...register("name")} aria-invalid={!!errors.name} />
          </Field>
          <Field label="Timing" error={errors.timing?.message}>
            <Input placeholder="9:00 AM – 12:00 PM" {...register("timing")} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Start Date" error={errors.startDate?.message}>
            <Input type="date" {...register("startDate")} />
          </Field>
          <Field label="End Date" error={errors.endDate?.message}>
            <Input type="date" {...register("endDate")} />
          </Field>
          <Field label="Max Capacity" error={errors.maxCapacity?.message}>
            <Input type="number" min={1} {...register("maxCapacity")} />
          </Field>
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isSubmitting || updateMut.isPending}
            className="bg-emerald-500 hover:bg-emerald-600 text-white">
            <Check className="size-3.5" />
            {updateMut.isPending ? "Saving…" : "Save"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
            <X className="size-3.5" /> Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 bg-white hover:border-gray-300 transition-colors">
      <div className="flex items-center gap-4 min-w-0">
        <BatchStatusBadge status={batch.status} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{batch.name}</p>
          <p className="text-xs text-muted-foreground">
            {batch.timing ?? ""}
            {batch.startDate && (
              <> · {format(new Date(batch.startDate), "dd MMM yyyy")}
              {batch.endDate && <> – {format(new Date(batch.endDate), "dd MMM yyyy")}</>}</>
            )}
            {batch.maxCapacity && <> · {batch.maxCapacity} seats</>}
          </p>
        </div>
      </div>
      {canEditBatch && (
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon-sm" onClick={startEdit}>
            <Edit2 className="size-3.5 text-gray-400" />
          </Button>
          <Button
            variant="ghost" size="icon-sm"
            disabled={deleteMut.isPending}
            onClick={() => deleteMut.mutate()}
          >
            <Trash2 className="size-3.5 text-red-400" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const courseId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { has } = usePermissions();
  const canUpdate = has("COURSE_UPDATE");
  const canDelete = has("COURSE_DELETE");
  const canCreateBatch = has("BATCH_MANAGE");
  const [editing, setEditing] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => getCourse(courseId),
  });

  const courseEditForm = useForm<CourseEditForm>({ resolver: zodResolver(courseEditSchema) as Resolver<CourseEditForm> });
  const batchForm = useForm<BatchForm>({ resolver: zodResolver(batchSchema) as Resolver<BatchForm> });

  function startEditing() {
    if (!course) return;
    courseEditForm.reset({
      name:          course.name,
      description:   course.description ?? "",
      durationWeeks: course.durationWeeks,
      fees:          course.fees,
      status:        course.status,
    });
    setEditing(true);
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["course", courseId] });

  const updateMut = useMutation({
    mutationFn: (v: CourseEditForm) => updateCourse(courseId, {
      ...v,
      description:   v.description   || undefined,
      durationWeeks: v.durationWeeks || undefined,
    }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["course", courseId], updated);
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Course updated");
      setEditing(false);
    },
    onError: () => toast.error("Failed to update course"),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Course deleted");
      router.push("/courses");
    },
    onError: () => { toast.error("Failed to delete course"); setConfirmDelete(false); },
  });

  const addBatchMut = useMutation({
    mutationFn: (v: BatchForm) => createBatch(courseId, {
      ...v,
      timing:      v.timing      || undefined,
      startDate:   v.startDate   || undefined,
      endDate:     v.endDate     || undefined,
      maxCapacity: v.maxCapacity || undefined,
    }),
    onSuccess: () => {
      toast.success("Batch added");
      batchForm.reset();
      setShowBatchForm(false);
      invalidate();
    },
    onError: () => toast.error("Failed to add batch"),
  });

  if (isLoading) return (
    <div className="max-w-3xl space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-40 w-full" />
    </div>
  );

  if (!course) return (
    <div className="text-center py-20 text-muted-foreground">
      Course not found. <Link href="/courses" className="text-emerald-600 hover:underline">Back to courses</Link>
    </div>
  );

  const batches = course.batches ?? [];

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/courses">
            <Button variant="ghost" size="icon-sm"><ArrowLeft className="size-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{course.name}</h1>
              <CourseStatusBadge status={course.status} />
            </div>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">{course.code}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canUpdate && !editing && (
            <Button variant="outline" size="sm" onClick={startEditing}>
              <Edit2 className="size-3.5" /> Edit
            </Button>
          )}
          {canDelete && (!confirmDelete ? (
            <Button variant="outline" size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-3.5" /> Delete
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button size="sm" variant="destructive"
                disabled={deleteMut.isPending}
                onClick={() => deleteMut.mutate()}>
                {deleteMut.isPending ? "Deleting…" : "Confirm"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="size-3" /> Duration</p>
          <p className="text-xl font-semibold mt-1">
            {course.durationWeeks ? `${course.durationWeeks} weeks` : "—"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><IndianRupee className="size-3" /> Fees</p>
          <p className="text-xl font-semibold mt-1">{formatCurrency(course.fees)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Layers className="size-3" /> Batches</p>
          <p className="text-xl font-semibold mt-1">{batches.length}</p>
        </Card>
      </div>

      {/* Edit form */}
      {editing ? (
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Edit Course</h2>
          <form onSubmit={courseEditForm.handleSubmit((v) => updateMut.mutate(v))} className="space-y-4">
            <Field label="Course Name" error={courseEditForm.formState.errors.name?.message}>
              <Input {...courseEditForm.register("name")} />
            </Field>
            <Field label="Description" error={courseEditForm.formState.errors.description?.message}>
              <Textarea rows={3} {...courseEditForm.register("description")} />
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Duration (weeks)" error={courseEditForm.formState.errors.durationWeeks?.message}>
                <Input type="number" min={1} {...courseEditForm.register("durationWeeks")} />
              </Field>
              <Field label="Fees (₹)" error={courseEditForm.formState.errors.fees?.message}>
                <Input type="number" min={0} {...courseEditForm.register("fees")} />
              </Field>
              <Field label="Status" error={courseEditForm.formState.errors.status?.message}>
                <Select
                  defaultValue={course.status}
                  onValueChange={(v) => courseEditForm.setValue("status", v as CourseStatus)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="flex gap-3">
              <Button type="submit"
                disabled={courseEditForm.formState.isSubmitting || updateMut.isPending}
                className="bg-emerald-500 hover:bg-emerald-600 text-white">
                {updateMut.isPending ? "Saving…" : "Save Changes"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      ) : course.description ? (
        <Card className="p-6">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">About</h2>
          <p className="text-sm text-gray-700">{course.description}</p>
        </Card>
      ) : null}

      {/* Batches section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Batches</h2>
          {canCreateBatch && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => { batchForm.reset(); setShowBatchForm((v) => !v); }}
            >
              <Plus className="size-3.5" />
              Add Batch
            </Button>
          )}
        </div>

        {/* Add batch form */}
        {showBatchForm && (
          <Card className="p-4 space-y-3 border-emerald-200 bg-emerald-50/30">
            <p className="text-sm font-medium">New Batch</p>
            <form onSubmit={batchForm.handleSubmit((v) => addBatchMut.mutate(v))} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Batch Name" error={batchForm.formState.errors.name?.message}>
                  <Input placeholder="Morning Batch 2025" aria-invalid={!!batchForm.formState.errors.name} {...batchForm.register("name")} />
                </Field>
                <Field label="Timing" error={batchForm.formState.errors.timing?.message}>
                  <Input placeholder="9:00 AM – 12:00 PM" {...batchForm.register("timing")} />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Start Date">
                  <Input type="date" {...batchForm.register("startDate")} />
                </Field>
                <Field label="End Date">
                  <Input type="date" {...batchForm.register("endDate")} />
                </Field>
                <Field label="Max Capacity">
                  <Input type="number" min={1} placeholder="30" {...batchForm.register("maxCapacity")} />
                </Field>
              </div>
              <div className="flex gap-2">
                <Button type="submit"
                  disabled={addBatchMut.isPending}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white" size="sm">
                  {addBatchMut.isPending ? "Adding…" : "Add Batch"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowBatchForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {batches.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-gray-200 rounded-lg">
            No batches yet. Click &ldquo;Add Batch&rdquo; to create the first one.
          </p>
        ) : (
          <div className="space-y-2">
            {batches.map((batch) => (
              <BatchRow
                key={batch.id}
                batch={batch}
                courseId={courseId}
                onDeleted={invalidate}
                onUpdated={invalidate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

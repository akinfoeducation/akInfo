"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Megaphone, Users, Info } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { sendBroadcast } from "@/lib/api/notifications.api";
import { listCourses } from "@/lib/api/courses.api";
import { listAllBatches } from "@/lib/api/batches.api";

const schema = z.object({
  channel:         z.enum(["EMAIL", "WHATSAPP"]),
  message:         z.string().min(1, "Message is required"),
  subject:         z.string().optional(),
  courseId:        z.coerce.number().optional(),
  batchId:         z.coerce.number().optional(),
  admissionStatus: z.string().optional(),
  leadStatus:      z.string().optional(),
  feePendingOnly:  z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

function Field({ label, hint, error, children }: {
  label: string; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint  && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function BroadcastPage() {
  const router = useRouter();

  const { data: coursesData } = useQuery({
    queryKey: ["courses", "ACTIVE"],
    queryFn:  () => listCourses("ACTIVE"),
    staleTime: 60_000,
  });
  const courses = coursesData?.data ?? [];

  const { data: batches = [] } = useQuery({
    queryKey: ["batches"],
    queryFn:  () => listAllBatches({}),
    staleTime: 60_000,
  });

  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { channel: "WHATSAPP" },
  });

  const watchedChannel = watch("channel");
  const watchedFeeOnly = watch("feePendingOnly");

  const mutation = useMutation({
    mutationFn: (values: FormData) => sendBroadcast({
      ...values,
      courseId:       values.courseId       || undefined,
      batchId:        values.batchId        || undefined,
      admissionStatus: values.admissionStatus || undefined,
      leadStatus:     values.leadStatus     || undefined,
      subject:        values.subject        || undefined,
    }),
    onSuccess: () => {
      toast.success("Broadcast queued — messages will be sent in the background");
      router.push("/notifications");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to start broadcast";
      toast.error(msg);
    },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/notifications">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Megaphone className="size-5 text-muted-foreground" />
            Broadcast Message
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Send a message to a filtered group of students
          </p>
        </div>
      </div>

      {/* Safety notice */}
      <Card className="p-4 flex items-start gap-3 bg-amber-50 border-amber-200">
        <Info className="size-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          Broadcast sends to up to <strong>500 recipients</strong> matching your filters.
          No filters selected = all active admissions.
          Messages are queued and delivered asynchronously.
        </p>
      </Card>

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Channel
          </h2>
          <Field label="Send Via">
            <input type="hidden" {...register("channel")} />
            <Select
              value={watchedChannel}
              onValueChange={(v) => setValue("channel", v as "EMAIL" | "WHATSAPP")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {watchedChannel === "EMAIL" && (
            <Field label="Email Subject" error={errors.subject?.message}>
              <Input placeholder="Important update from AKT Info Institute" {...register("subject")} />
            </Field>
          )}
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Users className="size-4" />
            Recipient Filters
            <span className="text-xs font-normal normal-case text-muted-foreground">(all optional)</span>
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Course" hint="Limit to students of this course">
              <Select
                value={watch("courseId") ? String(watch("courseId")) : "__all"}
                onValueChange={(v) => setValue("courseId", v === "__all" ? undefined : Number(v))}
              >
                <SelectTrigger><SelectValue placeholder="All courses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All courses</SelectItem>
                  {courses.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Batch" hint="Limit to a specific batch">
              <Select
                value={watch("batchId") ? String(watch("batchId")) : "__all"}
                onValueChange={(v) => setValue("batchId", v === "__all" ? undefined : Number(v))}
              >
                <SelectTrigger><SelectValue placeholder="All batches" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All batches</SelectItem>
                  {batches.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Admission Status">
              <Select
                value={watch("admissionStatus") || "__all"}
                onValueChange={(v) => setValue("admissionStatus", v === "__all" ? undefined : v ?? undefined)}
              >
                <SelectTrigger><SelectValue placeholder="Any status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Any status</SelectItem>
                  {["PENDING","DOCUMENTS_PENDING","ENROLLED","ACTIVE","COMPLETED"].map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Lead Status">
              <Select
                value={watch("leadStatus") || "__all"}
                onValueChange={(v) => setValue("leadStatus", v === "__all" ? undefined : v ?? undefined)}
              >
                <SelectTrigger><SelectValue placeholder="Any lead status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Any lead status</SelectItem>
                  {["NEW","CONTACTED","INTERESTED","DEMO_SCHEDULED","CONVERTED","NOT_INTERESTED","LOST"].map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="feePending"
              checked={!!watchedFeeOnly}
              onChange={(e) => setValue("feePendingOnly", e.target.checked)}
              className="size-4 rounded"
            />
            <Label htmlFor="feePending" className="cursor-pointer">
              Fee pending students only (balance &gt; ₹0)
            </Label>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Message
          </h2>
          <Field label="Message Body" error={errors.message?.message}>
            <Textarea
              rows={5}
              placeholder={watchedChannel === "EMAIL"
                ? "Write your message here (HTML is supported for email)…"
                : "Write your WhatsApp message here…"}
              {...register("message")}
              aria-invalid={!!errors.message}
            />
          </Field>
          <p className="text-xs text-muted-foreground">
            For WhatsApp: use *bold*, _italic_ formatting.
            For Email: HTML tags are supported.
          </p>
        </Card>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={mutation.isPending || isSubmitting}
            className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
          >
            <Megaphone className="size-4" />
            {mutation.isPending || isSubmitting ? "Queuing…" : "Send Broadcast"}
          </Button>
          <Link href="/notifications">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

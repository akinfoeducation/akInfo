"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Wifi, MapPin, AlertTriangle } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLead, lookupLeadByPhone } from "@/lib/api/leads.api";
import { listCourses } from "@/lib/api/courses.api";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { DuplicateLeadDialog, type DuplicateConflictView } from "@/components/leads/DuplicateLeadDialog";

// Lead intake is deliberately minimal — only the mobile number is required.
// Name / Course / Source are captured if available. Everything else (delivery mode,
// parent info, preferred batch/branch, etc.) is gathered later on the lead's
// qualification screen by the caller. Exception: a genuine walk-in is in front of
// you, so Online/Offline is required when Source = Walk In.
const schema = z
  .object({
    firstName:        z.string().max(100).optional().or(z.literal("")),
    phone:            z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
    whatsappNumber:   z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit number").optional().or(z.literal("")),
    email:            z.string().email("Enter a valid email").optional().or(z.literal("")),
    courseInterested: z.string().optional().or(z.literal("")),
    source:           z.enum(["WALK_IN", "REFERRAL", "SOCIAL_MEDIA", "WEBSITE", "GOOGLE_ADS", "OTHER"]).optional(),
    deliveryMode:     z.enum(["ONLINE", "OFFLINE"]).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.source === "WALK_IN" && !val.deliveryMode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deliveryMode"],
        message: "Select Online or Offline for a walk-in student",
      });
    }
  });

type FormData = z.infer<typeof schema>;

function DuplicateHint({ conflict, onView }: { conflict: DuplicateConflictView; onView: () => void }) {
  return (
    <button
      type="button"
      onClick={onView}
      className="mt-1 flex items-center gap-1.5 text-xs text-amber-700 hover:underline"
    >
      <AlertTriangle className="size-3.5 shrink-0" />
      Already exists{conflict.assignedToName ? ` — with ${conflict.assignedToName}` : ""} · view
    </button>
  );
}

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

  const source       = watch("source");
  const deliveryMode = watch("deliveryMode");
  const isWalkIn     = source === "WALK_IN";

  // ── Real-time duplicate check (Requirement 6) ───────────────────────────────
  const phoneValue    = watch("phone");
  const whatsappValue = watch("whatsappNumber");
  const debouncedPhone    = useDebounce(phoneValue, 400);
  const debouncedWhatsapp = useDebounce(whatsappValue, 400);
  const [dupConflicts, setDupConflicts] = useState<DuplicateConflictView[]>([]);
  const [dupOpen, setDupOpen] = useState(false);
  const poppedFor = useRef("");

  useEffect(() => {
    let active = true;
    const valid = (n?: string) => !!n && /^[6-9]\d{9}$/.test(n);
    (async () => {
      const checks: Array<{ field: "phone" | "whatsappNumber"; number: string }> = [];
      if (valid(debouncedPhone)) checks.push({ field: "phone", number: debouncedPhone! });
      if (valid(debouncedWhatsapp) && debouncedWhatsapp !== debouncedPhone) {
        checks.push({ field: "whatsappNumber", number: debouncedWhatsapp! });
      }
      const found: DuplicateConflictView[] = [];
      for (const c of checks) {
        try {
          const r = await lookupLeadByPhone(c.number);
          if (r.exists && r.leadId) {
            found.push({
              number: c.number, field: c.field, leadId: r.leadId,
              name: r.name, status: r.status, assignedToName: r.assignedToName,
            });
          }
        } catch {
          /* lookup is best-effort — never block the form on a failed check */
        }
      }
      if (!active) return;
      setDupConflicts(found);
      const sig = found.map((f) => `${f.field}:${f.number}`).sort().join(",");
      if (found.length > 0 && poppedFor.current !== sig) {
        poppedFor.current = sig;
        setDupOpen(true);
      }
      if (found.length === 0) poppedFor.current = "";
    })();
    return () => { active = false; };
  }, [debouncedPhone, debouncedWhatsapp]);

  const phoneConflict    = dupConflicts.find((c) => c.field === "phone");
  const whatsappConflict = dupConflicts.find((c) => c.field === "whatsappNumber");

  async function onSubmit(values: FormData) {
    try {
      const payload = {
        phone:            values.phone,
        firstName:        values.firstName       || undefined,
        whatsappNumber:   values.whatsappNumber  || undefined,
        email:            values.email           || undefined,
        courseInterested: values.courseInterested|| undefined,
        source:           values.source          || undefined,
        // Only sent for walk-ins; otherwise captured during qualification.
        deliveryMode:     values.deliveryMode     || undefined,
      };
      const lead = await createLead(payload);
      toast.success(`Lead ${lead.fullName} added`);
      router.push(`/leads/${lead.id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to create lead.";
      toast.error(msg);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/leads">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Add Lead</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Quick intake — only the mobile number is required. The caller fills in the
            rest later.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Contact ─────────────────────────────────────────────────── */}
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Contact
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Mobile Number" error={errors.phone?.message} required>
              <Input placeholder="9876543210" maxLength={10} aria-invalid={!!errors.phone} {...register("phone")} />
              {phoneConflict && <DuplicateHint conflict={phoneConflict} onView={() => setDupOpen(true)} />}
            </Field>
            <Field label="WhatsApp Number" error={errors.whatsappNumber?.message}>
              <Input placeholder="If different" maxLength={10} {...register("whatsappNumber")} />
              {whatsappConflict && <DuplicateHint conflict={whatsappConflict} onView={() => setDupOpen(true)} />}
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" error={errors.firstName?.message}>
              <Input placeholder="If known" {...register("firstName")} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" placeholder="If known" {...register("email")} />
            </Field>
          </div>
        </Card>

        {/* ── Lead Details ───────────────────────────────────────────── */}
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Lead Details
          </h2>
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
          <Field label="Source" error={errors.source?.message}>
            <Select onValueChange={(val) => setValue("source", val as FormData["source"], { shouldValidate: true })}>
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

          {/* Online/Offline — only for walk-ins (the student is present to ask). */}
          {isWalkIn && (
            <Field label="Delivery Mode" error={errors.deliveryMode?.message} required>
              <div className="grid grid-cols-2 gap-3">
                {(["ONLINE", "OFFLINE"] as const).map((mode) => {
                  const activeMode = deliveryMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setValue("deliveryMode", mode, { shouldValidate: true })}
                      className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                        activeMode
                          ? mode === "ONLINE"
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {mode === "ONLINE" ? <Wifi className="size-5 shrink-0" /> : <MapPin className="size-5 shrink-0" />}
                      <div>
                        <p className="font-semibold text-sm">{mode === "ONLINE" ? "Online" : "Offline"}</p>
                        <p className="text-xs opacity-70 mt-0.5">
                          {mode === "ONLINE" ? "Remote / LMS" : "Physical class"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Field>
          )}
        </Card>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {isSubmitting ? "Adding…" : "Add Lead"}
          </Button>
          <Link href="/leads">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>

      <DuplicateLeadDialog
        open={dupOpen}
        onOpenChange={setDupOpen}
        context="create"
        conflicts={dupConflicts}
      />
    </div>
  );
}

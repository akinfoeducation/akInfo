"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, type Resolver, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Info } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdmission, enrollAdmission } from "@/lib/api/admissions.api";

// ── Schema ────────────────────────────────────────────────────────────────────

const phoneOptional = z.string()
  .refine((v) => !v || /^[6-9]\d{9}$/.test(v), "Invalid 10-digit mobile number")
  .optional()
  .or(z.literal(""));

const schema = z.object({
  // Basic (pre-filled from admission)
  firstName:            z.string().min(1, "Required").max(100),
  lastName:             z.string().max(100).optional().or(z.literal("")),
  phone:                z.string().regex(/^[6-9]\d{9}$/, "Valid 10-digit mobile number required"),
  email:                z.string().email("Invalid email").optional().or(z.literal("")),
  whatsappNumber:       phoneOptional,

  // Personal
  dateOfBirth:          z.string().optional().or(z.literal("")),
  gender:               z.string().optional().or(z.literal("")),

  // Address
  address:              z.string().max(500).optional().or(z.literal("")),
  city:                 z.string().max(100).optional().or(z.literal("")),
  state:                z.string().max(100).optional().or(z.literal("")),
  pincode:              z.string()
                          .refine((v) => !v || /^\d{6}$/.test(v), "Must be 6 digits")
                          .optional()
                          .or(z.literal("")),

  // Parent / Guardian
  parentName:           z.string().max(200).optional().or(z.literal("")),
  parentPhone:          phoneOptional,
  parentEmail:          z.string().email("Invalid email").optional().or(z.literal("")),
  emergencyContact:     phoneOptional,

  // Education
  highestQualification: z.string().max(200).optional().or(z.literal("")),
  schoolCollegeName:    z.string().max(300).optional().or(z.literal("")),

  // Identity
  aadhaarNumber:        z.string()
                          .refine((v) => !v || /^\d{12}$/.test(v), "Must be exactly 12 digits")
                          .optional()
                          .or(z.literal("")),
  panNumber:            z.string()
                          .refine((v) => !v || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v), "Invalid format — example: ABCDE1234F")
                          .optional()
                          .or(z.literal("")),

  // Notes
  notes:                z.string().max(2000).optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function Field({
  label, error, hint, required, children,
}: {
  label: string; error?: string; hint?: string; required?: boolean; children: React.ReactNode;
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

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      {children}
    </h2>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EnrollStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const admissionId = Number(id);
  const router = useRouter();

  // Fetch admission to pre-fill
  const { data: admission, isLoading } = useQuery({
    queryKey: ["admission", admissionId],
    queryFn: () => getAdmission(admissionId),
  });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
  });

  // Pre-fill form once admission loads
  useEffect(() => {
    if (!admission) return;
    reset({
      firstName: admission.firstName,
      lastName:  admission.lastName  ?? "",
      phone:     admission.phone,
      email:     admission.email     ?? "",
    });
  }, [admission, reset]);

  const mutation = useMutation({
    mutationFn: (values: FormData) =>
      enrollAdmission(admissionId, {
        firstName:            values.firstName,
        lastName:             values.lastName             || undefined,
        phone:                values.phone,
        email:                values.email               || undefined,
        whatsappNumber:       values.whatsappNumber      || undefined,
        dateOfBirth:          values.dateOfBirth         || undefined,
        gender:               (values.gender as "MALE" | "FEMALE" | "OTHER") || undefined,
        address:              values.address             || undefined,
        city:                 values.city                || undefined,
        state:                values.state               || undefined,
        pincode:              values.pincode             || undefined,
        parentName:           values.parentName          || undefined,
        parentPhone:          values.parentPhone         || undefined,
        parentEmail:          values.parentEmail         || undefined,
        emergencyContact:     values.emergencyContact    || undefined,
        highestQualification: values.highestQualification|| undefined,
        schoolCollegeName:    values.schoolCollegeName   || undefined,
        aadhaarNumber:        values.aadhaarNumber       || undefined,
        panNumber:            values.panNumber           || undefined,
        notes:                values.notes               || undefined,
      }),
    onSuccess: (updated) => {
      toast.success("Student record created — add photo and ID documents on the profile page");
      router.push(`/students/${updated.studentId}`);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to create student record.";
      toast.error(msg);
    },
  });

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading || !admission) {
    return (
      <div className="max-w-2xl space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/admissions/${admissionId}`}>
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Create Student Record</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {admission.fullName} &middot;{" "}
            <span className="font-mono">{admission.admissionNumber}</span>
            {admission.courseName && <> &middot; {admission.courseName}</>}
          </p>
        </div>
      </div>

      {/* ID document notice */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
        <Info className="size-4 mt-0.5 shrink-0 text-amber-500" />
        <p>
          Fill in personal details below. <strong>ID document images</strong> (photos of Aadhaar
          card, PAN card, marksheets) can be uploaded from the student profile page after this
          record is created.
        </p>
      </div>

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-5">

        {/* ── Basic Information ── */}
        <Card className="p-6 space-y-4">
          <SectionHeader>Basic Information</SectionHeader>
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" error={errors.firstName?.message} required>
              <Input
                placeholder="Arjun"
                aria-invalid={!!errors.firstName}
                {...register("firstName")}
              />
            </Field>
            <Field label="Last Name" error={errors.lastName?.message}>
              <Input placeholder="Sharma" {...register("lastName")} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Mobile Number" error={errors.phone?.message} required
              hint="Primary contact — 10-digit Indian mobile"
            >
              <Input
                type="tel"
                maxLength={10}
                placeholder="9876543210"
                aria-invalid={!!errors.phone}
                {...register("phone")}
              />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" placeholder="arjun@example.com" {...register("email")} />
            </Field>
          </div>
          <Field
            label="WhatsApp Number" error={errors.whatsappNumber?.message}
            hint="Leave blank if same as mobile"
          >
            <Input
              type="tel"
              maxLength={10}
              placeholder="9876543210"
              {...register("whatsappNumber")}
            />
          </Field>
        </Card>

        {/* ── Personal Details ── */}
        <Card className="p-6 space-y-4">
          <SectionHeader>Personal Details</SectionHeader>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date of Birth" error={errors.dateOfBirth?.message}>
              <Input type="date" {...register("dateOfBirth")} />
            </Field>
            <Field label="Gender" error={errors.gender?.message}>
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v === "__none" ? "" : v)}
                  >
                    <SelectTrigger aria-invalid={!!errors.gender}>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">— Not specified —</SelectItem>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>
        </Card>

        {/* ── Address ── */}
        <Card className="p-6 space-y-4">
          <SectionHeader>Address</SectionHeader>
          <Field label="Street Address" error={errors.address?.message}>
            <Textarea
              placeholder="House no., street, locality…"
              rows={2}
              {...register("address")}
            />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="City" error={errors.city?.message}>
              <Input placeholder="Nagpur" {...register("city")} />
            </Field>
            <Field label="State" error={errors.state?.message}>
              <Input placeholder="Maharashtra" {...register("state")} />
            </Field>
            <Field label="Pincode" error={errors.pincode?.message}>
              <Input placeholder="440001" maxLength={6} {...register("pincode")} />
            </Field>
          </div>
        </Card>

        {/* ── Parent / Guardian ── */}
        <Card className="p-6 space-y-4">
          <SectionHeader>Parent / Guardian</SectionHeader>
          <Field label="Parent / Guardian Name" error={errors.parentName?.message}>
            <Input placeholder="Rajesh Sharma" {...register("parentName")} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Parent Mobile" error={errors.parentPhone?.message}>
              <Input
                type="tel"
                maxLength={10}
                placeholder="9876543210"
                {...register("parentPhone")}
              />
            </Field>
            <Field label="Parent Email" error={errors.parentEmail?.message}>
              <Input type="email" placeholder="parent@example.com" {...register("parentEmail")} />
            </Field>
          </div>
          <Field
            label="Emergency Contact" error={errors.emergencyContact?.message}
            hint="If different from parent — must be a valid mobile number"
          >
            <Input
              type="tel"
              maxLength={10}
              placeholder="9876543210"
              {...register("emergencyContact")}
            />
          </Field>
        </Card>

        {/* ── Education Background ── */}
        <Card className="p-6 space-y-4">
          <SectionHeader>Education Background</SectionHeader>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Highest Qualification" error={errors.highestQualification?.message}>
              <Input placeholder="10th, 12th, ITI, Diploma…" {...register("highestQualification")} />
            </Field>
            <Field label="School / College" error={errors.schoolCollegeName?.message}>
              <Input placeholder="ABC High School" {...register("schoolCollegeName")} />
            </Field>
          </div>
        </Card>

        {/* ── ID Details ── */}
        <Card className="p-6 space-y-4">
          <SectionHeader>ID Details</SectionHeader>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Aadhaar Number" error={errors.aadhaarNumber?.message}
              hint="12-digit number (optional)"
            >
              <Input
                placeholder="123456789012"
                maxLength={12}
                inputMode="numeric"
                {...register("aadhaarNumber")}
              />
            </Field>
            <Field
              label="PAN Number" error={errors.panNumber?.message}
              hint="10-character PAN (optional)"
            >
              <Input
                placeholder="ABCDE1234F"
                maxLength={10}
                className="uppercase"
                {...register("panNumber", {
                  setValueAs: (v: string) => (v ? v.toUpperCase() : v),
                })}
              />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            ID document images (Aadhaar card, PAN card) can be uploaded from the student profile page.
          </p>
        </Card>

        {/* ── Notes ── */}
        <Card className="p-6 space-y-4">
          <SectionHeader>Notes</SectionHeader>
          <Field label="Internal Notes" error={errors.notes?.message}>
            <Textarea
              placeholder="Any additional notes about this student…"
              rows={3}
              {...register("notes")}
            />
          </Field>
        </Card>

        {/* Submit */}
        <div className="flex gap-3 pb-8">
          <Button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {mutation.isPending ? "Creating Student Record…" : "Create Student Record"}
          </Button>
          <Link href={`/admissions/${admissionId}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>

      </form>
    </div>
  );
}

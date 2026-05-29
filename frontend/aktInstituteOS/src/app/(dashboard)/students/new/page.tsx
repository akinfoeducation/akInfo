"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRef, useState } from "react";
import { createStudent, uploadStudentDocument } from "@/lib/api/students.api";
import { Upload, FileImage, X, CheckCircle2 } from "lucide-react";

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  whatsappNumber: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit number")
    .optional()
    .or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  pincode: z
    .string()
    .regex(/^\d{6}$/, "Enter a valid 6-digit pincode")
    .optional()
    .or(z.literal("")),
  parentName: z.string().optional().or(z.literal("")),
  parentPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit number")
    .optional()
    .or(z.literal("")),
  highestQualification: z.string().optional().or(z.literal("")),
  schoolCollegeName: z.string().optional().or(z.literal("")),
  aadhaarNumber: z
    .string()
    .refine((v) => !v || /^\d{12}$/.test(v), "Must be exactly 12 digits")
    .optional()
    .or(z.literal("")),
  panNumber: z
    .string()
    .refine((v) => !v || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v), "Invalid format — example: ABCDE1234F")
    .optional()
    .or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

function Field({
  label,
  error,
  children,
  required,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
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

// ── Document upload widget ────────────────────────────────────────────────

function DocUpload({
  label, accept, file, onFile, hint,
}: {
  label: string;
  accept: string;
  file: File | null;
  onFile: (f: File | null) => void;
  hint?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {file ? (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-emerald-200 bg-emerald-50">
          <FileImage className="size-4 text-emerald-600 shrink-0" />
          <span className="text-sm text-gray-800 flex-1 truncate">{file.name}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {(file.size / 1024).toFixed(0)} KB
          </span>
          <button type="button" onClick={() => { onFile(null); if (ref.current) ref.current.value = ""; }}
            className="text-gray-400 hover:text-gray-600">
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-dashed border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors text-left"
        >
          <Upload className="size-4 text-gray-400 shrink-0" />
          <span className="text-sm text-muted-foreground">Click to upload {label}</span>
        </button>
      )}
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function NewStudentPage() {
  const router = useRouter();
  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [panFile,     setPanFile]     = useState<File | null>(null);
  const [uploading,   setUploading]   = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormData) {
    try {
      const payload = {
        ...values,
        email: values.email || undefined,
        whatsappNumber: values.whatsappNumber || undefined,
        dateOfBirth: values.dateOfBirth || undefined,
        address: values.address || undefined,
        city: values.city || undefined,
        state: values.state || undefined,
        pincode: values.pincode || undefined,
        parentName: values.parentName || undefined,
        parentPhone: values.parentPhone || undefined,
        highestQualification: values.highestQualification || undefined,
        schoolCollegeName: values.schoolCollegeName || undefined,
        aadhaarNumber: values.aadhaarNumber || undefined,
        panNumber: values.panNumber || undefined,
        notes: values.notes || undefined,
      };
      const student = await createStudent(payload);

      // Upload documents if provided
      if (aadhaarFile || panFile) {
        setUploading(true);
        const uploads: Promise<void>[] = [];
        if (aadhaarFile) uploads.push(uploadStudentDocument(student.id, aadhaarFile, "AADHAAR"));
        if (panFile)     uploads.push(uploadStudentDocument(student.id, panFile,     "PAN"));
        try {
          await Promise.all(uploads);
          toast.success(`Student ${student.fullName} created with documents (${student.studentNumber})`);
        } catch {
          toast.warning(`Student created but document upload failed. You can upload again from the student profile.`);
        } finally {
          setUploading(false);
        }
      } else {
        toast.success(`Student ${student.fullName} created (${student.studentNumber})`);
      }

      router.push(`/students/${student.id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to create student.";
      toast.error(msg);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/students">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Add Student</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Fill in student information below
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Basic Info
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
              <Input
                type="email"
                placeholder="rahul@email.com"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="WhatsApp Number" error={errors.whatsappNumber?.message}>
              <Input placeholder="9876543210" maxLength={10} {...register("whatsappNumber")} />
            </Field>
            <Field label="Date of Birth" error={errors.dateOfBirth?.message}>
              <Input type="date" {...register("dateOfBirth")} />
            </Field>
          </div>
          <Field label="Gender" error={errors.gender?.message}>
            <Select onValueChange={(val) => setValue("gender", val as "MALE" | "FEMALE" | "OTHER")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Address
          </h2>
          <Field label="Address" error={errors.address?.message}>
            <Textarea placeholder="Street address…" rows={2} {...register("address")} />
          </Field>
          <div className="grid grid-cols-3 gap-4">
            <Field label="City" error={errors.city?.message}>
              <Input placeholder="Mumbai" {...register("city")} />
            </Field>
            <Field label="State" error={errors.state?.message}>
              <Input placeholder="Maharashtra" {...register("state")} />
            </Field>
            <Field label="Pincode" error={errors.pincode?.message}>
              <Input
                placeholder="400001"
                maxLength={6}
                aria-invalid={!!errors.pincode}
                {...register("pincode")}
              />
            </Field>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Parent / Guardian
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Parent Name" error={errors.parentName?.message}>
              <Input placeholder="Parent name" {...register("parentName")} />
            </Field>
            <Field label="Parent Phone" error={errors.parentPhone?.message}>
              <Input
                placeholder="9876543210"
                maxLength={10}
                aria-invalid={!!errors.parentPhone}
                {...register("parentPhone")}
              />
            </Field>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Education
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Highest Qualification" error={errors.highestQualification?.message}>
              <Input placeholder="B.Sc" {...register("highestQualification")} />
            </Field>
            <Field label="School / College" error={errors.schoolCollegeName?.message}>
              <Input placeholder="ABC College" {...register("schoolCollegeName")} />
            </Field>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            ID Details
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Aadhaar Number" error={errors.aadhaarNumber?.message}>
              <Input
                placeholder="123456789012"
                maxLength={12}
                inputMode="numeric"
                {...register("aadhaarNumber")}
              />
              <p className="text-xs text-muted-foreground">12-digit number (optional)</p>
            </Field>
            <Field label="PAN Number" error={errors.panNumber?.message}>
              <Input
                placeholder="ABCDE1234F"
                maxLength={10}
                className="uppercase"
                {...register("panNumber", {
                  setValueAs: (v: string) => (v ? v.toUpperCase() : v),
                })}
              />
              <p className="text-xs text-muted-foreground">10-character PAN (optional)</p>
            </Field>
          </div>

          {/* Document uploads */}
          <div className="pt-1 border-t border-gray-100 space-y-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Upload ID Documents</p>
            <div className="grid grid-cols-2 gap-4">
              <DocUpload
                label="Aadhaar Card Image"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                file={aadhaarFile}
                onFile={setAadhaarFile}
                hint="JPEG, PNG or PDF · max 10 MB"
              />
              <DocUpload
                label="PAN Card Image"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                file={panFile}
                onFile={setPanFile}
                hint="JPEG, PNG or PDF · max 10 MB"
              />
            </div>
            {(aadhaarFile || panFile) && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                <CheckCircle2 className="size-3.5 shrink-0" />
                {[aadhaarFile && "Aadhaar", panFile && "PAN"].filter(Boolean).join(" & ")} ready to upload
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Notes
          </h2>
          <Field label="Internal Notes" error={errors.notes?.message}>
            <Textarea placeholder="Optional internal notes…" rows={3} {...register("notes")} />
          </Field>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting || uploading}
            className="bg-emerald-500 hover:bg-emerald-600 text-white">
            {uploading ? "Uploading documents…" : isSubmitting ? "Creating…" : "Create Student"}
          </Button>
          <Link href="/students">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

import { createUser } from "@/lib/api/users.api";
import { listRoles } from "@/lib/api/roles.api";
import { listBranches, listDepartments } from "@/lib/api/branches.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  firstName:   z.string().min(1, "First name is required").max(100),
  lastName:    z.string().max(100).optional(),
  email:       z.string().email("Valid email required"),
  username:    z.string().min(3).max(100).regex(/^[a-zA-Z0-9._-]+$/, "Letters, digits, . - _ only"),
  password:    z.string().min(8, "Min 8 characters"),
  phone:       z.string().optional(),
  employeeId:  z.string().optional(),
  designation: z.string().optional(),
  gender:      z.string().optional(),
  joiningDate: z.string().optional(),
  address:     z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewUserPage() {
  const router = useRouter();
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [branchId, setBranchId]           = useState<string>("");
  const [departmentId, setDepartmentId]   = useState<string>("");

  const { data: roles }       = useQuery({ queryKey: ["roles"],       queryFn: listRoles });
  const { data: branches }    = useQuery({ queryKey: ["branches"],    queryFn: listBranches });
  const { data: departments } = useQuery({ queryKey: ["departments"], queryFn: listDepartments });

  const {
    register, handleSubmit, formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (data: FormData) => createUser({
      ...data,
      roleIds:      selectedRoles,
      branchId:     branchId     ? Number(branchId)     : undefined,
      departmentId: departmentId ? Number(departmentId) : undefined,
      active: true,
    }),
    onSuccess: (user) => {
      toast.success("User created successfully");
      router.push(`/users/${user.id}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to create user");
    },
  });

  function toggleRole(id: number) {
    setSelectedRoles((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Add New User</h1>
          <p className="text-sm text-gray-500">Create a staff account and assign roles</p>
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">

        {/* Personal Info */}
        <Section title="Personal Information">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name *" error={errors.firstName?.message}>
              <Input {...register("firstName")} placeholder="First name" />
            </Field>
            <Field label="Last Name" error={errors.lastName?.message}>
              <Input {...register("lastName")} placeholder="Last name" />
            </Field>
            <Field label="Email *" error={errors.email?.message}>
              <Input {...register("email")} type="email" placeholder="email@institute.com" />
            </Field>
            <Field label="Mobile Number" error={errors.phone?.message}>
              <Input {...register("phone")} placeholder="10-digit mobile" />
            </Field>
            <Field label="Gender">
              <select {...register("gender")} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm">
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
            <Field label="Joining Date">
              <Input {...register("joiningDate")} type="date" />
            </Field>
          </div>
        </Section>

        {/* Account Info */}
        <Section title="Account Credentials">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Username *" error={errors.username?.message}>
              <Input {...register("username")} placeholder="Unique username" />
            </Field>
            <Field label="Password *" error={errors.password?.message}>
              <Input {...register("password")} type="password" placeholder="Min 8 characters" />
            </Field>
          </div>
        </Section>

        {/* Professional Info */}
        <Section title="Professional Details">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Employee ID">
              <Input {...register("employeeId")} placeholder="Auto-generated if blank" />
            </Field>
            <Field label="Designation">
              <Input {...register("designation")} placeholder="e.g. Senior Faculty" />
            </Field>
            <Field label="Branch">
              <Select value={branchId} onValueChange={(v) => setBranchId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                <SelectContent>
                  {(branches ?? []).map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Department">
              <Select value={departmentId} onValueChange={(v) => setDepartmentId(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {(departments ?? []).map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Address" className="mt-4">
            <textarea {...register("address")}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none h-20"
              placeholder="Office / residential address" />
          </Field>
        </Section>

        {/* Role Assignment */}
        <Section title="Role Assignment *">
          {selectedRoles.length === 0 && (
            <p className="text-xs text-red-500 mb-2">Select at least one role</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(roles ?? []).map((role) => {
              const selected = selectedRoles.includes(role.id);
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleRole(role.id)}
                  className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                    selected
                      ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium">{role.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{role.code}</div>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Submit */}
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button
            type="submit"
            disabled={isSubmitting || mutation.isPending || selectedRoles.length === 0}
            className="bg-emerald-500 hover:bg-emerald-600 text-white min-w-[140px]"
          >
            {mutation.isPending
              ? <><Loader2 className="size-4 mr-2 animate-spin" /> Creating…</>
              : "Create User"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-3">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  label, error, children, className,
}: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label className="text-xs font-medium text-gray-600">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

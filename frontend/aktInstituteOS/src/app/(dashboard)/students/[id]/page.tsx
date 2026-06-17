"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Phone, Mail, MapPin, User, GraduationCap, Trash2, IndianRupee, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudentStatusBadge } from "@/components/students/StudentStatusBadge";
import { getStudent, updateStudentStatus, deleteStudent } from "@/lib/api/students.api";
import { getFacultyStudentFees, type FacultyAdmissionFeeRow } from "@/lib/api/fees.api";
import { usePermissions } from "@/lib/hooks/usePermissions";
import type { StudentStatus } from "@/types/student";

const STATUS_OPTIONS: StudentStatus[] = ["ACTIVE", "INACTIVE", "GRADUATED", "DROPPED"];

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const studentId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isFacultyOnly } = usePermissions();
  const facultyOnly = isFacultyOnly();

  const { data: student, isLoading } = useQuery({
    queryKey: ["student", studentId],
    queryFn: () => getStudent(studentId),
  });

  // Faculty get scoped fee view; admins don't need this endpoint
  const { data: facultyFees = [] } = useQuery({
    queryKey: ["faculty-student-fees", studentId],
    queryFn:  () => getFacultyStudentFees(studentId),
    enabled:  facultyOnly,
  });

  const statusMutation = useMutation({
    mutationFn: (status: StudentStatus) => updateStudentStatus(studentId, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(["student", studentId], updated);
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteStudent(studentId),
    onSuccess: () => {
      toast.success("Student deleted");
      router.replace("/students");
    },
    onError: () => toast.error("Failed to delete student"),
  });

  function handleDelete() {
    if (!confirm("Delete this student? This action cannot be undone.")) return;
    deleteMutation.mutate();
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Student not found.</p>
        <Link href="/students">
          <Button variant="outline" className="mt-4">
            Back to Students
          </Button>
        </Link>
      </div>
    );
  }

  const location = [student.city, student.state, student.pincode].filter(Boolean).join(", ");

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/students">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{student.fullName}</h1>
            <StudentStatusBadge status={student.status} />
          </div>
          <p className="text-sm text-muted-foreground font-mono mt-0.5">{student.studentNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={student.status}
            onValueChange={(val) => val && statusMutation.mutate(val as StudentStatus)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="destructive"
            size="icon-sm"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-medium">Contact Information</h2>
          <div className="space-y-3">
            <InfoRow icon={Phone} label="Phone" value={student.phone} />
            {student.whatsappNumber && student.whatsappNumber !== student.phone && (
              <InfoRow icon={Phone} label="WhatsApp" value={student.whatsappNumber} />
            )}
            <InfoRow icon={Mail} label="Email" value={student.email} />
            {location && (
              <InfoRow icon={MapPin} label="Location" value={location} />
            )}
            {student.address && (
              <InfoRow icon={MapPin} label="Address" value={student.address} />
            )}
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-medium">Personal Details</h2>
          <div className="space-y-3">
            <InfoRow
              icon={User}
              label="Date of Birth"
              value={student.dateOfBirth ? format(new Date(student.dateOfBirth), "dd MMM yyyy") : undefined}
            />
            <InfoRow icon={User} label="Gender" value={student.gender} />
            <InfoRow icon={GraduationCap} label="Qualification" value={student.highestQualification} />
            <InfoRow icon={GraduationCap} label="School / College" value={student.schoolCollegeName} />
          </div>
        </Card>
      </div>

      {(student.parentName || student.parentPhone) && (
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-medium">Parent / Guardian</h2>
          <div className="grid grid-cols-2 gap-3">
            <InfoRow icon={User} label="Name" value={student.parentName} />
            <InfoRow icon={Phone} label="Phone" value={student.parentPhone} />
          </div>
        </Card>
      )}

      {student.notes && (
        <Card className="p-5 space-y-3">
          <h2 className="text-sm font-medium">Notes</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{student.notes}</p>
        </Card>
      )}

      {/* ── Fee Section (faculty-only, read-only) ── */}
      {facultyOnly && facultyFees.length > 0 && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <IndianRupee className="size-4 text-amber-500" />
              Fee Details
            </h2>
            <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded">Read-only</span>
          </div>

          {facultyFees.map(fee => {
            const pct = fee.feesAgreed > 0 ? (fee.feesPaid / fee.feesAgreed) * 100 : 0;
            const statusCfg = {
              PAID:    { label: "Fully Paid",      cls: "bg-emerald-50 text-emerald-700", icon: CheckCircle2, bar: "bg-emerald-500" },
              PARTIAL: { label: "Partially Paid",   cls: "bg-amber-50 text-amber-700",     icon: Clock,        bar: "bg-amber-400"   },
              PENDING: { label: "Payment Pending",  cls: "bg-red-50 text-red-700",         icon: AlertCircle,  bar: "bg-red-400"     },
            }[fee.feeStatus];
            const StatusIcon = statusCfg.icon;

            return (
              <div key={fee.admissionId} className="border border-gray-100 rounded-xl p-4 space-y-4">
                {/* Batch / course */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{fee.batchName ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{fee.courseName ?? "—"} · {fee.admissionNumber}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusCfg.cls}`}>
                    <StatusIcon className="size-3" />
                    {statusCfg.label}
                  </span>
                </div>

                {/* Fee figures */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Total Fee</p>
                    <p className="text-base font-bold text-gray-800">
                      ₹{fee.feesAgreed.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <p className="text-xs text-emerald-700">Paid</p>
                    <p className="text-base font-bold text-emerald-800">
                      ₹{fee.feesPaid.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className={`rounded-lg p-3 ${fee.feesDue > 0 ? "bg-red-50" : "bg-gray-50"}`}>
                    <p className={`text-xs ${fee.feesDue > 0 ? "text-red-700" : "text-muted-foreground"}`}>Due</p>
                    <p className={`text-base font-bold ${fee.feesDue > 0 ? "text-red-800" : "text-gray-500"}`}>
                      ₹{fee.feesDue.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                {/* Payment progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Payment progress</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${statusCfg.bar}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                  {fee.enrollmentDate && (
                    <span>Enrolled: {fee.enrollmentDate}</span>
                  )}
                  {fee.lastPaymentDate && (
                    <span>Last payment: {fee.lastPaymentDate}</span>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <Card className="p-5">
        <div className="flex gap-6 text-sm text-muted-foreground">
          <span>Added {format(new Date(student.createdAt), "dd MMM yyyy")}</span>
          <Separator orientation="vertical" className="h-4" />
          <span>Updated {format(new Date(student.updatedAt), "dd MMM yyyy")}</span>
        </div>
      </Card>
    </div>
  );
}

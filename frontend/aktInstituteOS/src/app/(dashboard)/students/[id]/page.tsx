"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Phone, Mail, MapPin, User, GraduationCap, Trash2 } from "lucide-react";
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

  const { data: student, isLoading } = useQuery({
    queryKey: ["student", studentId],
    queryFn: () => getStudent(studentId),
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

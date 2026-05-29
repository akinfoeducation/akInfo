import { Badge } from "@/components/ui/badge";
import type { StudentStatus } from "@/types/student";

const STATUS_MAP: Record<StudentStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ACTIVE: { label: "Active", variant: "default" },
  INACTIVE: { label: "Inactive", variant: "secondary" },
  GRADUATED: { label: "Graduated", variant: "outline" },
  DROPPED: { label: "Dropped", variant: "destructive" },
};

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const { label, variant } = STATUS_MAP[status] ?? { label: status, variant: "secondary" };
  return <Badge variant={variant}>{label}</Badge>;
}

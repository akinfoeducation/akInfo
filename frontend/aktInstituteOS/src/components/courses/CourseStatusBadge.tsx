import type { CourseStatus } from "@/types/course";

const STATUS_MAP: Record<CourseStatus, { label: string; className: string }> = {
  ACTIVE:   { label: "Active",   className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  INACTIVE: { label: "Inactive", className: "bg-gray-100 text-gray-600 border-gray-200" },
  ARCHIVED: { label: "Archived", className: "bg-red-50 text-red-600 border-red-200" },
};

export function CourseStatusBadge({ status }: { status: CourseStatus }) {
  const { label, className } = STATUS_MAP[status] ?? { label: status, className: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {label}
    </span>
  );
}

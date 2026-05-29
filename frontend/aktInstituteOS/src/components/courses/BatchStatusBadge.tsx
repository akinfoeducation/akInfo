import type { BatchStatus } from "@/types/course";

const STATUS_MAP: Record<BatchStatus, { label: string; className: string }> = {
  PLANNED:   { label: "Planned",   className: "bg-blue-50 text-blue-700 border-blue-200" },
  ACTIVE:    { label: "Active",    className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  COMPLETED: { label: "Completed", className: "bg-gray-100 text-gray-600 border-gray-200" },
  CANCELLED: { label: "Cancelled", className: "bg-red-50 text-red-600 border-red-200" },
};

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const { label, className } = STATUS_MAP[status] ?? { label: status, className: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {label}
    </span>
  );
}

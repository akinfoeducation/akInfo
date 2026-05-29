import type { AdmissionStatus } from "@/types/admission";

const STATUS_MAP: Record<AdmissionStatus, { label: string; className: string }> = {
  PENDING:           { label: "Pending",            className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  DOCUMENTS_PENDING: { label: "Docs Pending",       className: "bg-orange-50 text-orange-700 border-orange-200" },
  ENROLLED:          { label: "Enrolled",           className: "bg-blue-50 text-blue-700 border-blue-200" },
  ACTIVE:            { label: "Active",             className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  COMPLETED:         { label: "Completed",          className: "bg-gray-100 text-gray-700 border-gray-200" },
  CANCELLED:         { label: "Cancelled",          className: "bg-red-50 text-red-600 border-red-200" },
};

export function AdmissionStatusBadge({ status }: { status: AdmissionStatus }) {
  const { label, className } = STATUS_MAP[status] ?? { label: status, className: "bg-gray-50 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {label}
    </span>
  );
}

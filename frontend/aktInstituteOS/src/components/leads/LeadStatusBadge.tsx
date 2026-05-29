import type { LeadStatus } from "@/types/lead";

const STATUS_MAP: Record<LeadStatus, { label: string; className: string }> = {
  NEW:            { label: "New",           className: "bg-blue-50 text-blue-700 border-blue-200" },
  CONTACTED:      { label: "Contacted",     className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  FOLLOW_UP:      { label: "Follow Up",     className: "bg-amber-50 text-amber-700 border-amber-200" },
  DEMO_SCHEDULED: { label: "Demo Scheduled",className: "bg-purple-50 text-purple-700 border-purple-200" },
  NEGOTIATION:    { label: "Negotiation",   className: "bg-orange-50 text-orange-700 border-orange-200" },
  CONVERTED:      { label: "Converted",     className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  LOST:           { label: "Lost",          className: "bg-red-50 text-red-600 border-red-200" },
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const { label, className } = STATUS_MAP[status] ?? { label: status, className: "bg-gray-50 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
      {label}
    </span>
  );
}

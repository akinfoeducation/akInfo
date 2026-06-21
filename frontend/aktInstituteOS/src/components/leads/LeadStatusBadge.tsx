import type { LeadStatus } from "@/types/lead";

const STATUS_MAP: Record<LeadStatus, { label: string; className: string }> = {
  // ── Pre-visit (Caller) ────────────────────────────────────────────────────
  NEW_LEAD:               { label: "New Lead",              className: "bg-blue-50 text-blue-700 border-blue-200" },
  ASSIGNED:               { label: "Assigned",              className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  CONTACTED:              { label: "Contacted",             className: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  INTERESTED:             { label: "Interested",            className: "bg-teal-50 text-teal-700 border-teal-200" },
  FOLLOW_UP:              { label: "Follow Up",             className: "bg-amber-50 text-amber-700 border-amber-200" },
  CALLBACK:               { label: "Callback",              className: "bg-orange-50 text-orange-700 border-orange-200" },
  VISIT_PLANNED:          { label: "Visit Planned",         className: "bg-purple-50 text-purple-700 border-purple-200" },
  NOT_CONNECTED:          { label: "Not Connected",         className: "bg-slate-50 text-slate-600 border-slate-300" },
  NOT_INTERESTED:         { label: "Not Interested",        className: "bg-red-50 text-red-600 border-red-200" },
  NOT_REACHABLE:          { label: "Not Reachable",         className: "bg-rose-50 text-rose-600 border-rose-200" },
  INVALID:                { label: "Invalid",               className: "bg-slate-100 text-slate-600 border-slate-300" },
  ADMISSION_INTERESTED:   { label: "Admission Interested",  className: "bg-violet-50 text-violet-700 border-violet-200" },
  PAYMENT_PENDING:        { label: "Payment Pending",       className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  PAYMENT_VERIFIED:       { label: "Payment Verified",      className: "bg-lime-50 text-lime-700 border-lime-200" },
  BOOKING_CONFIRMED:      { label: "Booking Confirmed",     className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  VISIT_PENDING:          { label: "Visit Pending",         className: "bg-teal-50 text-teal-700 border-teal-200" },
  // ── Post-visit (Counsellor) ───────────────────────────────────────────────
  VISIT_DONE:             { label: "Visit Done",            className: "bg-sky-50 text-sky-700 border-sky-200" },
  FOLLOW_UP_AFTER_VISIT:  { label: "Follow-up After Visit", className: "bg-amber-50 text-amber-800 border-amber-300" },
  NEGOTIATION:            { label: "Negotiation",           className: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200" },
  DOCUMENT_PENDING:       { label: "Document Pending",      className: "bg-orange-50 text-orange-700 border-orange-200" },
  ADMISSION_IN_PROGRESS:  { label: "Admission In Progress", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  // ── Terminal ─────────────────────────────────────────────────────────────
  ADMISSION_DONE:         { label: "Admission Done",        className: "bg-green-50 text-green-700 border-green-300" },
  CLOSED:                 { label: "Closed",                className: "bg-gray-50 text-gray-600 border-gray-200" },
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const entry = STATUS_MAP[status] ?? { label: status.replace(/_/g, " "), className: "bg-gray-50 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${entry.className}`}>
      {entry.label}
    </span>
  );
}

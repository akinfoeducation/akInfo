import type { LeadSource } from "@/types/lead";

const SOURCE_MAP: Record<LeadSource, { label: string; className: string }> = {
  WALK_IN:      { label: "Walk In",     className: "bg-gray-100 text-gray-700" },
  REFERRAL:     { label: "Referral",    className: "bg-teal-50 text-teal-700" },
  SOCIAL_MEDIA: { label: "Social",      className: "bg-pink-50 text-pink-700" },
  WEBSITE:      { label: "Website",     className: "bg-blue-50 text-blue-700" },
  GOOGLE_ADS:   { label: "Google Ads",  className: "bg-yellow-50 text-yellow-700" },
  PHONE:        { label: "Phone",       className: "bg-emerald-50 text-emerald-700" },
  ONLINE:       { label: "Online",      className: "bg-sky-50 text-sky-700" },
  OTHER:        { label: "Other",       className: "bg-gray-100 text-gray-600" },
};

export function LeadSourceBadge({ source }: { source: LeadSource }) {
  const { label, className } = SOURCE_MAP[source] ?? { label: source, className: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

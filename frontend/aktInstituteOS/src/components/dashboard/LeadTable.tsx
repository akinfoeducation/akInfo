"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, ChevronDown, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type LeadStatus = "Hot" | "Warm" | "Cold";

interface Lead {
  id: string;
  name: string;
  initials: string;
  avatarBg: string;
  company: string;
  status: LeadStatus;
  contactDate: string;
  source: string;
  leadId: string;
}

const LEADS: Lead[] = [
  { id: "1", name: "Michael Smith",  initials: "MS", avatarBg: "bg-amber-100 text-amber-600",   company: "Fusion Works",    status: "Warm", contactDate: "2025-04-10", source: "Referral",      leadId: "#CRM23456" },
  { id: "2", name: "Henry Arthur",   initials: "HA", avatarBg: "bg-blue-100 text-blue-600",     company: "nanotech Corp",   status: "Cold", contactDate: "2025-01-05", source: "LinkedIn Ads",  leadId: "#CRM34567" },
  { id: "3", name: "Flores Juanita", initials: "FJ", avatarBg: "bg-rose-100 text-rose-600",     company: "CloudEdge",       status: "Hot",  contactDate: "2025-02-20", source: "Website Form",  leadId: "#CRM45678" },
  { id: "4", name: "Black Marvin",   initials: "BM", avatarBg: "bg-violet-100 text-violet-600", company: "BlueSky",         status: "Warm", contactDate: "2025-05-11", source: "Paid Campaign", leadId: "#CRM56789" },
  { id: "5", name: "Arjun Sharma",   initials: "AS", avatarBg: "bg-indigo-100 text-indigo-600", company: "TechVentures",    status: "Hot",  contactDate: "2025-05-18", source: "Website Form",  leadId: "#CRM67890" },
  { id: "6", name: "Priya Nair",     initials: "PN", avatarBg: "bg-emerald-100 text-emerald-600",company: "Innovate Co",   status: "Cold", contactDate: "2025-03-22", source: "Google Ads",    leadId: "#CRM78901" },
];

const STATUS_COLOR: Record<LeadStatus, string> = {
  Hot:  "text-red-600",
  Warm: "text-amber-600",
  Cold: "text-blue-500",
};

export function LeadTable() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = LEADS.filter(
    (l) =>
      search === "" ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.company.toLowerCase().includes(search.toLowerCase())
  );

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((l) => l.id)));
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">Lead List</h3>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
            <SlidersHorizontal className="size-3.5 text-gray-400" />
            Filter
          </button>
          <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
            All stages
            <ChevronDown className="size-3 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 w-48 rounded-lg border border-gray-200 px-3 py-1.5">
          <Search className="size-3.5 text-gray-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="text-xs text-gray-600 placeholder:text-gray-400 outline-none bg-transparent flex-1"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pl-5 pr-3 py-3">
                <input
                  type="checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll}
                  className="size-3.5 rounded accent-emerald-500 cursor-pointer"
                />
              </th>
              {["Name", "Company", "Status", "Contact Date", "Source", "Lead ID", ""].map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((lead) => (
              <tr
                key={lead.id}
                className="hover:bg-gray-50/80 transition-colors group"
              >
                {/* Checkbox */}
                <td className="pl-5 pr-3 py-3.5">
                  <input
                    type="checkbox"
                    checked={selected.has(lead.id)}
                    onChange={() => toggleRow(lead.id)}
                    className="size-3.5 rounded accent-emerald-500 cursor-pointer"
                  />
                </td>

                {/* Name */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("size-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0", lead.avatarBg)}>
                      {lead.initials}
                    </div>
                    <span className="text-sm font-medium text-gray-800 whitespace-nowrap">{lead.name}</span>
                  </div>
                </td>

                {/* Company */}
                <td className="px-4 py-3.5">
                  <span className="text-sm text-gray-600">{lead.company}</span>
                </td>

                {/* Status */}
                <td className="px-4 py-3.5">
                  <span className={cn("text-sm font-medium", STATUS_COLOR[lead.status])}>
                    {lead.status}
                  </span>
                </td>

                {/* Contact Date */}
                <td className="px-4 py-3.5">
                  <span className="text-sm text-gray-500">{lead.contactDate}</span>
                </td>

                {/* Source */}
                <td className="px-4 py-3.5">
                  <span className="text-sm text-gray-600">{lead.source}</span>
                </td>

                {/* Lead ID */}
                <td className="px-4 py-3.5">
                  <span className="text-sm text-gray-400 font-mono">{lead.leadId}</span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5">
                  <button className="size-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 opacity-0 group-hover:opacity-100 transition-all">
                    <MoreHorizontal className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

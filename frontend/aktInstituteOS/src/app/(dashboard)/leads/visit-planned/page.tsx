"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";
import { Building2, Calendar, Phone, Clock, Users, CheckCircle2, Search } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { listLeads } from "@/lib/api/leads.api";
import { listCounsellors } from "@/lib/api/leads.api";
import { performLeadAction } from "@/lib/api/leads.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import type { LeadSummary } from "@/types/lead";

// ── Helpers ───────────────────────────────────────────────────────────────────

function visitUrgency(nextFollowUpAt?: string): {
  label: string; color: string; bg: string;
} {
  if (!nextFollowUpAt) return { label: "No date set", color: "text-gray-500", bg: "bg-gray-50" };
  const d = new Date(nextFollowUpAt);
  if (isPast(d) && !isToday(d)) return { label: "Visit overdue", color: "text-red-700", bg: "bg-red-50 border-red-200" };
  if (isToday(d)) return { label: "Today", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" };
  if (isTomorrow(d)) return { label: "Tomorrow", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" };
  const days = differenceInDays(d, new Date());
  return { label: `In ${days} days`, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" };
}

function apiErr(err: unknown) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed";
}

// ── Visit Done Modal ──────────────────────────────────────────────────────────

function VisitDoneModal({
  lead,
  onClose,
  onSuccess,
}: {
  lead: LeadSummary;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [counsellorId, setCounsellorId] = useState("");
  const [notes,        setNotes]        = useState("");

  const { data: counsellors = [] } = useQuery({
    queryKey: ["counsellors-for-handoff"],
    queryFn: listCounsellors,
    staleTime: 5 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: () => performLeadAction(lead.id, {
      action: "STUDENT_VISITED",
      counsellorId: Number(counsellorId),
      notes: notes || undefined,
    }),
    onSuccess: () => {
      toast.success(`${lead.fullName} handed off to counsellor ✓`);
      onSuccess();
    },
    onError: (err) => toast.error(apiErr(err)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <Building2 className="size-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Student Visited</h2>
              <p className="text-sm text-muted-foreground">{lead.fullName}</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 bg-emerald-50 rounded-lg p-3 border border-emerald-100">
            This will mark the visit as complete and hand off ownership to the selected counsellor.
          </p>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Assign Counsellor *</label>
            <Select value={counsellorId} onValueChange={(v) => setCounsellorId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select counsellor…" />
              </SelectTrigger>
              <SelectContent>
                {counsellors.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.fullName ?? `${c.firstName} ${c.lastName ?? ""}`.trim()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Notes for counsellor</label>
            <Input
              placeholder="e.g. Came with father, interested in morning batch…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!counsellorId || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "Handing off…" : "Confirm — Visit Done ✓"}
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Lead Card ─────────────────────────────────────────────────────────────────

function VisitLeadCard({
  lead,
  onMarkVisited,
}: {
  lead: LeadSummary;
  onMarkVisited: (lead: LeadSummary) => void;
}) {
  const urgency = visitUrgency(lead.nextFollowUpAt);

  return (
    <Card className={`p-4 border ${urgency.bg} transition-all hover:shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Name + status */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/leads/${lead.id}`}
              className="font-semibold text-gray-900 hover:text-emerald-700 truncate"
            >
              {lead.fullName}
            </Link>
            <LeadStatusBadge status={lead.status} />
          </div>

          {/* Phone + course */}
          <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Phone className="size-3" /> {lead.phone}
            </span>
            {lead.courseInterested && (
              <span className="truncate">{lead.courseInterested}</span>
            )}
          </div>

          {/* Visit date */}
          <div className={`flex items-center gap-1.5 mt-2 text-xs font-medium ${urgency.color}`}>
            <Calendar className="size-3.5" />
            {lead.nextFollowUpAt
              ? format(new Date(lead.nextFollowUpAt), "EEE, dd MMM 'at' hh:mm a")
              : "No visit date set"}
            <span className="ml-1 text-[10px] font-bold uppercase tracking-wide opacity-75">
              ({urgency.label})
            </span>
          </div>
        </div>

        {/* Action */}
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 gap-1.5"
          onClick={() => onMarkVisited(lead)}
        >
          <Building2 className="size-3.5" />
          Student Visited
        </Button>
      </div>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VisitPlannedPage() {
  const qc = useQueryClient();
  const [q, setQ]                   = useState("");
  const [visitedLead, setVisitedLead] = useState<LeadSummary | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["leads", "visit-planned"],
    queryFn: () => listLeads({ status: "VISIT_PLANNED", size: 100, sort: "nextFollowUpAt", dir: "asc" }),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const leads = (data?.data ?? []).filter(l =>
    !q || l.fullName.toLowerCase().includes(q.toLowerCase()) || l.phone.includes(q)
  );

  // Group by urgency
  const overdue   = leads.filter(l => l.nextFollowUpAt && isPast(new Date(l.nextFollowUpAt)) && !isToday(new Date(l.nextFollowUpAt)));
  const today     = leads.filter(l => l.nextFollowUpAt && isToday(new Date(l.nextFollowUpAt)));
  const upcoming  = leads.filter(l => !l.nextFollowUpAt || (!isPast(new Date(l.nextFollowUpAt)) && !isToday(new Date(l.nextFollowUpAt))));

  function handleSuccess() {
    setVisitedLead(null);
    qc.invalidateQueries({ queryKey: ["leads", "visit-planned"] });
    qc.invalidateQueries({ queryKey: ["leads"] });
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Calendar className="size-5 text-emerald-600" />
            Visit Planned
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? "Loading…" : `${leads.length} lead${leads.length !== 1 ? "s" : ""} awaiting visit`}
            {overdue.length > 0 && (
              <span className="ml-2 text-red-600 font-medium">
                · {overdue.length} overdue
              </span>
            )}
          </p>
        </div>
        <Link href="/leads">
          <Button variant="outline" size="sm">← All Leads</Button>
        </Link>
      </div>

      {/* Stats */}
      {!isLoading && leads.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Overdue",  count: overdue.length,  color: "text-red-600",   bg: "bg-red-50   border-red-100" },
            { label: "Today",    count: today.length,    color: "text-emerald-700",bg: "bg-emerald-50 border-emerald-100" },
            { label: "Upcoming", count: upcoming.length, color: "text-blue-600",  bg: "bg-blue-50  border-blue-100" },
          ].map(s => (
            <Card key={s.label} className={`p-4 text-center border ${s.bg}`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or phone…"
          value={q}
          onChange={e => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      )}

      {/* Empty */}
      {!isLoading && leads.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="size-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No visits planned</p>
          <p className="text-sm mt-1">Leads with Visit Planned status will appear here.</p>
        </div>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-red-600 flex items-center gap-1.5">
            <Clock className="size-3.5" /> Overdue ({overdue.length})
          </h2>
          {overdue.map(l => (
            <VisitLeadCard key={l.id} lead={l} onMarkVisited={setVisitedLead} />
          ))}
        </div>
      )}

      {/* Today */}
      {today.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" /> Today ({today.length})
          </h2>
          {today.map(l => (
            <VisitLeadCard key={l.id} lead={l} onMarkVisited={setVisitedLead} />
          ))}
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
            <Users className="size-3.5" /> Upcoming ({upcoming.length})
          </h2>
          {upcoming.map(l => (
            <VisitLeadCard key={l.id} lead={l} onMarkVisited={setVisitedLead} />
          ))}
        </div>
      )}

      {/* Modal */}
      {visitedLead && (
        <VisitDoneModal
          lead={visitedLead}
          onClose={() => setVisitedLead(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

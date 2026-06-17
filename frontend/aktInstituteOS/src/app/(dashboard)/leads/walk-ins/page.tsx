"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DoorOpen, RefreshCw, ArrowRight, Phone, User } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { LeadSourceBadge } from "@/components/leads/LeadSourceBadge";
import { listLeads, claimWalkIn } from "@/lib/api/leads.api";
import { usePermissions } from "@/lib/hooks/usePermissions";
import type { LeadSummary } from "@/types/lead";

/**
 * Walk-in Leads — unassigned leads with source=WALK_IN or no caller yet.
 * Counsellors can self-claim any lead here; ownership transfers immediately.
 *
 * Business rule: claim sets counsellor_id + assigned_to_id = claimant,
 * status → VISIT_DONE, records WALK_IN_CLAIM in transfer history.
 */
export default function WalkInLeadsPage() {
  const qc = useQueryClient();
  const { userId } = usePermissions();
  const [page, setPage] = useState(0);
  const size = 20;

  // Walk-ins = NEW_LEAD or ASSIGNED leads that have no counsellor yet
  // We filter for unassigned (no assignedToId) + source WALK_IN on client after fetch,
  // OR we rely on the backend scoping. For now fetch NEW_LEAD + WALK_IN source.
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["walk-in-leads", page],
    queryFn: () => listLeads({ source: "WALK_IN", status: "NEW_LEAD", page, size }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const leads: LeadSummary[] = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 0;

  const claimMutation = useMutation({
    mutationFn: (id: number) => claimWalkIn(id),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["walk-in-leads"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success(`Walk-in claimed — ${updated.fullName || updated.phone} is now assigned to you`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Could not claim lead — it may have already been claimed.";
      toast.error(msg);
      qc.invalidateQueries({ queryKey: ["walk-in-leads"] });
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <DoorOpen className="size-5 text-sky-600" />
            <h1 className="text-2xl font-semibold">Walk-in Leads</h1>
            {total > 0 && (
              <span className="bg-sky-100 text-sky-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {total}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Students who walked in directly. Claim a lead to start counselling immediately.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Empty state */}
      {!isLoading && leads.length === 0 && (
        <Card className="p-12 text-center">
          <DoorOpen className="size-10 mx-auto text-sky-200 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No walk-in leads right now</p>
          <p className="text-xs text-muted-foreground mt-1">
            New walk-in leads will appear here as they are created by admin.
          </p>
        </Card>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      )}

      {/* Lead cards */}
      {!isLoading && leads.map(lead => (
        <Card key={lead.id} className="p-4 flex items-center gap-4 hover:bg-sky-50/30 transition-colors">
          <div className="bg-sky-100 rounded-full p-2 shrink-0">
            <User className="size-4 text-sky-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">{lead.fullName}</span>
              <LeadStatusBadge status={lead.status} />
              <LeadSourceBadge source={lead.source} />
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><Phone className="size-3" />{lead.phone}</span>
              {lead.courseInterested && <span>· {lead.courseInterested}</span>}
              <span>· Added {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/leads/${lead.id}`}>
              <Button variant="ghost" size="sm" className="text-slate-600">
                View <ArrowRight className="size-3.5" />
              </Button>
            </Link>
            {/* Only show claim if not already counselled */}
            {!lead.counsellorId && (
              <Button
                size="sm"
                className="bg-sky-600 hover:bg-sky-700 text-white"
                disabled={claimMutation.isPending}
                onClick={() => claimMutation.mutate(lead.id)}
              >
                {claimMutation.isPending ? "Claiming…" : "Claim Walk-in"}
              </Button>
            )}
            {lead.counsellorId && lead.counsellorId === userId && (
              <span className="text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 px-2 py-1 rounded-md">
                Yours
              </span>
            )}
          </div>
        </Card>
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages} · {total} leads
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

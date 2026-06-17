"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Phone, RefreshCw, ArrowRight, PhoneMissed, Clock } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { listRetryPool, claimFromPool } from "@/lib/api/leads.api";
import type { LeadSummary } from "@/types/lead";

/**
 * Retry Pool — shared pool of NOT_CONNECTED leads (>30 min old).
 * Any caller can claim a lead; ownership transfers instantly.
 */
export default function RetryPoolPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(0);
  const size = 20;

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["retry-pool", page],
    queryFn: () => listRetryPool({ page, size }),
    staleTime: 30_000,
    refetchInterval: 60_000, // auto-refresh every 60 s so new leads appear
  });

  const leads: LeadSummary[] = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const totalPages = data?.meta?.totalPages ?? 0;

  const claimMutation = useMutation({
    mutationFn: (id: number) => claimFromPool(id),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["retry-pool"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard", "caller"] });
      toast.success(`Lead claimed — ${updated.fullName || updated.phone} is now yours`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Could not claim lead — it may have been taken already.";
      toast.error(msg);
      qc.invalidateQueries({ queryKey: ["retry-pool"] });
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <PhoneMissed className="size-5 text-slate-600" />
            <h1 className="text-2xl font-semibold">Retry Pool</h1>
            {total > 0 && (
              <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {total}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Leads that were not connected and have been waiting 30+ minutes.
            First caller to claim gets ownership.
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
          <PhoneMissed className="size-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Retry pool is empty</p>
          <p className="text-xs text-muted-foreground mt-1">
            NOT_CONNECTED leads appear here after 30 minutes.
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
        <Card key={lead.id} className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
          {/* Phone icon */}
          <div className="bg-slate-100 rounded-full p-2 shrink-0">
            <Phone className="size-4 text-slate-600" />
          </div>

          {/* Lead info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">{lead.fullName}</span>
              <LeadStatusBadge status={lead.status} />
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
              <span>{lead.phone}</span>
              {lead.courseInterested && <span>· {lead.courseInterested}</span>}
              {lead.lastContactedAt && (
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  Not connected {formatDistanceToNow(new Date(lead.lastContactedAt), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/leads/${lead.id}`}>
              <Button variant="ghost" size="sm" className="text-slate-600">
                View <ArrowRight className="size-3.5" />
              </Button>
            </Link>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={claimMutation.isPending}
              onClick={() => claimMutation.mutate(lead.id)}
            >
              {claimMutation.isPending ? "Claiming…" : "Claim Lead"}
            </Button>
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

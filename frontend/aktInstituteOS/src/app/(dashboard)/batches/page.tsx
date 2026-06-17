"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, Users, Calendar, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { BatchStatusBadge } from "@/components/courses/BatchStatusBadge";
import { getBatchDashboard, listAllBatches, patchBatchStatus } from "@/lib/api/batches.api";
import { usePermissions } from "@/lib/hooks/usePermissions";
import type { BatchStatus } from "@/types/course";

const STATUS_FILTERS: Array<{ value: BatchStatus | ""; label: string }> = [
  { value: "",          label: "All Batches" },
  { value: "ACTIVE",    label: "Active" },
  { value: "PLANNED",   label: "Planned" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function BatchesPage() {
  const [statusFilter, setStatusFilter] = useState<BatchStatus | "">("");
  const qc = useQueryClient();
  const { has } = usePermissions();
  const canManage = has("BATCH_MANAGE");

  const { data: dashboard } = useQuery({
    queryKey: ["batch-dashboard"],
    queryFn: getBatchDashboard,
    staleTime: 30_000,
  });

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["batches", statusFilter],
    queryFn: () => listAllBatches(statusFilter ? { status: statusFilter } : undefined),
    staleTime: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: BatchStatus }) =>
      patchBatchStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["batches"] });
      qc.invalidateQueries({ queryKey: ["batch-dashboard"] });
      toast.success("Batch status updated");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to update status";
      toast.error(msg);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Batches</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage training batches and student assignments
          </p>
        </div>
        {canManage && (
          <Link href="/batches/new">
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
              <Plus className="size-4" />
              New Batch
            </Button>
          </Link>
        )}
      </div>

      {/* Dashboard KPIs */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total",     value: dashboard.totalBatches,     color: "text-gray-700" },
            { label: "Active",    value: dashboard.activeBatches,    color: "text-emerald-600" },
            { label: "Planned",   value: dashboard.plannedBatches,   color: "text-blue-600" },
            { label: "Completed", value: dashboard.completedBatches, color: "text-gray-500" },
            { label: "Enrolled",  value: dashboard.totalEnrolled,    color: "text-violet-600" },
          ].map((kpi) => (
            <Card key={kpi.label} className="p-4 text-center">
              <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{kpi.label}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select
          value={statusFilter || "__all"}
          onValueChange={(v) => setStatusFilter(v === "__all" ? "" : (v as BatchStatus))}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value || "__all"} value={f.value || "__all"}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{batches.length} batch{batches.length !== 1 ? "es" : ""}</span>
      </div>

      {/* Batch Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
          <Loader2 className="size-4 animate-spin" />
          Loading batches…
        </div>
      ) : batches.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Calendar className="size-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No batches found</p>
          {canManage && (
            <>
              <p className="text-sm mt-1">Create your first batch to get started.</p>
              <Link href="/batches/new" className="mt-4 inline-block">
                <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5">
                  <Plus className="size-3.5" />
                  New Batch
                </Button>
              </Link>
            </>
          )}
        </Card>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Batch</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Course</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mode</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Faculty</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Dates</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Seats</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {batches.map((batch) => {
                const seatsFull = batch.maxCapacity != null && batch.availableSeats <= 0;
                return (
                  <tr key={batch.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{batch.name}</div>
                      {batch.batchCode && (
                        <div className="text-xs text-muted-foreground">{batch.batchCode}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {batch.courseName ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {batch.mode ? (
                        <Badge variant="outline" className="text-xs">{batch.mode}</Badge>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{batch.facultyName ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {batch.startDate ? (
                        <span>{batch.startDate}{batch.endDate ? ` → ${batch.endDate}` : ""}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {batch.maxCapacity != null ? (
                        <span className={`text-xs font-medium ${seatsFull ? "text-red-600" : "text-emerald-600"}`}>
                          <Users className="size-3 inline mr-0.5" />
                          {batch.enrolledCount}/{batch.maxCapacity}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          <Users className="size-3 inline mr-0.5" />
                          {batch.enrolledCount}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <BatchStatusBadge status={batch.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/batches/${batch.id}`}>
                        <Button variant="ghost" size="icon-sm">
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

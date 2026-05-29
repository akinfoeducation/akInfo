"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft, Edit2, Trash2, Users, Calendar,
  CheckCircle2, XCircle, Loader2, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BatchStatusBadge } from "@/components/courses/BatchStatusBadge";
import {
  getBatch, getBatchStudents, getBatchAssignmentHistory,
  patchBatchStatus, updateBatch, deleteBatch,
} from "@/lib/api/batches.api";
import { listCourses } from "@/lib/api/courses.api";
import type { BatchStatus, UpdateBatchRequest } from "@/types/course";

const STATUS_OPTIONS: BatchStatus[] = ["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"];

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const batchId = Number(id);
  const router  = useRouter();
  const qc      = useQueryClient();

  const [editOpen,    setEditOpen]    = useState(false);
  const [deleteOpen,  setDeleteOpen]  = useState(false);
  const [statusOpen,  setStatusOpen]  = useState(false);
  const [newStatus,   setNewStatus]   = useState<BatchStatus>("PLANNED");

  // Edit form state
  const [editForm, setEditForm] = useState<UpdateBatchRequest>({});

  const { data: batch, isLoading } = useQuery({
    queryKey: ["batch", batchId],
    queryFn:  () => getBatch(batchId),
    staleTime: 30_000,
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ["batch-students", batchId],
    queryFn:  () => getBatchStudents(batchId),
    staleTime: 30_000,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["batch-history", batchId],
    queryFn:  () => getBatchAssignmentHistory(batchId),
    enabled:  false, // loaded per-admission, skipping here for now
    staleTime: 30_000,
  });

  const { data: coursesData } = useQuery({
    queryKey: ["courses", "ACTIVE"],
    queryFn:  () => listCourses("ACTIVE"),
    staleTime: 60_000,
  });

  const statusMutation = useMutation({
    mutationFn: (status: BatchStatus) => patchBatchStatus(batchId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["batch", batchId] });
      qc.invalidateQueries({ queryKey: ["batches"] });
      qc.invalidateQueries({ queryKey: ["batch-dashboard"] });
      toast.success("Status updated");
      setStatusOpen(false);
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (req: UpdateBatchRequest) => updateBatch(batchId, req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["batch", batchId] });
      qc.invalidateQueries({ queryKey: ["batches"] });
      toast.success("Batch updated");
      setEditOpen(false);
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteBatch(batchId),
    onSuccess: () => {
      toast.success("Batch deleted");
      router.push("/batches");
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="size-4 animate-spin" />
        Loading batch…
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="py-20 text-center text-muted-foreground">Batch not found.</div>
    );
  }

  const seatPct = batch.maxCapacity
    ? Math.round((batch.enrolledCount / batch.maxCapacity) * 100)
    : null;

  function openEdit() {
    setEditForm({
      name:        batch!.name,
      batchCode:   batch!.batchCode,
      mode:        batch!.mode,
      facultyName: batch!.facultyName,
      timing:      batch!.timing,
      startDate:   batch!.startDate,
      endDate:     batch!.endDate,
      maxCapacity: batch!.maxCapacity,
    });
    setEditOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/batches">
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{batch.name}</h1>
              <BatchStatusBadge status={batch.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {batch.courseName ?? "—"}
              {batch.batchCode && <span className="ml-2 text-xs">· {batch.batchCode}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { setNewStatus(batch.status); setStatusOpen(true); }}>
            Change Status
          </Button>
          <Button variant="outline" size="sm" onClick={openEdit}>
            <Edit2 className="size-3.5 mr-1.5" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-3.5 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Capacity bar + info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 space-y-1">
          <div className="text-xs text-muted-foreground">Mode</div>
          <div className="font-medium">{batch.mode ?? "—"}</div>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="text-xs text-muted-foreground">Faculty / Trainer</div>
          <div className="font-medium">{batch.facultyName ?? "—"}</div>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="text-xs text-muted-foreground">Timing</div>
          <div className="font-medium">{batch.timing ?? "—"}</div>
        </Card>
      </div>

      {/* Schedule + Capacity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="size-4 text-muted-foreground" />
            Schedule
          </div>
          <div className="text-sm text-muted-foreground">
            {batch.startDate ? (
              <>{batch.startDate} {batch.endDate ? `→ ${batch.endDate}` : ""}</>
            ) : "No dates set"}
          </div>
        </Card>
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Users className="size-4 text-muted-foreground" />
            Capacity
          </div>
          {batch.maxCapacity != null ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Occupied</span>
                <span className="font-medium">{batch.enrolledCount} / {batch.maxCapacity}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${seatPct === 100 ? "bg-red-500" : seatPct! >= 80 ? "bg-yellow-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(seatPct ?? 0, 100)}%` }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {batch.availableSeats} seat{batch.availableSeats !== 1 ? "s" : ""} available
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {batch.enrolledCount} enrolled · No capacity limit
            </div>
          )}
        </Card>
      </div>

      {/* Students */}
      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Students ({students.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="mt-4">
          {studentsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-8">
              <Loader2 className="size-4 animate-spin" />
              Loading students…
            </div>
          ) : students.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No students assigned to this batch yet.
            </Card>
          ) : (
            <div className="rounded-lg border bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Student</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Admission</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Fees Due</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map((s, idx) => (
                    <tr key={s.admissionId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium">{s.studentName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.phone}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{s.admissionNumber}</td>
                      <td className="px-4 py-3 text-right">
                        {s.feesDue > 0 ? (
                          <span className="text-red-600 font-medium">₹{s.feesDue.toLocaleString("en-IN")}</span>
                        ) : (
                          <CheckCircle2 className="size-4 text-emerald-500 inline" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{s.admissionStatus}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admissions/${s.admissionId}`}>
                          <Button variant="ghost" size="icon-sm">
                            <ChevronRight className="size-4 text-muted-foreground" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Change Status Dialog */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Batch Status</DialogTitle>
          </DialogHeader>
          <Select value={newStatus} onValueChange={(v) => setNewStatus(v as BatchStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusOpen(false)}>Cancel</Button>
            <Button
              onClick={() => statusMutation.mutate(newStatus)}
              disabled={statusMutation.isPending || newStatus === batch.status}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {statusMutation.isPending ? "Saving…" : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Batch</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {[
              { field: "name" as const,        label: "Batch Name",      type: "text" },
              { field: "batchCode" as const,   label: "Batch Code",      type: "text" },
              { field: "facultyName" as const, label: "Faculty/Trainer", type: "text" },
              { field: "timing" as const,      label: "Timing",          type: "text" },
              { field: "startDate" as const,   label: "Start Date",      type: "date" },
              { field: "endDate" as const,     label: "End Date",        type: "date" },
              { field: "maxCapacity" as const, label: "Capacity",        type: "number" },
            ].map(({ field, label, type }) => (
              <div key={field} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  type={type}
                  value={String(editForm[field] ?? "")}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, [field]: e.target.value || undefined }))}
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label>Mode</Label>
              <Select
                value={editForm.mode ?? "OFFLINE"}
                onValueChange={(v) => setEditForm((prev) => ({ ...prev, mode: v as "ONLINE" | "OFFLINE" | "HYBRID" }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OFFLINE">Offline</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                  <SelectItem value="HYBRID">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={() => updateMutation.mutate(editForm)}
              disabled={updateMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Batch</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-medium text-foreground">{batch.name}</span>?
            This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Layers, Edit3, Trash2, X, Save, Loader2 } from "lucide-react";

import {
  listDepartments, createDepartment, updateDepartment, deleteDepartment,
  type DepartmentRequest,
} from "@/lib/api/branches.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { DepartmentResponse } from "@/types/user-management";

export default function DepartmentsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: departments, isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: listDepartments,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => { toast.success("Department deleted"); qc.invalidateQueries({ queryKey: ["departments"] }); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Cannot delete department"),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Departments</h1>
          <p className="text-sm text-gray-500 mt-0.5">Organise staff into academic or administrative departments</p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => { setShowCreate(true); setEditingId(null); }}>
          <Plus className="size-4 mr-2" /> New Department
        </Button>
      </div>

      {showCreate && (
        <DeptForm
          onSave={async (payload) => {
            await createDepartment(payload);
            toast.success("Department created");
            qc.invalidateQueries({ queryKey: ["departments"] });
            setShowCreate(false);
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (departments ?? []).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Layers className="size-10 mx-auto mb-3 text-gray-200" />
          <p>No departments yet. Create your first department.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(departments ?? []).map((dept) =>
            editingId === dept.id ? (
              <DeptForm
                key={dept.id}
                initial={dept}
                onSave={async (payload) => {
                  await updateDepartment(dept.id, payload);
                  toast.success("Department updated");
                  qc.invalidateQueries({ queryKey: ["departments"] });
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <DeptRow
                key={dept.id}
                dept={dept}
                onEdit={() => { setEditingId(dept.id); setShowCreate(false); }}
                onDelete={() => deleteMutation.mutate(dept.id)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function DeptRow({ dept, onEdit, onDelete }: {
  dept: DepartmentResponse;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
          <Layers className="size-4 text-violet-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{dept.name}</span>
            <code className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{dept.code}</code>
            <Badge
              variant="outline"
              className={dept.active
                ? "text-emerald-700 border-emerald-200 bg-emerald-50 text-xs"
                : "text-red-700 border-red-200 bg-red-50 text-xs"}
            >
              {dept.active ? "Active" : "Inactive"}
            </Badge>
          </div>
          {dept.description && <p className="text-xs text-gray-400 mt-0.5">{dept.description}</p>}
        </div>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" className="size-8 p-0" onClick={onEdit}>
          <Edit3 className="size-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="size-8 p-0 text-red-500 hover:text-red-600" onClick={onDelete}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function DeptForm({ initial, onSave, onCancel }: {
  initial?: DepartmentResponse;
  onSave: (payload: DepartmentRequest) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName]         = useState(initial?.name ?? "");
  const [code, setCode]         = useState(initial?.code ?? "");
  const [description, setDesc]  = useState(initial?.description ?? "");
  const [active, setActive]     = useState(initial?.active ?? true);
  const [busy, setBusy]         = useState(false);

  async function handleSave() {
    if (!name.trim() || !code.trim()) return toast.error("Name and code are required");
    setBusy(true);
    try {
      await onSave({ name: name.trim(), code: code.toUpperCase(), description, active });
    } finally { setBusy(false); }
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-4">
      <p className="font-medium text-sm">{initial ? "Edit Department" : "New Department"}</p>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-xs">Department Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="e.g. Computer Science" />
        </div>
        <div>
          <Label className="text-xs">Code * (UPPERCASE)</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="mt-1 font-mono" placeholder="CS" />
        </div>
        <div>
          <Label className="text-xs">Description</Label>
          <Input value={description} onChange={(e) => setDesc(e.target.value)} className="mt-1" placeholder="Short description" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="dept-active"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="accent-emerald-500"
        />
        <Label htmlFor="dept-active" className="text-xs cursor-pointer">Active</Label>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}><X className="size-4 mr-1" /> Cancel</Button>
        <Button onClick={handleSave} disabled={busy} className="bg-emerald-500 hover:bg-emerald-600 text-white">
          {busy ? <><Loader2 className="size-4 mr-2 animate-spin" /> Saving…</> : <><Save className="size-4 mr-2" /> Save Department</>}
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Building2, MapPin, Phone, Mail, Edit3, Trash2, X, Save, Loader2 } from "lucide-react";

import {
  listBranches, createBranch, updateBranch, deleteBranch,
  type BranchRequest,
} from "@/lib/api/branches.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { BranchResponse } from "@/types/user-management";

export default function BranchesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: listBranches,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBranch,
    onSuccess: () => { toast.success("Branch deleted"); qc.invalidateQueries({ queryKey: ["branches"] }); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Cannot delete branch"),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Branches</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage institute campuses and locations</p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => { setShowCreate(true); setEditingId(null); }}>
          <Plus className="size-4 mr-2" /> New Branch
        </Button>
      </div>

      {showCreate && (
        <BranchForm
          onSave={async (payload) => {
            await createBranch(payload);
            toast.success("Branch created");
            qc.invalidateQueries({ queryKey: ["branches"] });
            setShowCreate(false);
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : (branches ?? []).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="size-10 mx-auto mb-3 text-gray-200" />
          <p>No branches yet. Create your first branch.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(branches ?? []).map((branch) =>
            editingId === branch.id ? (
              <div key={branch.id} className="col-span-full">
                <BranchForm
                  initial={branch}
                  onSave={async (payload) => {
                    await updateBranch(branch.id, payload);
                    toast.success("Branch updated");
                    qc.invalidateQueries({ queryKey: ["branches"] });
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <BranchCard
                key={branch.id}
                branch={branch}
                onEdit={() => { setEditingId(branch.id); setShowCreate(false); }}
                onDelete={() => deleteMutation.mutate(branch.id)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function BranchCard({ branch, onEdit, onDelete }: {
  branch: BranchResponse;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <Building2 className="size-4 text-emerald-600" />
          </div>
          <div>
            <p className="font-medium text-sm">{branch.name}</p>
            <code className="text-xs text-gray-400">{branch.code}</code>
          </div>
        </div>
        <Badge
          variant="outline"
          className={branch.active
            ? "text-emerald-700 border-emerald-200 bg-emerald-50 text-xs"
            : "text-red-700 border-red-200 bg-red-50 text-xs"}
        >
          {branch.active ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="space-y-1 text-xs text-gray-500">
        {branch.city && (
          <div className="flex items-center gap-1.5">
            <MapPin className="size-3 text-gray-300" />
            {branch.city}
          </div>
        )}
        {branch.phone && (
          <div className="flex items-center gap-1.5">
            <Phone className="size-3 text-gray-300" />
            {branch.phone}
          </div>
        )}
        {branch.email && (
          <div className="flex items-center gap-1.5">
            <Mail className="size-3 text-gray-300" />
            {branch.email}
          </div>
        )}
      </div>

      <div className="flex gap-1 pt-1 border-t border-gray-100">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onEdit}>
          <Edit3 className="size-3 mr-1" /> Edit
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-600" onClick={onDelete}>
          <Trash2 className="size-3 mr-1" /> Delete
        </Button>
      </div>
    </div>
  );
}

function BranchForm({ initial, onSave, onCancel }: {
  initial?: BranchResponse;
  onSave: (payload: BranchRequest) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName]       = useState(initial?.name ?? "");
  const [code, setCode]       = useState(initial?.code ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [city, setCity]       = useState(initial?.city ?? "");
  const [phone, setPhone]     = useState(initial?.phone ?? "");
  const [email, setEmail]     = useState(initial?.email ?? "");
  const [active, setActive]   = useState(initial?.active ?? true);
  const [busy, setBusy]       = useState(false);

  async function handleSave() {
    if (!name.trim() || !code.trim()) return toast.error("Name and code are required");
    setBusy(true);
    try {
      await onSave({ name: name.trim(), code: code.toUpperCase(), address, city, phone, email, active });
    } finally { setBusy(false); }
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-4">
      <p className="font-medium text-sm">{initial ? "Edit Branch" : "New Branch"}</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Branch Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="e.g. Koramangala Campus" />
        </div>
        <div>
          <Label className="text-xs">Code * (UPPERCASE)</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="mt-1 font-mono" placeholder="KRM" />
        </div>
        <div>
          <Label className="text-xs">City</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" placeholder="Bengaluru" />
        </div>
        <div>
          <Label className="text-xs">Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" placeholder="+91 98765 43210" />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" placeholder="branch@institute.com" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">Address</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1" placeholder="Street address" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="branch-active"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="accent-emerald-500"
        />
        <Label htmlFor="branch-active" className="text-xs cursor-pointer">Active</Label>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}><X className="size-4 mr-1" /> Cancel</Button>
        <Button onClick={handleSave} disabled={busy} className="bg-emerald-500 hover:bg-emerald-600 text-white">
          {busy ? <><Loader2 className="size-4 mr-2 animate-spin" /> Saving…</> : <><Save className="size-4 mr-2" /> Save Branch</>}
        </Button>
      </div>
    </div>
  );
}

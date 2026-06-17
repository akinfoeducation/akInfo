"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Shield, Users, ChevronDown, ChevronRight, Trash2, Edit3, X, Save, Loader2 } from "lucide-react";

import { listRoles, listPermissions, createRole, updateRole, assignPermissions, deleteRole } from "@/lib/api/roles.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { RoleResponse, PermissionResponse } from "@/types/user-management";

export default function RolesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId]   = useState<number | null>(null);
  const [expanded, setExpanded]     = useState<Set<number>>(new Set());

  const { data: roles,       isLoading } = useQuery({ queryKey: ["roles"],       queryFn: listRoles });
  const { data: permissions }            = useQuery({ queryKey: ["permissions"], queryFn: listPermissions });

  const deleteMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => { toast.success("Role deleted"); qc.invalidateQueries({ queryKey: ["roles"] }); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Cannot delete role"),
  });

  const permsByResource = groupByResource(permissions ?? []);
  const toggleExpand = (id: number) =>
    setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Roles & Permissions</h1>
          <p className="text-sm text-gray-500 mt-0.5">Define what each role can access across the system</p>
        </div>
        <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => setShowCreate(true)}>
          <Plus className="size-4 mr-2" /> New Role
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <RoleForm
          allPermissions={permissions ?? []}
          permsByResource={permsByResource}
          onSave={async (payload) => {
            await createRole(payload);
            toast.success("Role created");
            qc.invalidateQueries({ queryKey: ["roles"] });
            setShowCreate(false);
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* Roles list */}
      {isLoading
        ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
        : (
          <div className="space-y-3">
            {(roles ?? []).map((role) => (
              <div key={role.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Role header */}
                <div className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleExpand(role.id)} className="text-gray-400 hover:text-gray-600">
                      {expanded.has(role.id) ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </button>
                    <div className="size-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Shield className="size-4 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{role.name}</span>
                        <code className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{role.code}</code>
                        {role.system && <Badge variant="outline" className="text-xs">System</Badge>}
                        {!role.active && <Badge variant="outline" className="text-xs text-red-600 border-red-200">Inactive</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-400">{role.permissions.length} permissions</span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Users className="size-3" /> {role.userCount} users
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!role.system && (
                      <>
                        <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => setEditingId(role.id)}>
                          <Edit3 className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="size-8 p-0 text-red-500 hover:text-red-600"
                          onClick={() => deleteMutation.mutate(role.id)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Edit form */}
                {editingId === role.id && (
                  <div className="border-t border-gray-100 p-5">
                    <RoleForm
                      initial={role}
                      allPermissions={permissions ?? []}
                      permsByResource={permsByResource}
                      onSave={async (payload) => {
                        await updateRole(role.id, payload);
                        toast.success("Role updated");
                        qc.invalidateQueries({ queryKey: ["roles"] });
                        setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                )}

                {/* Expanded permission matrix */}
                {expanded.has(role.id) && editingId !== role.id && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    <PermissionMatrix
                      permsByResource={permsByResource}
                      selectedCodes={new Set(role.permissions.map((p) => p.code))}
                      readonly
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ── Role form (create / edit) ─────────────────────────────────────────────────

function RoleForm({
  initial, allPermissions, permsByResource, onSave, onCancel,
}: {
  initial?: RoleResponse;
  allPermissions: PermissionResponse[];
  permsByResource: Record<string, PermissionResponse[]>;
  onSave: (payload: any) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName]           = useState(initial?.name ?? "");
  const [code, setCode]           = useState(initial?.code ?? "");
  const [desc, setDesc]           = useState(initial?.description ?? "");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(
    new Set(initial?.permissions.map((p) => p.id) ?? [])
  );
  const [busy, setBusy] = useState(false);

  function togglePerm(id: number) {
    setSelectedIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleResource(perms: PermissionResponse[]) {
    const allSelected = perms.every((p) => selectedIds.has(p.id));
    setSelectedIds((s) => {
      const n = new Set(s);
      allSelected ? perms.forEach((p) => n.delete(p.id)) : perms.forEach((p) => n.add(p.id));
      return n;
    });
  }

  async function handleSave() {
    if (!name.trim() || !code.trim()) return toast.error("Name and code are required");
    setBusy(true);
    try {
      await onSave({ name: name.trim(), code: code.toUpperCase(), description: desc, permissionIds: [...selectedIds] });
    } finally { setBusy(false); }
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-xs">Role Name *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="e.g. Faculty Lead" />
        </div>
        <div>
          <Label className="text-xs">Code * (UPPERCASE)</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="mt-1 font-mono" placeholder="FACULTY_LEAD" />
        </div>
        <div>
          <Label className="text-xs">Description</Label>
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1" placeholder="Short description" />
        </div>
      </div>

      {/* Permission matrix */}
      <div>
        <Label className="text-xs mb-3 block">Permissions ({selectedIds.size} selected)</Label>
        <PermissionMatrix
          permsByResource={permsByResource}
          selectedCodes={new Set(allPermissions.filter((p) => selectedIds.has(p.id)).map((p) => p.code))}
          onToggleCode={(code) => {
            const perm = allPermissions.find((p) => p.code === code);
            if (perm) togglePerm(perm.id);
          }}
          onToggleResource={(resource) => {
            const perms = permsByResource[resource] ?? [];
            toggleResource(perms);
          }}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}><X className="size-4 mr-1" /> Cancel</Button>
        <Button onClick={handleSave} disabled={busy} className="bg-emerald-500 hover:bg-emerald-600 text-white">
          {busy ? <><Loader2 className="size-4 mr-2 animate-spin" /> Saving…</> : <><Save className="size-4 mr-2" /> Save Role</>}
        </Button>
      </div>
    </div>
  );
}

// ── Permission Matrix ─────────────────────────────────────────────────────────

const ACTION_ORDER = ["READ", "CREATE", "UPDATE", "DELETE", "EXPORT", "APPROVE"];

function PermissionMatrix({
  permsByResource, selectedCodes, readonly, onToggleCode, onToggleResource,
}: {
  permsByResource: Record<string, PermissionResponse[]>;
  selectedCodes: Set<string>;
  readonly?: boolean;
  onToggleCode?: (code: string) => void;
  onToggleResource?: (resource: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 pr-4 font-medium text-gray-500 w-40">Module</th>
            {ACTION_ORDER.map((a) => (
              <th key={a} className="text-center py-2 px-2 font-medium text-gray-400">{a}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(permsByResource).map(([resource, perms]) => {
            const allSelected = perms.every((p) => selectedCodes.has(p.code));
            return (
              <tr key={resource} className="border-b border-gray-100 last:border-0">
                <td className="py-2 pr-4 font-medium text-gray-700 capitalize">
                  {!readonly && onToggleResource ? (
                    <button onClick={() => onToggleResource(resource)}
                      className={`text-left hover:text-emerald-600 transition-colors ${allSelected ? "text-emerald-600" : ""}`}>
                      {resource.toLowerCase()}
                    </button>
                  ) : resource.toLowerCase()}
                </td>
                {ACTION_ORDER.map((action) => {
                  const perm = perms.find((p) => p.action === action);
                  const selected = perm ? selectedCodes.has(perm.code) : false;
                  return (
                    <td key={action} className="text-center py-2 px-2">
                      {perm ? (
                        <button
                          disabled={readonly}
                          onClick={() => onToggleCode?.(perm.code)}
                          className={`size-5 rounded border mx-auto flex items-center justify-center transition-all ${
                            selected
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-gray-200 hover:border-gray-400"
                          } ${readonly ? "cursor-default" : ""}`}
                        >
                          {selected && <span className="text-[10px] font-bold">✓</span>}
                        </button>
                      ) : (
                        <span className="text-gray-200 text-center block">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function groupByResource(permissions: PermissionResponse[]): Record<string, PermissionResponse[]> {
  return permissions.reduce((acc, p) => {
    if (!acc[p.resource]) acc[p.resource] = [];
    acc[p.resource].push(p);
    return acc;
  }, {} as Record<string, PermissionResponse[]>);
}

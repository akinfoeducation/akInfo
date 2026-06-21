"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeft, User, Shield, Monitor, KeyRound,
  UserCheck, UserX, Trash2, Loader2, Save, Camera,
} from "lucide-react";

import {
  getUser, updateUser, updateUserStatus, adminResetPassword,
  deleteUser, getMySessions, revokeSession, revokeAllSessions,
  uploadAvatar,
} from "@/lib/api/users.api";
import { listRoles } from "@/lib/api/roles.api";
import { listBranches, listDepartments } from "@/lib/api/branches.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { selectLabel } from "@/lib/ui/select-label";
import type { UpdateUserRequest, UserSessionResponse } from "@/types/user-management";

type Tab = "profile" | "roles" | "sessions" | "security";

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("profile");

  const { data: user, isLoading } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => getUser(userId),
  });

  const { data: roles }       = useQuery({ queryKey: ["roles"],       queryFn: listRoles });
  const { data: branches }    = useQuery({ queryKey: ["branches"],    queryFn: listBranches });
  const { data: departments } = useQuery({ queryKey: ["departments"], queryFn: listDepartments });
  const { data: sessions }    = useQuery({
    queryKey: ["user-sessions"],
    queryFn: getMySessions,
    enabled: tab === "sessions",
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateUserRequest) => updateUser(userId, payload) as Promise<any>,
    onSuccess: () => {
      toast.success("User updated"); qc.invalidateQueries({ queryKey: ["user", userId] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Update failed"),
  });

  const statusMutation = useMutation({
    mutationFn: (active: boolean) => updateUserStatus(userId, active),
    onSuccess: (_, active) => {
      toast.success(active ? "User activated" : "User deactivated");
      qc.invalidateQueries({ queryKey: ["user", userId] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteUser(userId),
    onSuccess: () => { toast.success("User deleted"); router.push("/users"); },
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(userId, file),
    onSuccess: () => {
      toast.success("Avatar updated");
      qc.invalidateQueries({ queryKey: ["user", userId] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Upload failed"),
  });

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) avatarMutation.mutate(file);
    e.target.value = "";
  }

  if (isLoading) return <UserDetailSkeleton />;
  if (!user) return <div className="text-center py-20 text-gray-400">User not found</div>;

  const initials = `${user.firstName[0]}${user.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-3">
            {/* Clickable avatar with upload overlay */}
            <label className="relative group cursor-pointer shrink-0">
              <div className="size-12 rounded-full bg-emerald-100 flex items-center justify-center text-lg font-bold text-emerald-700 overflow-hidden">
                {user.avatarUrl
                  ? <img src={user.avatarUrl} className="size-12 rounded-full object-cover" alt="" />
                  : initials}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {avatarMutation.isPending
                  ? <Loader2 className="size-4 text-white animate-spin" />
                  : <Camera className="size-4 text-white" />}
              </div>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
            </label>
            <div>
              <h1 className="text-xl font-semibold">{user.fullName ?? `${user.firstName} ${user.lastName ?? ""}`}</h1>
              <p className="text-sm text-gray-500">{user.email} · {user.employeeId ?? "No EMP ID"}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => statusMutation.mutate(!user.active)}
            disabled={statusMutation.isPending}
          >
            {user.active
              ? <><UserX className="size-3.5 mr-1.5 text-orange-500" /> Deactivate</>
              : <><UserCheck className="size-3.5 mr-1.5 text-emerald-500" /> Activate</>}
          </Button>
          <Button
            variant="outline" size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="size-3.5 mr-1.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline" className={user.active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"}>
          {user.active ? "Active" : "Inactive"}
        </Badge>
        {user.locked && <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">Locked</Badge>}
        {user.roles.map((r) => (
          <Badge key={r.id} variant="secondary" className="text-xs">{r.name}</Badge>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(["profile", "roles", "sessions", "security"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 ${
              tab === t
                ? "border-emerald-500 text-emerald-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "sessions" ? "Active Sessions" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "profile" && (
        <ProfileTab
          user={user}
          branches={branches ?? []}
          departments={departments ?? []}
          onSave={(data) => updateMutation.mutate(data)}
          saving={updateMutation.isPending}
        />
      )}

      {tab === "roles" && (
        <RolesTab
          userRoleIds={user.roles.map((r) => r.id)}
          allRoles={roles ?? []}
          onSave={(roleIds) => updateMutation.mutate({
            firstName: user.firstName,
            lastName: user.lastName,
            roleIds,
          })}
          saving={updateMutation.isPending}
        />
      )}

      {tab === "sessions" && (
        <SessionsTab
          sessions={sessions ?? []}
          onRevoke={(sid) => revokeSession(sid).then(() => qc.invalidateQueries({ queryKey: ["user-sessions"] }))}
          onRevokeAll={() => revokeAllSessions().then(() => qc.invalidateQueries({ queryKey: ["user-sessions"] }))}
        />
      )}

      {tab === "security" && (
        <SecurityTab
          userId={userId}
          onReset={(pwd) => adminResetPassword(userId, pwd).then(() => toast.success("Password reset. User must log in again."))}
        />
      )}
    </div>
  );
}

// ── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab({ user, branches, departments, onSave, saving }: {
  user: any; branches: any[]; departments: any[];
  onSave: (data: UpdateUserRequest) => void; saving: boolean;
}) {
  const [form, setForm] = useState<{
    firstName: string; lastName: string; email: string; phone: string;
    employeeId: string; designation: string; gender: string;
    joiningDate: string; address: string; branchId: string; departmentId: string;
  }>({
    firstName:    user.firstName ?? "",
    lastName:     user.lastName  ?? "",
    email:        user.email     ?? "",
    phone:        user.phone     ?? "",
    employeeId:   user.employeeId ?? "",
    designation:  user.designation ?? "",
    gender:       user.gender ?? "",
    joiningDate:  user.joiningDate ?? "",
    address:      user.address ?? "",
    branchId:     user.branchId ? String(user.branchId) : "",
    departmentId: user.departmentId ? String(user.departmentId) : "",
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function handleSave() {
    onSave({
      firstName:    form.firstName,
      lastName:     form.lastName || undefined,
      email:        form.email,
      phone:        form.phone || undefined,
      employeeId:   form.employeeId || undefined,
      designation:  form.designation || undefined,
      gender:       form.gender || undefined,
      joiningDate:  form.joiningDate || undefined,
      address:      form.address || undefined,
      branchId:     form.branchId     ? Number(form.branchId)     : null,
      departmentId: form.departmentId ? Number(form.departmentId) : null,
    });
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5 grid grid-cols-2 gap-4">
        <F label="First Name"><Input value={form.firstName}    onChange={set("firstName")} /></F>
        <F label="Last Name"> <Input value={form.lastName}     onChange={set("lastName")} /></F>
        <F label="Email">     <Input value={form.email}        onChange={set("email")} type="email" /></F>
        <F label="Mobile">    <Input value={form.phone}        onChange={set("phone")} /></F>
        <F label="Employee ID"><Input value={form.employeeId}  onChange={set("employeeId")} /></F>
        <F label="Designation"><Input value={form.designation} onChange={set("designation")} /></F>
        <F label="Gender">
          <select value={form.gender} onChange={set("gender")}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm">
            <option value="">—</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </F>
        <F label="Joining Date"><Input value={form.joiningDate} onChange={set("joiningDate")} type="date" /></F>
        <F label="Branch">
          <Select value={form.branchId || "none"} onValueChange={(v) => { const val = v ?? "none"; setForm((f) => ({ ...f, branchId: val === "none" ? "" : val })); }}>
            <SelectTrigger><SelectValue placeholder="Select branch">{selectLabel(branches, (b: { id: number; name: string }) => b.name, "Select branch", { none: "None" })}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {branches.map((b: any) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </F>
        <F label="Department">
          <Select value={form.departmentId || "none"} onValueChange={(v) => { const val = v ?? "none"; setForm((f) => ({ ...f, departmentId: val === "none" ? "" : val })); }}>
            <SelectTrigger><SelectValue placeholder="Select department">{selectLabel(departments, (d: { id: number; name: string }) => d.name, "Select department", { none: "None" })}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {departments.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </F>
        <div className="col-span-2">
          <F label="Address">
            <textarea value={form.address} onChange={set("address")}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none h-20" />
          </F>
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white">
          {saving ? <><Loader2 className="size-4 mr-2 animate-spin" /> Saving…</> : <><Save className="size-4 mr-2" /> Save Changes</>}
        </Button>
      </div>
    </div>
  );
}

// ── Roles Tab ────────────────────────────────────────────────────────────────

function RolesTab({ userRoleIds, allRoles, onSave, saving }: {
  userRoleIds: number[]; allRoles: any[];
  onSave: (roleIds: number[]) => void; saving: boolean;
}) {
  const [selected, setSelected] = useState<number[]>(userRoleIds);
  const toggle = (id: number) => setSelected((p) => p.includes(id) ? p.filter((r) => r !== id) : [...p, id]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm text-gray-500 mb-4">Select roles to assign to this user.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {allRoles.map((role: any) => {
            const sel = selected.includes(role.id);
            return (
              <button key={role.id} type="button" onClick={() => toggle(role.id)}
                className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                  sel ? "border-emerald-400 bg-emerald-50 text-emerald-800" : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}>
                <div className="font-medium">{role.name}</div>
                <div className="text-xs text-gray-400">{role.permissions.length} permissions</div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => onSave(selected)} disabled={saving || selected.length === 0}
          className="bg-emerald-500 hover:bg-emerald-600 text-white">
          {saving ? "Saving…" : "Update Roles"}
        </Button>
      </div>
    </div>
  );
}

// ── Sessions Tab ─────────────────────────────────────────────────────────────

function SessionsTab({ sessions, onRevoke, onRevokeAll }: {
  sessions: UserSessionResponse[];
  onRevoke: (id: number) => void;
  onRevokeAll: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={onRevokeAll}>
          Logout from all devices
        </Button>
      </div>
      {sessions.length === 0
        ? <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">No active sessions</div>
        : sessions.map((s) => (
          <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="size-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium">{s.deviceName ?? `${s.browser} on ${s.os}`}
                  {s.current && <Badge className="ml-2 text-xs bg-emerald-100 text-emerald-700">Current</Badge>}
                </p>
                <p className="text-xs text-gray-400">{s.ipAddress} · Last active {s.lastActiveAt ? format(new Date(s.lastActiveAt), "dd MMM, HH:mm") : "—"}</p>
              </div>
            </div>
            {!s.current && (
              <Button variant="outline" size="sm" className="text-red-600 border-red-200" onClick={() => onRevoke(s.id)}>
                Revoke
              </Button>
            )}
          </div>
        ))}
    </div>
  );
}

// ── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab({ userId, onReset }: { userId: number; onReset: (pwd: string) => void }) {
  const [pwd, setPwd]   = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);

  async function handle() {
    if (pwd.length < 8)   return toast.error("Password must be at least 8 characters");
    if (pwd !== pwd2)     return toast.error("Passwords do not match");
    setBusy(true);
    try { await onReset(pwd); setPwd(""); setPwd2(""); }
    finally { setBusy(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 max-w-sm space-y-4">
      <h3 className="font-medium text-sm">Reset Password</h3>
      <p className="text-xs text-gray-500">The user will be logged out from all devices and must log in with the new password.</p>
      <div className="space-y-3">
        <div>
          <Label className="text-xs">New Password</Label>
          <Input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Min 8 characters" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Confirm Password</Label>
          <Input type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} placeholder="Repeat password" className="mt-1" />
        </div>
        <Button onClick={handle} disabled={busy} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
          {busy ? "Resetting…" : <><KeyRound className="size-4 mr-2" /> Reset Password</>}
        </Button>
      </div>
    </div>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-gray-600">{label}</Label>
      {children}
    </div>
  );
}

function UserDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex gap-3"><Skeleton className="size-12 rounded-full" /><div className="space-y-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-64" /></div></div>
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

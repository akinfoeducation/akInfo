"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { User, Lock, LogOut, Save, Loader2, Eye, EyeOff } from "lucide-react";

import { updateProfile, changePassword } from "@/lib/api/profile.api";
import { logout as apiLogout } from "@/lib/api/auth.api";
import { useAuthStore } from "@/lib/stores/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PortalSettingsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, updateUser, clearAuth } = useAuthStore();

  // ── Profile form ─────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName,  setLastName]  = useState(user?.lastName  ?? "");
  const [phone,     setPhone]     = useState((user as any)?.phone ?? "");

  const profileMut = useMutation({
    mutationFn: () => updateProfile({ firstName, lastName, phone: phone || undefined }),
    onSuccess: (updated) => {
      updateUser(updated);
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["portal-dashboard"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Failed to update profile"),
  });

  // ── Change password form ──────────────────────────────────────────────────
  const [current,  setCurrent]  = useState("");
  const [next,     setNext]     = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showCurr, setShowCurr] = useState(false);
  const [showNext, setShowNext] = useState(false);

  const pwdMut = useMutation({
    mutationFn: () => {
      if (next !== confirm) throw new Error("Passwords do not match");
      if (next.length < 8) throw new Error("Password must be at least 8 characters");
      return changePassword({ currentPassword: current, newPassword: next });
    },
    onSuccess: () => {
      toast.success("Password changed — please log in again");
      setCurrent(""); setNext(""); setConfirm("");
      setTimeout(handleLogout, 1500);
    },
    onError: (e: any) => toast.error(e?.message ?? e?.response?.data?.message ?? "Failed to change password"),
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  async function handleLogout() {
    try { await apiLogout(); } catch { /* ignore */ }
    clearAuth();
    router.replace("/login");
  }

  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() || "S";

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your profile and account security</p>
      </div>

      {/* Avatar + name chip */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
        <div className="size-14 rounded-full bg-emerald-100 flex items-center justify-center text-xl font-bold text-emerald-700 shrink-0">
          {initials}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
          <p className="text-sm text-gray-400">{user?.email ?? user?.username}</p>
          <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">
            Student
          </span>
        </div>
      </div>

      {/* ── Profile ── */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User className="size-4 text-emerald-600" />
          <h2 className="font-semibold text-gray-900">Personal Information</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">First Name</Label>
            <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Last Name</Label>
            <Input value={lastName} onChange={e => setLastName(e.target.value)} className="mt-1" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Phone Number</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1" placeholder="+91 98765 43210" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs text-gray-400">Username</Label>
            <Input value={user?.username ?? ""} disabled className="mt-1 bg-gray-50 text-gray-400 cursor-not-allowed" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs text-gray-400">Email</Label>
            <Input value={user?.email ?? ""} disabled className="mt-1 bg-gray-50 text-gray-400 cursor-not-allowed" />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            disabled={profileMut.isPending}
            onClick={() => profileMut.mutate()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {profileMut.isPending
              ? <><Loader2 className="size-4 mr-2 animate-spin" />Saving…</>
              : <><Save className="size-4 mr-2" />Save Changes</>}
          </Button>
        </div>
      </section>

      {/* ── Change Password ── */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="size-4 text-emerald-600" />
          <h2 className="font-semibold text-gray-900">Change Password</h2>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Current Password</Label>
            <div className="relative mt-1">
              <Input
                type={showCurr ? "text" : "password"}
                value={current}
                onChange={e => setCurrent(e.target.value)}
                placeholder="Enter your current password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurr(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurr ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label className="text-xs">New Password</Label>
            <div className="relative mt-1">
              <Input
                type={showNext ? "text" : "password"}
                value={next}
                onChange={e => setNext(e.target.value)}
                placeholder="At least 8 characters"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNext(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNext ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label className="text-xs">Confirm New Password</Label>
            <Input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat new password"
              className={`mt-1 ${confirm && next !== confirm ? "border-red-300 focus-visible:ring-red-300" : ""}`}
            />
            {confirm && next !== confirm && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            disabled={pwdMut.isPending || !current || !next || next !== confirm}
            onClick={() => pwdMut.mutate()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {pwdMut.isPending
              ? <><Loader2 className="size-4 mr-2 animate-spin" />Updating…</>
              : <><Lock className="size-4 mr-2" />Update Password</>}
          </Button>
        </div>
      </section>

      {/* ── Logout ── */}
      <section className="bg-white rounded-xl border border-red-100 p-5">
        <h2 className="font-semibold text-gray-900 mb-1">Sign Out</h2>
        <p className="text-sm text-gray-500 mb-4">
          You will be signed out of your student portal on this device.
        </p>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
        >
          <LogOut className="size-4 mr-2" />
          Sign out
        </Button>
      </section>
    </div>
  );
}

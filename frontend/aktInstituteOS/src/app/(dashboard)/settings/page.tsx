"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  User, Lock, Shield, Mail, Phone, AtSign,
  Check, Eye, EyeOff, Pencil,
} from "lucide-react";

import { getMe, updateProfile, changePassword } from "@/lib/api/profile.api";
import { useAuthStore } from "@/lib/stores/auth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// ── Schemas ───────────────────────────────────────────────────────────────

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName:  z.string().max(100).optional().or(z.literal("")),
  phone:     z.string().max(20).optional().or(z.literal("")),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword:     z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine(d => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ProfileForm   = z.infer<typeof profileSchema>;
type PasswordForm  = z.infer<typeof passwordSchema>;

// ── Tab types ─────────────────────────────────────────────────────────────

type Tab = "profile" | "security";

const TABS: Array<{ key: Tab; label: string; icon: React.ElementType }> = [
  { key: "profile",  label: "My Profile",  icon: User  },
  { key: "security", label: "Security",    icon: Lock  },
];

// ── Avatar ────────────────────────────────────────────────────────────────

function AvatarCircle({ name, size = "lg" }: { name: string; size?: "sm" | "lg" }) {
  const initials = name
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const s = size === "lg" ? "size-20 text-2xl" : "size-10 text-sm";
  return (
    <div className={`${s} rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white shrink-0`}>
      {initials || "?"}
    </div>
  );
}

// ── Password input ────────────────────────────────────────────────────────

function PasswordInput({ id, placeholder, error, ...props }: React.ComponentProps<"input"> & { error?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1">
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          className="pr-10"
          aria-invalid={!!error}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-700"
          tabIndex={-1}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── Info row ──────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="size-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <Icon className="size-4 text-gray-500" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value || "—"}</p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const { user: storeUser, setAuth } = useAuthStore();
  const qc = useQueryClient();

  // ── Load latest profile from server ──────────────────────────────────

  const { data: profile, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn:  getMe,
    staleTime: 60_000,
  });

  const displayName = profile
    ? [profile.firstName, profile.lastName].filter(Boolean).join(" ")
    : storeUser?.firstName ?? "";

  // ── Profile form ──────────────────────────────────────────────────────

  const {
    register: regProfile,
    handleSubmit: hProfile,
    reset: resetProfile,
    formState: { errors: pErrors, isDirty: pDirty },
  } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema) });

  // Pre-fill form once data loads
  useEffect(() => {
    if (profile) {
      resetProfile({
        firstName: profile.firstName ?? "",
        lastName:  profile.lastName  ?? "",
        phone:     (profile as unknown as { phone?: string }).phone ?? "",
      });
    }
  }, [profile, resetProfile]);

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      toast.success("Profile updated successfully");
      qc.invalidateQueries({ queryKey: ["me"] });
      // Update auth store so header initials refresh
      if (storeUser) {
        setAuth(
          { ...storeUser, firstName: updated.firstName, lastName: updated.lastName ?? "", fullName: updated.fullName ?? updated.firstName },
          "", // token unchanged — store doesn't re-issue it
        );
      }
      resetProfile({ firstName: updated.firstName, lastName: updated.lastName ?? "", phone: (updated as unknown as { phone?: string }).phone ?? "" });
    },
    onError: () => toast.error("Failed to update profile. Please try again."),
  });

  // ── Password form ─────────────────────────────────────────────────────

  const {
    register: regPwd,
    handleSubmit: hPwd,
    reset: resetPwd,
    formState: { errors: pwdErrors },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const pwdMutation = useMutation({
    mutationFn: (data: PasswordForm) =>
      changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
    onSuccess: () => {
      toast.success("Password changed. Please log in again.");
      resetPwd();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to change password.";
      toast.error(msg);
    },
  });

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl space-y-6">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Profile summary card */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          {isLoading
            ? <div className="size-20 rounded-full bg-gray-100 animate-pulse" />
            : <AvatarCircle name={displayName} />
          }
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold text-gray-900 truncate">{displayName || "—"}</p>
            <p className="text-sm text-muted-foreground truncate">{profile?.email ?? storeUser?.email ?? ""}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(profile?.roles ?? storeUser?.roles ?? []).map(r => (
                <span key={r} className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded uppercase tracking-wide">
                  {r.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => setActiveTab("profile")}
            className="size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Pencil className="size-4" />
          </button>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? "bg-white border border-b-white border-gray-200 -mb-px text-emerald-700"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ───────────────────────────────────────────────── */}
      {activeTab === "profile" && (
        <div className="space-y-6">

          {/* Read-only account info */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">Account Information</h2>
            <p className="text-xs text-muted-foreground mb-4">These fields cannot be changed. Contact admin to update.</p>
            <div className="divide-y divide-gray-100">
              <InfoRow icon={Mail}    label="Email address" value={profile?.email    ?? storeUser?.email    ?? ""} />
              <InfoRow icon={AtSign}  label="Username"      value={profile?.username ?? storeUser?.username ?? ""} />
              <InfoRow icon={Shield}  label="Role"          value={(profile?.roles ?? storeUser?.roles ?? []).map(r => r.replace(/_/g, " ")).join(", ")} />
            </div>
          </Card>

          {/* Editable profile */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Edit Profile</h2>
            <form onSubmit={hProfile(data => profileMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>First Name <span className="text-destructive">*</span></Label>
                  <Input placeholder="First name" aria-invalid={!!pErrors.firstName} {...regProfile("firstName")} />
                  {pErrors.firstName && <p className="text-xs text-destructive">{pErrors.firstName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name</Label>
                  <Input placeholder="Last name" {...regProfile("lastName")} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input placeholder="+91 98765 43210" className="pl-9" {...regProfile("phone")} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <Button type="button" variant="outline"
                  onClick={() => resetProfile({ firstName: profile?.firstName ?? "", lastName: profile?.lastName ?? "", phone: "" })}
                  disabled={!pDirty || profileMutation.isPending}>
                  Reset
                </Button>
                <Button
                  type="submit"
                  disabled={!pDirty || profileMutation.isPending}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 disabled:opacity-50"
                >
                  {profileMutation.isPending ? "Saving…" : (
                    <><Check className="size-4" /> Save Changes</>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ── Security tab ──────────────────────────────────────────────── */}
      {activeTab === "security" && (
        <div className="space-y-6">

          {/* Change password */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">Change Password</h2>
            <p className="text-xs text-muted-foreground mb-5">
              After changing your password you will be signed out and need to log in again.
            </p>
            <form onSubmit={hPwd(data => pwdMutation.mutate(data))} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Current Password</Label>
                <PasswordInput
                  placeholder="Enter your current password"
                  error={pwdErrors.currentPassword?.message}
                  {...regPwd("currentPassword")}
                />
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label>New Password</Label>
                <PasswordInput
                  placeholder="At least 8 characters"
                  error={pwdErrors.newPassword?.message}
                  {...regPwd("newPassword")}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Confirm New Password</Label>
                <PasswordInput
                  placeholder="Repeat new password"
                  error={pwdErrors.confirmPassword?.message}
                  {...regPwd("confirmPassword")}
                />
              </div>

              {/* Password rules hint */}
              <ul className="text-xs text-muted-foreground space-y-1 pl-1">
                <li className="flex items-center gap-1.5"><span className="size-1 rounded-full bg-gray-300 inline-block" /> Minimum 8 characters</li>
                <li className="flex items-center gap-1.5"><span className="size-1 rounded-full bg-gray-300 inline-block" /> Mix of letters and numbers recommended</li>
              </ul>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  disabled={pwdMutation.isPending}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2 disabled:opacity-50"
                >
                  {pwdMutation.isPending ? "Changing…" : (
                    <><Lock className="size-4" /> Change Password</>
                  )}
                </Button>
              </div>
            </form>
          </Card>

          {/* Session info */}
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Active Session</h2>
            <div className="flex items-center gap-3 text-sm">
              <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-gray-600">Logged in as <strong>{profile?.email ?? storeUser?.email}</strong></span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Session is valid for 15 minutes and auto-refreshes while you&apos;re active.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}

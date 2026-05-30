"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell, Search, Bookmark, ChevronDown, LogOut, User, Settings, LayoutDashboard, Menu, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/stores/auth.store";
import { logout } from "@/lib/api/auth.api";

const INSTITUTE_NAMES: Record<string, string> = {
  delhi: "AKT Institute Delhi",
  patna: "AKT Institute Patna",
};

function useInstituteName(): string | null {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    const parts = window.location.hostname.split(".");
    let sub: string | undefined;
    if (parts.length === 2 && parts[1] === "localhost") sub = parts[0];
    else if (parts.length >= 3) sub = parts[0];
    if (sub && INSTITUTE_NAMES[sub]) setName(INSTITUTE_NAMES[sub]);
  }, []);
  return name;
}

const PAGE_LABELS: Array<{ prefix: string; label: string }> = [
  { prefix: "/leads",      label: "Leads" },
  { prefix: "/admissions", label: "Admissions" },
  { prefix: "/students",   label: "Students" },
  { prefix: "/courses",    label: "Courses" },
  { prefix: "/fees",       label: "Fees" },
  { prefix: "/reports",    label: "Reports" },
  { prefix: "/settings",   label: "Settings" },
  { prefix: "/help",       label: "Help" },
];

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const instituteName = useInstituteName();

  const pageLabel =
    PAGE_LABELS.find((e) => pathname === e.prefix || pathname.startsWith(e.prefix + "/"))?.label ??
    "Dashboard";

  async function handleLogout() {
    setShowDropdown(false);
    try {
      await logout();
    } catch {
      // ignored
    }
    clearAuth();
    toast.success("Signed out");
    router.replace("/login");
  }

  const initials = user
    ? `${user.firstName[0]}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "?";

  const displayName = user?.fullName ?? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();

  return (
    <header className="relative flex items-center justify-between h-14 px-5 border-b border-gray-200 bg-white shrink-0">
      {/* Left: hamburger (mobile) + page label */}
      <div className="flex items-center gap-2">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="md:hidden size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
        >
          <Menu className="size-4" />
        </button>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600">
          <LayoutDashboard className="size-3.5 text-gray-400" />
          <span className="hidden sm:inline">{pageLabel}</span>
        </div>
      </div>

      {/* Centre: institute name */}
      {instituteName && (
        <div className="absolute left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1">
          <MapPin className="size-3 text-emerald-500 shrink-0" />
          <span className="text-xs font-medium text-emerald-700">{instituteName}</span>
        </div>
      )}

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        <button className="size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors">
          <Search className="size-4" />
        </button>

        <button className="relative size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors">
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-red-500" />
        </button>

        <button className="size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors">
          <Bookmark className="size-4" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200 mx-1.5" />

        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors"
          >
            <div className="size-7 rounded-full bg-emerald-500 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
              {initials}
            </div>
            <ChevronDown
              className={`size-3.5 text-gray-400 transition-transform ${showDropdown ? "rotate-180" : ""}`}
            />
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-lg shadow-gray-200/70 border border-gray-100 py-1.5 z-20">
                <div className="px-3 py-2 border-b border-gray-100 mb-1">
                  <p className="text-xs font-medium text-gray-800">{displayName || "User"}</p>
                  <p className="text-[11px] text-gray-400 truncate">{user?.email ?? ""}</p>
                </div>
                <button
                  onClick={() => { setShowDropdown(false); router.push("/settings"); }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  <User className="size-3.5 text-gray-400" />
                  My Profile
                </button>
                <button
                  onClick={() => { setShowDropdown(false); router.push("/settings"); }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  <Settings className="size-3.5 text-gray-400" />
                  Settings
                </button>
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="size-3.5" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

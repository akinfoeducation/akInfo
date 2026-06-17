"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  GraduationCap, LayoutDashboard, BarChart2,
  BookOpen, Calendar, Menu, X,
  Bell, Search, ChevronDown, User, Settings, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth.store";
import { logout as apiLogout } from "@/lib/api/auth.api";
import { toast } from "sonner";

const NAV = [
  { href: "/portal/dashboard",    label: "Dashboard",  icon: LayoutDashboard },
  { href: "/portal/attendance",   label: "Attendance", icon: BarChart2 },
  { href: "/portal/my-materials", label: "Materials",  icon: BookOpen },
  { href: "/portal/my-schedule",  label: "Schedule",   icon: Calendar },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (user && !user.roles?.includes("STUDENT")) {
      router.replace("/");
    }
  }, [user, router]);

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "S"
    : "S";

  const displayName = user?.fullName ?? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();

  async function handleLogout() {
    setDropdownOpen(false);
    try { await apiLogout(); } catch { /* ignore */ }
    clearAuth();
    toast.success("Signed out");
    router.replace("/login");
  }

  const sidebar = (
    <aside className="flex flex-col w-60 shrink-0 h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
            <GraduationCap className="size-4 text-white" />
          </div>
          <p className="text-sm font-semibold text-gray-900">Student Portal</p>
        </div>
        <button className="md:hidden" onClick={() => setDrawerOpen(false)}>
          <X className="size-4 text-gray-400" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} onClick={() => setDrawerOpen(false)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all",
                active
                  ? "bg-emerald-50 text-emerald-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}>
              <Icon className={cn("size-4 shrink-0", active ? "text-emerald-600" : "text-gray-400")} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">{sidebar}</div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative flex">{sidebar}</div>
        </div>
      )}

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Top header — matches admin header style */}
        <header className="relative flex items-center justify-between h-14 px-5 border-b border-gray-200 bg-white shrink-0">
          {/* Left: hamburger (mobile) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500"
            >
              <Menu className="size-4" />
            </button>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600">
              <GraduationCap className="size-3.5 text-gray-400" />
              <span className="hidden sm:inline">Student Portal</span>
            </div>
          </div>

          {/* Right: icons + user dropdown */}
          <div className="flex items-center gap-1">
            <button className="size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors">
              <Search className="size-4" />
            </button>
            <button className="relative size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors">
              <Bell className="size-4" />
            </button>

            {/* Divider */}
            <div className="w-px h-5 bg-gray-200 mx-1.5" />

            {/* User dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(v => !v)}
                className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors"
              >
                <div className="size-7 rounded-full bg-emerald-500 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                  {initials}
                </div>
                <ChevronDown className={cn("size-3.5 text-gray-400 transition-transform", dropdownOpen && "rotate-180")} />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-lg shadow-gray-200/70 border border-gray-100 py-1.5 z-20">
                    {/* Name + email */}
                    <div className="px-3 py-2 border-b border-gray-100 mb-1">
                      <p className="text-xs font-medium text-gray-800">{displayName || "Student"}</p>
                      <p className="text-[11px] text-gray-400 truncate">{user?.email ?? ""}</p>
                    </div>

                    <button
                      onClick={() => { setDropdownOpen(false); router.push("/portal/settings"); }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      <User className="size-3.5 text-gray-400" />
                      My Profile
                    </button>
                    <button
                      onClick={() => { setDropdownOpen(false); router.push("/portal/settings"); }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                    >
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

        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

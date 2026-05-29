"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  LayoutDashboard,
  UserCheck,
  ClipboardList,
  Users,
  BookOpen,
  CreditCard,
  BarChart3,
  Settings,
  HelpCircle,
  Search,
  CalendarDays,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAIN_NAV = [
  { href: "/",           label: "Dashboard",  icon: LayoutDashboard, exact: true },
  { href: "/leads",      label: "Leads",      icon: UserCheck },
  { href: "/admissions", label: "Admissions", icon: ClipboardList },
  { href: "/students",   label: "Students",   icon: Users },
  { href: "/courses",    label: "Courses",    icon: BookOpen },
  { href: "/batches",    label: "Batches",    icon: CalendarDays },
  { href: "/fees",           label: "Fees",           icon: CreditCard },
  { href: "/notifications",  label: "Notifications",  icon: Bell },
  { href: "/reports",        label: "Reports",        icon: BarChart3 },
];

const BOTTOM_NAV = [
  { href: "/settings", label: "Settings",    icon: Settings },
  { href: "/help",     label: "Help Center", icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact = false) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="flex flex-col w-60 shrink-0 h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-100">
        <div className="size-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
          <GraduationCap className="size-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-gray-900">AKT Institute</span>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 cursor-text">
          <Search className="size-3.5 text-gray-400 shrink-0" />
          <span className="text-xs text-gray-400 flex-1">Search...</span>
          <kbd className="text-[10px] text-gray-400">⌘K</kbd>
        </div>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-2">
          Menu
        </p>
        <div className="space-y-0.5">
          {MAIN_NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150",
                  active
                    ? "bg-emerald-50 text-emerald-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className={cn("size-4 shrink-0", active ? "text-emerald-600" : "text-gray-400")} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Settings & Help */}
      <div className="px-3 py-3 border-t border-gray-100 space-y-0.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 mb-2">
          Settings &amp; Help
        </p>
        {BOTTOM_NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-150"
          >
            <Icon className="size-4 shrink-0 text-gray-400" />
            {label}
          </Link>
        ))}
      </div>
    </aside>
  );
}

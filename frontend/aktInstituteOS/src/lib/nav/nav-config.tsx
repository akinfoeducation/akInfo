import {
  LayoutDashboard,
  UserCheck,
  ClipboardList,
  Users,
  BookOpen,
  CreditCard,
  BadgeCheck,
  BarChart3,
  Receipt,
  Wallet,
  AlertCircle,
  Settings,
  HelpCircle,
  CalendarDays,
  Bell,
  UserCog,
  Shield,
  Building2,
  Layers,
  ScrollText,
  Calendar,
  Video,
  FileText,
  Contact,
  PhoneMissed,
  TrendingUp,
  DoorOpen,
} from "lucide-react";

export type NavIcon = React.ComponentType<{ className?: string }>;

export interface NavChild {
  href: string;
  label: string;
  icon: NavIcon;
  permission?: string;
}

export interface NavItem {
  href: string;
  label: string;
  icon: NavIcon;
  exact?: boolean;
  permission?: string;
  badge?: number;
  children?: NavChild[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "CRM",
    items: [
      {
        href: "/leads",
        label: "Leads",
        icon: UserCheck,
        permission: "LEAD_VIEW",
        children: [
          { href: "/leads/retry-pool",    label: "Retry Pool",     icon: PhoneMissed, permission: "LEAD_VIEW" },
          { href: "/leads/visit-planned", label: "Visit Planned",  icon: Calendar,    permission: "LEAD_VIEW" },
          { href: "/leads/walk-ins",      label: "Walk-in Leads",  icon: DoorOpen,    permission: "COUNSELLOR_ASSIGN" },
        ],
      },
      { href: "/caller-performance", label: "Caller Performance", icon: TrendingUp, permission: "LEAD_ASSIGN" },
      { href: "/admissions", label: "Admissions", icon: ClipboardList, permission: "ADMISSION_VIEW" },
      { href: "/students",   label: "Students",   icon: Users,          permission: "STUDENT_VIEW" },
    ],
  },
  {
    label: "Academic",
    items: [
      { href: "/courses",   label: "Courses",        icon: BookOpen,    permission: "COURSE_VIEW" },
      { href: "/batches",   label: "Batches",         icon: CalendarDays, permission: "BATCH_VIEW" },
      { href: "/faculty",   label: "Faculty",         icon: Contact,     permission: "FACULTY_PROFILE_VIEW" },
      { href: "/schedule",  label: "Timetable",       icon: Calendar,    permission: "TIMETABLE_VIEW" },
      { href: "/sessions",  label: "Class Sessions",  icon: Video,       permission: "CLASS_SESSION_VIEW" },
      { href: "/materials", label: "Study Materials", icon: FileText,    permission: "MATERIAL_VIEW" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/fees",         label: "Fee Collection",       icon: CreditCard, permission: "FEE_VIEW" },
      { href: "/payments",     label: "Payment Verification", icon: BadgeCheck, permission: "BOOKING_VERIFY" },
      { href: "/receipts",     label: "Receipts",             icon: Receipt,    permission: "FEE_VIEW" },
      { href: "/fees?tab=dues",label: "Pending Dues",         icon: AlertCircle, permission: "FEE_VIEW" },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/expenses",                    label: "Expenses",        icon: Wallet,    permission: "EXPENSE_VIEW" },
      { href: "/reports?tab=monthly-revenue", label: "Revenue",         icon: TrendingUp, permission: "REPORT_VIEW" },
      { href: "/reports",                     label: "Finance Reports", icon: BarChart3, permission: "REPORT_VIEW" },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/users",       label: "Users",       icon: UserCog,    permission: "USER_VIEW" },
      { href: "/roles",       label: "Roles",       icon: Shield,     permission: "ROLE_VIEW" },
      { href: "/branches",    label: "Branches",    icon: Building2,  permission: "BRANCH_VIEW" },
      { href: "/departments", label: "Departments", icon: Layers,     permission: "DEPT_VIEW" },
      { href: "/audit",       label: "Audit Logs",  icon: ScrollText, permission: "AUDIT_VIEW" },
    ],
  },
];

export const BOTTOM_NAV: NavItem[] = [
  { href: "/settings", label: "Settings",    icon: Settings,  permission: "SETTINGS_MANAGE" },
  { href: "/help",     label: "Help Center", icon: HelpCircle },
];

export interface FlatNavEntry {
  href: string;
  label: string;
  icon: NavIcon;
  permission?: string;
  /** Section the entry lives under, e.g. "CRM" — also used as a search keyword. */
  section: string;
}

/**
 * Every navigable destination (top-level items, their children, and the footer
 * items) as a flat list — used by the command palette to search across pages.
 */
export function flattenNav(): FlatNavEntry[] {
  const out: FlatNavEntry[] = [];
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      out.push({ href: item.href, label: item.label, icon: item.icon, permission: item.permission, section: section.label });
      for (const child of item.children ?? []) {
        out.push({ href: child.href, label: child.label, icon: child.icon, permission: child.permission, section: item.label });
      }
    }
  }
  for (const item of BOTTOM_NAV) {
    out.push({ href: item.href, label: item.label, icon: item.icon, permission: item.permission, section: "Settings" });
  }
  return out;
}

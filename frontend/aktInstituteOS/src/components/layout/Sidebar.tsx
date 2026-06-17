"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  X,
  Search,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useCommandPalette } from "@/components/command/command-palette";
import { NAV_SECTIONS, BOTTOM_NAV, type NavItem, type NavChild } from "@/lib/nav/nav-config";

// Roles seeing more than this many top-level items get accordion sections.
// Lighter roles (Caller, Faculty, …) render flat — there's nothing worth hiding.
const ACCORDION_THRESHOLD = 8;

const STORAGE_COLLAPSED = "sidebar.collapsed";

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { has } = usePermissions();
  const { open: openCommand } = useCommandPalette();

  const [collapsed, setCollapsed] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const skipFirstPersist = useRef(true);

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    // /leads should not highlight when on /leads/retry-pool etc.
    if (href === "/leads") return pathname === "/leads" || (
      pathname.startsWith("/leads/") &&
      !pathname.startsWith("/leads/retry-pool") &&
      !pathname.startsWith("/leads/visit-planned") &&
      !pathname.startsWith("/leads/walk-ins")
    );
    return pathname === href || pathname.startsWith(href + "/");
  }

  function childActive(child: NavChild) {
    return pathname === child.href || pathname.startsWith(child.href + "/");
  }

  function isVisible(item: NavItem | NavChild) {
    return !item.permission || has(item.permission);
  }

  // Permission-filtered sections (drop empty ones entirely).
  const visibleSections = NAV_SECTIONS
    .map(section => ({ ...section, items: section.items.filter(isVisible) }))
    .filter(section => section.items.length > 0);

  const totalVisible = visibleSections.reduce((n, s) => n + s.items.length, 0);
  const flat = totalVisible <= ACCORDION_THRESHOLD;

  // Hydrate collapsed state from storage after mount (avoids SSR mismatch).
  useEffect(() => {
    try {
      const c = localStorage.getItem(STORAGE_COLLAPSED);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
      if (c !== null) setCollapsed(c === "true");
    } catch { /* localStorage unavailable */ }
  }, []);

  // Persist on change, skipping the initial mount so we never clobber storage
  // with the default before hydration has had a chance to read it.
  useEffect(() => {
    if (skipFirstPersist.current) { skipFirstPersist.current = false; return; }
    try { localStorage.setItem(STORAGE_COLLAPSED, String(collapsed)); } catch { /* ignore */ }
  }, [collapsed]);

  // The section containing the active route opens on load / navigation; manual
  // toggles override it until the next navigation.
  useEffect(() => {
    const active = visibleSections.find(s =>
      s.items.some(it => isActive(it.href, it.exact) || (it.children?.some(childActive) ?? false)),
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync open section to route
    if (active) setOpenSection(active.label);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // "[" toggles collapse (ignored while typing).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      setCollapsed(c => !c);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggleSection(label: string) {
    setOpenSection(prev => (prev === label ? null : label));
  }

  // ── Expanded item ────────────────────────────────────────────────────────
  function renderExpandedItem(item: NavItem) {
    const { href, label, icon: Icon, exact, children, badge } = item;
    const visibleChildren = children?.filter(isVisible) ?? [];
    const anyChildActive = visibleChildren.some(childActive);
    const highlight = isActive(href, exact) || anyChildActive;

    return (
      <div key={href}>
        <Link
          href={href}
          onClick={onClose}
          className={cn(
            "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150",
            highlight
              ? "bg-emerald-50 font-medium text-emerald-700"
              : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900",
          )}
        >
          {highlight && (
            <span className="absolute -left-2.5 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-emerald-600" />
          )}
          <Icon className={cn("size-4 shrink-0", highlight ? "text-emerald-600" : "text-gray-400 group-hover:text-gray-500")} />
          <span className="truncate">{label}</span>
          {badge ? (
            <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-gray-200 px-1.5 text-[10px] font-semibold text-gray-600">
              {badge}
            </span>
          ) : null}
        </Link>

        {visibleChildren.length > 0 && (
          <div className="mt-0.5 ml-3 space-y-0.5 border-l border-gray-200/70 pl-3">
            {visibleChildren.map(child => {
              const ChildIcon = child.icon;
              const active = childActive(child);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-all duration-150",
                    active
                      ? "bg-emerald-50 font-medium text-emerald-700"
                      : "text-gray-500 hover:bg-gray-100/80 hover:text-gray-800",
                  )}
                >
                  <ChildIcon className={cn("size-3.5 shrink-0", active ? "text-emerald-600" : "text-gray-400")} />
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Collapsed item (icon + hover flyout) ──────────────────────────────────
  function renderCollapsedItem(item: NavItem) {
    const { href, label, icon: Icon, exact, children, badge } = item;
    const visibleChildren = children?.filter(isVisible) ?? [];
    const anyChildActive = visibleChildren.some(childActive);
    const highlight = isActive(href, exact) || anyChildActive;

    return (
      <div key={href} className="group/fly relative flex justify-center">
        <Link
          href={href}
          onClick={onClose}
          aria-label={label}
          className={cn(
            "relative flex size-10 items-center justify-center rounded-lg transition-all duration-150",
            highlight ? "bg-emerald-50 text-emerald-600" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600",
          )}
        >
          {highlight && (
            <span className="absolute -left-2.5 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-emerald-600" />
          )}
          <Icon className="size-[18px]" />
          {badge ? (
            <span className="absolute right-1 top-1 size-2 rounded-full bg-red-500 ring-2 ring-[#FAFBFC]" />
          ) : null}
        </Link>

        {/* Flyout: label (+ children) on hover */}
        <div className="pointer-events-none invisible absolute left-full top-0 z-50 ml-2 opacity-0 transition-opacity duration-100 group-hover/fly:visible group-hover/fly:pointer-events-auto group-hover/fly:opacity-100">
          <div className="min-w-[184px] rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg shadow-gray-200/60">
            <Link
              href={href}
              onClick={onClose}
              className={cn(
                "block rounded-lg px-3 py-1.5 text-sm font-medium",
                highlight ? "text-emerald-700" : "text-gray-800 hover:bg-gray-50",
              )}
            >
              {label}
            </Link>
            {visibleChildren.length > 0 && (
              <div className="mt-1 border-t border-gray-100 pt-1">
                {visibleChildren.map(child => {
                  const active = childActive(child);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onClose}
                      className={cn(
                        "block rounded-lg px-3 py-1.5 text-sm",
                        active ? "font-medium text-emerald-700" : "text-gray-600 hover:bg-gray-50",
                      )}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Footer item ───────────────────────────────────────────────────────────
  function renderFooterItem({ href, label, icon: Icon }: NavItem, collapsedMode: boolean) {
    const active = isActive(href);
    if (collapsedMode) {
      return (
        <div key={href} className="group/fly relative flex justify-center">
          <Link
            href={href}
            onClick={onClose}
            aria-label={label}
            className={cn(
              "flex size-10 items-center justify-center rounded-lg transition-all duration-150",
              active ? "bg-emerald-50 text-emerald-600" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600",
            )}
          >
            <Icon className="size-[18px]" />
          </Link>
          <div className="pointer-events-none invisible absolute bottom-0 left-full z-50 ml-2 opacity-0 transition-opacity duration-100 group-hover/fly:visible group-hover/fly:opacity-100">
            <div className="whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-lg shadow-gray-200/60">
              {label}
            </div>
          </div>
        </div>
      );
    }
    return (
      <Link
        key={href}
        href={href}
        onClick={onClose}
        className={cn(
          "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150",
          active ? "bg-emerald-50 font-medium text-emerald-700" : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900",
        )}
      >
        <Icon className={cn("size-4 shrink-0", active ? "text-emerald-600" : "text-gray-400 group-hover:text-gray-500")} />
        {label}
      </Link>
    );
  }

  // ── Sidebar shell ─────────────────────────────────────────────────────────
  function renderContent(collapsedMode: boolean, mobile: boolean) {
    return (
      <aside
        className={cn(
          "flex h-full shrink-0 flex-col border-r border-gray-200 bg-[#FAFBFC] transition-[width] duration-200 ease-out",
          collapsedMode ? "w-[72px]" : "w-[264px]",
        )}
      >
        {/* Header / brand */}
        <div
          className={cn(
            "flex items-center border-b border-gray-100",
            collapsedMode ? "flex-col gap-2 px-2 py-4" : "justify-between px-4 py-4",
          )}
        >
          {collapsedMode ? (
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500">
              <GraduationCap className="size-[18px] text-white" />
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500">
                <GraduationCap className="size-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-900">AKT Institute</span>
            </div>
          )}

          {!mobile && (
            <button
              onClick={() => setCollapsed(c => !c)}
              aria-label={collapsedMode ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsedMode ? "Expand ([)" : "Collapse ([)"}
              className="flex size-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              {collapsedMode ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </button>
          )}
          {mobile && onClose && (
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="flex size-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className={cn(collapsedMode ? "flex justify-center px-2 pt-3 pb-1" : "px-3 pt-3 pb-1")}>
          {collapsedMode ? (
            <div className="group/fly relative flex justify-center">
              <button
                aria-label="Search"
                onClick={openCommand}
                className="flex size-10 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <Search className="size-[18px]" />
              </button>
              <div className="pointer-events-none invisible absolute left-full top-0 z-50 ml-2 opacity-0 transition-opacity duration-100 group-hover/fly:visible group-hover/fly:opacity-100">
                <div className="whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-lg shadow-gray-200/60">
                  Search <span className="ml-1 text-gray-400">⌘K</span>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={openCommand}
              className="flex w-full items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-left transition-colors hover:bg-gray-200/70"
            >
              <Search className="size-3.5 shrink-0 text-gray-400" />
              <span className="flex-1 text-xs text-gray-400">Search...</span>
              <kbd className="hidden text-[10px] text-gray-400 md:block">⌘K</kbd>
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 overflow-y-auto py-3", collapsedMode ? "px-2 space-y-1" : "px-2.5 space-y-2")}>
          {visibleSections.map((section, idx) => {
            if (collapsedMode) {
              return (
                <div key={section.label}>
                  {idx > 0 && <div className="mx-2 my-2 border-t border-gray-200/70" />}
                  <div className="space-y-1">
                    {section.items.map(renderCollapsedItem)}
                  </div>
                </div>
              );
            }

            const alwaysOpen = section.label === "Overview" || flat;
            const sectionOpen = alwaysOpen || openSection === section.label;
            const collapsible = !alwaysOpen;

            return (
              <div key={section.label}>
                {collapsible ? (
                  <button
                    onClick={() => toggleSection(section.label)}
                    aria-expanded={sectionOpen}
                    className="group mb-0.5 flex w-full items-center justify-between rounded-md px-3 py-1.5"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 group-hover:text-gray-500">
                      {section.label}
                    </span>
                    <ChevronRight
                      className={cn("size-3 text-gray-400 transition-transform duration-200", sectionOpen && "rotate-90")}
                    />
                  </button>
                ) : (
                  <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    {section.label}
                  </p>
                )}

                {sectionOpen && (
                  <div className="space-y-0.5">
                    {section.items.map(renderExpandedItem)}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={cn("border-t border-gray-100 py-3", collapsedMode ? "px-2 space-y-1" : "px-2.5 space-y-0.5")}>
          {BOTTOM_NAV.filter(isVisible).map(item => renderFooterItem(item, collapsedMode))}
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* Desktop — collapsible */}
      <div className="hidden md:flex">{renderContent(collapsed, false)}</div>

      {/* Mobile — slide-in drawer, always expanded */}
      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <div className="relative flex animate-in slide-in-from-left duration-200">{renderContent(false, true)}</div>
        </div>
      )}
    </>
  );
}

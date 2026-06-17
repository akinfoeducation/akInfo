"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, CornerDownLeft, ArrowUp, ArrowDown, UserCheck, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { flattenNav, type NavIcon } from "@/lib/nav/nav-config";
import { listLeads } from "@/lib/api/leads.api";
import { searchStudents } from "@/lib/api/students.api";

interface CommandPaletteContextValue {
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  return ctx;
}

type Cmd =
  | { kind: "page"; key: string; label: string; sublabel: string; href: string; icon: NavIcon }
  | { kind: "lead"; key: string; label: string; sublabel: string; href: string; icon: NavIcon }
  | { kind: "student"; key: string; label: string; sublabel: string; href: string; icon: NavIcon };

const MIN_ENTITY_QUERY = 2;

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const value = useMemo<CommandPaletteContextValue>(
    () => ({
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen(o => !o),
    }),
    [],
  );

  // ⌘K / Ctrl+K toggles the palette from anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen(o => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      {isOpen && <CommandPalette onClose={value.close} />}
    </CommandPaletteContext.Provider>
  );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { has } = usePermissions();
  const inputRef = useRef<HTMLInputElement>(null);

  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [active, setActive] = useState(0);

  // Debounce the query that hits the network; page filtering stays instant.
  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 220);
    return () => clearTimeout(t);
  }, [q]);

  // Autofocus the input on open; lock body scroll while open.
  useEffect(() => {
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Esc closes from anywhere, not just while the input is focused.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canLeads = has("LEAD_VIEW");
  const canStudents = has("STUDENT_VIEW");

  const { data: entities, isFetching } = useQuery({
    queryKey: ["command-search", dq, canLeads, canStudents],
    enabled: dq.length >= MIN_ENTITY_QUERY && (canLeads || canStudents),
    staleTime: 30_000,
    queryFn: async () => {
      const [leadsRes, studentsRes] = await Promise.all([
        canLeads ? listLeads({ q: dq, size: 5 }) : Promise.resolve(null),
        canStudents ? searchStudents({ q: dq, size: 5 }) : Promise.resolve(null),
      ]);
      return {
        leads: leadsRes?.data ?? [],
        students: studentsRes?.data ?? [],
      };
    },
  });

  // ── Build grouped results ──────────────────────────────────────────────────
  const pages = useMemo<Cmd[]>(() => {
    const query = q.trim().toLowerCase();
    const all = flattenNav().filter(e => !e.permission || has(e.permission));
    const matched = query
      ? all.filter(e => e.label.toLowerCase().includes(query) || e.section.toLowerCase().includes(query))
      : all;
    return matched.slice(0, 8).map(e => ({
      kind: "page" as const,
      key: `page:${e.href}`,
      label: e.label,
      sublabel: e.section,
      href: e.href,
      icon: e.icon,
    }));
  }, [q, has]);

  const leadCmds = useMemo<Cmd[]>(
    () =>
      (entities?.leads ?? []).map(l => ({
        kind: "lead" as const,
        key: `lead:${l.id}`,
        label: l.fullName,
        sublabel: [l.phone, l.status].filter(Boolean).join(" · "),
        href: `/leads/${l.id}`,
        icon: UserCheck,
      })),
    [entities],
  );

  const studentCmds = useMemo<Cmd[]>(
    () =>
      (entities?.students ?? []).map(s => ({
        kind: "student" as const,
        key: `student:${s.id}`,
        label: s.fullName,
        sublabel: [s.phone, s.status].filter(Boolean).join(" · "),
        href: `/students/${s.id}`,
        icon: Users,
      })),
    [entities],
  );

  const groups = useMemo(
    () =>
      [
        { title: "Pages", items: pages },
        { title: "Leads", items: leadCmds },
        { title: "Students", items: studentCmds },
      ].filter(g => g.items.length > 0),
    [pages, leadCmds, studentCmds],
  );

  const flat = useMemo(() => groups.flatMap(g => g.items), [groups]);

  // Clamp instead of resetting via an effect — keeps the highlight valid as
  // async results arrive without triggering an extra render pass.
  const activeIndex = flat.length ? Math.min(active, flat.length - 1) : 0;

  const run = useCallback(
    (cmd: Cmd | undefined) => {
      if (!cmd) return;
      onClose();
      setQ("");
      router.push(cmd.href);
    },
    [onClose, router],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(flat.length - 1, activeIndex + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(0, activeIndex - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(flat[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  const showEntityHint = dq.length > 0 && dq.length < MIN_ENTITY_QUERY && (canLeads || canStudents);
  let runningIndex = -1;

  return (
    <div className="fixed inset-0 z-[60] flex justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true">
      <button aria-label="Close search" className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-900/10 animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-4">
          <Search className="size-4 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => { setQ(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search pages, leads, students…"
            className="flex-1 bg-transparent py-4 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />
          {isFetching && <Loader2 className="size-4 shrink-0 animate-spin text-gray-300" />}
          <kbd className="hidden rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-400 sm:block">esc</kbd>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto py-2">
          {groups.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-400">
              {showEntityHint
                ? "Keep typing to search leads & students…"
                : dq.length >= MIN_ENTITY_QUERY && isFetching
                  ? "Searching…"
                  : "No results found."}
            </div>
          ) : (
            groups.map(group => (
              <div key={group.title} className="mb-1">
                <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {group.title}
                </p>
                {group.items.map(cmd => {
                  runningIndex += 1;
                  const idx = runningIndex;
                  const isActive = idx === activeIndex;
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={cmd.key}
                      onClick={() => run(cmd)}
                      onMouseMove={() => setActive(idx)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors",
                        isActive ? "bg-emerald-50 text-emerald-700" : "text-gray-700 hover:bg-gray-50",
                      )}
                    >
                      <Icon className={cn("size-4 shrink-0", isActive ? "text-emerald-600" : "text-gray-400")} />
                      <span className="truncate font-medium">{cmd.label}</span>
                      {cmd.sublabel && (
                        <span className="ml-auto truncate pl-3 text-xs text-gray-400">{cmd.sublabel}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 border-t border-gray-100 px-4 py-2 text-[11px] text-gray-400">
          <span className="flex items-center gap-1"><ArrowUp className="size-3" /><ArrowDown className="size-3" /> navigate</span>
          <span className="flex items-center gap-1"><CornerDownLeft className="size-3" /> open</span>
          <span className="ml-auto">esc to close</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { listCourses } from "@/lib/api/courses.api";

/**
 * Searchable, dropdown-only course picker populated from active courses in the
 * Course Management module. A value is only committed by selecting from the list —
 * typing alone filters but never sets a free-text value.
 */
export function CourseCombobox({ value, onChange, placeholder = "Search course…" }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const { data } = useQuery({
    queryKey: ["courses", "ACTIVE"],
    queryFn: () => listCourses("ACTIVE"),
    staleTime: 60_000,
  });
  const courses = useMemo(() => data?.data ?? [], [data]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = useMemo(
    () => courses.filter(c => c.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 50),
    [courses, query],
  );

  function select(name: string) { onChange(name); setQuery(name); setOpen(false); }
  function clear() { onChange(""); setQuery(""); setOpen(true); }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          className="pl-8 pr-7"
          placeholder={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => { closeTimer.current = setTimeout(() => setOpen(false), 150); }}
        />
        {query && (
          <button type="button" onMouseDown={e => { e.preventDefault(); clear(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="size-3.5" />
          </button>
        )}
      </div>
      {open && (
        <div
          className="absolute z-50 mt-1 w-full max-h-52 overflow-auto rounded-lg border bg-popover shadow-md text-sm"
          onMouseEnter={() => { if (closeTimer.current) clearTimeout(closeTimer.current); }}
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-muted-foreground">No matching course</div>
          ) : filtered.map(c => (
            <button
              key={c.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); select(c.name); }}
              className={`block w-full text-left px-3 py-1.5 hover:bg-accent ${c.name === value ? "bg-accent/60 font-medium" : ""}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

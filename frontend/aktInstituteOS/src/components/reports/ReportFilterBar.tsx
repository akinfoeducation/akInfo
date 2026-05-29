"use client";

import { useState, useEffect } from "react";
import { format, startOfWeek, subDays, startOfMonth, subMonths } from "date-fns";
import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { DatePreset, DateRange } from "@/types/report";

// ── Preset helpers ────────────────────────────────────────────────────────

const PRESETS: Array<{ key: DatePreset; label: string }> = [
  { key: "today",      label: "Today"      },
  { key: "yesterday",  label: "Yesterday"  },
  { key: "this_week",  label: "This Week"  },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "custom",     label: "Custom"     },
];

function presetRange(key: DatePreset): DateRange {
  const today = new Date();
  const fmt   = (d: Date) => format(d, "yyyy-MM-dd");
  switch (key) {
    case "today":
      return { from: fmt(today), to: fmt(today) };
    case "yesterday": {
      const y = subDays(today, 1);
      return { from: fmt(y), to: fmt(y) };
    }
    case "this_week":
      return { from: fmt(startOfWeek(today, { weekStartsOn: 1 })), to: fmt(today) };
    case "this_month":
      return { from: fmt(startOfMonth(today)), to: fmt(today) };
    case "last_month": {
      const lm = subMonths(today, 1);
      return {
        from: fmt(startOfMonth(lm)),
        to:   fmt(new Date(lm.getFullYear(), lm.getMonth() + 1, 0)),
      };
    }
    default:
      return { from: fmt(startOfMonth(today)), to: fmt(today) };
  }
}

// ── Month selector ────────────────────────────────────────────────────────

function buildMonthOptions() {
  const opts: Array<{ label: string; value: string }> = [];
  for (let i = 0; i < 18; i++) {
    const d = subMonths(new Date(), i);
    opts.push({
      label: format(d, "MMM yyyy"),
      value: `${format(d, "yyyy-MM")}-01`,
    });
  }
  return opts;
}

const MONTH_OPTIONS = buildMonthOptions();

// ── Props ─────────────────────────────────────────────────────────────────

export interface ExtraFilter {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}

interface Props {
  onChange: (range: DateRange) => void;
  extraFilters?: ExtraFilter[];
  onExtraFilterChange?: (key: string, value: string) => void;
  extraFilterValues?: Record<string, string>;
}

export function ReportFilterBar({
  onChange,
  extraFilters = [],
  onExtraFilterChange,
  extraFilterValues = {},
}: Props) {
  const [preset, setPreset]   = useState<DatePreset>("this_month");
  const [customFrom, setCFrom] = useState("");
  const [customTo,   setCTo]   = useState("");

  // Emit range whenever preset/custom changes
  useEffect(() => {
    if (preset === "custom") {
      if (customFrom && customTo) onChange({ from: customFrom, to: customTo });
    } else {
      onChange(presetRange(preset));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, customFrom, customTo]);

  function handleMonthSelect(val: string | null) {
    if (!val) return;
    // val = "2026-05-01"
    const d = new Date(val);
    const from = format(d, "yyyy-MM-dd");
    const to   = format(new Date(d.getFullYear(), d.getMonth() + 1, 0), "yyyy-MM-dd");
    setPreset("custom");
    setCFrom(from);
    setCTo(to);
  }

  return (
    <div className="flex flex-wrap gap-3 items-end bg-white rounded-xl border border-gray-200 p-4">

      {/* Date presets */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          <CalendarDays className="size-3" /> Date Range
        </Label>
        <div className="flex gap-1">
          {PRESETS.map(pr => (
            <button
              key={pr.key}
              onClick={() => setPreset(pr.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                preset === pr.key
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {pr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Month quick-jump */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Month</Label>
        <Select onValueChange={handleMonthSelect}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue placeholder="Jump to…" />
          </SelectTrigger>
          <SelectContent>
            {MONTH_OPTIONS.map(m => (
              <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom date inputs */}
      {preset === "custom" && (
        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input type="date" className="w-36 h-8 text-xs" value={customFrom}
              onChange={e => setCFrom(e.target.value)} />
          </div>
          <span className="text-muted-foreground text-sm pb-1.5">–</span>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input type="date" className="w-36 h-8 text-xs" value={customTo}
              onChange={e => setCTo(e.target.value)} />
          </div>
        </div>
      )}

      {/* Extra report-specific filters */}
      {extraFilters.map(f => (
        <div key={f.key} className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{f.label}</Label>
          <Select
            value={extraFilterValues[f.key] || "__all"}
            onValueChange={v => onExtraFilterChange?.(f.key, (!v || v === "__all") ? "" : v)}
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All</SelectItem>
              {f.options.map(o => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}

      {/* Clear extra filters */}
      {Object.values(extraFilterValues).some(Boolean) && (
        <Button variant="ghost" size="sm" className="mb-0 self-end text-xs h-8"
          onClick={() => extraFilters.forEach(f => onExtraFilterChange?.(f.key, ""))}>
          <X className="size-3 mr-1" /> Clear filters
        </Button>
      )}
    </div>
  );
}

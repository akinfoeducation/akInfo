"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Shield, ChevronDown, ChevronRight, Filter } from "lucide-react";

import { listAuditLogs, type AuditLogEntry } from "@/lib/api/audit.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const ACTION_COLORS: Record<string, string> = {
  USER_CREATED:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  USER_UPDATED:   "bg-blue-50 text-blue-700 border-blue-200",
  USER_DELETED:   "bg-red-50 text-red-700 border-red-200",
  USER_ACTIVATED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  USER_DEACTIVATED: "bg-orange-50 text-orange-700 border-orange-200",
  ROLE_ASSIGNED:  "bg-violet-50 text-violet-700 border-violet-200",
  LOGIN_SUCCESS:  "bg-gray-50 text-gray-600 border-gray-200",
  LOGIN_FAILED:   "bg-red-50 text-red-700 border-red-200",
  PASSWORD_RESET: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

const ENTITY_TYPES = ["USER", "ROLE", "BRANCH", "DEPARTMENT", "STUDENT", "ADMISSION", "LEAD", "FEE"];
const ACTIONS = [
  "USER_CREATED", "USER_UPDATED", "USER_DELETED", "USER_ACTIVATED", "USER_DEACTIVATED",
  "ROLE_ASSIGNED", "LOGIN_SUCCESS", "LOGIN_FAILED", "PASSWORD_RESET",
];

export default function AuditPage() {
  const [action, setAction]         = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom]             = useState("");
  const [to, setTo]                 = useState("");
  const [page, setPage]             = useState(0);
  const [expanded, setExpanded]     = useState<Set<number>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["audit", action, entityType, from, to, page],
    queryFn: () => listAuditLogs({
      action: action || undefined,
      entityType: entityType || undefined,
      from: from || undefined,
      to: to || undefined,
      page,
      size: 50,
    }),
    placeholderData: (prev) => prev,
  });

  const logs  = data?.data ?? [];
  const meta  = data?.meta;

  function toggleExpand(id: number) {
    setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function reset() {
    setAction(""); setEntityType(""); setFrom(""); setTo(""); setPage(0);
  }

  const hasFilters = !!(action || entityType || from || to);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Immutable record of all critical operations</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Shield className="size-4" />
          {meta ? `${meta.total.toLocaleString()} events` : ""}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium mr-1">
            <Filter className="size-3.5" /> Filters
          </div>

          <Select value={action || "all"} onValueChange={(v) => { setAction(v === "all" ? "" : (v ?? "")); setPage(0); }}>
            <SelectTrigger className="w-44 h-8 text-xs">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={entityType || "all"} onValueChange={(v) => { setEntityType(v === "all" ? "" : (v ?? "")); setPage(0); }}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {ENTITY_TYPES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">From</span>
            <Input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(0); }}
              className="h-8 w-36 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">To</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPage(0); }}
              className="h-8 w-36 text-xs"
            />
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-400" onClick={reset}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Log list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="px-5 py-3 flex gap-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No audit logs found</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <AuditRow key={log.id} log={log} expanded={expanded.has(log.id)} onToggle={() => toggleExpand(log.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {meta.page + 1} of {meta.totalPages} ({meta.total.toLocaleString()} total)</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!meta.hasPrevious} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={!meta.hasNext} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditRow({ log, expanded, onToggle }: {
  log: AuditLogEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasDetails = !!(log.oldValues || log.newValues);
  const colorClass = ACTION_COLORS[log.action] ?? "bg-gray-50 text-gray-600 border-gray-200";

  return (
    <div>
      <div
        className={`px-5 py-3 flex items-center gap-4 text-sm hover:bg-gray-50 transition-colors ${hasDetails ? "cursor-pointer" : ""}`}
        onClick={hasDetails ? onToggle : undefined}
      >
        {hasDetails ? (
          <span className="text-gray-300 shrink-0">
            {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </span>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        <span className="text-xs text-gray-400 w-36 shrink-0 tabular-nums">
          {format(new Date(log.createdAt), "dd MMM yy HH:mm:ss")}
        </span>

        <Badge variant="outline" className={`text-xs shrink-0 ${colorClass}`}>
          {log.action}
        </Badge>

        <span className="text-xs text-gray-500 w-24 shrink-0 font-mono">
          {log.entityType}{log.entityId ? ` #${log.entityId}` : ""}
        </span>

        <span className="text-xs text-gray-700 flex-1 truncate">
          {log.userDisplayName || <span className="text-gray-300">System</span>}
        </span>

        {log.ipAddress && (
          <span className="text-xs text-gray-300 font-mono shrink-0">{log.ipAddress}</span>
        )}
      </div>

      {expanded && hasDetails && (
        <div className="px-12 pb-4 grid grid-cols-2 gap-4">
          {log.oldValues && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-1.5">Before</p>
              <pre className="text-xs bg-red-50 text-red-900 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all border border-red-100">
                {formatJson(log.oldValues)}
              </pre>
            </div>
          )}
          {log.newValues && (
            <div>
              <p className="text-xs font-medium text-gray-400 mb-1.5">After</p>
              <pre className="text-xs bg-emerald-50 text-emerald-900 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all border border-emerald-100">
                {formatJson(log.newValues)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatJson(raw: string): string {
  try { return JSON.stringify(JSON.parse(raw), null, 2); }
  catch { return raw; }
}

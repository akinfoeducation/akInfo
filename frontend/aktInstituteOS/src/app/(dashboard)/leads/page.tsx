"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { listLeads } from "@/lib/api/leads.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import { LeadSourceBadge } from "@/components/leads/LeadSourceBadge";
import type { LeadStatus, LeadSource } from "@/types/lead";
import { format } from "date-fns";

const STATUS_OPTIONS: Array<{ value: LeadStatus | ""; label: string }> = [
  { value: "", label: "All Statuses" },
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "FOLLOW_UP", label: "Follow Up" },
  { value: "DEMO_SCHEDULED", label: "Demo Scheduled" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "CONVERTED", label: "Converted" },
  { value: "LOST", label: "Lost" },
];

const SOURCE_OPTIONS: Array<{ value: LeadSource | ""; label: string }> = [
  { value: "", label: "All Sources" },
  { value: "WALK_IN", label: "Walk In" },
  { value: "REFERRAL", label: "Referral" },
  { value: "SOCIAL_MEDIA", label: "Social Media" },
  { value: "WEBSITE", label: "Website" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "OTHER", label: "Other" },
];

export default function LeadsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<LeadStatus | "">("");
  const [source, setSource] = useState<LeadSource | "">("");
  const [page, setPage] = useState(0);
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["leads", debouncedQuery, status, source, page],
    queryFn: () =>
      listLeads({
        q: debouncedQuery || undefined,
        status: status || undefined,
        source: source || undefined,
        page,
        size: 20,
      }),
    placeholderData: (prev) => prev,
  });

  const leads = data?.data ?? [];
  const meta = data?.meta;

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setPage(0);
  }

  function handleStatus(val: string | null) {
    setStatus((!val || val === "__all" ? "" : val) as LeadStatus | "");
    setPage(0);
  }

  function handleSource(val: string | null) {
    setSource((!val || val === "__all" ? "" : val) as LeadSource | "");
    setPage(0);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leads</h1>
          {meta && (
            <p className="text-sm text-muted-foreground mt-1">
              {meta.total} total leads
            </p>
          )}
        </div>
        <Link href="/leads/new">
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
            <Plus className="size-4" />
            Add Lead
          </Button>
        </Link>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email, course…"
            value={query}
            onChange={handleSearch}
            className="pl-9"
          />
        </div>
        <Select value={status || "__all"} onValueChange={handleStatus}>
          <SelectTrigger className="w-40">
            <Filter className="size-3.5 text-muted-foreground mr-1" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || "__all"} value={opt.value || "__all"}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={source || "__all"} onValueChange={handleSource}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || "__all"} value={opt.value || "__all"}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Course Interested</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Next Follow-up</TableHead>
              <TableHead>Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  {query || status || source ? "No leads match your filters." : "No leads yet. Add your first lead to get started."}
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id} className="cursor-pointer hover:bg-gray-50/80">
                  <TableCell>
                    <Link href={`/leads/${lead.id}`} className="block">
                      <span className="font-medium text-gray-900 hover:text-emerald-700">
                        {lead.fullName}
                      </span>
                      {lead.email && (
                        <p className="text-xs text-muted-foreground">{lead.email}</p>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{lead.phone}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lead.courseInterested ?? "—"}
                  </TableCell>
                  <TableCell>
                    <LeadSourceBadge source={lead.source} />
                  </TableCell>
                  <TableCell>
                    <LeadStatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lead.nextFollowUpAt
                      ? format(new Date(lead.nextFollowUpAt), "dd MMM, hh:mm a")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(lead.createdAt), "dd MMM yyyy")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {meta.page + 1} of {meta.totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!meta.hasPrevious || isFetching}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!meta.hasNext || isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

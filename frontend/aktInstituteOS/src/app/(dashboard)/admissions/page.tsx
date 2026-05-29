"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { listAdmissions } from "@/lib/api/admissions.api";
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
import { AdmissionStatusBadge } from "@/components/admissions/AdmissionStatusBadge";
import type { AdmissionStatus } from "@/types/admission";
import { format } from "date-fns";

const STATUS_OPTIONS: Array<{ value: AdmissionStatus | ""; label: string }> = [
  { value: "", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "DOCUMENTS_PENDING", label: "Docs Pending" },
  { value: "ENROLLED", label: "Enrolled" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export default function AdmissionsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AdmissionStatus | "">("");
  const [page, setPage] = useState(0);
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admissions", debouncedQuery, status, page],
    queryFn: () =>
      listAdmissions({
        q: debouncedQuery || undefined,
        status: status || undefined,
        page,
        size: 20,
      }),
    placeholderData: (prev) => prev,
  });

  const admissions = data?.data ?? [];
  const meta = data?.meta;

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setPage(0);
  }

  function handleStatus(val: string | null) {
    setStatus((!val || val === "__all" ? "" : val) as AdmissionStatus | "");
    setPage(0);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admissions</h1>
          {meta && (
            <p className="text-sm text-muted-foreground mt-1">
              {meta.total} total admissions
            </p>
          )}
        </div>
        <Link href="/admissions/new">
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
            <Plus className="size-4" />
            New Admission
          </Button>
        </Link>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, course, admission #…"
            value={query}
            onChange={handleSearch}
            className="pl-9"
          />
        </div>
        <Select value={status || "__all"} onValueChange={handleStatus}>
          <SelectTrigger className="w-44">
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
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Admission #</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Course / Batch</TableHead>
              <TableHead>Fees Agreed</TableHead>
              <TableHead>Fees Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Enrolled On</TableHead>
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
            ) : admissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                  {query || status
                    ? "No admissions match your filters."
                    : "No admissions yet. Convert a lead to create the first one."}
                </TableCell>
              </TableRow>
            ) : (
              admissions.map((adm) => (
                <TableRow key={adm.id} className="cursor-pointer hover:bg-gray-50/80">
                  <TableCell className="font-mono text-xs">
                    <Link href={`/admissions/${adm.id}`} className="block hover:text-emerald-700">
                      {adm.admissionNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admissions/${adm.id}`} className="block">
                      <span className="font-medium text-gray-900 hover:text-emerald-700">
                        {adm.fullName}
                      </span>
                      <p className="text-xs text-muted-foreground">{adm.phone}</p>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    <p>{adm.courseName ?? "—"}</p>
                    {adm.batchName && (
                      <p className="text-xs text-muted-foreground">{adm.batchName}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {formatCurrency(adm.feesAgreed)}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className={adm.feesDue > 0 ? "text-red-600 font-medium" : "text-emerald-600"}>
                      {formatCurrency(adm.feesDue)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <AdmissionStatusBadge status={adm.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {adm.enrollmentDate
                      ? format(new Date(adm.enrollmentDate), "dd MMM yyyy")
                      : "—"}
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

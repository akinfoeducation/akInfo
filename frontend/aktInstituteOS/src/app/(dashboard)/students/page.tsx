"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { listStudents, searchStudents } from "@/lib/api/students.api";
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
import { StudentStatusBadge } from "@/components/students/StudentStatusBadge";
import type { StudentStatus } from "@/types/student";
import { format } from "date-fns";

const STATUS_OPTIONS: Array<{ value: StudentStatus | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "GRADUATED", label: "Graduated" },
  { value: "DROPPED", label: "Dropped" },
];

export default function StudentsPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StudentStatus | "">("");
  const [page, setPage] = useState(0);
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["students", debouncedQuery, status, page],
    queryFn: () =>
      debouncedQuery
        ? searchStudents({ q: debouncedQuery, status: status || undefined, page, size: 20 })
        : listStudents({ q: "", status: status || undefined, page, size: 20 }),
    placeholderData: (prev) => prev,
  });

  const students = data?.data ?? [];
  const meta = data?.meta;

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setPage(0);
  }

  function handleStatus(val: StudentStatus | "" | null) {
    setStatus(val ?? "");
    setPage(0);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Students</h1>
          {meta && (
            <p className="text-sm text-muted-foreground mt-1">
              {meta.total} total students
            </p>
          )}
        </div>
        <Link href="/students/new">
          <Button>
            <Plus className="size-4" />
            Add Student
          </Button>
        </Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, email…"
            value={query}
            onChange={handleSearch}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={handleStatus}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value || "__all"} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student #</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  No students found.
                </TableCell>
              </TableRow>
            ) : (
              students.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-mono text-xs">
                    <Link href={`/students/${s.id}`} className="block">
                      {s.studentNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/students/${s.id}`} className="block font-medium hover:underline">
                      {s.fullName}
                    </Link>
                    {s.email && (
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{s.phone}</TableCell>
                  <TableCell className="text-sm">{s.city ?? "—"}</TableCell>
                  <TableCell>
                    <StudentStatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(s.createdAt), "dd MMM yyyy")}
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

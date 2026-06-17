"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Plus, Smartphone, Laptop, Monitor, Apple, Bot,
  BookOpen, Clock, IndianRupee, Layers
} from "lucide-react";
import { listCourses } from "@/lib/api/courses.api";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseStatusBadge } from "@/components/courses/CourseStatusBadge";
import type { CourseStatus, CourseSummary } from "@/types/course";

const STATUS_OPTIONS: Array<{ value: CourseStatus | ""; label: string }> = [
  { value: "",         label: "All" },
  { value: "ACTIVE",   label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ARCHIVED", label: "Archived" },
];

const COURSE_ICONS: Record<string, React.ElementType> = {
  MRC: Smartphone,
  LRC: Laptop,
  DRC: Monitor,
  IRC: Apple,
  ARC: Bot,
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(amount);
}

function CourseCard({ course }: { course: CourseSummary }) {
  const Icon = COURSE_ICONS[course.code] ?? BookOpen;
  return (
    <Link href={`/courses/${course.id}`}>
      <div className="bg-white border border-gray-200 rounded-xl p-5 hover:border-emerald-300 hover:shadow-sm transition-all group cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div className="size-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
            <Icon className="size-5 text-emerald-600" />
          </div>
          <CourseStatusBadge status={course.status} />
        </div>
        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 group-hover:text-emerald-700 transition-colors">
          {course.name}
        </h3>
        <p className="text-xs text-muted-foreground font-mono mb-4">{course.code}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {course.durationWeeks && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {course.durationWeeks}w
            </span>
          )}
          <span className="flex items-center gap-1">
            <IndianRupee className="size-3" />
            {formatCurrency(course.fees)}
          </span>
          <span className="flex items-center gap-1 ml-auto">
            <Layers className="size-3" />
            {course.batchCount} {course.batchCount === 1 ? "batch" : "batches"}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function CoursesPage() {
  const [status, setStatus] = useState<CourseStatus | "">("");
  const { has } = usePermissions();
  const canCreate = has("COURSE_CREATE");

  const { data, isLoading } = useQuery({
    queryKey: ["courses", status],
    queryFn: () => listCourses(status || undefined),
  });

  const courses = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Courses</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {courses.length} course{courses.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canCreate && (
          <Link href="/courses/new">
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
              <Plus className="size-4" />
              Add Course
            </Button>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Select value={status || "__all"} onValueChange={(v) => setStatus(v === "__all" ? "" : v as CourseStatus)}>
          <SelectTrigger className="w-36">
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

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          No courses found.{canCreate && (
            <> <Link href="/courses/new" className="text-emerald-600 hover:underline">Add your first course.</Link></>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}

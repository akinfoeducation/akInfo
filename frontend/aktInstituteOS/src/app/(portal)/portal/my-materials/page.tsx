"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, Download, ExternalLink, FileText, Link2, Video } from "lucide-react";
import { format } from "date-fns";
import { getPortalMaterials } from "@/lib/api/academic.api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { MaterialType } from "@/types/academic";

const TYPE_ICONS: Record<MaterialType, React.ReactNode> = {
  PDF:        <FileText className="size-4 text-red-500" />,
  NOTES:      <BookOpen className="size-4 text-blue-500" />,
  PPT:        <FileText className="size-4 text-orange-500" />,
  ASSIGNMENT: <FileText className="size-4 text-purple-500" />,
  LINK:       <Link2 className="size-4 text-emerald-500" />,
  VIDEO:      <Video className="size-4 text-pink-500" />,
};

const TYPE_COLORS: Record<MaterialType, string> = {
  PDF:        "bg-red-50 text-red-700 border-red-200",
  NOTES:      "bg-blue-50 text-blue-700 border-blue-200",
  PPT:        "bg-orange-50 text-orange-700 border-orange-200",
  ASSIGNMENT: "bg-purple-50 text-purple-700 border-purple-200",
  LINK:       "bg-emerald-50 text-emerald-700 border-emerald-200",
  VIDEO:      "bg-pink-50 text-pink-700 border-pink-200",
};

function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024*1024)  return `${(bytes/1024).toFixed(0)} KB`;
  return `${(bytes/1024/1024).toFixed(1)} MB`;
}

export default function PortalMaterialsPage() {
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["portal-materials"],
    queryFn: getPortalMaterials,
  });

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Study Materials</h1>
        <p className="text-sm text-gray-400 mt-0.5">Resources shared by your faculty</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : materials.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="size-10 mx-auto mb-3 text-gray-200" />
          <p>No materials available yet. Check back after your next class.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map(m => {
            const type = m.materialType as MaterialType;
            const href = m.externalLink ?? m.fileUrl ?? "#";
            const isExternal = !!m.externalLink;
            return (
              <div key={m.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                      {TYPE_ICONS[type] ?? <FileText className="size-4 text-gray-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{m.title}</span>
                        <Badge variant="outline" className={`text-xs ${TYPE_COLORS[type]}`}>{type}</Badge>
                      </div>
                      {m.description && <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>}
                      <p className="text-xs text-gray-400 mt-1">
                        {m.subject && <span>{m.subject} · </span>}
                        {m.uploaderName && <span>{m.uploaderName} · </span>}
                        {format(new Date(m.createdAt), "dd MMM yyyy")}
                        {m.fileSizeBytes ? ` · ${formatBytes(m.fileSizeBytes)}` : ""}
                      </p>
                    </div>
                  </div>
                  {href !== "#" && (
                    <a href={href} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors shrink-0">
                      {isExternal ? <ExternalLink className="size-3.5" /> : <Download className="size-3.5" />}
                      {isExternal ? "Open" : "Download"}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

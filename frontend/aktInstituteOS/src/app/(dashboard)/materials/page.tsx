"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Link2, FileUp, Trash2, Download, FileText, Video, BookOpen, Loader2, X } from "lucide-react";

import { listMaterials, addMaterialLink, uploadMaterialFile, deleteMaterial } from "@/lib/api/academic.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { StudyMaterialResponse, MaterialType } from "@/types/academic";

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

export default function MaterialsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<"link" | "upload" | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ["materials", filterType],
    queryFn: () => listMaterials({ type: filterType === "all" ? undefined : filterType }),
  });

  const deleteMut = useMutation({
    mutationFn: deleteMaterial,
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["materials"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Failed"),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Study Materials</h1>
          <p className="text-sm text-gray-500 mt-0.5">Share PDFs, links, and notes with students</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setModal("link")}>
            <Link2 className="size-4 mr-2" /> Add Link
          </Button>
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => setModal("upload")}>
            <FileUp className="size-4 mr-2" /> Upload File
          </Button>
        </div>
      </div>

      {/* Type filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "PDF", "NOTES", "PPT", "ASSIGNMENT", "LINK", "VIDEO"].map(t => (
          <button key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === t
                ? "bg-emerald-500 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}>
            {t === "all" ? "All Types" : t}
          </button>
        ))}
      </div>

      {modal === "link"   && <AddLinkModal   onClose={() => setModal(null)} />}
      {modal === "upload" && <UploadFileModal onClose={() => setModal(null)} />}

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : materials.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BookOpen className="size-10 mx-auto mb-3 text-gray-200" />
          <p>No materials yet. Upload a file or add a link.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map(m => (
            <MaterialCard key={m.id} material={m} onDelete={() => deleteMut.mutate(m.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function MaterialCard({ material: m, onDelete }: { material: StudyMaterialResponse; onDelete: () => void }) {
  const type = m.materialType as MaterialType;
  const href = m.externalLink ?? m.fileUrl ?? "#";
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
          {TYPE_ICONS[type] ?? <FileText className="size-4 text-gray-400" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{m.title}</span>
            <Badge variant="outline" className={`text-xs ${TYPE_COLORS[type]}`}>{type}</Badge>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {m.batchName ?? m.courseName ?? "All batches"}
            {m.subject && ` · ${m.subject}`}
            {m.uploaderName && ` · ${m.uploaderName}`}
          </p>
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        {href !== "#" && (
          <a href={href} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="size-8 p-0"><Download className="size-3.5" /></Button>
          </a>
        )}
        <Button variant="ghost" size="sm" className="size-8 p-0 text-red-400 hover:text-red-600" onClick={onDelete}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function AddLinkModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [link, setLink]   = useState("");
  const [type, setType]   = useState("LINK");
  const [busy, setBusy]   = useState(false);

  async function submit() {
    if (!title || !link) return toast.error("Title and URL are required");
    setBusy(true);
    try {
      await addMaterialLink({ title, externalLink: link, materialType: type });
      toast.success("Link added");
      qc.invalidateQueries({ queryKey: ["materials"] });
      onClose();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm">Add External Link</p>
        <button onClick={onClose}><X className="size-4 text-gray-400" /></button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label className="text-xs">Title *</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1" placeholder="e.g. IBPS PO Previous Year Papers" />
        </div>
        <div className="col-span-2">
          <Label className="text-xs">URL *</Label>
          <Input value={link} onChange={e => setLink(e.target.value)} className="mt-1" placeholder="https://..." />
        </div>
        <div>
          <Label className="text-xs">Type</Label>
          <select value={type} onChange={e => setType(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
            {["LINK","VIDEO","NOTES","ASSIGNMENT"].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={busy} className="bg-emerald-500 hover:bg-emerald-600 text-white">
          {busy ? <><Loader2 className="size-4 mr-2 animate-spin" />Adding…</> : "Add Link"}
        </Button>
      </div>
    </div>
  );
}

function UploadFileModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle]   = useState("");
  const [type, setType]     = useState("PDF");
  const [file, setFile]     = useState<File | null>(null);
  const [busy, setBusy]     = useState(false);

  async function submit() {
    if (!title || !file) return toast.error("Title and file are required");
    setBusy(true);
    try {
      await uploadMaterialFile(file, { title, materialType: type });
      toast.success("File uploaded");
      qc.invalidateQueries({ queryKey: ["materials"] });
      onClose();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? "Upload failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm">Upload Study Material</p>
        <button onClick={onClose}><X className="size-4 text-gray-400" /></button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label className="text-xs">Title *</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1" placeholder="e.g. Chapter 3 Notes — Profit & Loss" />
        </div>
        <div>
          <Label className="text-xs">Type</Label>
          <select value={type} onChange={e => setType(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
            {["PDF","NOTES","PPT","ASSIGNMENT"].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">File *</Label>
          <input ref={fileRef} type="file" accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full text-xs text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:text-xs cursor-pointer" />
          {file && <p className="text-xs text-gray-400 mt-1">{file.name} ({(file.size/1024).toFixed(0)} KB)</p>}
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={busy} className="bg-emerald-500 hover:bg-emerald-600 text-white">
          {busy ? <><Loader2 className="size-4 mr-2 animate-spin" />Uploading…</> : <><FileUp className="size-4 mr-2" />Upload</>}
        </Button>
      </div>
    </div>
  );
}

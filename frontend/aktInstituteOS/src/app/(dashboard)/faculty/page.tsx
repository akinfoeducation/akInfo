"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GraduationCap, Mail, Phone, Save, X, Loader2, Edit3, Plus } from "lucide-react";

import {
  listFaculty,
  upsertFacultyProfile,
  updateMyFacultyProfile,
} from "@/lib/api/academic.api";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { FacultyProfileResponse, FacultyProfileRequest } from "@/types/academic";

const EMP_TYPE_COLORS: Record<string, string> = {
  FULL_TIME: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PART_TIME: "bg-blue-50 text-blue-700 border-blue-200",
  VISITING:  "bg-orange-50 text-orange-700 border-orange-200",
  CONTRACT:  "bg-purple-50 text-purple-700 border-purple-200",
};

export default function FacultyPage() {
  const qc = useQueryClient();
  const { has, hasRole, userId } = usePermissions();
  const canManage = has("FACULTY_PROFILE_MANAGE");
  // Faculty-only users: they see only their own profile card, not the full institute directory
  const isFacultyOnly = hasRole("FACULTY") && !has("FACULTY_PROFILE_MANAGE");

  const [editing, setEditing] = useState<FacultyProfileResponse | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: allFaculty = [], isLoading } = useQuery({
    queryKey: ["faculty"],
    queryFn: listFaculty,
  });

  // Faculty-only users see only their own profile card
  const faculty = isFacultyOnly
    ? allFaculty.filter(f => f.userId === userId)
    : allFaculty;

  const saveMut = useMutation({
    mutationFn: ({ profile, data }: { profile: FacultyProfileResponse; data: FacultyProfileRequest }) => {
      // Faculty editing their own profile → /faculty/me (requires only FACULTY_PROFILE_VIEW)
      // Admins editing any profile → /faculty/user/{id} (requires FACULTY_PROFILE_MANAGE)
      if (canManage) {
        return upsertFacultyProfile(profile.userId, data);
      }
      return updateMyFacultyProfile(data);
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["faculty"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Failed to update profile"),
  });

  const createMut = useMutation({
    mutationFn: ({ newUserId, data }: { newUserId: number; data: FacultyProfileRequest }) =>
      upsertFacultyProfile(newUserId, data),
    onSuccess: () => {
      toast.success("Faculty profile created");
      qc.invalidateQueries({ queryKey: ["faculty"] });
      setCreateOpen(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Failed to create profile"),
  });

  // A faculty user can only edit their own card; admins can edit any
  function canEditProfile(f: FacultyProfileResponse) {
    if (canManage) return true;
    return f.userId === userId;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{isFacultyOnly ? "My Profile" : "Faculty"}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isFacultyOnly
              ? "View and update your faculty profile"
              : faculty.length > 0 ? `${faculty.length} faculty members` : "Manage institute faculty"}
          </p>
        </div>
        {canManage && (
          <Button
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4 mr-2" />
            Add Faculty Profile
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : faculty.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <GraduationCap className="size-10 mx-auto mb-3 text-gray-200" />
          <p>No faculty profiles yet.</p>
          {canManage && (
            <p className="text-xs mt-1">
              Use &ldquo;Add Faculty Profile&rdquo; to create a profile for an existing faculty user.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faculty.map(f =>
            editing?.userId === f.userId ? (
              <EditCard
                key={f.userId}
                faculty={f}
                onSave={data => saveMut.mutate({ profile: f, data })}
                onCancel={() => setEditing(null)}
                busy={saveMut.isPending}
              />
            ) : (
              <FacultyCard
                key={f.userId}
                faculty={f}
                onEdit={canEditProfile(f) ? () => setEditing(f) : undefined}
              />
            )
          )}
        </div>
      )}

      {canManage && (
        <CreateProfileDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onSave={(newUserId, data) => createMut.mutate({ newUserId, data })}
          busy={createMut.isPending}
        />
      )}
    </div>
  );
}

function FacultyCard({
  faculty: f,
  onEdit,
}: {
  faculty: FacultyProfileResponse;
  onEdit?: () => void;
}) {
  const initials = `${f.firstName?.[0] ?? ""}${f.lastName?.[0] ?? ""}`.toUpperCase() || "F";
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-emerald-100 flex items-center justify-center text-lg font-bold text-emerald-700 shrink-0 overflow-hidden">
            {f.avatarUrl
              ? <img src={f.avatarUrl} className="size-12 object-cover" alt="" />
              : initials}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{f.fullName}</p>
            <p className="text-xs text-gray-400">{f.designation ?? "Faculty"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {f.employeeType && (
            <Badge variant="outline" className={`text-xs ${EMP_TYPE_COLORS[f.employeeType] ?? ""}`}>
              {f.employeeType.replace("_", " ")}
            </Badge>
          )}
          {onEdit && (
            <Button variant="ghost" size="sm" className="size-8 p-0" onClick={onEdit}>
              <Edit3 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-1.5 text-sm text-gray-600">
        {f.email && (
          <div className="flex items-center gap-2">
            <Mail className="size-3.5 text-gray-300 shrink-0" />
            <span className="truncate">{f.email}</span>
          </div>
        )}
        {f.phone && (
          <div className="flex items-center gap-2">
            <Phone className="size-3.5 text-gray-300 shrink-0" />
            {f.phone}
          </div>
        )}
      </div>

      {(f.subjects || f.qualification || f.experienceYears > 0) && (
        <div className="border-t border-gray-100 pt-3 space-y-1.5 text-xs text-gray-500">
          {f.subjects && <p><span className="text-gray-300 font-medium">Subjects </span>{f.subjects}</p>}
          {f.qualification && <p><span className="text-gray-300 font-medium">Qualification </span>{f.qualification}</p>}
          {f.experienceYears > 0 && <p><span className="text-gray-300 font-medium">Experience </span>{f.experienceYears} years</p>}
        </div>
      )}
    </div>
  );
}

function ProfileFormFields({
  values: v,
  onChange,
}: {
  values: {
    qualification: string;
    experience: string;
    subjects: string;
    skills: string;
    empType: string;
    linkedin: string;
    bio: string;
  };
  onChange: (field: string, value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label className="text-xs">Qualification</Label>
        <Input value={v.qualification} onChange={e => onChange("qualification", e.target.value)} className="mt-1" placeholder="e.g. M.Sc. Mathematics" />
      </div>
      <div>
        <Label className="text-xs">Experience (years)</Label>
        <Input type="number" min={0} max={60} value={v.experience} onChange={e => onChange("experience", e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label className="text-xs">Subjects / Expertise</Label>
        <Input value={v.subjects} onChange={e => onChange("subjects", e.target.value)} className="mt-1" placeholder="Quantitative Aptitude, Reasoning…" />
      </div>
      <div>
        <Label className="text-xs">Skills</Label>
        <Input value={v.skills} onChange={e => onChange("skills", e.target.value)} className="mt-1" placeholder="IBPS PO, SBI Clerk…" />
      </div>
      <div>
        <Label className="text-xs">Employment Type</Label>
        <Select value={v.empType} onValueChange={val => onChange("empType", val ?? "FULL_TIME")}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="FULL_TIME">Full Time</SelectItem>
            <SelectItem value="PART_TIME">Part Time</SelectItem>
            <SelectItem value="VISITING">Visiting</SelectItem>
            <SelectItem value="CONTRACT">Contract</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">LinkedIn URL</Label>
        <Input value={v.linkedin} onChange={e => onChange("linkedin", e.target.value)} className="mt-1" placeholder="https://linkedin.com/in/..." />
      </div>
      <div className="col-span-2">
        <Label className="text-xs">Bio</Label>
        <textarea
          value={v.bio}
          onChange={e => onChange("bio", e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none h-20"
          placeholder="Short professional bio…"
        />
      </div>
    </div>
  );
}

function EditCard({ faculty: f, onSave, onCancel, busy }: {
  faculty: FacultyProfileResponse;
  onSave: (data: FacultyProfileRequest) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [fields, setFields] = useState({
    qualification: f.qualification ?? "",
    experience: String(f.experienceYears ?? 0),
    subjects: f.subjects ?? "",
    skills: f.skills ?? "",
    empType: f.employeeType ?? "FULL_TIME",
    linkedin: f.linkedinUrl ?? "",
    bio: f.bio ?? "",
  });

  function handleChange(field: string, value: string) {
    setFields(prev => ({ ...prev, [field]: value }));
  }

  function buildPayload(): FacultyProfileRequest {
    return {
      qualification: fields.qualification,
      experienceYears: Number(fields.experience),
      subjects: fields.subjects,
      skills: fields.skills,
      employeeType: fields.empType,
      linkedinUrl: fields.linkedin,
      bio: fields.bio,
    };
  }

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-4 md:col-span-2">
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm">Edit Profile — {f.fullName}</p>
        <button onClick={onCancel}><X className="size-4 text-gray-400" /></button>
      </div>
      <ProfileFormFields values={fields} onChange={handleChange} />
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}><X className="size-4 mr-1" />Cancel</Button>
        <Button
          disabled={busy}
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
          onClick={() => onSave(buildPayload())}
        >
          {busy ? <><Loader2 className="size-4 mr-2 animate-spin" />Saving…</> : <><Save className="size-4 mr-2" />Save</>}
        </Button>
      </div>
    </div>
  );
}

function CreateProfileDialog({ open, onClose, onSave, busy }: {
  open: boolean;
  onClose: () => void;
  onSave: (userId: number, data: FacultyProfileRequest) => void;
  busy: boolean;
}) {
  const [targetUserId, setTargetUserId] = useState("");
  const [fields, setFields] = useState({
    qualification: "",
    experience: "0",
    subjects: "",
    skills: "",
    empType: "FULL_TIME",
    linkedin: "",
    bio: "",
  });

  function handleChange(field: string, value: string) {
    setFields(prev => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    const uid = parseInt(targetUserId, 10);
    if (!uid || uid <= 0) {
      toast.error("Please enter a valid User ID");
      return;
    }
    onSave(uid, {
      qualification: fields.qualification,
      experienceYears: Number(fields.experience),
      subjects: fields.subjects,
      skills: fields.skills,
      employeeType: fields.empType,
      linkedinUrl: fields.linkedin,
      bio: fields.bio,
    });
  }

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Faculty Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">User ID <span className="text-gray-400">(from the Users page)</span></Label>
            <Input
              type="number"
              min={1}
              value={targetUserId}
              onChange={e => setTargetUserId(e.target.value)}
              className="mt-1"
              placeholder="e.g. 42"
            />
            <p className="text-xs text-gray-400 mt-1">
              The user must already exist with the Faculty role assigned.
            </p>
          </div>
          <ProfileFormFields values={fields} onChange={handleChange} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            disabled={busy || !targetUserId}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={handleSave}
          >
            {busy ? <><Loader2 className="size-4 mr-2 animate-spin" />Creating…</> : "Create Profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

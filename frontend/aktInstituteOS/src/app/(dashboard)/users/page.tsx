"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, UserCheck, UserX, Trash2, KeyRound,
  MoreHorizontal, Shield, Building2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { listUsers, updateUserStatus, deleteUser } from "@/lib/api/users.api";
import { listBranches, listDepartments } from "@/lib/api/branches.api";
import { listRoles } from "@/lib/api/roles.api";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserResponse } from "@/types/user-management";

export default function UsersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [branchId, setBranchId] = useState("");
  const [page, setPage] = useState(0);
  const debouncedQ = useDebounce(q, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["users", debouncedQ, status, role, branchId, page],
    queryFn: () => listUsers({
      q: debouncedQ || undefined,
      status: status || undefined,
      role: role || undefined,
      branchId: branchId ? Number(branchId) : undefined,
      page, size: 20,
    }),
    placeholderData: (prev) => prev,
  });

  const { data: branches } = useQuery({ queryKey: ["branches"], queryFn: listBranches });
  const { data: roles }    = useQuery({ queryKey: ["roles"],    queryFn: listRoles });

  const users = data?.data ?? [];
  const meta  = data?.meta;

  const statusMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => updateUserStatus(id, active),
    onSuccess: (_, { active }) => {
      toast.success(active ? "User activated" : "User deactivated");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => toast.error("Failed to update user status"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => {
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => toast.error("Failed to delete user"),
  });

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setQ(e.target.value); setPage(0);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {meta ? `${meta.total} total users` : "Manage institute staff and access"}
          </p>
        </div>
        <Link href="/users/new">
          <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
            <Plus className="size-4 mr-2" /> Add User
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, username…"
            value={q}
            onChange={handleSearch}
            className="pl-9"
          />
        </div>

        <Select value={status || "all"} onValueChange={(v) => { if(!v) return; setStatus(v === "all" ? "" : v); setPage(0); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={role || "all"} onValueChange={(v) => { if(!v) return; setRole(v === "all" ? "" : v); setPage(0); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {(roles ?? []).map((r) => (
              <SelectItem key={r.id} value={r.code}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={branchId || "all"} onValueChange={(v) => { if(!v) return; setBranchId(v === "all" ? "" : v); setPage(0); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {(branches ?? []).map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>User</TableHead>
              <TableHead>Employee ID</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : users.length === 0
              ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-400">
                      No users found
                    </TableCell>
                  </TableRow>
                )
              : users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    onToggleStatus={(active) => statusMutation.mutate({ id: user.id, active })}
                    onDelete={() => deleteMutation.mutate(user.id)}
                  />
                ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {meta.page + 1} of {meta.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!meta.hasPrevious}
              onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={!meta.hasNext}
              onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function UserRow({
  user,
  onToggleStatus,
  onDelete,
}: {
  user: UserResponse;
  onToggleStatus: (active: boolean) => void;
  onDelete: () => void;
}) {
  const initials = `${user.firstName[0]}${user.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <TableRow className="hover:bg-gray-50">
      {/* User info */}
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-semibold text-emerald-700 shrink-0">
            {user.avatarUrl
              ? <img src={user.avatarUrl} className="size-9 rounded-full object-cover" alt="" />
              : initials}
          </div>
          <div>
            <Link href={`/users/${user.id}`} className="font-medium text-gray-900 hover:text-emerald-600 text-sm">
              {user.fullName ?? `${user.firstName} ${user.lastName ?? ""}`}
            </Link>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
        </div>
      </TableCell>

      {/* Employee ID */}
      <TableCell className="text-sm text-gray-600 font-mono">
        {user.employeeId ?? <span className="text-gray-300">—</span>}
      </TableCell>

      {/* Roles */}
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {user.roles.slice(0, 2).map((r) => (
            <Badge key={r.id} variant="secondary" className="text-xs">
              {r.name}
            </Badge>
          ))}
          {user.roles.length > 2 && (
            <Badge variant="outline" className="text-xs">+{user.roles.length - 2}</Badge>
          )}
        </div>
      </TableCell>

      {/* Branch */}
      <TableCell className="text-sm text-gray-600">
        {user.branchName ?? <span className="text-gray-300">—</span>}
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge
          className={user.active
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-red-50 text-red-700 border-red-200"}
          variant="outline"
        >
          {user.active ? "Active" : "Inactive"}
        </Badge>
        {user.locked && (
          <Badge variant="outline" className="ml-1 text-xs bg-orange-50 text-orange-700 border-orange-200">
            Locked
          </Badge>
        )}
      </TableCell>

      {/* Last login */}
      <TableCell className="text-xs text-gray-400">
        {user.lastLoginAt ? format(new Date(user.lastLoginAt), "dd MMM yyyy") : "Never"}
      </TableCell>

      {/* Actions */}
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger className="size-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => window.location.href = `/users/${user.id}`}>
              View / Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.location.href = `/users/${user.id}?tab=roles`}>
              <Shield className="size-3.5 mr-2" /> Manage Roles
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onToggleStatus(!user.active)}>
              {user.active
                ? <><UserX className="size-3.5 mr-2 text-orange-500" /> Deactivate</>
                : <><UserCheck className="size-3.5 mr-2 text-emerald-500" /> Activate</>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="size-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

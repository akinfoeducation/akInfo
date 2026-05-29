"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Bell, Mail, MessageSquare, CheckCircle2, XCircle, Clock,
  Loader2, RefreshCw, Send, Megaphone,
} from "lucide-react";
import { toast } from "sonner";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { listNotificationLogs, sendManualNotification } from "@/lib/api/notifications.api";
import type { NotificationStatus } from "@/types/notification";

const STATUS_MAP: Record<NotificationStatus, { label: string; icon: React.ReactNode; cls: string }> = {
  SENT:    { label: "Sent",    icon: <CheckCircle2 className="size-3.5 text-emerald-500" />, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  FAILED:  { label: "Failed",  icon: <XCircle      className="size-3.5 text-red-500"     />, cls: "bg-red-50 text-red-600 border-red-200" },
  PENDING: { label: "Pending", icon: <Clock        className="size-3.5 text-amber-500"   />, cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

const sendSchema = z.object({
  channel:        z.enum(["EMAIL", "WHATSAPP"]),
  recipientName:  z.string().min(1, "Name is required"),
  recipientPhone: z.string().optional(),
  recipientEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  subject:        z.string().optional(),
  message:        z.string().min(1, "Message is required"),
});
type SendForm = z.infer<typeof sendSchema>;

export default function NotificationsPage() {
  const [channelFilter, setChannelFilter] = useState("");
  const [statusFilter,  setStatusFilter]  = useState("");
  const [page, setPage] = useState(0);
  const [sendOpen, setSendOpen] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["notification-logs", channelFilter, statusFilter, page],
    queryFn: () => listNotificationLogs({
      channel: channelFilter || undefined,
      status:  statusFilter  || undefined,
      page, size: 20,
    }),
    staleTime: 15_000,
  });

  const logs     = data?.data ?? [];
  const pageMeta = data?.meta;

  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors, isSubmitting },
  } = useForm<SendForm>({
    resolver: zodResolver(sendSchema) as Resolver<SendForm>,
    defaultValues: { channel: "WHATSAPP" },
  });

  const watchedChannel = watch("channel");

  const sendMutation = useMutation({
    mutationFn: (values: SendForm) => sendManualNotification({
      ...values,
      recipientPhone: values.recipientPhone || undefined,
      recipientEmail: values.recipientEmail || undefined,
      subject:        values.subject        || undefined,
    }),
    onSuccess: () => {
      toast.success("Notification queued for delivery");
      setSendOpen(false);
      reset();
      setTimeout(() => { qc.invalidateQueries({ queryKey: ["notification-logs"] }); }, 2000);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to send";
      toast.error(msg);
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Send messages and view delivery history
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/notifications/broadcast">
            <Button variant="outline" className="gap-2">
              <Megaphone className="size-4" />
              Broadcast
            </Button>
          </Link>
          <Link href="/notifications/templates">
            <Button variant="outline" className="gap-2">
              <Bell className="size-4" />
              Templates
            </Button>
          </Link>
          <Button
            className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
            onClick={() => setSendOpen(true)}
          >
            <Send className="size-4" />
            Send
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={channelFilter || "__all"} onValueChange={(v) => { setChannelFilter(v === "__all" ? "" : (v ?? "")); setPage(0); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Channels" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All Channels</SelectItem>
            <SelectItem value="EMAIL"><Mail className="size-3.5 inline mr-1" />Email</SelectItem>
            <SelectItem value="WHATSAPP"><MessageSquare className="size-3.5 inline mr-1" />WhatsApp</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter || "__all"} onValueChange={(v) => { setStatusFilter(v === "__all" ? "" : (v ?? "")); setPage(0); }}>
          <SelectTrigger className="w-32"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All Status</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="size-3.5" />
          Refresh
        </Button>
        {pageMeta && (
          <span className="text-sm text-muted-foreground ml-auto">
            {pageMeta.total} notification{pageMeta.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Log Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading logs…
        </div>
      ) : logs.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Bell className="size-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No notifications yet</p>
          <p className="text-sm mt-1">Notifications are sent automatically on admissions and payments.</p>
        </Card>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Channel</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Recipient</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Preview</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sent At</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => {
                const st = STATUS_MAP[log.status] ?? STATUS_MAP.PENDING;
                return (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {log.channel === "EMAIL"
                        ? <span className="flex items-center gap-1.5"><Mail className="size-3.5 text-blue-500" />Email</span>
                        : <span className="flex items-center gap-1.5"><MessageSquare className="size-3.5 text-emerald-500" />WhatsApp</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{log.recipientName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {log.channel === "EMAIL" ? log.recipientEmail : log.recipientPhone}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-xs text-muted-foreground truncate">
                        {log.subject && <><span className="font-medium text-foreground">{log.subject}</span> — </>}
                        {log.messagePreview}
                      </p>
                      {log.failureReason && (
                        <p className="text-xs text-red-500 mt-0.5 truncate">{log.failureReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {log.templateType
                        ? <Badge variant="outline" className="text-xs">{log.templateType.replace(/_/g, " ")}</Badge>
                        : <span className="text-xs text-muted-foreground">{log.relatedType ?? "Manual"}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${st.cls}`}>
                        {st.icon}{st.label}
                        {log.retryCount > 0 && <span className="ml-0.5 text-[10px] opacity-70">×{log.retryCount}</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {log.sentAt
                        ? new Date(log.sentAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })
                        : new Date(log.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pageMeta && pageMeta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={!pageMeta.hasPrevious} onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page + 1} of {pageMeta.totalPages}</span>
          <Button variant="outline" size="sm" disabled={!pageMeta.hasNext} onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      )}

      {/* Manual Send Dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => sendMutation.mutate(v))} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Channel <span className="text-destructive">*</span></Label>
              <input type="hidden" {...register("channel")} />
              <Select
                value={watchedChannel}
                onValueChange={(v) => setValue("channel", v as "EMAIL" | "WHATSAPP")}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Recipient Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Student Name" {...register("recipientName")} aria-invalid={!!errors.recipientName} />
              {errors.recipientName && <p className="text-xs text-destructive">{errors.recipientName.message}</p>}
            </div>

            {watchedChannel === "WHATSAPP" || watchedChannel === undefined ? (
              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input placeholder="9876543210" maxLength={10} {...register("recipientPhone")} />
              </div>
            ) : null}

            {watchedChannel === "EMAIL" && (
              <>
                <div className="space-y-1.5">
                  <Label>Email Address</Label>
                  <Input type="email" placeholder="student@email.com" {...register("recipientEmail")} />
                  {errors.recipientEmail && <p className="text-xs text-destructive">{errors.recipientEmail.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Subject</Label>
                  <Input placeholder="Message subject" {...register("subject")} />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label>Message <span className="text-destructive">*</span></Label>
              <Textarea rows={4} placeholder="Type your message…" {...register("message")} aria-invalid={!!errors.message} />
              {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSendOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={sendMutation.isPending || isSubmitting}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {sendMutation.isPending || isSubmitting ? "Sending…" : "Send"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

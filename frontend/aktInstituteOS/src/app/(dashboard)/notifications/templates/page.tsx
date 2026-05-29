"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Edit2, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
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
import {
  listTemplates, createTemplate, updateTemplate, deleteTemplate,
} from "@/lib/api/notifications.api";
import type { NotificationTemplate, NotificationTemplate_Type } from "@/types/notification";

const TEMPLATE_TYPES: NotificationTemplate_Type[] = [
  "ADMISSION_CONFIRMATION", "FEE_PAYMENT", "FEE_REMINDER", "BATCH_ASSIGNMENT", "GENERAL",
];

const schema = z.object({
  name:      z.string().min(1, "Name required"),
  type:      z.string().min(1, "Type required"),
  channel:   z.enum(["EMAIL", "WHATSAPP", "BOTH"]),
  subject:   z.string().optional(),
  body:      z.string().min(1, "Body required"),
  variables: z.string().optional(),
  isDefault: z.boolean(),
});
type FormData = z.infer<typeof schema>;

export default function TemplatesPage() {
  const qc = useQueryClient();
  const [editTarget, setEditTarget] = useState<NotificationTemplate | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["notification-templates"],
    queryFn:  listTemplates,
    staleTime: 60_000,
  });

  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { channel: "WHATSAPP", isDefault: false },
  });

  const watchedChannel = watch("channel");

  function openCreate() {
    reset({ channel: "WHATSAPP", isDefault: false });
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(t: NotificationTemplate) {
    reset({
      name:      t.name,
      type:      t.type,
      channel:   (t.channel as "EMAIL" | "WHATSAPP" | "BOTH"),
      subject:   t.subject ?? "",
      body:      t.body,
      variables: t.variables ?? "",
      isDefault: t.isDefault,
    });
    setEditTarget(t);
    setFormOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: (values: FormData) => {
      const req = {
        name:      values.name,
        type:      values.type as NotificationTemplate_Type,
        channel:   values.channel,
        subject:   values.subject || undefined,
        body:      values.body,
        variables: values.variables || undefined,
        isDefault: values.isDefault,
      };
      return editTarget ? updateTemplate(editTarget.id, req) : createTemplate(req);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-templates"] });
      toast.success(editTarget ? "Template updated" : "Template created");
      setFormOpen(false);
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-templates"] });
      toast.success("Template deleted");
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed");
    },
  });

  const grouped = TEMPLATE_TYPES.reduce<Record<string, NotificationTemplate[]>>((acc, type) => {
    acc[type] = templates.filter((t) => t.type === type);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/notifications">
            <Button variant="ghost" size="icon-sm"><ArrowLeft className="size-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Notification Templates</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage reusable message templates with {"{{"} variable {"}} "}  substitution
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2">
          <Plus className="size-4" />
          New Template
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />Loading…
        </div>
      ) : (
        <div className="space-y-6">
          {TEMPLATE_TYPES.map((type) => (
            <div key={type}>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {type.replace(/_/g, " ")}
              </h2>
              {grouped[type].length === 0 ? (
                <p className="text-sm text-muted-foreground pl-1">No templates yet.</p>
              ) : (
                <div className="space-y-2">
                  {grouped[type].map((t) => (
                    <Card key={t.id} className="p-4 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{t.name}</span>
                          <Badge variant="outline" className="text-xs">{t.channel}</Badge>
                          {t.isDefault && (
                            <span className="flex items-center gap-0.5 text-[10px] text-emerald-600">
                              <CheckCircle2 className="size-3" />Default
                            </span>
                          )}
                          {!t.isActive && (
                            <Badge variant="outline" className="text-xs text-red-500">Inactive</Badge>
                          )}
                        </div>
                        {t.subject && (
                          <p className="text-xs text-muted-foreground mt-1">Subject: {t.subject}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.body.replace(/<[^>]+>/g, " ").slice(0, 120)}</p>
                        {t.variables && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Variables: <span className="font-mono">{t.variables}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(t)}>
                          <Edit2 className="size-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost" size="icon-sm"
                          className="text-red-400 hover:text-red-600"
                          disabled={deleteMutation.isPending}
                          onClick={() => { if (confirm("Delete this template?")) deleteMutation.mutate(t.id); }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Template" : "New Template"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Template Name <span className="text-destructive">*</span></Label>
                <Input placeholder="Admission Confirmation (WhatsApp)" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Type <span className="text-destructive">*</span></Label>
                <Select value={watch("type") || "__none"} onValueChange={(v) => setValue("type", v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Channel <span className="text-destructive">*</span></Label>
              <input type="hidden" {...register("channel")} />
              <Select value={watchedChannel} onValueChange={(v) => setValue("channel", v as "EMAIL" | "WHATSAPP" | "BOTH")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="BOTH">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(watchedChannel === "EMAIL" || watchedChannel === "BOTH") && (
              <div className="space-y-1.5">
                <Label>Email Subject</Label>
                <Input placeholder="{{courseName}} Admission Confirmed | AKT Info Institute" {...register("subject")} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Message Body <span className="text-destructive">*</span></Label>
              <Textarea
                rows={8}
                className="font-mono text-xs"
                placeholder="Dear {{studentName}},&#10;&#10;Your admission has been confirmed…"
                {...register("body")}
                aria-invalid={!!errors.body}
              />
              {errors.body && <p className="text-xs text-destructive">{errors.body.message}</p>}
              <p className="text-xs text-muted-foreground">
                Use {"{{variableName}}"} for dynamic values. HTML is supported for email.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Variables</Label>
              <Input placeholder="studentName,courseName,admissionNumber" {...register("variables")} />
              <p className="text-xs text-muted-foreground">Comma-separated list of variable names used in the body.</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={!!watch("isDefault")}
                onChange={(e) => setValue("isDefault", e.target.checked)}
                className="size-4 rounded"
              />
              <Label htmlFor="isDefault" className="cursor-pointer">
                Set as default template for this type + channel
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                disabled={saveMutation.isPending || isSubmitting}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                {saveMutation.isPending || isSubmitting ? "Saving…" : (editTarget ? "Save Changes" : "Create Template")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

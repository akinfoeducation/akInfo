"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Phone, MessageCircle, User } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LeadStatusBadge } from "@/components/leads/LeadStatusBadge";
import type { LeadStatus } from "@/types/lead";

export interface DuplicateConflictView {
  number: string;
  field?: "phone" | "whatsappNumber";
  leadId: number;
  name?: string;
  status?: LeadStatus;
  assignedToName?: string;
}

/**
 * Requirement 6 popup — surfaces that a number already belongs to an active lead,
 * showing its current status and assigned caller/counsellor, with a link to open it.
 *
 * - context "create": the new lead was NOT created (hard block).
 * - context "update": the conflicting number was NOT saved; the rest of the edit was.
 */
export function DuplicateLeadDialog({
  open,
  onOpenChange,
  context,
  conflicts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: "create" | "update";
  conflicts: DuplicateConflictView[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-600" />
            {context === "create" ? "Lead already exists" : "Number already in use"}
          </DialogTitle>
          <DialogDescription>
            {context === "create"
              ? "This number is already linked to an active lead, so a new lead was not created."
              : "The number(s) below already belong to another active lead and were not saved. Your other changes were saved."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {conflicts.map((c) => (
            <div key={`${c.field ?? "phone"}-${c.number}`} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                {c.field === "whatsappNumber" ? (
                  <MessageCircle className="size-4 text-muted-foreground" />
                ) : (
                  <Phone className="size-4 text-muted-foreground" />
                )}
                <span>{c.number}</span>
                {c.field && (
                  <span className="text-xs text-muted-foreground">
                    ({c.field === "whatsappNumber" ? "WhatsApp" : "Phone"})
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Belongs to</span>
                <span className="font-medium">{c.name ?? `Lead #${c.leadId}`}</span>
                {c.status && <LeadStatusBadge status={c.status} />}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="size-3.5" />
                {c.assignedToName ? `Assigned to ${c.assignedToName}` : "Unassigned"}
              </div>

              <Link
                href={`/leads/${c.leadId}`}
                onClick={() => onOpenChange(false)}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Open this lead <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

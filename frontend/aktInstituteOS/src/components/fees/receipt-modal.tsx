"use client";

import { format } from "date-fns";
import { Printer, Banknote, Smartphone, Receipt, Building2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FeePayment, PaymentMode } from "@/types/fees";

const MODE_ICONS: Record<PaymentMode, React.ComponentType<{ className?: string }>> = {
  CASH: Banknote, UPI: Smartphone, CHEQUE: Receipt, BANK_TRANSFER: Building2, OTHER: HelpCircle,
};
const MODE_LABELS: Record<PaymentMode, string> = {
  CASH: "Cash", UPI: "UPI", CHEQUE: "Cheque", BANK_TRANSFER: "Bank Transfer", OTHER: "Other",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

/** Printable fee-payment receipt. Shared by the Fee Collection and Receipts pages. */
export function ReceiptModal({ payment, onClose }: { payment: FeePayment; onClose: () => void }) {
  const ModeIcon = MODE_ICONS[payment.paymentMode] ?? HelpCircle;
  return (
    <>
      <style>{`@media print { body > * { visibility: hidden; } #receipt-print-area, #receipt-print-area * { visibility: visible; } #receipt-print-area { position: fixed; inset: 0; background: white; display: flex; align-items: flex-start; justify-content: center; padding: 40px; } }`}</style>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
          <div id="receipt-print-area" className="space-y-4 p-6">
            <div className="border-b border-dashed border-gray-300 pb-4 text-center">
              <p className="text-base font-bold uppercase tracking-wide">AKT Institute</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Fee Payment Receipt</p>
              <p className="mt-2 font-mono text-lg font-semibold text-emerald-700">{payment.receiptNumber}</p>
            </div>
            <div className="space-y-1.5 border-b border-dashed border-gray-300 pb-4 text-sm">
              <div className="flex justify-between gap-4"><span className="shrink-0 text-muted-foreground">Student</span><span className="text-right font-medium">{payment.studentName}</span></div>
              <div className="flex justify-between gap-4"><span className="shrink-0 text-muted-foreground">Admission #</span><span className="font-mono text-xs">{payment.admissionNumber}</span></div>
              {payment.courseName && <div className="flex justify-between gap-4"><span className="shrink-0 text-muted-foreground">Course</span><span className="text-right">{payment.courseName}</span></div>}
            </div>
            <div className="space-y-1.5 border-b border-dashed border-gray-300 pb-4 text-sm">
              <div className="flex justify-between gap-4"><span className="shrink-0 text-muted-foreground">Date</span><span>{format(new Date(payment.paymentDate), "dd MMM yyyy")}</span></div>
              <div className="flex justify-between gap-4"><span className="shrink-0 text-muted-foreground">Mode</span><span className="flex items-center gap-1.5"><ModeIcon className="size-3.5 text-gray-500" />{MODE_LABELS[payment.paymentMode]}</span></div>
              {payment.referenceNumber && <div className="flex justify-between gap-4"><span className="shrink-0 text-muted-foreground">Reference</span><span className="font-mono text-xs">{payment.referenceNumber}</span></div>}
              {payment.notes && <div className="flex justify-between gap-4"><span className="shrink-0 text-muted-foreground">Notes</span><span className="max-w-[60%] text-right text-xs">{payment.notes}</span></div>}
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-semibold">Amount Paid</span>
              <span className="text-2xl font-bold text-emerald-700">{fmt(payment.amount)}</span>
            </div>
            <p className="pt-1 text-center text-[10px] text-muted-foreground">Generated {format(new Date(payment.createdAt), "dd MMM yyyy, h:mm a")}</p>
          </div>
          <div className="flex gap-3 px-6 pb-6 print:hidden">
            <Button className="flex-1 gap-1.5 bg-emerald-500 text-white hover:bg-emerald-600" onClick={() => window.print()}>
              <Printer className="size-4" /> Print
            </Button>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </>
  );
}

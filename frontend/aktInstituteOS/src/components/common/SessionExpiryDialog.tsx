"use client";

import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SessionExpiryDialogProps {
  secondsLeft: number;
  isExtending: boolean;
  onExtend: () => void;
  onLogout: () => void;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SessionExpiryDialog({
  secondsLeft,
  isExtending,
  onExtend,
  onLogout,
}: SessionExpiryDialogProps) {
  // Progress bar depletes from full (120s) to empty (0s)
  const pct = Math.min(100, Math.max(0, (secondsLeft / 120) * 100));
  const isUrgent = secondsLeft <= 30;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">

        {/* Depleting progress bar at the top */}
        <div className="h-1 bg-gray-100">
          <div
            className={`h-full transition-all duration-1000 ease-linear rounded-r-full ${
              isUrgent ? "bg-red-400" : "bg-amber-400"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div
              className={`size-14 rounded-full flex items-center justify-center border-2 transition-colors ${
                isUrgent
                  ? "bg-red-50 border-red-200"
                  : "bg-amber-50 border-amber-200"
              }`}
            >
              <Clock
                className={`size-7 transition-colors ${
                  isUrgent ? "text-red-500" : "text-amber-500"
                }`}
              />
            </div>
          </div>

          {/* Text */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Session expiring soon
            </h2>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
              You will be signed out in{" "}
              <span
                className={`font-semibold tabular-nums ${
                  isUrgent ? "text-red-600" : "text-amber-600"
                }`}
              >
                {formatTime(secondsLeft)}
              </span>
              . Would you like to stay signed in?
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            <Button
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={onExtend}
              disabled={isExtending}
            >
              {isExtending ? "Extending…" : "Continue Session"}
            </Button>
            <Button
              variant="outline"
              className="w-full text-gray-600"
              onClick={onLogout}
              disabled={isExtending}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

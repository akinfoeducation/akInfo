"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { useAuthStore } from "@/lib/stores/auth.store";
import { setAccessToken } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api";
import type { TokenRefreshResponse } from "@/types/auth";

/** Show the warning dialog this many ms before the token expires. */
const WARNING_BEFORE_MS = 2 * 60 * 1000; // 2 minutes

/** User is considered idle if no interaction in this window. */
const IDLE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export function useSessionExpiry() {
  const { isAuthenticated, tokenExpiresAt, updateToken, clearAuth } = useAuthStore();
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [isExtending, setIsExtending] = useState(false);

  const lastActivityRef = useRef<number>(Date.now());
  const timersRef = useRef<{
    warning?: ReturnType<typeof setTimeout>;
    countdown?: ReturnType<typeof setInterval>;
  }>({});

  // ── Activity tracking ─────────────────────────────────────────────────────
  useEffect(() => {
    function record() {
      lastActivityRef.current = Date.now();
    }
    document.addEventListener("mousemove", record);
    document.addEventListener("keydown", record);
    document.addEventListener("click", record);
    document.addEventListener("scroll", record, { passive: true });
    document.addEventListener("touchstart", record, { passive: true });
    return () => {
      document.removeEventListener("mousemove", record);
      document.removeEventListener("keydown", record);
      document.removeEventListener("click", record);
      document.removeEventListener("scroll", record);
      document.removeEventListener("touchstart", record);
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const doLogout = useCallback(() => {
    clearTimeout(timersRef.current.warning);
    clearInterval(timersRef.current.countdown);
    setShowWarning(false);
    clearAuth();
    window.location.href = "/login?reason=session_expired";
  }, [clearAuth]);

  /**
   * Extend the session by calling the refresh endpoint directly with axios
   * (bypasses the apiClient interceptor to avoid any 401 retry loop).
   */
  const extend = useCallback(async () => {
    setIsExtending(true);
    try {
      const { data } = await axios.post<ApiResponse<TokenRefreshResponse>>(
        `${process.env.NEXT_PUBLIC_API_URL ?? ""}/api/v1/auth/refresh`,
        {},
        { withCredentials: true }
      );
      const result = data.data;
      setAccessToken(result.accessToken);
      updateToken(result.accessToken, result.expiresIn);
      // Timers will reset via the tokenExpiresAt change in the effect below
      clearTimeout(timersRef.current.warning);
      clearInterval(timersRef.current.countdown);
      setShowWarning(false);
    } catch {
      doLogout();
    } finally {
      setIsExtending(false);
    }
  }, [updateToken, doLogout]);

  // ── Session timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !tokenExpiresAt) {
      setShowWarning(false);
      return;
    }

    clearTimeout(timersRef.current.warning);
    clearInterval(timersRef.current.countdown);

    function startCountdown() {
      const isActive = Date.now() - lastActivityRef.current < IDLE_THRESHOLD_MS;

      if (!isActive) {
        // User is idle — auto-logout silently at expiry without dialog
        const msLeft = tokenExpiresAt! - Date.now();
        if (msLeft <= 0) {
          doLogout();
          return;
        }
        timersRef.current.warning = setTimeout(doLogout, msLeft);
        return;
      }

      // User is active — show warning dialog with live countdown
      const computeSecs = () =>
        Math.max(0, Math.floor((tokenExpiresAt! - Date.now()) / 1000));

      setSecondsLeft(computeSecs());
      setShowWarning(true);

      timersRef.current.countdown = setInterval(() => {
        const secs = computeSecs();
        setSecondsLeft(secs);
        if (secs <= 0) {
          clearInterval(timersRef.current.countdown);
          setShowWarning(false);
          doLogout();
        }
      }, 1000);
    }

    const msUntilWarning = tokenExpiresAt - WARNING_BEFORE_MS - Date.now();

    if (msUntilWarning <= 0) {
      // Already inside the warning window
      startCountdown();
    } else {
      timersRef.current.warning = setTimeout(startCountdown, msUntilWarning);
    }

    return () => {
      clearTimeout(timersRef.current.warning);
      clearInterval(timersRef.current.countdown);
    };
  }, [isAuthenticated, tokenExpiresAt, doLogout]);

  return { showWarning, secondsLeft, isExtending, extend, logout: doLogout };
}

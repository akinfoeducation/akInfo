"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useAuthStore } from "@/lib/stores/auth.store";
import { getAccessToken, setOnTokenRefreshed } from "@/lib/api/client";
import { useSessionExpiry } from "@/lib/hooks/useSessionExpiry";
import { SessionExpiryDialog } from "@/components/common/SessionExpiryDialog";
import type { TokenRefreshResponse } from "@/types/auth";
import type { ApiResponse } from "@/types/api";

/**
 * On every page load/refresh the in-memory access token is wiped.
 * We silently restore it by calling /auth/refresh with the httpOnly cookie.
 *
 * CRITICAL: We use plain `axios` (not `apiClient`) deliberately.
 * `apiClient` has a 401 interceptor that tries to refresh on every 401 response.
 * If we used `apiClient` here and the refresh endpoint returned 401 (expired
 * cookie), the interceptor would retry, fail again, then call
 * `window.location.href = "/login"` — but the akt_session cookie would still
 * exist, causing the middleware to redirect back to "/" → infinite loop.
 *
 * With plain axios:
 *   success → token restored, children render normally.
 *   failure → clearAuth() cleans up the cookie, then we navigate to /login once.
 *
 * We also wait for Zustand `persist` to finish hydrating from localStorage
 * before reading auth state — otherwise isAuthenticated is still the default
 * `false` and we call onReady() before the token is restored.
 */
function AuthInitializer({ onReady }: { onReady: () => void }) {
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;

    function doInit() {
      if (attempted.current) return;
      attempted.current = true;

      // Token already in memory (same tab, just logged in)
      if (getAccessToken()) {
        onReady();
        return;
      }

      // Read FRESH state after hydration — avoids stale closure values
      const { isAuthenticated, user, setAuth, clearAuth } = useAuthStore.getState();

      if (!isAuthenticated || !user) {
        onReady();
        return;
      }

      // Use plain axios — bypasses the 401 interceptor on apiClient
      const backendBase = process.env.NEXT_PUBLIC_API_URL ?? "";
      axios
        .post<ApiResponse<TokenRefreshResponse>>(
          `${backendBase}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        )
        .then((res) => {
          const payload = res.data?.data;
          if (payload?.accessToken) {
            setAuth(user, payload.accessToken, payload.expiresIn);
          } else {
            // Unexpected response shape — clear and redirect
            clearAuth();
            window.location.replace("/login");
          }
        })
        .catch(() => {
          // Refresh token truly expired or revoked.
          // Clear the akt_session cookie first so the middleware won't
          // bounce us back, then navigate to login once.
          clearAuth();
          window.location.replace("/login");
        })
        .finally(() => {
          onReady();
        });
    }

    // Wait for Zustand persist to finish hydrating from localStorage
    if (useAuthStore.persist.hasHydrated()) {
      doInit();
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(doInit);
      return () => unsub();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function SessionGuard() {
  const { showWarning, secondsLeft, isExtending, extend, logout } = useSessionExpiry();
  if (!showWarning) return null;
  return (
    <SessionExpiryDialog
      secondsLeft={secondsLeft}
      isExtending={isExtending}
      onExtend={extend}
      onLogout={logout}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(false);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      })
  );

  useEffect(() => {
    setOnTokenRefreshed((token, expiresIn) => {
      useAuthStore.getState().updateToken(token, expiresIn);
    });
    return () => setOnTokenRefreshed(null);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer onReady={() => setAuthReady(true)} />
      {/*
        Block children until the token is restored.
        This prevents the race where queries fire with no Bearer token.
      */}
      {authReady ? (
        children
      ) : (
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading…</p>
          </div>
        </div>
      )}
      <SessionGuard />
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}

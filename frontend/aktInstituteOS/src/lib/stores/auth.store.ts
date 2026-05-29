"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserInfo } from "@/types/auth";
import { setAccessToken } from "@/lib/api/client";

interface AuthState {
  user: UserInfo | null;
  isAuthenticated: boolean;
  /** Unix ms when the current access token expires. Not persisted (meaningless after reload). */
  tokenExpiresAt: number | null;
  setAuth: (user: UserInfo, token: string, expiresIn?: number) => void;
  /** Update token after a silent refresh without changing the user object. */
  updateToken: (token: string, expiresIn: number) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      tokenExpiresAt: null,
      setAuth: (user, token, expiresIn?) => {
        setAccessToken(token);
        // max-age=604800 = 7 days, matching the refresh token lifetime
        document.cookie = "akt_session=1; path=/; max-age=604800; SameSite=Lax";
        const tokenExpiresAt = expiresIn ? Date.now() + expiresIn * 1000 : null;
        set({ user, isAuthenticated: true, tokenExpiresAt });
      },
      updateToken: (token, expiresIn) => {
        setAccessToken(token);
        set({ tokenExpiresAt: Date.now() + expiresIn * 1000 });
      },
      clearAuth: () => {
        setAccessToken(null);
        document.cookie = "akt_session=; path=/; max-age=0; SameSite=Lax";
        set({ user: null, isAuthenticated: false, tokenExpiresAt: null });
      },
    }),
    {
      name: "akt-auth",
      // tokenExpiresAt is intentionally excluded — stale after page reload
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

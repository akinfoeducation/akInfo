import apiClient from "./client";
import type { ApiResponse } from "@/types/api";
import type { LoginResponse, TokenRefreshResponse, UserInfo } from "@/types/auth";

/**
 * Extracts the subdomain from the current browser hostname.
 *
 * Examples:
 *   delhi.akinfoinstitute.tech  →  "delhi"
 *   patna.akinfoinstitute.tech  →  "patna"
 *   delhi.localhost             →  "delhi"   (local dev with /etc/hosts)
 *   localhost                   →  undefined  (falls back to default institute)
 *   akinfoinstitute.tech        →  undefined  (apex domain, no subdomain)
 */
function getSubdomain(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const hostname = window.location.hostname; // excludes port number
  const parts = hostname.split(".");

  if (parts.length === 1) return undefined;                          // bare "localhost"
  if (parts.length === 2 && parts[1] === "localhost") return parts[0]; // "delhi.localhost"
  if (parts.length >= 3) return parts[0];                            // "delhi.akinfoinstitute.tech"
  return undefined;                                                  // apex domain only
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const subdomain = getSubdomain();
  const { data } = await apiClient.post<ApiResponse<LoginResponse>>("/api/v1/auth/login", {
    emailOrUsername: email,
    password,
    ...(subdomain ? { subdomain } : {}),
  });
  return data.data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/api/v1/auth/logout");
}

export async function refreshToken(): Promise<TokenRefreshResponse> {
  const { data } = await apiClient.post<ApiResponse<TokenRefreshResponse>>("/api/v1/auth/refresh");
  return data.data;
}

export async function getMe(): Promise<UserInfo> {
  const { data } = await apiClient.get<ApiResponse<UserInfo>>("/api/v1/auth/me");
  return data.data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await apiClient.post("/api/v1/auth/change-password", { currentPassword, newPassword });
}

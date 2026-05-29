import apiClient from "./client";
import type { ApiResponse } from "@/types/api";
import type { LoginResponse, TokenRefreshResponse, UserInfo } from "@/types/auth";

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<ApiResponse<LoginResponse>>("/api/v1/auth/login", {
    emailOrUsername: email,
    password,
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

import apiClient from "./client";
import type { ApiResponse } from "@/types/api";
import type { UserInfo } from "@/types/auth";

export interface UpdateProfileRequest {
  firstName: string;
  lastName?: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const getMe = () =>
  apiClient.get<ApiResponse<UserInfo>>("/api/v1/auth/me").then(r => r.data.data!);

export const updateProfile = (body: UpdateProfileRequest) =>
  apiClient.put<ApiResponse<UserInfo>>("/api/v1/auth/me", body).then(r => r.data.data!);

export const changePassword = (body: ChangePasswordRequest) =>
  apiClient.post<ApiResponse<void>>("/api/v1/auth/change-password", body).then(r => r.data);

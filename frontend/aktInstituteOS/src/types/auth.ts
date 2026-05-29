export interface UserInfo {
  id: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  avatarUrl?: string;
  instituteId: number;
  roles: string[];
  permissions: string[];
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserInfo;
}

export interface TokenRefreshResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

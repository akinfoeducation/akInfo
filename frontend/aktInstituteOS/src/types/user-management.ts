export interface RoleSummary {
  id: number;
  name: string;
  code: string;
  system: boolean;
}

export interface UserResponse {
  id: number;
  uuid: string;
  instituteId: number;
  username: string;
  email: string;
  firstName: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
  employeeId?: string;
  designation?: string;
  gender?: string;
  dateOfBirth?: string;
  joiningDate?: string;
  address?: string;
  branchId?: number;
  branchName?: string;
  departmentId?: number;
  departmentName?: string;
  roles: RoleSummary[];
  active: boolean;
  emailVerified: boolean;
  lastLoginAt?: string;
  locked: boolean;
  failedLoginAttempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionResponse {
  id: number;
  name: string;
  code: string;
  resource: string;
  action: string;
  description?: string;
}

export interface RoleResponse {
  id: number;
  instituteId: number;
  name: string;
  code: string;
  description?: string;
  system: boolean;
  active: boolean;
  permissions: PermissionResponse[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BranchResponse {
  id: number;
  uuid: string;
  instituteId: number;
  name: string;
  code: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentResponse {
  id: number;
  uuid: string;
  instituteId: number;
  name: string;
  code: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  firstName: string;
  lastName?: string;
  email: string;
  username: string;
  password: string;
  phone?: string;
  employeeId?: string;
  designation?: string;
  gender?: string;
  dateOfBirth?: string;
  joiningDate?: string;
  address?: string;
  branchId?: number;
  departmentId?: number;
  roleIds: number[];
  active?: boolean;
}

export interface UpdateUserRequest {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  employeeId?: string;
  designation?: string;
  gender?: string;
  dateOfBirth?: string;
  joiningDate?: string;
  address?: string;
  branchId?: number | null;
  departmentId?: number | null;
  roleIds?: number[];
}

export interface UserSessionResponse {
  id: number;
  uuid: string;
  deviceName?: string;
  deviceType: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  active: boolean;
  current: boolean;
  lastActiveAt: string;
  expiresAt: string;
  createdAt: string;
}

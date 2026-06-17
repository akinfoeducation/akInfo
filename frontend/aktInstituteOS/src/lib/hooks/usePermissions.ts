import { useAuthStore } from "@/lib/stores/auth.store";

/**
 * Provides helpers for checking the logged-in user's roles and permissions.
 * Permissions come from the JWT (via auth store) and mirror the backend's
 * Spring Security authority strings (e.g. "FACULTY_PROFILE_VIEW").
 */
export function usePermissions() {
  const user = useAuthStore(s => s.user);
  const permissions: string[] = user?.permissions ?? [];
  const roles: string[] = user?.roles ?? [];

  return {
    /** True if the user has the exact permission code. */
    has: (permission: string) => permissions.includes(permission),
    /** True if the user has at least one of the given permission codes. */
    hasAny: (...perms: string[]) => perms.some(p => permissions.includes(p)),
    /** True if the user has all of the given permission codes. */
    hasAll: (...perms: string[]) => perms.every(p => permissions.includes(p)),
    /** True if the user has the given role code (e.g. "FACULTY", "STUDENT"). */
    hasRole: (role: string) => roles.includes(role),
    /** True if the user is faculty only (no admin override). Mirrors backend isFacultyOnly(). */
    isFacultyOnly: () =>
      roles.includes("FACULTY") &&
      !roles.includes("SUPER_ADMIN") &&
      !roles.includes("INSTITUTE_ADMIN"),
    /**
     * True for CALLER role users — scoped to assigned leads pre-VISIT_DONE.
     * Mirrors backend isCallerOnly(): has LEAD_VIEW but NOT LEAD_ASSIGN.
     */
    isCallerOnly: () =>
      permissions.includes("LEAD_VIEW") &&
      !permissions.includes("LEAD_ASSIGN"),
    /**
     * True for COUNSELLOR role — owns leads post-VISIT_DONE.
     * Has COUNSELLOR_ASSIGN but NOT LEAD_ASSIGN (removed in V30).
     */
    isCounsellor: () =>
      roles.includes("COUNSELLOR") &&
      !roles.includes("SUPER_ADMIN") &&
      !roles.includes("INSTITUTE_ADMIN"),
    /** True if user can hand off / claim walk-ins (COUNSELLOR_ASSIGN permission). */
    canHandoff: () => permissions.includes("COUNSELLOR_ASSIGN"),
    /** True if user can assign callers to leads (admin-level). */
    canAssignCaller: () => permissions.includes("LEAD_ASSIGN"),
    /** True if user is an institute admin or super admin. */
    isAdmin: () =>
      roles.includes("INSTITUTE_ADMIN") || roles.includes("SUPER_ADMIN"),
    /** True for ACCOUNTANT role only (no admin override) — drives the payments workspace. */
    isAccountant: () =>
      roles.includes("ACCOUNTANT") &&
      !roles.includes("SUPER_ADMIN") &&
      !roles.includes("INSTITUTE_ADMIN"),
    /** True if user can verify/confirm payments (BOOKING_VERIFY permission). */
    canVerifyPayments: () => permissions.includes("BOOKING_VERIFY"),
    /** User's numeric ID from the auth store. */
    userId: user?.id ?? null,
  };
}

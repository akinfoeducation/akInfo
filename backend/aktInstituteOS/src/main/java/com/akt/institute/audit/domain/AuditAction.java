package com.akt.institute.audit.domain;

/** Canonical audit action codes — keeps logs consistent and queryable. */
public final class AuditAction {

    private AuditAction() {}

    // Auth
    public static final String LOGIN             = "AUTH_LOGIN";
    public static final String LOGOUT            = "AUTH_LOGOUT";
    public static final String LOGIN_FAILED      = "AUTH_LOGIN_FAILED";
    public static final String ACCOUNT_LOCKED    = "AUTH_ACCOUNT_LOCKED";
    public static final String PASSWORD_CHANGED  = "AUTH_PASSWORD_CHANGED";
    public static final String PASSWORD_RESET    = "AUTH_PASSWORD_RESET";

    // User
    public static final String USER_CREATED      = "USER_CREATED";
    public static final String USER_UPDATED      = "USER_UPDATED";
    public static final String USER_DELETED      = "USER_DELETED";
    public static final String USER_ACTIVATED    = "USER_ACTIVATED";
    public static final String USER_DEACTIVATED  = "USER_DEACTIVATED";
    public static final String USER_ROLE_CHANGED = "USER_ROLE_CHANGED";
    public static final String USER_PASSWORD_RESET = "USER_PASSWORD_RESET";

    // Role
    public static final String ROLE_CREATED      = "ROLE_CREATED";
    public static final String ROLE_UPDATED      = "ROLE_UPDATED";
    public static final String ROLE_DELETED      = "ROLE_DELETED";
    public static final String ROLE_PERMS_UPDATED = "ROLE_PERMISSIONS_UPDATED";

    // Session
    public static final String SESSION_REVOKED   = "SESSION_REVOKED";
    public static final String ALL_SESSIONS_REVOKED = "ALL_SESSIONS_REVOKED";

    // Branch / Department
    public static final String BRANCH_CREATED    = "BRANCH_CREATED";
    public static final String BRANCH_UPDATED    = "BRANCH_UPDATED";
    public static final String BRANCH_DELETED    = "BRANCH_DELETED";
    public static final String DEPT_CREATED      = "DEPARTMENT_CREATED";
    public static final String DEPT_UPDATED      = "DEPARTMENT_UPDATED";
    public static final String DEPT_DELETED      = "DEPARTMENT_DELETED";
}

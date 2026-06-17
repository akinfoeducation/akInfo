# AKT Institute OS — User Management Guide

Quick reference for managing users, roles, and permissions in the system.

---

## Table of Contents

1. [Create a Role](#1-create-a-role)
2. [Assign Permissions to a Role](#2-assign-permissions-to-a-role)
3. [Create a User](#3-create-a-user)
4. [Assign a Role to a User](#4-assign-a-role-to-a-user)
5. [Remove a Permission from a Role](#5-remove-a-permission-from-a-role)
6. [Remove a Role from a User](#6-remove-a-role-from-a-user)
7. [Deactivate / Activate a User](#7-deactivate--activate-a-user)
8. [Reset a User's Password](#8-reset-a-users-password)
9. [Delete a User](#9-delete-a-user)
10. [Delete a Role](#10-delete-a-role)

---

## 1. Create a Role

**Via UI**

1. Go to **Administration → Roles** in the sidebar
2. Click **New Role** (top right)
3. Fill in:
   - **Role Name** — e.g. `Batch Coordinator`
   - **Code** — uppercase, underscores only — e.g. `BATCH_COORDINATOR`
   - **Description** — optional, short description
4. Select permissions from the matrix (see section 2)
5. Click **Save Role**

**Via API**
```http
POST /api/v1/roles
Authorization: Bearer <token>

{
  "name": "Batch Coordinator",
  "code": "BATCH_COORDINATOR",
  "description": "Manages batch schedules and faculty assignments",
  "permissionIds": [21, 22, 23]
}
```

> ⚠️ **System roles** (Super Admin, Institute Admin, etc.) cannot be edited or deleted.

---

## 2. Assign Permissions to a Role

**Via UI**

1. Go to **Administration → Roles**
2. Click the **Edit (pencil)** icon on the role you want to update
3. In the **permission matrix**, click any cell to toggle that permission ON/OFF
   - Click a **module name** (e.g. `STUDENT`) to toggle all actions for that module at once
4. Click **Save Role**

**Permission Matrix explained:**

| Module | VIEW | CREATE | UPDATE | DELETE | EXPORT | APPROVE |
|--------|------|--------|--------|--------|--------|---------|
| USER | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| STUDENT | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ |

A **✓** means the role has that permission. Click to toggle.

**Via API — Replace all permissions for a role**
```http
PUT /api/v1/roles/{roleId}/permissions
Authorization: Bearer <token>

{
  "permissionIds": [1, 2, 3, 15, 16]
}
```

> ℹ️ This **replaces** all existing permissions. Always include the full set you want.

**Get all available permission IDs:**
```http
GET /api/v1/permissions
Authorization: Bearer <token>
```

---

## 3. Create a User

**Via UI**

1. Go to **Administration → Users**
2. Click **Add User** (top right)
3. Fill in the required fields:

   | Field | Required | Notes |
   |-------|----------|-------|
   | First Name | ✅ | |
   | Email | ✅ | Must be unique within the institute |
   | Username | ✅ | Lowercase, letters/digits/. - _ only |
   | Password | ✅ | Minimum 8 characters |
   | Role | ✅ | Select at least one role |
   | Employee ID | ✗ | Auto-generated if left blank (EMP-2026-000001) |
   | Branch | ✗ | Optional organisational assignment |
   | Department | ✗ | Optional organisational assignment |

4. Click **Create User**

The user can now log in at the institute portal with their username and password.

**Via API**
```http
POST /api/v1/users
Authorization: Bearer <token>

{
  "firstName": "Rahul",
  "lastName": "Sharma",
  "email": "rahul.sharma@aktinstitute.com",
  "username": "rahul.sharma",
  "password": "Welcome@123",
  "phone": "9876543210",
  "designation": "Faculty",
  "roleIds": [4],
  "branchId": 1,
  "departmentId": 1,
  "active": true
}
```

---

## 4. Assign a Role to a User

**Via UI — Option A: From the Users list**

1. Go to **Administration → Users**
2. Click the **⋯ menu** on any user row
3. Click **Manage Roles**
4. On the Roles tab, select the roles you want to assign
5. Click **Update Roles**

**Via UI — Option B: From the User detail page**

1. Go to **Administration → Users → click on a user**
2. Click the **Roles** tab
3. Click the role cards to select/deselect
4. Click **Update Roles**

**Via API — Update roles (replaces current roles)**
```http
PUT /api/v1/users/{userId}
Authorization: Bearer <token>

{
  "firstName": "Rahul",
  "roleIds": [3, 4]
}
```

> ℹ️ `roleIds` replaces all current roles. Include every role you want the user to have.

---

## 5. Remove a Permission from a Role

**Via UI**

1. Go to **Administration → Roles**
2. Click **Edit (pencil)** on the role
3. In the permission matrix, click the **✓** cell to turn it **✗** (OFF)
4. Click **Save Role**

**Via API**

Fetch current permissions first, remove the ones you don't want, then PUT the updated list:

```http
# Step 1: Get current permissions for the role
GET /api/v1/roles/{roleId}

# Step 2: Remove unwanted permission IDs from the list, then PUT
PUT /api/v1/roles/{roleId}/permissions

{
  "permissionIds": [1, 2, 3]
}
# (permission 4 is now removed)
```

> ⚠️ You **cannot** modify permissions on system roles (SUPER_ADMIN, INSTITUTE_ADMIN, etc.) via the API. These are seeded and protected.

---

## 6. Remove a Role from a User

**Via UI**

1. Go to **Administration → Users → click on the user**
2. Click the **Roles** tab
3. Click the role card to **deselect** it (turns grey)
4. Click **Update Roles**

**Via API**
```http
PUT /api/v1/users/{userId}
Authorization: Bearer <token>

{
  "firstName": "Rahul",
  "roleIds": [4]
}
# roleIds no longer contains the role you want to remove
```

> ℹ️ A user must always have at least one role. The system will warn you if roleIds is empty.

---

## 7. Deactivate / Activate a User

When deactivated, the user is immediately logged out and **cannot log in** until reactivated.

**Via UI**

1. Go to **Administration → Users**
2. Click the **⋯ menu** on the user row
3. Click **Deactivate** (or **Activate** if currently inactive)

Or from the user detail page, click the **Deactivate** button in the header.

**Via API**
```http
PATCH /api/v1/users/{userId}/status
Authorization: Bearer <token>

{
  "active": false,
  "reason": "Employee on extended leave"
}
```

Set `"active": true` to reactivate.

---

## 8. Reset a User's Password

Useful when a user forgets their password or an account is compromised. The user is **immediately logged out** from all devices.

**Via UI**

1. Go to **Administration → Users → click on the user**
2. Click the **Security** tab
3. Enter a new password (min 8 characters) and confirm it
4. Click **Reset Password**

**Via API**
```http
POST /api/v1/users/{userId}/reset-password
Authorization: Bearer <token>

{
  "newPassword": "NewSecure@456",
  "forceChange": true
}
```

`forceChange: true` — user must change their password at next login.

---

## 9. Delete a User

Soft-delete — the user's data is retained for records but they cannot log in. All active sessions are immediately revoked.

> ⚠️ You cannot delete your own account.

**Via UI**

1. Go to **Administration → Users**
2. Click the **⋯ menu** → click **Delete**
3. Confirm the action

Or from the user detail page, click the **Delete** button in the header.

**Via API**
```http
DELETE /api/v1/users/{userId}
Authorization: Bearer <token>
```

---

## 10. Delete a Role

> ⚠️ You cannot delete:
> - System roles (SUPER_ADMIN, INSTITUTE_ADMIN, COUNSELLOR, FACULTY, STUDENT, PARENT)
> - Any role that is currently assigned to one or more users — reassign those users first

**Via UI**

1. Go to **Administration → Roles**
2. Click the **🗑 Delete** icon on the role row
3. If users are assigned, you will see an error — go to Users, reassign them, then delete the role

**Via API**
```http
DELETE /api/v1/roles/{roleId}
Authorization: Bearer <token>
```

---

## Quick Reference — Who Can Do What

| Action | Required Permission |
|--------|-------------------|
| View users | `USER_VIEW` |
| Create users | `USER_CREATE` |
| Edit users | `USER_UPDATE` |
| Delete users | `USER_DELETE` |
| Bulk operations | `USER_BULK` |
| View roles | `ROLE_VIEW` |
| Create roles | `ROLE_CREATE` |
| Edit roles / permissions | `ROLE_UPDATE` |
| Delete roles | `ROLE_DELETE` |
| View audit logs | `AUDIT_VIEW` |
| Force logout users | `SESSION_REVOKE` |

---

## Default Credentials

| Institute | URL | Username | Password |
|-----------|-----|----------|----------|
| AKT Institute Delhi | `delhi.akinfoinstitute.tech` | `admin` | `admin` |
| AKT Institute Patna | `patna.akinfoinstitute.tech` | `superadmin` | `Admin@1234` |

> 🔴 **Change these passwords immediately in production.**

---

*AKT Institute OS — Internal Documentation*

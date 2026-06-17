-- ============================================================
-- V19: User Management Module — Permissions & Role Updates
--      Adds new permission codes for roles, branches,
--      departments, sessions, audit, and menu modules.
-- ============================================================

-- ── New permissions ────────────────────────────────────────────────────────
INSERT INTO permissions (name, code, resource, action, description)
VALUES
-- ROLE management
('View Roles',              'ROLE_VIEW',        'ROLE',       'READ',   'View roles and their permissions'),
('Create Roles',            'ROLE_CREATE',      'ROLE',       'CREATE', 'Create new roles'),
('Update Roles',            'ROLE_UPDATE',      'ROLE',       'UPDATE', 'Edit role details and permissions'),
('Delete Roles',            'ROLE_DELETE',      'ROLE',       'DELETE', 'Delete custom roles'),

-- BRANCH management
('View Branches',           'BRANCH_VIEW',      'BRANCH',     'READ',   'View branch list and details'),
('Manage Branches',         'BRANCH_MANAGE',    'BRANCH',     'UPDATE', 'Create, edit, deactivate branches'),

-- DEPARTMENT management
('View Departments',        'DEPT_VIEW',        'DEPARTMENT', 'READ',   'View department list and details'),
('Manage Departments',      'DEPT_MANAGE',      'DEPARTMENT', 'UPDATE', 'Create, edit, deactivate departments'),

-- USER IMPORT / BULK OPS
('Import Users',            'USER_IMPORT',      'USER',       'CREATE', 'Bulk import users via CSV/Excel'),
('Bulk User Actions',       'USER_BULK',        'USER',       'UPDATE', 'Bulk activate, deactivate, assign roles'),

-- AUDIT LOGS
('View Audit Logs',         'AUDIT_VIEW',       'AUDIT',      'READ',   'View system audit logs'),

-- SESSION MANAGEMENT
('View All Sessions',       'SESSION_VIEW_ALL', 'SESSION',    'READ',   'View active sessions of all users'),
('Force Logout Users',      'SESSION_REVOKE',   'SESSION',    'UPDATE', 'Force logout any user session');

-- ── Grant new permissions to SUPER_ADMIN (institute 1 & 2) ────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'SUPER_ADMIN'
  AND p.code IN (
      'ROLE_VIEW', 'ROLE_CREATE', 'ROLE_UPDATE', 'ROLE_DELETE',
      'BRANCH_VIEW', 'BRANCH_MANAGE',
      'DEPT_VIEW', 'DEPT_MANAGE',
      'USER_IMPORT', 'USER_BULK',
      'AUDIT_VIEW',
      'SESSION_VIEW_ALL', 'SESSION_REVOKE'
  )
ON CONFLICT DO NOTHING;

-- ── Grant new permissions to INSTITUTE_ADMIN (institute 1 & 2) ────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'INSTITUTE_ADMIN'
  AND p.code IN (
      'ROLE_VIEW', 'ROLE_CREATE', 'ROLE_UPDATE', 'ROLE_DELETE',
      'BRANCH_VIEW', 'BRANCH_MANAGE',
      'DEPT_VIEW', 'DEPT_MANAGE',
      'USER_IMPORT', 'USER_BULK',
      'AUDIT_VIEW',
      'SESSION_VIEW_ALL', 'SESSION_REVOKE'
  )
ON CONFLICT DO NOTHING;

-- ── Grant limited permissions to COUNSELLOR ───────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'COUNSELLOR'
  AND p.code IN ('BRANCH_VIEW', 'DEPT_VIEW')
ON CONFLICT DO NOTHING;

-- ── Grant limited permissions to FACULTY ──────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'FACULTY'
  AND p.code IN ('BRANCH_VIEW', 'DEPT_VIEW')
ON CONFLICT DO NOTHING;

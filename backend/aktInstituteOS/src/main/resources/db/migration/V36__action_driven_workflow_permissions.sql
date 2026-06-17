-- ============================================================
-- V36: Action-Driven Workflow — Roles & Permissions
--
--   1. ACCOUNTANT role  — verifies payments (primary); replaces admin-only payment verify
--   2. LEAD_STATUS_OVERRIDE permission — admin escape hatch for direct status set
--   3. COUNSELLOR_REASSIGN permission  — reassign counsellor on post-handoff leads
--   4. LEAD_PERFORM_ACTION permission  — all workflow action buttons
--   5. Grant matrix for all new permissions
-- ============================================================

-- ── 1. ACCOUNTANT role ───────────────────────────────────────────────────────
INSERT INTO roles (institute_id, name, code, description, is_system, is_active)
SELECT 1, 'Accountant', 'ACCOUNTANT',
       'Verifies and confirms student payments; primary payment authority',
       TRUE, TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM roles WHERE code = 'ACCOUNTANT' AND institute_id = 1
);

-- ── 2. New permissions ───────────────────────────────────────────────────────
INSERT INTO permissions (name, code, resource, action, description)
VALUES
    (
        'Admin Status Override',
        'LEAD_STATUS_OVERRIDE',
        'LEAD',
        'UPDATE',
        'Directly set any lead status bypassing workflow — admin escape hatch; requires reason'
    ),
    (
        'Perform Lead Action',
        'LEAD_PERFORM_ACTION',
        'LEAD',
        'UPDATE',
        'Perform workflow actions on leads (call outcomes, visit, negotiation, etc.)'
    ),
    (
        'Reassign Counsellor',
        'COUNSELLOR_REASSIGN',
        'LEAD',
        'UPDATE',
        'Reassign a post-handoff lead from one counsellor to another'
    )
ON CONFLICT (code) DO NOTHING;

-- ── 3. Grant LEAD_PERFORM_ACTION ─────────────────────────────────────────────
-- All roles that interact with leads need this
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code IN ('CALLER', 'COUNSELLOR', 'INSTITUTE_ADMIN', 'SUPER_ADMIN')
  AND  r.institute_id = 1
  AND  p.code = 'LEAD_PERFORM_ACTION'
ON CONFLICT DO NOTHING;

-- ── 4. Grant LEAD_STATUS_OVERRIDE (admin only) ───────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code IN ('INSTITUTE_ADMIN', 'SUPER_ADMIN')
  AND  r.institute_id = 1
  AND  p.code = 'LEAD_STATUS_OVERRIDE'
ON CONFLICT DO NOTHING;

-- ── 5. Grant COUNSELLOR_REASSIGN (admin only) ────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code IN ('INSTITUTE_ADMIN', 'SUPER_ADMIN')
  AND  r.institute_id = 1
  AND  p.code = 'COUNSELLOR_REASSIGN'
ON CONFLICT DO NOTHING;

-- ── 6. Grant BOOKING_VERIFY to ACCOUNTANT ────────────────────────────────────
-- Accountant is the primary payment verifier
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code = 'ACCOUNTANT'
  AND  r.institute_id = 1
  AND  p.code IN (
      'LEAD_VIEW',
      'BOOKING_VIEW',
      'BOOKING_VERIFY'
  )
ON CONFLICT DO NOTHING;

-- ── 7. Keep BOOKING_VERIFY on INSTITUTE_ADMIN and SUPER_ADMIN (fallback) ─────
-- (Already granted in earlier migrations; this is a safety re-grant)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code IN ('INSTITUTE_ADMIN', 'SUPER_ADMIN')
  AND  r.institute_id = 1
  AND  p.code = 'BOOKING_VERIFY'
ON CONFLICT DO NOTHING;

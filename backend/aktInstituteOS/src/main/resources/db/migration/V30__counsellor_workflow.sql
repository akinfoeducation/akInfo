-- ============================================================
-- V30: Counsellor Workflow — Four foundational fixes
--
--   Fix 1: Dual ownership columns (caller_id vs counsellor_id)
--   Fix 2: Missing LeadStatus values — handled in Java enum;
--           DB uses VARCHAR so no DDL needed for enum values
--   Fix 3: Booking type + partial unique index
--   Fix 4: COUNSELLOR_ASSIGN permission, remove LEAD_ASSIGN from COUNSELLOR
-- ============================================================

-- ── Fix 1a: Dual ownership columns on leads ──────────────────────────────────
ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS caller_id             BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS counsellor_id         BIGINT REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS handed_off_at         TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS visit_planned_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS visit_done_at         TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS booking_confirmed_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS admission_done_at     TIMESTAMPTZ;

-- Fix 1b: Backfill — every lead that already has an assigned_to_id was assigned to a caller
UPDATE leads SET caller_id = assigned_to_id WHERE assigned_to_id IS NOT NULL AND caller_id IS NULL;

-- Fix 1c: Indexes for dual-owner queries and KPI dashboards
CREATE INDEX IF NOT EXISTS idx_leads_caller_id
    ON leads(institute_id, caller_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_counsellor_id
    ON leads(institute_id, counsellor_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_visit_done_at
    ON leads(institute_id, visit_done_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_admission_done_at
    ON leads(institute_id, admission_done_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_booking_confirmed_at
    ON leads(institute_id, booking_confirmed_at) WHERE deleted_at IS NULL;

-- ── Fix 3a: Booking type + is_active on admission_bookings ───────────────────
ALTER TABLE admission_bookings
    ADD COLUMN IF NOT EXISTS booking_type   VARCHAR(20)  NOT NULL DEFAULT 'ADMISSION_CLOSING',
    ADD COLUMN IF NOT EXISTS is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS cancelled_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_by   BIGINT       REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS cancel_reason  TEXT;

-- Fix 3b: Drop the hard UNIQUE(lead_id) constraint that blocks multiple bookings per lead
--         (e.g. remote token booking + later in-person admission closing)
ALTER TABLE admission_bookings DROP CONSTRAINT IF EXISTS uq_admission_bookings_lead;

-- Fix 3c: Replace with a partial unique index — only one ACTIVE booking per lead
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_booking_per_lead
    ON admission_bookings(lead_id) WHERE is_active = TRUE;

-- Fix 3d: Index for booking type reporting
CREATE INDEX IF NOT EXISTS idx_admission_bookings_type
    ON admission_bookings(institute_id, booking_type);

-- ── Fix 4a: COUNSELLOR_ASSIGN permission ─────────────────────────────────────
INSERT INTO permissions (name, code, resource, action, description)
VALUES (
    'Assign Counsellor',
    'COUNSELLOR_ASSIGN',
    'LEAD',
    'UPDATE',
    'Hand off a lead to a counsellor after VISIT_DONE, or self-claim a walk-in'
)
ON CONFLICT (code) DO NOTHING;

-- Fix 4b: Remove LEAD_ASSIGN from COUNSELLOR role
--         COUNSELLOR previously had LEAD_ASSIGN (from V2) which caused them to see ALL leads.
--         They now use COUNSELLOR_ASSIGN for handoff + walk-in claim only.
DELETE FROM role_permissions
WHERE role_id  = (SELECT id FROM roles WHERE code = 'COUNSELLOR' AND institute_id = 1)
  AND permission_id = (SELECT id FROM permissions WHERE code = 'LEAD_ASSIGN');

-- Fix 4c: Grant COUNSELLOR_ASSIGN to COUNSELLOR role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code = 'COUNSELLOR'
  AND  r.institute_id = 1
  AND  p.code = 'COUNSELLOR_ASSIGN'
ON CONFLICT DO NOTHING;

-- Fix 4d: Grant COUNSELLOR_ASSIGN to INSTITUTE_ADMIN (admin can handoff too)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code = 'INSTITUTE_ADMIN'
  AND  r.institute_id = 1
  AND  p.code = 'COUNSELLOR_ASSIGN'
ON CONFLICT DO NOTHING;

-- Fix 4e: Grant COUNSELLOR_ASSIGN to SUPER_ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code = 'SUPER_ADMIN'
  AND  r.institute_id = 1
  AND  p.code = 'COUNSELLOR_ASSIGN'
ON CONFLICT DO NOTHING;

-- ── Fix 4f: Also grant ADMISSION_COMPLETE permission (for ADMISSION_DONE status) ──
INSERT INTO permissions (name, code, resource, action, description)
VALUES (
    'Complete Admission',
    'ADMISSION_COMPLETE',
    'LEAD',
    'UPDATE',
    'Mark a lead as ADMISSION_DONE — final stage after full onboarding'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code IN ('COUNSELLOR', 'INSTITUTE_ADMIN', 'SUPER_ADMIN')
  AND  r.institute_id = 1
  AND  p.code = 'ADMISSION_COMPLETE'
ON CONFLICT DO NOTHING;

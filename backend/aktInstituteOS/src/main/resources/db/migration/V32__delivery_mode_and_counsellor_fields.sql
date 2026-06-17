-- ============================================================
-- V32: Delivery Mode, Counsellor Fields, & Workflow Constraints
--
--   1. delivery_mode (ONLINE/OFFLINE) + preferred_batch/branch on leads
--   2. parent contact fields on leads (needed before admission)
--   3. Unique constraint — one active admission per lead
--   4. Unique constraint — one active admission per lead in DB
--   5. Counsellor permission grants: STUDENT_CREATE, BATCH_ASSIGN, BOOKING_CREATE
-- ============================================================

-- ── 1. Delivery mode and batch/branch preference ─────────────────────────────
ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS delivery_mode    VARCHAR(10),
    ADD COLUMN IF NOT EXISTS preferred_batch  VARCHAR(200),
    ADD COLUMN IF NOT EXISTS preferred_branch VARCHAR(200);

CREATE INDEX IF NOT EXISTS idx_leads_delivery_mode
    ON leads(institute_id, delivery_mode) WHERE deleted_at IS NULL;

-- ── 2. Parent contact fields (counsellor needs these before admission) ───────
ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS parent_name   VARCHAR(100),
    ADD COLUMN IF NOT EXISTS parent_phone  VARCHAR(15),
    ADD COLUMN IF NOT EXISTS parent_email  VARCHAR(255);

-- ── 3. Unique index — one ACTIVE (non-deleted) admission per lead ────────────
-- Uses a partial unique index (WHERE deleted_at IS NULL) so soft-deleted rows
-- are excluded. This is safer than a full UNIQUE constraint which would conflict
-- with existing soft-deleted seed/test data.
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_admission_per_lead
    ON admissions(lead_id, institute_id)
    WHERE deleted_at IS NULL;

-- ── 4. Counsellor permission grants ─────────────────────────────────────────

-- STUDENT_CREATE: counsellor creates student record from admission
INSERT INTO permissions (name, code, resource, action, description)
VALUES (
    'Create Student',
    'STUDENT_CREATE',
    'STUDENT',
    'CREATE',
    'Create a student record from an admission (counsellor path)'
)
ON CONFLICT (code) DO NOTHING;

-- BATCH_ASSIGN: counsellor assigns a batch to a student/admission
INSERT INTO permissions (name, code, resource, action, description)
VALUES (
    'Assign Batch',
    'BATCH_ASSIGN',
    'BATCH',
    'UPDATE',
    'Assign or transfer a student to a batch'
)
ON CONFLICT (code) DO NOTHING;

-- Grant STUDENT_CREATE + BATCH_ASSIGN to COUNSELLOR, INSTITUTE_ADMIN, SUPER_ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code IN ('COUNSELLOR', 'INSTITUTE_ADMIN', 'SUPER_ADMIN')
  AND  p.code IN ('STUDENT_CREATE', 'BATCH_ASSIGN')
ON CONFLICT DO NOTHING;

-- BOOKING_CREATE: counsellor creates ADMISSION_CLOSING type bookings
INSERT INTO permissions (name, code, resource, action, description)
VALUES (
    'Create Booking',
    'BOOKING_CREATE',
    'BOOKING',
    'CREATE',
    'Create a booking for a lead (caller: REMOTE_TOKEN; counsellor: ADMISSION_CLOSING)'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code IN ('CALLER', 'COUNSELLOR', 'INSTITUTE_ADMIN', 'SUPER_ADMIN')
  AND  p.code = 'BOOKING_CREATE'
ON CONFLICT DO NOTHING;

-- Explicitly ensure COUNSELLOR does NOT have BOOKING_VERIFY (payment verification is admin-only)
DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE code = 'COUNSELLOR' LIMIT 1)
  AND permission_id = (SELECT id FROM permissions WHERE code = 'BOOKING_VERIFY');

-- ── Batch enhancements ───────────────────────────────────────────────────
-- Add batch_code, mode, faculty_name columns to existing batches table

ALTER TABLE batches
    ADD COLUMN IF NOT EXISTS batch_code   VARCHAR(30),
    ADD COLUMN IF NOT EXISTS mode         VARCHAR(20) DEFAULT 'OFFLINE',
    ADD COLUMN IF NOT EXISTS faculty_name VARCHAR(200);

CREATE UNIQUE INDEX IF NOT EXISTS uq_batch_code_institute
    ON batches(institute_id, batch_code)
    WHERE batch_code IS NOT NULL AND deleted_at IS NULL;

-- ── Link admissions to batches ────────────────────────────────────────────
-- batch_id is optional (admissions can exist without a batch assignment)

ALTER TABLE admissions
    ADD COLUMN IF NOT EXISTS batch_id BIGINT REFERENCES batches(id);

CREATE INDEX IF NOT EXISTS idx_admissions_batch_id ON admissions(batch_id);

-- ── Batch permissions ─────────────────────────────────────────────────────
INSERT INTO permissions (name, code, resource, action, description)
VALUES
    ('View Batches',   'BATCH_VIEW',   'BATCH', 'READ',   'View batch list and detail'),
    ('Manage Batches', 'BATCH_MANAGE', 'BATCH', 'CREATE', 'Create, update, delete batches'),
    ('Assign Batch',   'BATCH_ASSIGN', 'BATCH', 'ACTION', 'Assign students to batches')
ON CONFLICT (code) DO NOTHING;

-- ── Grant all batch permissions to SUPER_ADMIN ───────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code = 'SUPER_ADMIN'
  AND  p.resource = 'BATCH'
  AND  r.institute_id = 1
ON CONFLICT DO NOTHING;

-- ── Grant BATCH_VIEW + BATCH_ASSIGN to COUNSELLOR ────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code = 'COUNSELLOR'
  AND  p.code IN ('BATCH_VIEW', 'BATCH_ASSIGN')
  AND  r.institute_id = 1
ON CONFLICT DO NOTHING;

-- ── Grant BATCH_VIEW to FACULTY ───────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code = 'FACULTY'
  AND  p.code = 'BATCH_VIEW'
  AND  r.institute_id = 1
ON CONFLICT DO NOTHING;

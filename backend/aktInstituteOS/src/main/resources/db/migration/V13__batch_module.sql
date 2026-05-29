-- ── Rename batch statuses to align with requirements ─────────────────────────
-- UPCOMING → PLANNED, ONGOING → ACTIVE

UPDATE batches SET status = 'PLANNED' WHERE status = 'UPCOMING';
UPDATE batches SET status = 'ACTIVE'  WHERE status = 'ONGOING';

-- ── Batch assignment history ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS batch_assignment_history (
    id           BIGSERIAL PRIMARY KEY,
    institute_id BIGINT       NOT NULL REFERENCES institutes(id),
    admission_id BIGINT       NOT NULL REFERENCES admissions(id),
    from_batch_id BIGINT      REFERENCES batches(id),
    to_batch_id   BIGINT      REFERENCES batches(id),
    action        VARCHAR(20) NOT NULL, -- ASSIGNED, TRANSFERRED, REMOVED
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by    BIGINT      REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_bah_admission ON batch_assignment_history(admission_id);
CREATE INDEX IF NOT EXISTS idx_bah_institute ON batch_assignment_history(institute_id);

-- ── Add BATCH_ASSIGN to COUNSELLOR if not yet granted ────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code = 'COUNSELLOR'
  AND  p.code IN ('BATCH_VIEW', 'BATCH_ASSIGN', 'BATCH_MANAGE')
  AND  r.institute_id = 1
ON CONFLICT DO NOTHING;

-- ── Grant BATCH_VIEW to FACULTY ───────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code = 'FACULTY'
  AND  p.code IN ('BATCH_VIEW')
  AND  r.institute_id = 1
ON CONFLICT DO NOTHING;

-- ── Ensure BATCH_MANAGE permission exists ─────────────────────────────────────
INSERT INTO permissions (name, code, resource, action, description)
VALUES ('Manage Batches', 'BATCH_MANAGE', 'BATCH', 'CREATE', 'Create, update, delete batches')
ON CONFLICT (code) DO NOTHING;

-- ── Grant all batch perms to SUPER_ADMIN + INSTITUTE_ADMIN ───────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code IN ('SUPER_ADMIN', 'INSTITUTE_ADMIN')
  AND  p.resource = 'BATCH'
  AND  r.institute_id = 1
ON CONFLICT DO NOTHING;

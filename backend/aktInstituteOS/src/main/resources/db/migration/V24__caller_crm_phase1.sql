-- ============================================================
-- V24: Caller CRM Phase-1
--   • Extend leads with caller workflow fields
--   • Add available_seats to batches
--   • Create follow_ups table
--   • Create lead_activities table
--   • Create admission_bookings table
--   • Add CALLER role + permissions
-- ============================================================

-- ── Extend leads ─────────────────────────────────────────────────────────────
ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS address       TEXT,
    ADD COLUMN IF NOT EXISTS current_work  VARCHAR(30),
    ADD COLUMN IF NOT EXISTS interested_for VARCHAR(30),
    ADD COLUMN IF NOT EXISTS assigned_at   TIMESTAMPTZ;

-- ── Extend batches with seat tracking ────────────────────────────────────────
ALTER TABLE batches
    ADD COLUMN IF NOT EXISTS available_seats INT;

-- Backfill: available_seats = max_capacity for existing batches
UPDATE batches SET available_seats = max_capacity WHERE available_seats IS NULL AND max_capacity IS NOT NULL;

-- ── Follow-ups ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follow_ups (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institute_id BIGINT      NOT NULL REFERENCES institutes(id),
    lead_id      BIGINT      NOT NULL REFERENCES leads(id),
    scheduled_at TIMESTAMPTZ NOT NULL,
    remarks      TEXT,
    is_done      BOOLEAN     NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_by   BIGINT      REFERENCES users(id),
    updated_by   BIGINT      REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_followups_lead_id     ON follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_followups_institute_id ON follow_ups(institute_id);
CREATE INDEX IF NOT EXISTS idx_followups_scheduled_at ON follow_ups(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_followups_created_by   ON follow_ups(created_by);

-- ── Lead activities (timeline) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_activities (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institute_id BIGINT       NOT NULL REFERENCES institutes(id),
    lead_id      BIGINT       NOT NULL REFERENCES leads(id),
    action_type  VARCHAR(50)  NOT NULL,
    description  TEXT,
    performed_by BIGINT       REFERENCES users(id),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id     ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_institute_id ON lead_activities(institute_id);

-- ── Admission Bookings ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admission_bookings (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid                    VARCHAR(36)    NOT NULL UNIQUE,
    institute_id            BIGINT         NOT NULL REFERENCES institutes(id),
    lead_id                 BIGINT         NOT NULL REFERENCES leads(id),
    batch_id                BIGINT         NOT NULL REFERENCES batches(id),
    payment_amount          NUMERIC(12,2),
    payment_proof_url       TEXT,
    payment_proof_uploaded_at TIMESTAMPTZ,
    booking_status          VARCHAR(30)    NOT NULL DEFAULT 'PAYMENT_PENDING',
    payment_verified_by     BIGINT         REFERENCES users(id),
    payment_verified_at     TIMESTAMPTZ,
    notes                   TEXT,
    created_by              BIGINT         REFERENCES users(id),
    updated_by              BIGINT         REFERENCES users(id),
    created_at              TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_admission_bookings_lead UNIQUE (lead_id)
);

CREATE INDEX IF NOT EXISTS idx_admission_bookings_lead_id     ON admission_bookings(lead_id);
CREATE INDEX IF NOT EXISTS idx_admission_bookings_batch_id    ON admission_bookings(batch_id);
CREATE INDEX IF NOT EXISTS idx_admission_bookings_institute_id ON admission_bookings(institute_id);
CREATE INDEX IF NOT EXISTS idx_admission_bookings_status      ON admission_bookings(booking_status);

-- ── Lead imports tracking ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lead_imports (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    institute_id   BIGINT      NOT NULL REFERENCES institutes(id),
    imported_by    BIGINT      REFERENCES users(id),
    file_name      VARCHAR(255),
    total_rows     INT         NOT NULL DEFAULT 0,
    valid_rows     INT         NOT NULL DEFAULT 0,
    duplicate_rows INT         NOT NULL DEFAULT 0,
    invalid_rows   INT         NOT NULL DEFAULT 0,
    import_status  VARCHAR(20) NOT NULL DEFAULT 'DONE',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── New permissions ────────────────────────────────────────────────────────────
INSERT INTO permissions (name, code, resource, action, description)
VALUES
    ('Import Leads',         'LEAD_IMPORT',      'LEAD',    'CREATE', 'Bulk import leads from spreadsheet'),
    ('View Bookings',        'BOOKING_VIEW',     'BOOKING', 'READ',   'View admission bookings'),
    ('Create Booking',       'BOOKING_CREATE',   'BOOKING', 'CREATE', 'Initiate admission booking and upload payment proof'),
    ('Verify Payment',       'BOOKING_VERIFY',   'BOOKING', 'UPDATE', 'Verify payment and confirm booking'),
    ('View Follow-ups',      'FOLLOWUP_VIEW',    'FOLLOWUP','READ',   'View follow-up schedule'),
    ('Manage Follow-ups',    'FOLLOWUP_MANAGE',  'FOLLOWUP','CREATE', 'Create and update follow-ups')
ON CONFLICT (code) DO NOTHING;

-- ── CALLER role ────────────────────────────────────────────────────────────────
INSERT INTO roles (institute_id, name, code, description, is_system, is_active)
SELECT 1, 'Caller', 'CALLER', 'Daily caller — calls assigned leads, updates info, initiates bookings', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'CALLER' AND institute_id = 1);

-- ── Grant permissions to CALLER ────────────────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code = 'CALLER'
  AND  r.institute_id = 1
  AND  p.code IN (
      'LEAD_VIEW', 'LEAD_UPDATE',
      'FOLLOWUP_VIEW', 'FOLLOWUP_MANAGE',
      'BOOKING_VIEW', 'BOOKING_CREATE',
      'BATCH_VIEW', 'COURSE_VIEW'
  )
ON CONFLICT DO NOTHING;

-- ── Grant new permissions to INSTITUTE_ADMIN ───────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code = 'INSTITUTE_ADMIN'
  AND  r.institute_id = 1
  AND  p.code IN (
      'LEAD_IMPORT',
      'BOOKING_VIEW', 'BOOKING_CREATE', 'BOOKING_VERIFY',
      'FOLLOWUP_VIEW', 'FOLLOWUP_MANAGE'
  )
ON CONFLICT DO NOTHING;

-- ── Grant new permissions to SUPER_ADMIN ──────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code = 'SUPER_ADMIN'
  AND  r.institute_id = 1
  AND  p.resource IN ('BOOKING', 'FOLLOWUP')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code = 'SUPER_ADMIN'
  AND  r.institute_id = 1
  AND  p.code = 'LEAD_IMPORT'
ON CONFLICT DO NOTHING;

-- ── Grant BOOKING + FOLLOWUP to COUNSELLOR ────────────────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code = 'COUNSELLOR'
  AND  r.institute_id = 1
  AND  p.code IN (
      'LEAD_IMPORT',
      'BOOKING_VIEW', 'BOOKING_CREATE', 'BOOKING_VERIFY',
      'FOLLOWUP_VIEW', 'FOLLOWUP_MANAGE'
  )
ON CONFLICT DO NOTHING;

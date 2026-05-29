-- ── Admissions table ──────────────────────────────────────────────────────
CREATE TABLE admissions (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    uuid             VARCHAR(36)    NOT NULL UNIQUE,
    admission_number VARCHAR(30)    NOT NULL,
    institute_id     BIGINT         NOT NULL REFERENCES institutes(id),
    lead_id          BIGINT         NOT NULL REFERENCES leads(id),
    student_id       BIGINT         REFERENCES students(id),
    first_name       VARCHAR(100)   NOT NULL,
    last_name        VARCHAR(100),
    phone            VARCHAR(15)    NOT NULL,
    email            VARCHAR(255),
    course_name      VARCHAR(200),
    batch_name       VARCHAR(200),
    fees_agreed      NUMERIC(12, 2) NOT NULL DEFAULT 0,
    fees_paid        NUMERIC(12, 2) NOT NULL DEFAULT 0,
    enrollment_date  DATE,
    status           VARCHAR(50)    NOT NULL DEFAULT 'PENDING',
    notes            TEXT,
    created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at       TIMESTAMP,
    created_by       BIGINT         REFERENCES users(id),
    updated_by       BIGINT         REFERENCES users(id),
    CONSTRAINT uq_admission_number_institute UNIQUE (admission_number, institute_id)
);

CREATE INDEX idx_admissions_institute_id  ON admissions(institute_id);
CREATE INDEX idx_admissions_lead_id       ON admissions(lead_id);
CREATE INDEX idx_admissions_student_id    ON admissions(student_id);
CREATE INDEX idx_admissions_status        ON admissions(status);
CREATE INDEX idx_admissions_deleted_at    ON admissions(deleted_at);
CREATE INDEX idx_admissions_enrollment_dt ON admissions(enrollment_date);

CREATE TRIGGER trg_admissions_updated_at
    BEFORE UPDATE ON admissions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Admission permissions ─────────────────────────────────────────────────
INSERT INTO permissions (name, code, resource, action, description)
VALUES
    ('View Admissions',   'ADMISSION_VIEW',   'ADMISSION', 'READ',   'View admission records'),
    ('Create Admissions', 'ADMISSION_CREATE', 'ADMISSION', 'CREATE', 'Create new admissions'),
    ('Update Admissions', 'ADMISSION_UPDATE', 'ADMISSION', 'UPDATE', 'Edit admission details and status'),
    ('Delete Admissions', 'ADMISSION_DELETE', 'ADMISSION', 'DELETE', 'Soft-delete admissions'),
    ('Enroll Admission',  'ADMISSION_ENROLL', 'ADMISSION', 'ACTION', 'Mark admission as enrolled/active')
ON CONFLICT (code) DO NOTHING;

-- ── Grant all ADMISSION permissions to SUPER_ADMIN ────────────────────────
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM   roles r
CROSS  JOIN permissions p
WHERE  r.code = 'SUPER_ADMIN'
  AND  p.resource = 'ADMISSION'
  AND  r.institute_id = 1
ON CONFLICT DO NOTHING;
